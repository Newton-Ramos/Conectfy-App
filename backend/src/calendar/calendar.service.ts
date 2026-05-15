import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCalendarEvent } from './user-calendar-event.entity';
import { Notification } from '../notifications/notification.entity';
import { isDemoOwnerEmail, isRaquelEmail } from '../notifications/demo-users';
import { notificationFromCalendarEvent } from '../notifications/calendar-notification.sync';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(UserCalendarEvent)
    private readonly repo: Repository<UserCalendarEvent>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async listForUser(userId: number, email: string | null | undefined) {
    if (isRaquelEmail(email)) {
      return [];
    }
    const rows = await this.repo.find({
      where: { userId },
      order: { dateAt: 'ASC' },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      notes: r.notes ?? '',
      dateIso: r.dateAt.toISOString(),
    }));
  }

  async create(
    userId: number,
    email: string | null | undefined,
    body: { title: string; notes?: string; dateIso: string },
  ) {
    if (isRaquelEmail(email)) {
      throw new ForbiddenException('Conta sem permissão para criar eventos.');
    }
    const dateAt = new Date(body.dateIso);
    if (Number.isNaN(dateAt.getTime())) {
      throw new ForbiddenException('Data inválida');
    }
    const row = await this.repo.save({
      userId,
      title: body.title.trim(),
      notes: body.notes?.trim() || null,
      dateAt,
    });

    try {
      await this.notificationRepo.save(
        notificationFromCalendarEvent(userId, row),
      );
    } catch {
      /* painel opcional se notifications ainda não tiver calendarEventId */
    }

    return {
      id: row.id,
      title: row.title,
      notes: row.notes ?? '',
      dateIso: row.dateAt.toISOString(),
    };
  }

  async remove(userId: number, id: number) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Evento não encontrado');
    if (row.userId !== userId) throw new ForbiddenException();
    await this.notificationRepo.delete({ userId, calendarEventId: id });
    await this.repo.remove(row);
    return { ok: true };
  }

  /** Usado pelo seed — não altera admin. */
  async replaceMockEventsForUser(
    userId: number,
    email: string,
    events: { title: string; notes?: string | null; dateAt: Date }[],
  ) {
    if (isDemoOwnerEmail(email) || isRaquelEmail(email)) return;
    await this.notificationRepo.delete({ userId });
    await this.repo.delete({ userId });
    if (events.length === 0) return;
    const rows = await this.repo.save(
      events.map((e) => ({
        userId,
        title: e.title,
        notes: e.notes ?? null,
        dateAt: e.dateAt,
      })),
    );
    await this.notificationRepo.save(
      rows.map((row) => notificationFromCalendarEvent(userId, row)),
    );
  }
}
