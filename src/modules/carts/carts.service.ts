import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
  ) {}

  // 1. Tìm hoặc khởi tạo giỏ hàng cho user
  async getOrCreateCart(uid: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { uid },
    });

    if (!cart) {
      cart = this.cartRepository.create({ uid });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  // 2. Xem giỏ hàng hiện tại của user kèm thông tin chi tiết
  async getCart(uid: string) {
    const cart = await this.getOrCreateCart(uid);

    const items = await this.cartItemRepository.find({
      where: { cartId: cart.cartId },
      relations: {
        product: { brand: true, category: true },
        variant: true,
      },
      order: { addedAt: 'DESC' },
    });

    // Tính toán tổng số lượng và tổng tiền tạm tính
    let subtotal = 0;
    let totalItems = 0;
    const formattedItems = items.map((item) => {
      // Giá cơ bản của sản phẩm (dùng salePrice nếu có, ngược lại dùng price) cộng với phụ phí variant
      const basePrice = Number(item.product.salePrice ?? item.product.price);
      const extraPrice = Number(item.variant.extraPrice);
      const currentPrice = basePrice + extraPrice;

      // Cập nhật lại unitPrice trong DB nếu giá sản phẩm thay đổi để đồng bộ giỏ hàng
      if (Number(item.unitPrice) !== currentPrice) {
        item.unitPrice = currentPrice;
        void this.cartItemRepository.save(item);
      }

      const lineTotal = currentPrice * item.quantity;
      subtotal += lineTotal;
      totalItems += item.quantity;

      return {
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: currentPrice,
        lineTotal,
        addedAt: item.addedAt,
        product: {
          productId: item.product.productId,
          name: item.product.name,
          images: item.product.images,
          brandName: item.product.brand?.name,
          categoryName: item.product.category?.name,
        },
        variant: {
          variantId: item.variant.variantId,
          size: item.variant.size,
          colorName: item.variant.colorName,
          colorHex: item.variant.colorHex,
          sku: item.variant.sku,
          stockQty: item.variant.stockQty,
        },
      };
    });

    return {
      cartId: cart.cartId,
      subtotal,
      totalItems,
      items: formattedItems,
    };
  }

  // 3. Thêm sản phẩm vào giỏ hàng
  async addToCart(uid: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(uid);

    // Tìm và kiểm tra biến thể có hợp lệ và còn hàng hay không
    const variant = await this.variantRepository.findOne({
      where: { variantId: dto.variantId, isActive: true },
      relations: { product: true },
    });

    if (!variant || !variant.product || !variant.product.isActive) {
      throw new NotFoundException(
        'Biến thể sản phẩm không tồn tại hoặc đã bị ẩn.',
      );
    }

    if (variant.stockQty < dto.quantity) {
      throw new BadRequestException(
        `Số lượng trong kho không đủ (Chỉ còn ${variant.stockQty} sản phẩm).`,
      );
    }

    // Tính toán giá snapshot tại thời điểm thêm
    const basePrice = Number(
      variant.product.salePrice ?? variant.product.price,
    );
    const extraPrice = Number(variant.extraPrice);
    const unitPrice = basePrice + extraPrice;

    // Kiểm tra xem variant đã có trong giỏ hàng chưa
    let cartItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.cartId, variantId: dto.variantId },
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + dto.quantity;
      if (variant.stockQty < newQuantity) {
        throw new BadRequestException(
          `Bạn đã có ${cartItem.quantity} sản phẩm trong giỏ hàng. Không thể thêm tiếp vì vượt quá số lượng kho (${variant.stockQty}).`,
        );
      }
      cartItem.quantity = newQuantity;
      cartItem.unitPrice = unitPrice; // cập nhật lại giá mới nhất
      await this.cartItemRepository.save(cartItem);
    } else {
      cartItem = this.cartItemRepository.create({
        cartId: cart.cartId,
        productId: variant.productId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        unitPrice,
      });
      await this.cartItemRepository.save(cartItem);
    }

    return this.getCart(uid);
  }

  // 4. Cập nhật số lượng sản phẩm trong giỏ hàng
  async updateCartItem(uid: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(uid);

    const cartItem = await this.cartItemRepository.findOne({
      where: { itemId, cartId: cart.cartId },
      relations: { variant: true },
    });

    if (!cartItem) {
      throw new NotFoundException(
        'Không tìm thấy mặt hàng này trong giỏ hàng.',
      );
    }

    if (cartItem.variant.stockQty < dto.quantity) {
      throw new BadRequestException(
        `Số lượng trong kho không đủ (Chỉ còn ${cartItem.variant.stockQty} sản phẩm).`,
      );
    }

    cartItem.quantity = dto.quantity;
    await this.cartItemRepository.save(cartItem);

    return this.getCart(uid);
  }

  // 5. Xóa mặt hàng khỏi giỏ hàng
  async deleteCartItem(uid: string, itemId: string) {
    const cart = await this.getOrCreateCart(uid);

    const cartItem = await this.cartItemRepository.findOne({
      where: { itemId, cartId: cart.cartId },
    });

    if (!cartItem) {
      throw new NotFoundException(
        'Không tìm thấy mặt hàng này trong giỏ hàng.',
      );
    }

    await this.cartItemRepository.remove(cartItem);

    return this.getCart(uid);
  }

  // 6. Xóa toàn bộ giỏ hàng
  async clearCart(uid: string) {
    const cart = await this.getOrCreateCart(uid);
    await this.cartItemRepository.delete({ cartId: cart.cartId });
    return { message: 'Đã xóa toàn bộ giỏ hàng.' };
  }
}
