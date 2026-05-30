import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentMethod } from '../../../entities/order.entity';

export class CreateOrderDto {
  @IsUUID(undefined, { message: 'ID địa chỉ nhận hàng không hợp lệ' })
  @IsNotEmpty({ message: 'Địa chỉ nhận hàng không được để trống' })
  addressId: string;

  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  @IsNotEmpty({ message: 'Phương thức thanh toán không được để trống' })
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  note?: string;
}
