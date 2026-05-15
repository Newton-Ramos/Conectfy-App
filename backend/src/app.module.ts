import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MessagesModule } from './messages/messages.module'; // 1. Importação necessária
import { NotificationsModule } from './notifications/notifications.module';
import { CirclesModule } from './circles/circles.module';
import { readTypeOrmConnectionOptions } from './typeorm-env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const nodeEnv = config.get<string>('NODE_ENV');
        const isProd = nodeEnv === 'production';
        const syncExplicit = config.get<string>('TYPEORM_SYNC');
        const synchronize = isProd
          ? false
          : syncExplicit === 'true' || syncExplicit !== 'false';

        const connection = readTypeOrmConnectionOptions(
          (key) => config.get<string>(key) ?? process.env[key],
        );

        return {
          ...connection,
          autoLoadEntities: true,
          synchronize,
          migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
          migrationsRun: false,
        };
      },
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
