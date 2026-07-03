import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MessagesService } from './src/modules/messages/messages.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const messagesService = app.get(MessagesService);
  try {
    const sessions = await messagesService.getChatSessions();
    console.log(sessions);
  } catch (err) {
    console.error(err);
  }
  await app.close();
}
bootstrap();
