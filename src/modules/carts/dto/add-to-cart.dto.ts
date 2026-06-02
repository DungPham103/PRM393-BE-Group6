import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({
    description: 'ID của biến thể sản phẩm cần thêm vào giỏ (dạng UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID(undefined, { message: 'ID biến thể không hợp lệ' })
  @IsNotEmpty({ message: 'ID biến thể không được để trống' })
  variantId: string;

  @ApiProperty({
    description: 'Số lượng sản phẩm muốn thêm vào giỏ',
    example: 1,
  })
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  quantity: number;
}
