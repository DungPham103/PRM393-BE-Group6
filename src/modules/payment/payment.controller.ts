import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  Req,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tạo Stripe Checkout Session cho đơn hàng' })
  @Post('create-checkout-session/:orderId')
  async createCheckoutSession(
    @Param('orderId') orderId: string,
    @Request() req,
  ) {
    const uid = req.user.uid;
    return this.paymentService.createCheckoutSession(orderId, uid);
  }

  @ApiOperation({ summary: 'Trang hiển thị khi thanh toán thành công' })
  @Get('success')
  paymentSuccess(@Query('order_id') orderId: string, @Res() res: any) {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;background:#f0fdf4;margin:0;">
          <div style="text-align:center;padding:40px;">
            <div style="font-size:64px;">&#10004;</div>
            <h1 style="color:#16a34a;">Thanh toán thành công!</h1>
            <p style="color:#666;font-size:18px;">Đơn hàng <strong>${orderId || ''}</strong> đã được thanh toán.</p>
            <p style="color:#999;">Bạn có thể đóng trang này và quay lại ứng dụng.</p>
          </div>
        </body>
      </html>
    `);
  }

  @ApiOperation({ summary: 'Trang hiển thị khi hủy thanh toán' })
  @Get('cancel')
  paymentCancel(@Query('order_id') orderId: string, @Res() res: any) {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;background:#fef2f2;margin:0;">
          <div style="text-align:center;padding:40px;">
            <div style="font-size:64px;">&#10060;</div>
            <h1 style="color:#dc2626;">Thanh toán đã bị hủy</h1>
            <p style="color:#666;font-size:18px;">Đơn hàng <strong>${orderId || ''}</strong> chưa được thanh toán.</p>
            <p style="color:#999;">Bạn có thể đóng trang này và quay lại ứng dụng để thử lại.</p>
          </div>
        </body>
      </html>
    `);
  }

  @ApiOperation({ summary: 'Webhook nhận event từ Stripe (không cần Auth)' })
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: any,
  ) {
    // Stripe yêu cầu raw body để verify signature. NestJS hỗ trợ thông qua req.rawBody
    const body = req.rawBody;
    if (!body) {
      return { error: 'No raw body available' };
    }
    return this.paymentService.handleWebhook(signature, body);
  }
}
