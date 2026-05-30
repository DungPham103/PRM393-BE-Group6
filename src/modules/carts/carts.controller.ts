import {
  Controller,
  Get,
  Post,
  Patch,
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
  @ApiOperation({ summary: 'Xem giỏ hàng (kèm thông tin sản phẩm)' })
  getCart(@Request() req) {
    return this.cartsService.getCart(req.user.uid);
  }

  @Post('items')
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ' })
  addToCart(@Request() req, @Body() dto: AddToCartDto) {
    return this.cartsService.addToCart(req.user.uid, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Thay đổi số lượng sản phẩm trong giỏ' })
  updateCartItem(
    @Request() req,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateCartItem(req.user.uid, itemId, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Xóa 1 sản phẩm khỏi giỏ' })
  deleteCartItem(@Request() req, @Param('id') itemId: string) {
    return this.cartsService.deleteCartItem(req.user.uid, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Xóa toàn bộ giỏ hàng' })
  clearCart(@Request() req) {
    return this.cartsService.clearCart(req.user.uid);
  }
}
