import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductVariantDto {
  @ApiProperty({ example: 'M' })
  @IsEnum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'FREE'])
  @IsNotEmpty()
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'FREE';

  @ApiProperty({ example: 'Đen' })
  @IsString()
  @IsNotEmpty()
  colorName: string;

  @ApiProperty({ example: 15 })
  @IsNumber()
  @IsNotEmpty()
  stockQty: number;

  @ApiPropertyOptional({ example: 'https://example.com/red-variant.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'ID của danh mục sản phẩm (dạng UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'Danh mục sản phẩm không được để trống' })
  @IsString({
    message: 'ID danh mục sản phẩm phải là chuỗi hợp lệ',
  })
  categoryId: string;

  @ApiProperty({
    description: 'ID của thương hiệu sản phẩm (dạng UUID)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsNotEmpty({ message: 'Thương hiệu sản phẩm không được để trống' })
  @IsString({
    message: 'ID thương hiệu sản phẩm phải là chuỗi hợp lệ',
  })
  brandId: string;

  @ApiProperty({ example: 'Áo thun Nike Dri-FIT Training' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

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

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];
}
