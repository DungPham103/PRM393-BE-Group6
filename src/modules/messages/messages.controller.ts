import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('Messages / Chat')
@ApiBearerAuth('JWT-auth')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Lay lich su chat cua user' })
  getMessages(@Request() req) {
    return this.messagesService.getMessages(req.user.uid);
  }

  @Post()
  @ApiOperation({ summary: 'Gui tin nhan chat' })
  sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(req.user.uid, dto);
  }
}
