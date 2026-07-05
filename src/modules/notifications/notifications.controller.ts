import {
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Thông báo (Notifications)')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của user' })
  getNotifications(@Request() req: { user: { uid: string } }) {
    return this.notificationsService.getNotifications(req.user.uid);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu 1 thông báo đã đọc' })
  markAsRead(
    @Request() req: { user: { uid: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.uid, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  markAllAsRead(@Request() req: { user: { uid: string } }) {
    return this.notificationsService.markAllAsRead(req.user.uid);
  }

  @Delete('clear-all')
  @ApiOperation({ summary: 'Xóa tất cả thông báo của user' })
  clearAll(@Request() req: { user: { uid: string } }) {
    return this.notificationsService.clearAll(req.user.uid);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa 1 thông báo' })
  deleteNotification(
    @Request() req: { user: { uid: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(req.user.uid, id);
  }
}
