import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MessagesModule } from './messages/messages.module'; // 1. Importação necessária
import { NotificationsModule } from './notifications/notifications.module';
import { CirclesModule } from './circles/circles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'conectfy',
      autoLoadEntities: true, // Isso vai carregar a Entity Message automaticamente
      synchronize: true, // Isso vai criar a tabela messages agora que o módulo foi importado
    }),
    UsersModule,
    AuthModule,
    MessagesModule, // 2. Adicione aqui para o NestJS ativar o chat
    NotificationsModule,
    CirclesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}