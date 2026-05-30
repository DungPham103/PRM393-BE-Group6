import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @IsUUID(undefined, { message: 'ID biến thể không hợp lệ' })
  @IsNotEmpty({ message: 'ID biến thể không được để trống' })
  variantId: string;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity: number;
}
