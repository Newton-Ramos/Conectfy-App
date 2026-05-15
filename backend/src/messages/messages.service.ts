import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, IsNull } from 'typeorm';
import {
  Message,
  MessageMediaType,
  MessageStatus,
} from './entities/message.entity';
import { MessageReaction } from './entities/message-reaction.entity';
import { User } from '../users/user.entity';
import { UserContact } from '../users/user-contact.entity';

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export type MessageWithReactions = Message & {
  reactions?: { userId: number; emoji: string }[];
};

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(MessageReaction)
    private readonly reactionRepository: Repository<MessageReaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserContact)
    private readonly contactRepository: Repository<UserContact>,
  ) {}

  async create(data: {
    senderId: number;
    receiverId: number;
    content: string;
    parentMessageId?: number | null;
    mediaType?: MessageMediaType;
    mediaUrl?: string | null;
    mediaDurationSec?: number | null;
  }) {
    const bloqueio = await this.contactRepository.findOne({
      where: {
        user_id: data.receiverId,
        contact_id: data.senderId,
        is_blocked: true,
      },
    });

    if (bloqueio) {
      throw new ForbiddenException(
        'Mensagem não enviada: você foi bloqueado por este usuário.',
      );
    }

    const mt =
      data.mediaType != null &&
      Object.values(MessageMediaType).includes(data.mediaType)
        ? data.mediaType
        : MessageMediaType.TEXT;

    const msg = this.messageRepository.create({
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content,
      status: MessageStatus.SENT,
      parent:
        data.parentMessageId != null ? { id: data.parentMessageId } : null,
      mediaType: mt,
      mediaUrl: data.mediaUrl ?? null,
      mediaDurationSec: data.mediaDurationSec ?? null,
      read_at: null,
      deliveredAt: null,
      editedAt: null,
      deletedAt: null,
    });

    return this.messageRepository.save(msg);
  }

  async markAsRead(receiverId: number, senderId: number) {
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.READ, read_at: new Date() })
      .where('receiverId = :rid', { rid: receiverId })
      .andWhere('senderId = :sid', { sid: senderId })
      .andWhere('status != :r', { r: MessageStatus.READ })
      .andWhere('deletedAt IS NULL')
      .execute();
    return { success: true };
  }

  /** Cliente (destinatário) confirma recebimento no aparelho → 2 checks cinza */
  async markDeliveredForReceiver(messageIds: number[], receiverUserId: number) {
    if (!messageIds.length) return { updated: 0 };
    const res = await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.DELIVERED, deliveredAt: new Date() })
      .where('id IN (:...ids)', { ids: messageIds })
      .andWhere('receiverId = :uid', { uid: receiverUserId })
      .andWhere('status = :s', { s: MessageStatus.SENT })
      .andWhere('deletedAt IS NULL')
      .execute();
    return { updated: res.affected ?? 0 };
  }

  async getActiveConversations(userId: number) {
    const interactions = await this.messageRepository
      .createQueryBuilder('message')
      .select(
        'DISTINCT CASE WHEN "senderId" = :id THEN "receiverId" ELSE "senderId" END',
        'contactId',
      )
      .where('"senderId" = :id OR "receiverId" = :id', { id: userId })
      .getRawMany();

    const contactIds = interactions
      .map((i) => Number(i.contactId))
      .filter(Number.isFinite);
    if (contactIds.length === 0) return [];

    const contacts = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id AS id',
        'user.nome AS nome',
        'contact.telefone AS telefone',
        'contact.nota AS nota',
        'contact.is_blocked AS is_blocked',
      ])
      .leftJoin(
        UserContact,
        'contact',
        'contact.contact_id = user.id AND contact.user_id = :userId',
        { userId },
      )
      .where('user.id IN (:...contactIds)', { contactIds })
      .getRawMany();

    const conversations = await Promise.all(
      contacts.map(async (c) => {
        const lastMsg = await this.messageRepository
          .createQueryBuilder('m')
          .where(
            '(m.senderId = :uid AND m.receiverId = :cid) OR (m.senderId = :cid AND m.receiverId = :uid)',
            { uid: userId, cid: c.id },
          )
          .andWhere('m.deletedAt IS NULL')
          .orderBy('m.createdAt', 'DESC')
          .getOne();

        const unreadCount = await this.messageRepository.count({
          where: {
            senderId: c.id,
            receiverId: userId,
            status: Not(MessageStatus.READ),
            deletedAt: IsNull(),
          },
        });

        return {
          ...c,
          id: Number(c.id),
          lastMessage: lastMsg?.content || '',
          lastMessageTime: lastMsg?.createdAt || null,
          unreadCount,
        };
      }),
    );

    return conversations.sort(
      (a, b) =>
        (b.lastMessageTime instanceof Date ? b.lastMessageTime.getTime() : 0) -
        (a.lastMessageTime instanceof Date ? a.lastMessageTime.getTime() : 0),
    );
  }

  /** Histórico completo (retrocompatível) — sem paginação */
  async findConversation(id1: number, id2: number) {
    const rows = await this.messageRepository.find({
      where: [
        { senderId: id1, receiverId: id2, deletedAt: IsNull() },
        { senderId: id2, receiverId: id1, deletedAt: IsNull() },
      ],
      order: { createdAt: 'ASC' },
    });
    return this.attachReactions(rows);
  }

  async findConversationPage(
    userId: number,
    peerId: number,
    opts: { limit?: number; beforeId?: number },
  ) {
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
    const qb = this.messageRepository
      .createQueryBuilder('m')
      .where(
        '(m.senderId = :uid AND m.receiverId = :pid) OR (m.senderId = :pid AND m.receiverId = :uid)',
        { uid: userId, pid: peerId },
      )
      .andWhere('m.deletedAt IS NULL')
      .orderBy('m.createdAt', 'DESC')
      .take(limit);

    if (opts.beforeId) {
      qb.andWhere('m.id < :beforeId', { beforeId: opts.beforeId });
    }

    const page = await qb.getMany();
    const chronological = [...page].reverse();
    const enriched = await this.attachReactions(chronological);
    const oldestId = chronological.length
      ? Math.min(...chronological.map((m) => m.id))
      : null;
    return {
      messages: enriched,
      nextBeforeId: oldestId,
      hasMore: page.length === limit,
    };
  }

  private async attachReactions(
    msgs: Message[],
  ): Promise<MessageWithReactions[]> {
    if (!msgs.length) return [];
    const ids = msgs.map((m) => m.id);
    const reactions = await this.reactionRepository.find({
      where: { messageId: In(ids) },
    });
    const map = new Map<number, { userId: number; emoji: string }[]>();
    for (const r of reactions) {
      if (!map.has(r.messageId)) map.set(r.messageId, []);
      map.get(r.messageId)!.push({ userId: r.userId, emoji: r.emoji });
    }
    return msgs.map((m) =>
      Object.assign(m, { reactions: map.get(m.id) ?? [] }),
    );
  }

  async update(id: number, senderId: number, newContent: string) {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');
    if (message.senderId !== senderId)
      throw new ForbiddenException('Ação não permitida');
    if (message.deletedAt) throw new BadRequestException('Mensagem apagada');
    const age = Date.now() - new Date(message.createdAt).getTime();
    if (age > EDIT_WINDOW_MS) {
      throw new BadRequestException(
        'Só é possível editar até 15 minutos após o envio',
      );
    }

    message.content = newContent;
    message.editedAt = new Date();
    return this.messageRepository.save(message);
  }

  async softDelete(id: number, requesterId: number) {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');
    if (message.senderId !== requesterId)
      throw new ForbiddenException('Ação não permitida');
    message.deletedAt = new Date();
    await this.messageRepository.save(message);
    return { success: true };
  }

  /** Hard delete — uso interno / admin */
  async remove(id: number, senderId: number) {
    const message = await this.messageRepository.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');
    if (message.senderId !== senderId)
      throw new ForbiddenException('Ação não permitida');

    return this.messageRepository.remove(message);
  }

  async deleteConversation(userId: number, peerId: number) {
    if (userId === peerId) {
      throw new BadRequestException('Operação inválida');
    }
    await this.messageRepository
      .createQueryBuilder()
      .delete()
      .from(Message)
      .where(
        '("senderId" = :uid AND "receiverId" = :pid) OR ("senderId" = :pid AND "receiverId" = :uid)',
        { uid: userId, pid: peerId },
      )
      .execute();
    return { success: true };
  }

  async addReaction(messageId: number, userId: number, emoji: string) {
    const msg = await this.messageRepository.findOne({
      where: { id: messageId },
    });
    if (!msg || msg.deletedAt)
      throw new NotFoundException('Mensagem não encontrada');

    let row = await this.reactionRepository.findOne({
      where: { messageId, userId },
    });
    if (row) {
      row.emoji = emoji;
      await this.reactionRepository.save(row);
    } else {
      row = this.reactionRepository.create({ messageId, userId, emoji });
      await this.reactionRepository.save(row);
    }
    return row;
  }

  async removeReaction(messageId: number, userId: number) {
    await this.reactionRepository.delete({ messageId, userId });
    return { success: true };
  }
}
