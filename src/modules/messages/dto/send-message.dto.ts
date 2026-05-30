import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Shop ơi size L còn hàng không?' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @IsString()
  content: string;
}
