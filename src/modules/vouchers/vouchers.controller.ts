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
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Vouchers')
@ApiBearerAuth('JWT-auth')
@Controller('vouchers')
@UseGuards(JwtAuthGuard)
export class VouchersController {
  constructor(private vouchersService: VouchersService) {}

  // ─── Admin Endpoints ───

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Tạo voucher mới (Admin only)' })
  createVoucher(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.createVoucher(dto);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Lấy tất cả voucher (Admin only)' })
  getAllVouchers() {
    return this.vouchersService.getAllVouchers();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Sửa voucher (Admin only)' })
  updateVoucher(
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.vouchersService.updateVoucher(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Vô hiệu hóa voucher (Admin only)' })
  deleteVoucher(@Param('id') id: string) {
    return this.vouchersService.deleteVoucher(id);
  }

  // ─── User Endpoints ───

  @Get('my')
  @ApiOperation({ summary: 'Lấy voucher khả dụng theo bậc thành viên' })
  getMyVouchers(@Request() req: { user: { uid: string } }) {
    return this.vouchersService.getAvailableVouchers(req.user.uid);
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate voucher code' })
  validateVoucher(
    @Request() req: { user: { uid: string } },
    @Param('code') code: string,
  ) {
    // Validate với subtotal = 0, checkout sẽ validate lại với subtotal thực
    return this.vouchersService.validateAndCalculateDiscount(code, req.user.uid, 0);
  }
}
