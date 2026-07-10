import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Address } from '../../entities/address.entity';
import { User } from '../../entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { VouchersService } from '../vouchers/vouchers.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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
    private notificationsService: NotificationsService,
    private vouchersService: VouchersService,
    private httpService: HttpService,
    private configService: ConfigService,
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

      // d. Xử lý voucher (nếu có)
      let discount = 0;
      let voucherId: string | undefined = undefined;

      if (dto.voucherId) {
        // Lấy voucher từ DB qua voucherId
        const voucher = await this.vouchersService['voucherRepository'].findOne({
          where: { voucherId: dto.voucherId, isActive: true },
        });

        if (!voucher) {
          throw new BadRequestException('Voucher không tồn tại hoặc đã bị vô hiệu hóa.');
        }

        // Validate & tính discount
        const result = await this.vouchersService.validateAndCalculateDiscount(
          voucher.code,
          uid,
          subtotal,
        );
        discount = result.discountAmount;
        voucherId = voucher.voucherId;
      }

      // e. Tính toán phí vận chuyển tự động bằng Backend
      const shippingFee = await this.calculateShippingFee(address);
      const total = subtotal + shippingFee - discount;

      // f. Tạo Đơn hàng (Order)
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
        voucherId,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // g. Lưu các OrderItem gắn với Order vừa tạo
      for (const orderItem of orderItemsToCreate) {
        orderItem.orderId = savedOrder.orderId;
      }
      await queryRunner.manager.save(OrderItem, orderItemsToCreate);

      // h. Xóa tất cả sản phẩm trong giỏ hàng
      await queryRunner.manager.remove(CartItem, cartItems);

      // Commit transaction thành công!
      await queryRunner.commitTransaction();

      // i. Đánh dấu voucher đã sử dụng (ngoài transaction)
      if (voucherId) {
        await this.vouchersService.markVoucherUsed(uid, voucherId, savedOrder.orderId);
      }

      await this.notificationsService.createNotification({
        uid,
        type: NotificationType.SYSTEM,
        title: 'Đặt hàng thành công',
        body: `Đơn hàng #${savedOrder.orderId.slice(0, 8)} đã được ghi nhận. Chúng tôi sẽ xác nhận đơn trong thời gian sớm nhất.`,
        refId: savedOrder.orderId,
        refType: 'order',
      });

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
      await this.notificationsService.createNotification({
        uid,
        type: NotificationType.ORDER_CANCELLED,
        title: 'Đơn hàng đã bị hủy',
        body: `Đơn hàng #${order.orderId.slice(0, 8)} đã được hủy thành công.`,
        refId: order.orderId,
        refType: 'order',
      });
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

    const oldStatus = order.status;
    order.status = status;
    const savedOrder = await this.orderRepository.save(order);

    if (oldStatus !== status) {
      await this.notificationsService.createNotification({
        uid: savedOrder.uid,
        ...this.buildOrderStatusNotification(savedOrder.orderId, status),
      });

      // Khi đơn hàng hoàn tất → cập nhật total_spent & kiểm tra nâng bậc
      if (status === OrderStatus.COMPLETED) {
        await this.updateTotalSpentAndCheckTier(savedOrder.uid, savedOrder.total);
      }
    }

    return savedOrder;
  }

  // 6. Lấy tất cả đơn hàng (Dành riêng cho Admin)
  async getAllOrders() {
    return this.orderRepository.find({
      relations: { address: true, items: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async calculateShippingFee(address: Address): Promise<number> {
    const token = this.configService.get<string>('MAPBOX_TOKEN');
    if (!token) {
      return 30000; // Fallback nếu không có token
    }

    const query = `${address.street}, ${address.ward ? address.ward + ', ' : ''}${address.district}, ${address.city}`;
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&country=vn&limit=1&language=vi&access_token=${token}`;

    try {
      const response = await firstValueFrom(this.httpService.get(url, { timeout: 10000 }));
      const features = response.data?.features;
      if (!features || features.length === 0) {
        return 30000; // Fallback nếu không tìm thấy tọa độ
      }

      const coordinates = features[0].geometry.coordinates;
      const userLng = coordinates[0];
      const userLat = coordinates[1];

      // Tọa độ shop
      const shopLat = 10.84118;
      const shopLng = 106.80986;

      // Tính khoảng cách bằng công thức Haversine
      const R = 6371; // Bán kính trái đất tính bằng km
      const dLat = (userLat - shopLat) * (Math.PI / 180);
      const dLng = (userLng - shopLng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(shopLat * (Math.PI / 180)) * Math.cos(userLat * (Math.PI / 180)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = R * c;

      // Công thức tính phí ship (Fix lỗi logic baseFee 15k)
      const baseFee = 15000;
      const extraPerKm = 5000;
      const maxFee = 40000;

      const extraKm = distanceKm <= 2 ? 0 : Math.ceil(distanceKm - 2);
      let fee = baseFee + extraKm * extraPerKm;

      if (fee > maxFee) {
        fee = maxFee;
      }

      return fee;
    } catch (error) {
      console.error('Error calculating shipping fee:', error.message);
      return 30000; // Fallback 30k nếu lỗi API
    }
  }

  // ─── Cập nhật total_spent và kiểm tra nâng bậc ───
  private async updateTotalSpentAndCheckTier(uid: string, orderTotal: number) {
    try {
      // Cộng total vào total_spent
      await this.dataSource
        .createQueryBuilder()
        .update(User)
        .set({ totalSpent: () => `total_spent + ${Number(orderTotal)}` })
        .where('uid = :uid', { uid })
        .execute();

      // Kiểm tra & nâng bậc
      await this.vouchersService.checkAndUpgradeTier(uid);
    } catch (error) {
      // Không throw lỗi ở đây để không ảnh hưởng order flow
      console.error('Error updating tier:', error);
    }
  }

  private buildOrderStatusNotification(orderId: string, status: OrderStatus) {
    const shortId = orderId.slice(0, 8);
    switch (status) {
      case OrderStatus.CONFIRMED:
        return {
          type: NotificationType.ORDER_CONFIRMED,
          title: 'Đơn hàng đã được xác nhận',
          body: `Đơn hàng #${shortId} đã được xác nhận và đang chuẩn bị xử lý.`,
          refId: orderId,
          refType: 'order',
        };
      case OrderStatus.PROCESSING:
        return {
          type: NotificationType.SYSTEM,
          title: 'Đơn hàng đang được chuẩn bị',
          body: `Đơn hàng #${shortId} đang được đóng gói tại SportZone.`,
          refId: orderId,
          refType: 'order',
        };
      case OrderStatus.SHIPPING:
        return {
          type: NotificationType.ORDER_SHIPPING,
          title: 'Đơn hàng đang giao tới bạn',
          body: `Đơn hàng #${shortId} đã rời kho và đang trên đường giao tới bạn.`,
          refId: orderId,
          refType: 'order',
        };
      case OrderStatus.DELIVERED:
        return {
          type: NotificationType.ORDER_DELIVERED,
          title: 'Đơn hàng đã giao thành công',
          body: `Đơn hàng #${shortId} đã được giao. Bạn có thể đánh giá sản phẩm sau khi kiểm tra.`,
          refId: orderId,
          refType: 'order',
        };
      case OrderStatus.COMPLETED:
        return {
          type: NotificationType.ORDER_DELIVERED,
          title: 'Đơn hàng đã hoàn tất',
          body: `Đơn hàng #${shortId} đã hoàn tất. Cảm ơn bạn đã mua sắm tại SportZone.`,
          refId: orderId,
          refType: 'order',
        };
      case OrderStatus.CANCELLED:
        return {
          type: NotificationType.ORDER_CANCELLED,
          title: 'Đơn hàng đã bị hủy',
          body: `Đơn hàng #${shortId} đã được chuyển sang trạng thái hủy.`,
          refId: orderId,
          refType: 'order',
        };
      default:
        return {
          type: NotificationType.SYSTEM,
          title: 'Trạng thái đơn hàng đã cập nhật',
          body: `Đơn hàng #${shortId} đã được cập nhật trạng thái.`,
          refId: orderId,
          refType: 'order',
        };
    }
  }
}
