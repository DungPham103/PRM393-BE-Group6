import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'ID của danh mục sản phẩm (dạng UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'Danh mục sản phẩm không được để trống' })
  @IsUUID(undefined, { message: 'ID danh mục sản phẩm phải là định dạng UUID hợp lệ' })
  categoryId: string;

  @ApiProperty({
    description: 'ID của thương hiệu sản phẩm (dạng UUID)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsNotEmpty({ message: 'Thương hiệu sản phẩm không được để trống' })
  @IsUUID(undefined, { message: 'ID thương hiệu sản phẩm phải là định dạng UUID hợp lệ' })
  brandId: string;

  @ApiProperty({ example: 'Áo thun Nike Dri-FIT Training' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 450000 })
  @IsNotEmpty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 380000 })
  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @ApiPropertyOptional({ example: ['https://example.com/img1.jpg'] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ example: 'Polyester 100%' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ enum: ['men', 'women', 'unisex'], example: 'men' })
  @IsOptional()
  @IsEnum(['men', 'women', 'unisex'])
  gender?: 'men' | 'women' | 'unisex';

  @ApiPropertyOptional({ example: 'Việt Nam' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warrantyInfo?: string;
}
