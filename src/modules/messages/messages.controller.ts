import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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
  getMessages(@Request() req: { user: { uid: string } }) {
    return this.messagesService.getMessages(req.user.uid);
  }

  @Post()
  @ApiOperation({ summary: 'Gui tin nhan chat' })
  sendMessage(
    @Request() req: { user: { uid: string } },
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(req.user.uid, dto);
  }

  // --- ADMIN APIs ---

  @Get('sessions')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Lay danh sach cac phien chat (Admin)' })
  getChatSessions() {
    return this.messagesService.getChatSessions();
  }

  @Get(':uid')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Lay lich su chat voi 1 user (Admin)' })
  getMessagesForAdmin(@Param('uid') uid: string) {
    return this.messagesService.getMessagesForAdmin(uid);
  }

  @Post(':uid/reply')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Tra loi tin nhan cho 1 user (Admin)' })
  replyMessage(
    @Param('uid') uid: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.replyMessage(uid, dto);
  }
}
