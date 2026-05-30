import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentMethod } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Address } from '../../entities/address.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    private dataSource: DataSource,
  ) {}

  // 1. Đặt hàng sử dụng Database Transaction (QueryRunner)
  async createOrder(uid: string, dto: CreateOrderDto) {
    // Kiểm tra địa chỉ nhận hàng có tồn tại và thuộc về user không
    const address = await this.addressRepository.findOne({
      where: { addressId: dto.addressId, uid },
    });
    if (!address) {
      throw new NotFoundException('Địa chỉ nhận hàng không tồn tại.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // a. Lấy giỏ hàng của user
      const cart = await queryRunner.manager.findOne(Cart, { where: { uid } });
      if (!cart) {
        throw new BadRequestException('Không tìm thấy giỏ hàng của bạn.');
      }

      // b. Lấy danh sách mặt hàng trong giỏ hàng
      const cartItems = await queryRunner.manager.find(CartItem, {
        where: { cartId: cart.cartId },
        relations: {
          product: { brand: true },
          variant: true,
        },
      });

      if (!cartItems || cartItems.length === 0) {
        throw new BadRequestException('Giỏ hàng trống. Không thể đặt hàng.');
      }

      // c. Duyệt qua từng mặt hàng để kiểm tra tồn kho
      let subtotal = 0;
      const orderItemsToCreate: OrderItem[] = [];

      for (const item of cartItems) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { variantId: item.variantId, isActive: true },
          lock: { mode: 'pessimistic_write' }, // Lock dòng này để tránh race condition khi nhiều người cùng đặt hàng
        });

        if (!variant) {
          throw new BadRequestException(
            `Sản phẩm [${item.product.name}] đã dừng bán.`,
          );
        }

        if (variant.stockQty < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm [${item.product.name}] - Size ${variant.size} chỉ còn ${variant.stockQty} sản phẩm trong kho.`,
          );
        }

        // Cập nhật lại số lượng tồn kho (giảm đi)
        variant.stockQty -= item.quantity;
        await queryRunner.manager.save(variant);

        // Tính tiền dòng hàng
        const itemPrice = Number(item.unitPrice);
        const lineTotal = itemPrice * item.quantity;
        subtotal += lineTotal;

        // Tạo đối tượng OrderItem
        const orderItem = queryRunner.manager.create(OrderItem, {
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product.name,
          brandName: item.product.brand?.name || 'SportZone',
          size: variant.size,
          colorName: variant.colorName,
          imageUrl: variant.imageUrl || item.product.images[0] || undefined,
          quantity: item.quantity,
          unitPrice: itemPrice,
        });

        orderItemsToCreate.push(orderItem);
      }

      // d. Tính toán tổng chi phí (ở đây tạm tính ship 30k cố định, chưa áp dụng voucher)
      const shippingFee = 30000;
      const discount = 0;
      const total = subtotal + shippingFee - discount;

      // e. Tạo Đơn hàng (Order)
      const order = queryRunner.manager.create(Order, {
        uid,
        addressId: dto.addressId,
        paymentMethod: dto.paymentMethod,
        status: OrderStatus.PENDING,
        subtotal,
        shippingFee,
        discount,
        total,
        note: dto.note,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // f. Lưu các OrderItem gắn với Order vừa tạo
      for (const orderItem of orderItemsToCreate) {
        orderItem.orderId = savedOrder.orderId;
      }
      await queryRunner.manager.save(OrderItem, orderItemsToCreate);

      // g. Xóa tất cả sản phẩm trong giỏ hàng
      await queryRunner.manager.remove(CartItem, cartItems);

      // Commit transaction thành công!
      await queryRunner.commitTransaction();

      // Trả về đơn hàng kèm chi tiết
      return this.getOrderById(uid, savedOrder.orderId);
    } catch (error) {
      // Rollback nếu có bất kỳ lỗi nào xảy ra
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Giải phóng queryRunner
      await queryRunner.release();
    }
  }

  // 2. Lấy danh sách đơn hàng của người dùng hiện tại
  async getMyOrders(uid: string) {
    return this.orderRepository.find({
      where: { uid },
      order: { createdAt: 'DESC' },
    });
  }

  // 3. Lấy chi tiết một đơn hàng
  async getOrderById(uid: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { orderId, uid },
      relations: { address: true, items: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng của bạn.');
    }

    return order;
  }

  // 4. Hủy đơn hàng (Chỉ khi đơn ở trạng thái 'pending')
  async cancelOrder(uid: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { orderId, uid },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn hàng khi đang chờ xác nhận.',
      );
    }

    // Hoàn trả lại số lượng tồn kho của các biến thể
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of order.items) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { variantId: item.variantId },
        });
        if (variant) {
          variant.stockQty += item.quantity;
          await queryRunner.manager.save(variant);
        }
      }

      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 5. Cập nhật trạng thái đơn hàng (Dành riêng cho Admin)
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderRepository.findOne({
      where: { orderId },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    order.status = status;
    return this.orderRepository.save(order);
  }
}
