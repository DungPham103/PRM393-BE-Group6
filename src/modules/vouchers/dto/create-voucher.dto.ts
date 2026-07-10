import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType, MembershipTier } from '../../../entities/voucher.entity';

export class CreateVoucherDto {
  @ApiProperty({ description: 'Mã voucher (unique)', example: 'GOLD50K' })
  @IsString()
  @IsNotEmpty({ message: 'Mã voucher không được để trống' })
  code: string;

  @ApiPropertyOptional({ description: 'Mô tả voucher', example: 'Giảm 50K cho Gold member' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Loại giảm giá', enum: DiscountType, example: DiscountType.FIXED_AMOUNT })
  @IsEnum(DiscountType, { message: 'Loại giảm giá phải là percentage hoặc fixed_amount' })
  @IsNotEmpty()
  discountType: DiscountType;

  @ApiProperty({ description: 'Giá trị giảm', example: 50000 })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Giá trị giảm phải lớn hơn 0' })
  discountValue: number;

  @ApiPropertyOptional({ description: 'Giảm tối đa (cho percentage)', example: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxDiscount?: number;

  @ApiPropertyOptional({ description: 'Giá trị đơn tối thiểu', example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @ApiProperty({ description: 'Bậc thành viên target', enum: MembershipTier, example: MembershipTier.GOLD })
  @IsEnum(MembershipTier, { message: 'Bậc thành viên không hợp lệ' })
  @IsNotEmpty()
  targetTier: MembershipTier;

  @ApiPropertyOptional({ description: 'Giới hạn số lần sử dụng', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Thời gian bắt đầu', example: '2026-07-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Thời gian kết thúc', example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Kích hoạt ngay', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
