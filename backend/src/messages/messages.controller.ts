import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageHistoryQueryDto } from './dto/message-history-query.dto';
import { AddReactionDto } from './dto/reaction.dto';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() data: CreateMessageDto, @Request() req) {
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
  findAllConversations(@Request() req) {
    return this.messagesService.getActiveConversations(req.user.userId);
  }

  /** Upload de áudio para mensagem de voz (multipart field "file") */
  @Post('upload-voice')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'voice'),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname) || '.m4a';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('audio/')) {
          cb(new Error('Envie apenas arquivo de áudio'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadVoice(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo ausente');
    return {
      mediaUrl: `/uploads/voice/${file.filename}`,
      filename: file.filename,
    };
  }

  /**
   * GET /messages/history/:contactId
   * Sem query → lista completa (retrocompat).
   * Com ?limit=&beforeId= → paginação (scroll infinito).
   */
  @Get('history/:contactId')
  getHistory(
    @Param('contactId', ParseIntPipe) contactId: number,
    @Request() req,
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
  markAsRead(@Param('contactId', ParseIntPipe) contactId: number, @Request() req) {
    return this.messagesService.markAsRead(req.user.userId, contactId);
  }

  @Delete('conversation/:peerId')
  deleteConversation(@Param('peerId', ParseIntPipe) peerId: number, @Request() req) {
    return this.messagesService.deleteConversation(req.user.userId, peerId);
  }

  @Post(':id/reactions')
  addReaction(
    @Param('id', ParseIntPipe) messageId: number,
    @Body() dto: AddReactionDto,
    @Request() req,
  ) {
    return this.messagesService.addReaction(messageId, req.user.userId, dto.emoji);
  }

  @Delete(':id/reactions')
  removeReaction(@Param('id', ParseIntPipe) messageId: number, @Request() req) {
    return this.messagesService.removeReaction(messageId, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { content: string },
    @Request() req,
  ) {
    return this.messagesService.update(id, req.user.userId, data.content);
  }

  /** Soft delete — “Apagar para todos” local ao remetente neste MVP */
  @Delete(':id')
  softDelete(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.messagesService.softDelete(id, req.user.userId);
  }
}
