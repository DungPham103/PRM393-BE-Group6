import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Họ tên mới cần cập nhật',
    example: 'Nguyễn Văn A Cập Nhật',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên lạc mới cần cập nhật',
    example: '0912345678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn ảnh đại diện mới cần cập nhật',
    example: 'https://example.com/avatars/new-avatar.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
