import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  @ApiOperation({ summary: 'Tạo đơn hàng (checkout giỏ hàng)' })
  createOrder(
    @Request() req: { user: { uid: string } },
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(req.user.uid, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lịch sử đơn hàng của user' })
  getMyOrders(@Request() req: { user: { uid: string } }) {
    return this.ordersService.getMyOrders(req.user.uid);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Lấy tất cả đơn hàng (Admin only)' })
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng' })
  getOrderById(
    @Request() req: { user: { uid: string } },
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderById(req.user.uid, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hủy đơn hàng (chỉ khi trạng thái pending)' })
  cancelOrder(
    @Request() req: { user: { uid: string } },
    @Param('id') id: string,
  ) {
    return this.ordersService.cancelOrder(req.user.uid, id);
  }

  @Delete(':id/abandon')
  @ApiOperation({ summary: 'Xóa hoàn toàn đơn hàng thanh toán hụt (khôi phục giỏ hàng và tồn kho)' })
  abandonOrder(
    @Request() req: { user: { uid: string } },
    @Param('id') id: string,
  ) {
    return this.ordersService.abandonOrder(req.user.uid, id);
  }

  @Post(':id/approve-cancel')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Duyệt yêu cầu hủy đơn và hoàn tiền qua Stripe (Admin only)' })
  approveCancel(@Param('id') id: string) {
    return this.ordersService.approveCancel(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Cập nhật trạng thái đơn hàng (Admin only)' })
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
