import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request as NestRequestDecorator,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageHistoryQueryDto } from './dto/message-history-query.dto';
import { AddReactionDto } from './dto/reaction.dto';
import type { AuthenticatedRequest, UploadFile } from './types/messages.types';
import {
  inferMediaTypeFromMime,
  uploadSubdir,
} from './messages-upload.helpers';
import {
  mediaUploadMulterOptions,
  voiceUploadMulterOptions,
} from './messages.multer-options';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(
    @Body() data: CreateMessageDto,
    @NestRequestDecorator() req: AuthenticatedRequest,
  ) {
    return this.messagesService.create({
      senderId: req.user.userId,
      receiverId: data.receiverId,
      content: data.content,
      parentMessageId: data.parentMessageId ?? null,
      mediaType: data.mediaType,
      mediaUrl: data.mediaUrl ?? null,
      mediaDurationSec: data.mediaDurationSec ?? null,
    });
  }

  @Get('conversations')
  findAllConversations(@NestRequestDecorator() req: AuthenticatedRequest) {
    return this.messagesService.getActiveConversations(req.user.userId);
  }

  /** Upload de áudio (multipart field `file`). */
  @Post('upload-voice')
  @UseInterceptors(FileInterceptor('file', voiceUploadMulterOptions))
  uploadVoice(@UploadedFile() file: UploadFile) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    return {
      mediaUrl: `/uploads/voice/${file.filename}`,
      filename: file.filename,
    };
  }

  /** Upload genérico: imagem, vídeo, PDF, Office, outros (multipart `file`). */
  @Post('upload-media')
  @UseInterceptors(FileInterceptor('file', mediaUploadMulterOptions))
  uploadMedia(@UploadedFile() file: UploadFile) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    const sub = uploadSubdir(file.mimetype);
    const mt = inferMediaTypeFromMime(file.mimetype);
    return {
      mediaUrl: `/uploads/${sub}/${file.filename}`,
      filename: file.originalname || file.filename,
      mediaType: mt,
      size: file.size,
    };
  }

  /**
   * GET /messages/history/:contactId
   * Sem query → lista completa (retrocompat).
   * Com ?limit=&beforeId= → paginação.
   */
  @Get('history/:contactId')
  getHistory(
    @Param('contactId', ParseIntPipe) contactId: number,
    @NestRequestDecorator() req: AuthenticatedRequest,
    @Query() q: MessageHistoryQueryDto,
  ) {
    const userId = req.user.userId;
    if (q.beforeId != null || q.limit != null) {
      return this.messagesService.findConversationPage(userId, contactId, {
        limit: q.limit,
        beforeId: q.beforeId,
      });
    }
    return this.messagesService.findConversation(userId, contactId);
  }

  @Patch('read/:contactId')
  markAsRead(
    @Param('contactId', ParseIntPipe) contactId: number,
    @NestRequestDecorator() req: AuthenticatedRequest,
  ) {
    return this.messagesService.markAsRead(req.user.userId, contactId);
  }

  @Patch('unread/:contactId')
  markAsUnread(
    @Param('contactId', ParseIntPipe) contactId: number,
    @NestRequestDecorator() req: AuthenticatedRequest,
  ) {
    return this.messagesService.markAsUnread(req.user.userId, contactId);
  }

  @Delete('conversation/:peerId')
  deleteConversation(
    @Param('peerId', ParseIntPipe) peerId: number,
    @NestRequestDecorator() req: AuthenticatedRequest,
  ) {
    return this.messagesService.deleteConversation(req.user.userId, peerId);
  }

  @Post(':id/reactions')
  addReaction(
    @Param('id', ParseIntPipe) messageId: number,
    @Body() dto: AddReactionDto,
    @NestRequestDecorator() req: AuthenticatedRequest,
  ) {
    return this.messagesService.addReaction(
      messageId,
      req.user.userId,
      dto.emoji,
    );
  }

  @Delete(':id/reactions')
  removeReaction(
    @Param('id', ParseIntPipe) messageId: number,
    @NestRequestDecorator() req: AuthenticatedRequest,
  ) {
    return this.messagesService.removeReaction(messageId, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { content: string },
    @NestRequestDecorator() req: AuthenticatedRequest,
  ) {
    return this.messagesService.update(id, req.user.userId, data.content);
  }

  /** Soft delete — “Apagar para todos” local ao remetente neste MVP */
  @Delete(':id')
  softDelete(
    @Param('id', ParseIntPipe) id: number,
    @NestRequestDecorator() req: AuthenticatedRequest,
  ) {
    return this.messagesService.softDelete(id, req.user.userId);
  }
}
