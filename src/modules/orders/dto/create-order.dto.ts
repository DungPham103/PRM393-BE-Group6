import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../../entities/order.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID của địa chỉ nhận hàng của người dùng',
    example: 'addr-001',
  })
  @IsString({ message: 'ID địa chỉ nhận hàng không hợp lệ' })
  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  addressId: string;

  @ApiProperty({
    description: 'Phương thức thanh toán cho đơn hàng',
    enum: PaymentMethod,
    example: PaymentMethod.COD,
  })
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm cho đơn hàng (ví dụ: giao giờ hành chính)',
    example: 'Giao giờ hành chính giúp em ạ!',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  note?: string;

  @ApiPropertyOptional({
    description: 'Phí vận chuyển đã tính từ app theo khoảng cách',
    example: 25000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Phí vận chuyển không hợp lệ' })
  @Min(0, { message: 'Phí vận chuyển không được âm' })
  @Max(200000, { message: 'Phí vận chuyển vượt giới hạn cho phép' })
  shippingFee?: number;

  @ApiPropertyOptional({
    description: 'ID voucher giảm giá muốn áp dụng',
    example: 'voucher-001',
  })
  @IsOptional()
  @IsString({ message: 'ID voucher không hợp lệ' })
  voucherId?: string;
}
