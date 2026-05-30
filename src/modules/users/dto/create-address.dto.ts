import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty()
  @IsString()
  recipientName: string;

  @ApiProperty({ example: '0909000001' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: '456 Lê Văn Việt' })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiPropertyOptional({ example: 'Hiệp Phú' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiProperty({ example: 'Quận 9' })
  @IsNotEmpty()
  @IsString()
  district: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
