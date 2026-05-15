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
import { UserCalendarEvent } from '../calendar/user-calendar-event.entity';
import { isDemoOwnerEmail, isRaquelEmail } from './demo-users';
import { notificationFromCalendarEvent } from './calendar-notification.sync';

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
    @InjectRepository(UserCalendarEvent)
    private readonly calendarRepo: Repository<UserCalendarEvent>,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.manager.query(`
        ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "calendarEventId" integer
      `);
    } catch {
      /* Postgres indisponível ou tabela ainda não criada */
    }

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

  /** Painel: notificações do banco + eventos do calendário sem entrada no painel. */
  private async findForPersonalUser(userId: number): Promise<NotificationFeedItem[]> {
    try {
      await this.syncCalendarEventsToPanel(userId);
    } catch {
      /* coluna/tabela de calendário ausente ou sync falhou — painel segue com notificações existentes */
    }
    const dbNotifs = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return dbNotifs.map((n) => this.toFeedItem(n));
  }

  /** Cria notificação para eventos da agenda que ainda não estão no painel (ex.: criados antes do vínculo). */
  private async syncCalendarEventsToPanel(userId: number): Promise<void> {
    const events = await this.calendarRepo.find({
      where: { userId },
      order: { dateAt: 'ASC' },
    });
    if (events.length === 0) return;

    const linked = await this.repo.find({
      where: { userId },
      select: ['calendarEventId'],
    });
    const linkedIds = new Set(
      linked.map((n) => n.calendarEventId).filter((id): id is number => id != null),
    );

    const orphans = events.filter((e) => !linkedIds.has(e.id));
    if (orphans.length === 0) return;

    await this.repo.save(
      orphans.map((e) => notificationFromCalendarEvent(userId, e)),
    );
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
