import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Giỏ hàng (Cart)')
@ApiBearerAuth('JWT-auth')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private cartsService: CartsService) {}

  @Get()
  @ApiOperation({ summary: 'Xem giỏ hàng hiện tại của người dùng' })
  getCart(@Request() req) {
    return this.cartsService.getCart(req.user.uid);
  }

  @Post('items')
  @ApiOperation({
    summary: 'Thêm sản phẩm biến thể (variant SKU) vào giỏ hàng',
  })
  addToCart(@Request() req, @Body() dto: AddToCartDto) {
    return this.cartsService.addToCart(req.user.uid, dto);
  }

  @Put('items/:itemId')
  @ApiOperation({
    summary: 'Cập nhật số lượng của một sản phẩm trong giỏ hàng',
  })
  updateCartItem(
    @Request() req,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateCartItem(req.user.uid, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Xóa một sản phẩm khỏi giỏ hàng' })
  deleteCartItem(@Request() req, @Param('itemId') itemId: string) {
    return this.cartsService.deleteCartItem(req.user.uid, itemId);
  }
}
