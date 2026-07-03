import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, SenderRole } from '../../entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async getMessages(uid: string) {
    // Mark store messages as read for this user
    await this.messageRepository.update(
      { uid, senderRole: SenderRole.STORE, isRead: false },
      { isRead: true },
    );

    return this.messageRepository.find({
      where: { uid },
      order: { sentAt: 'ASC' },
    });
  }

  async sendMessage(uid: string, dto: SendMessageDto) {
    const customerMessage = await this.messageRepository.save(
      this.messageRepository.create({
        uid,
        senderRole: SenderRole.CUSTOMER,
        content: dto.content.trim(),
        isBot: false,
        isRead: false, // Admin hasn't read it yet
      }),
    );

    return {
      message: customerMessage,
    };
  }

  // --- ADMIN APIs ---

  async getChatSessions() {
    // Get distinct customer users who have messages, ordered by latest message
    const sessions = await this.messageRepository
      .createQueryBuilder('m')
      .innerJoin('m.user', 'user')
      .select([
        'user.uid AS user_uid',
        'user.email AS user_email',
        '"user"."full_name" AS user_full_name',
        '"user"."avatar_url" AS user_avatar_url',
        'MAX(m."sent_at") AS last_activity',
        `COUNT(CASE WHEN m."sender_role" = 'customer' AND m."is_read" = false THEN 1 END) AS unread_count`,
      ])
      .where('"user"."role" = :role', { role: 'customer' })
      .groupBy('user.uid')
      .addGroupBy('user.email')
      .addGroupBy('"user"."full_name"')
      .addGroupBy('"user"."avatar_url"')
      .orderBy('last_activity', 'DESC')
      .getRawMany();

    return sessions;
  }

  async getMessagesForAdmin(uid: string) {
    // Mark customer messages as read by admin
    await this.messageRepository.update(
      { uid, senderRole: SenderRole.CUSTOMER, isRead: false },
      { isRead: true },
    );

    return this.messageRepository.find({
      where: { uid },
      order: { sentAt: 'ASC' },
    });
  }

  async replyMessage(uid: string, dto: SendMessageDto) {
    const adminMessage = await this.messageRepository.save(
      this.messageRepository.create({
        uid,
        senderRole: SenderRole.STORE,
        content: dto.content.trim(),
        isBot: false,
        isRead: false, // User hasn't read it yet
      }),
    );

    return adminMessage;
  }
}
