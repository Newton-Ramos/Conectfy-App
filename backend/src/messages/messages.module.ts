import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { ChatGateway } from './chat.gateway';
import { Message } from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { User } from '../users/user.entity';
import { UserContact } from '../users/user-contact.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageReaction, User, UserContact]),
    UsersModule,
    AuthModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, ChatGateway],
  exports: [MessagesService],
})
export class MessagesModule {}
