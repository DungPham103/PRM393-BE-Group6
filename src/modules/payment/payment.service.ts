import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Order, OrderStatus, PaymentMethod } from '../../entities/order.entity';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {
    const stripeSecret = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      this.logger.warn('STRIPE_SECRET_KEY is not defined in environment variables.');
    }
    this.stripe = new Stripe(stripeSecret || '', {
      apiVersion: '2025-01-27.acacia' as any, // specify recent stable version, might need to suppress warning if type is strict
    });
  }

  async createCheckoutSession(orderId: string, uid: string) {
    try {
      const order = await this.orderRepository.findOne({
        where: { orderId, uid },
        relations: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new InternalServerErrorException(
          'Chỉ có thể thanh toán cho đơn hàng đang chờ xử lý',
        );
      }

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
        price_data: {
          currency: 'vnd',
          product_data: {
            name: `${item.productName} (Size: ${item.size} - Màu: ${item.colorName})`,
            images: item.imageUrl ? [item.imageUrl] : [],
          },
          unit_amount: Number(item.unitPrice),
        },
        quantity: item.quantity,
      }));

      // Thêm phí vận chuyển như một line item nếu có
      if (order.shippingFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'vnd',
            product_data: {
              name: 'Phí vận chuyển',
            },
            unit_amount: Number(order.shippingFee),
          },
          quantity: 1,
        });
      }

      // Khấu trừ giảm giá (Stripe không hỗ trợ số âm trực tiếp trong line items trừ khi dùng Coupon)
      // Ở đây dùng Coupon tạo tự động hoặc tính lại giá, hoặc bỏ qua discount tạm thời trong UI.
      // Cách đơn giản nhất để áp dụng discount cho checkout session là tạo coupon 1 lần.
      // Nhưng để đơn giản, ta trừ thẳng vào sản phẩm đầu tiên hoặc tạo coupon tạm.
      // Lấy base URL từ biến môi trường, fallback về Render URL
      const baseUrl = this.configService.get<string>('APP_URL') || 'https://prm393-be.onrender.com';

      let sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${baseUrl}/api/v1/payment/success?order_id=${orderId}`,
        cancel_url: `${baseUrl}/api/v1/payment/cancel?order_id=${orderId}`,
        client_reference_id: orderId,
        metadata: {
          orderId: order.orderId,
          uid: order.uid,
        },
      };

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      return {
        checkoutUrl: session.url,
      };
    } catch (error) {
      this.logger.error('Error creating checkout session', error);
      throw new InternalServerErrorException('Không thể tạo phiên thanh toán Stripe');
    }
  }

  async handleWebhook(signature: string, body: Buffer) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret || '',
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new InternalServerErrorException(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id || session.metadata?.orderId;

      if (orderId) {
        const order = await this.orderRepository.findOne({ where: { orderId } });
        if (order) {
          order.status = OrderStatus.CONFIRMED;
          order.paymentMethod = PaymentMethod.STRIPE;
          await this.orderRepository.save(order);
          this.logger.log(`Order ${orderId} has been paid and confirmed via Stripe.`);
        }
      }
    }

    return { received: true };
  }
}
