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
    // Get distinct users who have sent messages, ordered by latest message
    const sessions = await this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'user')
      .select([
        'user.uid',
        'user.email',
        'user.fullName',
        'user.avatarUrl',
        'MAX(m.sentAt) as last_activity',
        'COUNT(CASE WHEN m.sender_role = \'customer\' AND m.is_read = false THEN 1 END) as unread_count',
      ])
      .groupBy('user.uid')
      .addGroupBy('user.email')
      .addGroupBy('user.fullName')
      .addGroupBy('user.avatarUrl')
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
