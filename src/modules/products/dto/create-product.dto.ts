import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'cat-001' })
  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @ApiProperty({ example: 'brd-001' })
  @IsNotEmpty()
  @IsString()
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
