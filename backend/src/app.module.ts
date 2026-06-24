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
import { CalendarModule } from './calendar/calendar.module';
import { isLocalDatabase, readTypeOrmConnectionOptions } from './typeorm-env';

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
        const get = (key: string) => config.get<string>(key) ?? process.env[key];
        const nodeEnv = get('NODE_ENV');
        const isProd = nodeEnv === 'production';
        const syncExplicit = get('TYPEORM_SYNC');
        const local = isLocalDatabase(get);
        /**
         * synchronize só roda em DEV e contra banco LOCAL. Apontar o dev para um
         * banco remoto (ex.: Render) nunca sincroniza — evita o erro
         * "type ... already exists" e protege os dados de produção. Em remoto,
         * use migrations (npm run migration:run).
         */
        const synchronize = !isProd && local && syncExplicit !== 'false';

        const connection = readTypeOrmConnectionOptions(get);

        return {
          ...connection,
          autoLoadEntities: true,
          synchronize,
          migrations: [join(__dirname, 'migrations', '[0-9]*.{js,ts}')],
          /** Em produção o sync está sempre off — migrations aplicam o schema (ex.: calendarEventId). */
          migrationsRun: isProd,
        };
      },
    }),
    UsersModule,
    AuthModule,
    MessagesModule, // 2. Adicione aqui para o NestJS ativar o chat
    NotificationsModule,
    CirclesModule,
    CalendarModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
