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
        const databaseUrl = config.get<string>('DATABASE_URL');
        const nodeEnv = config.get<string>('NODE_ENV');
        const isProd = nodeEnv === 'production';
        const syncExplicit = config.get<string>('TYPEORM_SYNC');
        const synchronize =
          syncExplicit === 'true' || (!isProd && syncExplicit !== 'false');

        const prodLogging: ('error')[] = ['error'];

        if (databaseUrl?.trim()) {
          const isLocalUrl =
            /localhost|127\.0\.0\.1/.test(databaseUrl) || databaseUrl.includes('sslmode=disable');
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: isLocalUrl ? false : { rejectUnauthorized: false },
            autoLoadEntities: true,
            synchronize,
            logging: isProd ? prodLogging : false,
          };
        }

        const host = config.get<string>('DB_HOST', 'localhost').trim();
        const isLocalHost = host === 'localhost' || host === '127.0.0.1';

        return {
          type: 'postgres',
          host,
          port: parseInt(String(config.get('DB_PORT') ?? '5432'), 10),
          username: config.get<string>('DB_USERNAME', 'postgres'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME', 'conectfy'),
          autoLoadEntities: true,
          synchronize,
          logging: isProd ? prodLogging : false,
          ssl: isLocalHost ? false : { rejectUnauthorized: false },
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