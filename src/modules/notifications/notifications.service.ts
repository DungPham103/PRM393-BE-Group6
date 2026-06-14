import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notifRepository: Repository<Notification>,
  ) {}

  async getNotifications(uid: string) {
    return this.notifRepository.find({
      where: { uid },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(uid: string, notifId: string) {
    const notif = await this.notifRepository.findOne({
      where: { notifId, uid },
    });
    if (!notif) throw new NotFoundException('Thông báo không tồn tại.');
    notif.isRead = true;
    return this.notifRepository.save(notif);
  }

  async markAllAsRead(uid: string) {
    await this.notifRepository.update({ uid, isRead: false }, { isRead: true });
    return { message: 'Đã đánh dấu tất cả thông báo đã đọc.' };
  }
}
