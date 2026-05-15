import { Notification } from './notification.entity';
import { UserCalendarEvent } from '../calendar/user-calendar-event.entity';

export function grupoFromEventDate(d: Date): 'hoje' | 'ontem' | 'anteriores' {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startToday) return 'hoje';
  if (d >= startYesterday) return 'ontem';
  return 'anteriores';
}

export function notificationFromCalendarEvent(
  userId: number,
  event: UserCalendarEvent,
): Partial<Notification> {
  return {
    userId,
    calendarEventId: event.id,
    title: `Evento agendado: ${event.title}`,
    body: event.notes?.trim() || 'Evento criado no seu calendário.',
    grupo: grupoFromEventDate(event.dateAt),
    kind: 'evento',
    eventAt: event.dateAt,
    rsvpStatus: null,
    createdAt: new Date(),
  };
}
