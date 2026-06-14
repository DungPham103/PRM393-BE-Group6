import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CartsModule } from './modules/carts/carts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagesModule } from './modules/messages/messages.module';
import { MailModule } from './modules/mail/mail.module';

// Import tất cả các entities một cách tường minh để tránh lỗi khởi tạo metadata
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Notification } from './entities/notification.entity';
import { Message } from './entities/message.entity';
import { StoreLocation } from './entities/store-location.entity';

@Module({
  imports: [
    // Nạp file cấu hình .env toàn cục
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Cấu hình kết nối PostgreSQL / Supabase
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [
          User,
          Address,
          Category,
          Brand,
          Product,
          ProductVariant,
          Cart,
          CartItem,
          Order,
          OrderItem,
          Notification,
          Message,
          StoreLocation,
        ],
        // synchronize: false để tránh việc TypeORM tự động sửa schema đã chạy từ shop_v2.sql
        synchronize: false,
        ssl: {
          rejectUnauthorized: false, // Yêu cầu SSL khi kết nối tới Supabase
        },
      }),
    }),
    // Đăng ký Auth Module
    AuthModule,
    // Đăng ký Products Module
    ProductsModule,
    // Đăng ký Carts Module
    CartsModule,
    // Đăng ký Orders Module
    OrdersModule,
    UsersModule,
    NotificationsModule,
    MessagesModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
