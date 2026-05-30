import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Người dùng & Địa chỉ (Users & Addresses)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('users/:id')
  @ApiOperation({ summary: 'Xem profile người dùng' })
  getUserProfile(@Request() req, @Param('id') id: string) {
    return this.usersService.getUserProfile(req.user.uid, id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Cập nhật profile người dùng' })
  updateUserProfile(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUserProfile(req.user.uid, id, dto);
  }

  @Get('users/:id/addresses')
  @ApiOperation({ summary: 'Danh sách địa chỉ giao hàng của người dùng' })
  getAddresses(@Request() req, @Param('id') id: string) {
    return this.usersService.getAddresses(req.user.uid, id);
  }

  @Post('users/:id/addresses')
  @ApiOperation({ summary: 'Thêm địa chỉ giao hàng mới' })
  createAddress(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(req.user.uid, id, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Sửa địa chỉ giao hàng' })
  updateAddress(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(req.user.uid, id, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Xóa địa chỉ giao hàng' })
  deleteAddress(@Request() req, @Param('id') id: string) {
    return this.usersService.deleteAddress(req.user.uid, id);
  }
}
