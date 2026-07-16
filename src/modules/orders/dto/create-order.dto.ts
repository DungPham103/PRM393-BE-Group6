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
    description: 'ID voucher giảm giá muốn áp dụng',
    example: 'voucher-001',
  })
  @IsOptional()
  @IsString({ message: 'ID voucher không hợp lệ' })
  voucherId?: string;

  @ApiPropertyOptional({
    description: 'Delivery latitude selected or geocoded by the app',
    example: 10.84118,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Delivery latitude is invalid' })
  @Min(-90)
  @Max(90)
  deliveryLatitude?: number;

  @ApiPropertyOptional({
    description: 'Delivery longitude selected or geocoded by the app',
    example: 106.80986,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Delivery longitude is invalid' })
  @Min(-180)
  @Max(180)
  deliveryLongitude?: number;

  @ApiPropertyOptional({
    description: 'Delivery distance in kilometers estimated by the app',
    example: 8.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Delivery distance is invalid' })
  @Min(0)
  deliveryDistanceKm?: number;

  @ApiPropertyOptional({
    description: 'Shipping fee displayed by the app; backend recalculates it',
    example: 45000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Shipping fee is invalid' })
  @Min(0)
  shippingFee?: number;
}
