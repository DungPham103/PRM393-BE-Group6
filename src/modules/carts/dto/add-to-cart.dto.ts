import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({
    description: 'ID của biến thể sản phẩm cần thêm vào giỏ',
    example: 'var-001',
  })
  @IsString({ message: 'ID biến thể không hợp lệ' })
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
