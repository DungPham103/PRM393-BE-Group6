import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService], // Export để các module khác (như AuthModule) có thể dùng
})
export class MailModule {}
