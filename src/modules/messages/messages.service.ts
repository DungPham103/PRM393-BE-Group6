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
        isRead: true,
      }),
    );

    const autoReplyContent = this.getAutoReply(dto.content);
    const autoReply = autoReplyContent
      ? await this.messageRepository.save(
          this.messageRepository.create({
            uid,
            senderRole: SenderRole.STORE,
            content: autoReplyContent,
            isBot: true,
            isRead: false,
          }),
        )
      : null;

    return {
      message: customerMessage,
      autoReply,
    };
  }

  private getAutoReply(content: string): string | null {
    const normalized = content.toLowerCase();

    if (normalized.includes('size')) {
      return 'SportZone da nhan cau hoi ve size. Ban vui long gui ten san pham hoac ma SKU de shop kiem tra ton kho.';
    }

    if (normalized.includes('giao') || normalized.includes('ship')) {
      return 'SportZone giao hang toan quoc. Phi giao hang se duoc tinh khi checkout.';
    }

    if (normalized.includes('doi') || normalized.includes('tra')) {
      return 'SportZone ho tro doi tra theo chinh sach bao hanh cua tung san pham.';
    }

    return 'SportZone da nhan tin nhan cua ban. Nhan vien se phan hoi trong thoi gian som nhat.';
  }
}
