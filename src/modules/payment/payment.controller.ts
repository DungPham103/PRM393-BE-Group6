import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  Req,
  RawBodyRequest,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';

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
