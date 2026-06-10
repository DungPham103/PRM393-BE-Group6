import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static assets explicitly for the uploads directory
  app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
    prefix: '/uploads/',
  });

  // Bật CORS để Flutter client hoặc web app có thể gọi API
  app.enableCors();

  // Thiết lập tiền tố API toàn cục
  app.setGlobalPrefix('api/v1');

  // Áp dụng ValidationPipe toàn cục cho việc validate DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các thuộc tính không được định nghĩa trong DTO
      transform: true, // Tự động chuyển đổi kiểu dữ liệu (ví dụ từ string sang number nếu khai báo trong DTO)
    }),
  );

  // Cấu hình tài liệu API tự động với Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sports Shop API')
    .setDescription(
      'Tài liệu mô tả chi tiết và công cụ chạy thử các API trong hệ thống Cửa hàng Đồ thể thao (Flutter Client Backend).',
    )
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập Bearer Token để thực hiện các API yêu cầu đăng nhập',
        in: 'header',
      },
      'JWT-auth', // Tên tham chiếu bảo mật
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true, // Lưu lại token đã đăng nhập khi F5 trang Swagger
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    `🚀 Sports Shop Backend is running on: http://localhost:${port}/api/v1`,
  );
  console.log(
    `📖 Swagger API Documentation is available at: http://localhost:${port}/api/docs`,
  );
}
void bootstrap();
