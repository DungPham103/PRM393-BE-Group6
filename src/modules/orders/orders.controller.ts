import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrderStatus } from '../../entities/order.entity';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Đơn hàng (Orders)')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo đơn hàng mới (Checkout giỏ hàng)' })
  createOrder(@Request() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user.uid, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy lịch sử mua hàng của người dùng hiện tại' })
  getMyOrders(@Request() req) {
    return this.ordersService.getMyOrders(req.user.uid);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết một đơn hàng kèm danh sách sản phẩm đã mua',
  })
  getOrderById(@Request() req, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user.uid, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Hủy đơn hàng của tôi (Chỉ khi đơn hàng ở trạng thái pending)',
  })
  cancelOrder(@Request() req, @Param('id') id: string) {
    return this.ordersService.cancelOrder(req.user.uid, id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (Quyền Admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(OrderStatus),
          description: 'Trạng thái đơn hàng mới',
        },
      },
    },
  })
  updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateOrderStatus(id, status);
  }
}
