import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '../../../entities/order.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID của địa chỉ nhận hàng của người dùng (dạng UUID)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID(undefined, { message: 'ID địa chỉ nhận hàng không hợp lệ' })
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
}
