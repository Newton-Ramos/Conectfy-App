/**
 * Gera painel + agenda mock únicos por conta (determinístico a partir do e-mail).
 */

import type {
  MockCalendarEventSeed,
  MockContactPoolEntry,
  MockNotificationSeed,
  MockScenarioOwner,
} from './mock-scenarios.data';

function seedFromEmail(email: string): number {
  let h = 0;
  for (let i = 0; i < email.length; i++) {
    h = (Math.imul(31, h) + email.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

function pick<T>(arr: T[], seed: number, index: number): T {
  return arr[(seed + index * 7) % arr.length];
}

function firstName(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

function primaryTag(tags: string[]): string {
  return tags[0]?.trim() || 'Amigos';
}

function hoursAgoDate(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000);
}

function dateFromOffset(daysFromNow: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const EVENT_TEMPLATES = [
  (fn: string, tag: string) => `${fn} — café no círculo ${tag}`,
  (fn: string) => `Reunião com ${fn}`,
  (fn: string) => `Happy Hour · ${fn}`,
  (fn: string, tag: string) => `Workshop ${tag} com ${fn}`,
  (fn: string) => `Almoço de equipe · ${fn}`,
];

const EVENT_NOTES = [
  'Confirme presença pelo app.',
  'Local: CEUB Asa Norte.',
  'Traga documento ou material combinado.',
  'Evento no calendário Conectfy.',
  'Lembrete automático da sua rede.',
];

export function generateMockPack(
  scenario: MockScenarioOwner,
  pool: Map<string, MockContactPoolEntry>,
): {
  notifications: MockNotificationSeed[];
  calendarEvents: MockCalendarEventSeed[];
} {
  const seed = seedFromEmail(scenario.email);
  const contacts = scenario.contactKeys
    .map((k) => pool.get(k))
    .filter((c): c is MockContactPoolEntry => Boolean(c));

  const notifications: MockNotificationSeed[] = [];
  const calendarEvents: MockCalendarEventSeed[] = [];

  contacts.forEach((c, i) => {
    const tag = primaryTag(scenario.contactTags[c.key] ?? ['Amigos']);
    const fn = firstName(c.nome);

    notifications.push({
      title: `${c.nome} adicionado ao grupo de ${tag}`,
      body: null,
      grupo: i % 2 === 0 ? 'ontem' : 'hoje',
      kind: 'sistema',
      hoursAgo: 20 + i * 4 + (seed % 5),
    });

    if (i === 0 || i === 2) {
      notifications.push({
        title: pick(EVENT_TEMPLATES, seed, i)(fn, tag),
        body: pick(EVENT_NOTES, seed, i + 1),
        grupo: 'hoje',
        kind: 'evento',
        hoursAgo: 3 + i + (seed % 3),
      });
    }

    if (i === 1 && seed % 3 !== 2) {
      notifications.push({
        title: `${c.nome} faz aniversário hoje`,
        body: 'Lembrete para parabenizar seu contato.',
        grupo: 'hoje',
        kind: 'aniversario',
        hoursAgo: 2,
      });
    }

    const dayOffsets = [1, 3, 7, 12, 18, 25];
    const hours = [9, 11, 14, 16, 18, 19];
    calendarEvents.push({
      title: pick(EVENT_TEMPLATES, seed + i, i)(fn, tag),
      notes: `${pick(EVENT_NOTES, seed, i)} · ${tag}`,
      daysFromNow: pick(dayOffsets, seed, i),
      hour: pick(hours, seed, i + 2),
      minute: (seed + i * 11) % 60,
    });
  });

  calendarEvents.push({
    title: `Planejamento · círculo ${scenario.circulos[0] ?? 'Conectfy'}`,
    notes: 'Agenda pessoal gerada para demonstração.',
    daysFromNow: pick([2, 5, 9], seed, 9),
    hour: 10,
    minute: 30,
  });

  calendarEvents.push({
    title: 'Data importante — networking CEUB',
    notes: 'Evento institucional no calendário.',
    daysFromNow: pick([14, 21, 28], seed, 11),
    hour: 15,
    minute: 0,
  });

  const seen = new Set<string>();
  const uniqueNotifications = notifications.filter((n) => {
    const k = n.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return { notifications: uniqueNotifications, calendarEvents };
}

export function calendarSeedToDate(e: MockCalendarEventSeed): Date {
  return dateFromOffset(e.daysFromNow, e.hour, e.minute ?? 0);
}

export function notificationSeedToRow(
  n: MockNotificationSeed,
): { createdAt: Date; eventAt: Date | null } {
  const createdAt = hoursAgoDate(n.hoursAgo ?? 0);
  const eventAt =
    n.kind === 'evento' ? new Date(createdAt.getTime() + 2 * 3_600_000) : null;
  return { createdAt, eventAt };
}
