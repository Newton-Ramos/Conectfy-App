import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { UserContact } from '../users/user-contact.entity';
import { User } from '../users/user.entity';
import { isDemoOwnerEmail, isRaquelEmail } from './demo-users';
import {
  buildIdealNotificationFeed,
  type ContactForFeed,
  type MessageForFeed,
} from './notifications-feed.builder';

export type NotificationFeedItem = {
  id: number;
  userId: number | null;
  title: string;
  body: string | null;
  grupo: string;
  kind: string;
  eventAt: Date | null;
  rsvpStatus: 'sim' | 'nao' | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(UserContact)
    private readonly contactRepo: Repository<UserContact>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    const n = await this.repo.count();
    if (n > 0) return;
    const soon = new Date();
    soon.setMinutes(soon.getMinutes() + 90);
    await this.repo.save([
      {
        userId: null,
        title: 'Agatha faz aniversário hoje',
        body: 'Não esqueça de parabenizar. Confirme se vai comparecer ao jantar às 20h.',
        grupo: 'hoje',
        kind: 'evento',
        eventAt: soon,
      },
      {
        userId: null,
        title: 'João e... te convidaram para o Happy Hour hoje às 17h',
        body: 'Bar Central — confirme sua presença para reservarmos lugar.',
        grupo: 'hoje',
        kind: 'evento',
        eventAt: new Date(),
      },
      {
        userId: null,
        title: 'Carina adicionada ao grupo de Amigos',
        body: null,
        grupo: 'ontem',
        kind: 'sistema',
      },
    ]);
  }

  async findForUser(userId: number): Promise<NotificationFeedItem[]> {
    const viewer = await this.userRepo.findOne({ where: { id: userId } });
    if (isDemoOwnerEmail(viewer?.email)) {
      return this.findForDemoOwner(userId);
    }
    if (isRaquelEmail(viewer?.email)) {
      return [];
    }
    return this.findForPersonalUser(userId);
  }

  /** Painel demo do admin — não alterar (notificações globais + DB). */
  private async findForDemoOwner(userId: number): Promise<NotificationFeedItem[]> {
    const dbNotifs = await this.repo.find({
      where: [{ userId }, { userId: IsNull() }],
      order: { createdAt: 'DESC' },
    });

    let birthdayRows: { id: number; nome: string }[] = [];
    try {
      birthdayRows = await this.contactRepo.query(
        `
        SELECT u.id AS id, u.nome AS nome
        FROM user_contacts uc
        INNER JOIN users u ON u.id = uc.contact_id
        WHERE uc.user_id = $1
          AND uc.contact_id <> uc.user_id
          AND u."dataNascimento" IS NOT NULL
          AND EXTRACT(MONTH FROM u."dataNascimento")::int = EXTRACT(MONTH FROM CURRENT_DATE)::int
          AND EXTRACT(DAY FROM u."dataNascimento")::int = EXTRACT(DAY FROM CURRENT_DATE)::int
        `,
        [userId],
      );
    } catch {
      birthdayRows = [];
    }

    const birthdayNotifs: NotificationFeedItem[] = birthdayRows.map((r) => ({
      id: -(1_000_000 + r.id),
      userId,
      title: `${r.nome} faz aniversário hoje`,
      body: 'Parabenize seu contato no Conectfy.',
      grupo: 'hoje',
      kind: 'aniversario',
      eventAt: null,
      rsvpStatus: null,
      createdAt: new Date(),
    }));

    return [...birthdayNotifs, ...dbNotifs.map((n) => this.toFeedItem(n))];
  }

  /**
   * Demais usuários: painel montado a partir dos contatos (seed) + mensagens reais.
   * Sem contatos → painel vazio (ex.: Raquel).
   */
  private async findForPersonalUser(userId: number): Promise<NotificationFeedItem[]> {
    const contacts = await this.loadContactsForFeed(userId);
    if (contacts.length === 0) {
      return [];
    }
    const messages = await this.loadMessagesForFeed(userId);
    return buildIdealNotificationFeed(userId, contacts, messages);
  }

  private async loadContactsForFeed(userId: number): Promise<ContactForFeed[]> {
    try {
      const rows: { id: number; nome: string; tags: unknown }[] =
        await this.contactRepo.query(
          `
        SELECT u.id AS id, u.nome AS nome, uc.tags AS tags
        FROM user_contacts uc
        INNER JOIN users u ON u.id = uc.contact_id
        WHERE uc.user_id = $1
          AND uc.contact_id <> uc.user_id
        ORDER BY u.nome ASC
        `,
          [userId],
        );
      return rows.map((r) => ({
        id: r.id,
        nome: r.nome,
        tags: Array.isArray(r.tags)
          ? r.tags.filter((t): t is string => typeof t === 'string')
          : [],
      }));
    } catch {
      return [];
    }
  }

  private async loadMessagesForFeed(userId: number): Promise<MessageForFeed[]> {
    try {
      const rows: MessageForFeed[] = await this.contactRepo.query(
        `
        SELECT m.id AS id, u.nome AS nome, m.content AS content,
               m."createdAt" AS "createdAt", m.read_at AS read_at
        FROM messages m
        INNER JOIN users u ON u.id = m."senderId"
        WHERE m."receiverId" = $1
          AND m."deletedAt" IS NULL
          AND m."createdAt" >= NOW() - INTERVAL '14 days'
        ORDER BY m."createdAt" DESC
        LIMIT 10
        `,
        [userId],
      );
      return rows;
    } catch {
      return [];
    }
  }

  private toFeedItem(n: Notification): NotificationFeedItem {
    return {
      id: n.id,
      userId: n.userId,
      title: n.title,
      body: n.body ?? null,
      grupo: n.grupo,
      kind: n.kind,
      eventAt: n.eventAt ?? null,
      rsvpStatus: n.rsvpStatus ?? null,
      createdAt: n.createdAt,
    };
  }

  async setRsvp(viewerId: number, id: number, status: 'sim' | 'nao') {
    if (id < 0) {
      throw new BadRequestException(
        'Esta notificação não aceita confirmação de presença',
      );
    }
    const n = await this.repo.findOne({ where: { id } });
    if (!n) throw new NotFoundException('Notificação não encontrada');
    if (n.userId != null && n.userId !== viewerId) {
      throw new ForbiddenException();
    }
    n.rsvpStatus = status;
    await this.repo.save(n);
    return n;
  }
}
