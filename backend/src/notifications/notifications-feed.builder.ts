import type { NotificationFeedItem } from './notifications.service';

const ID_BIRTHDAY = 1_000_000;
const ID_MESSAGE = 2_000_000;
const ID_CIRCLE = 3_000_000;
const ID_EVENT = 5_000_000;

export type ContactForFeed = {
  id: number;
  nome: string;
  tags: string[];
};

export type MessageForFeed = {
  id: number;
  nome: string;
  content: string;
  createdAt: Date;
  read_at: Date | null;
};

function grupoFromDate(d: Date): 'hoje' | 'ontem' | 'anteriores' {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startToday) return 'hoje';
  if (d >= startYesterday) return 'ontem';
  return 'anteriores';
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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

/**
 * Monta o painel só com os contatos reais do usuário (cada conta = histórico diferente).
 * Raquel / conta sem contatos → array vazio.
 */
export function buildIdealNotificationFeed(
  userId: number,
  contacts: ContactForFeed[],
  messages: MessageForFeed[],
): NotificationFeedItem[] {
  if (contacts.length === 0) {
    return [];
  }

  const feed: NotificationFeedItem[] = [];
  const flavor = userId % 5;
  const sorted = [...contacts].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[(i + flavor) % sorted.length];
    const tag = primaryTag(c.tags);
    const nome = c.nome;
    const fn = firstName(nome);

    if (i === 0 && flavor !== 4) {
      feed.push({
        id: -(ID_CIRCLE + c.id + userId * 13),
        userId,
        title: `${nome} adicionado ao grupo de ${tag}`,
        body: null,
        grupo: 'ontem',
        kind: 'sistema',
        eventAt: null,
        rsvpStatus: null,
        createdAt: hoursAgoDate(26 + flavor),
      });
    }

    if (i === 1 && sorted.length >= 2) {
      const eventTitles = [
        `${fn} te convidou para o café das 16h`,
        `${fn} marcou reunião para hoje às 15h`,
        `Happy Hour com ${fn} hoje às 18h`,
        `${fn} criou um evento no seu círculo ${tag}`,
        `Encontro ${tag} — ${fn} confirmou presença`,
      ];
      feed.push({
        id: -(ID_EVENT + c.id + userId),
        userId,
        title: eventTitles[flavor],
        body: 'Toque para ver detalhes e confirmar presença.',
        grupo: 'hoje',
        kind: 'evento',
        eventAt: hoursAgoDate(-1),
        rsvpStatus: null,
        createdAt: hoursAgoDate(3 + flavor),
      });
    }

    if (i === 2 && flavor <= 2) {
      feed.push({
        id: -(ID_BIRTHDAY + c.id),
        userId,
        title: `${nome} faz aniversário hoje`,
        body: 'Não esqueça de enviar os parabéns.',
        grupo: 'hoje',
        kind: 'aniversario',
        eventAt: null,
        rsvpStatus: null,
        createdAt: hoursAgoDate(1),
      });
    }
  }

  const insightTag = sorted[flavor % sorted.length];
  const insightCount = contacts.filter((x) =>
    x.tags.some((t) => t === primaryTag(insightTag.tags)),
  ).length;
  feed.push({
    id: -(ID_CIRCLE + userId * 100 + insightTag.id),
    userId,
    title: `Círculo ${primaryTag(insightTag.tags)} — ${insightCount} ${insightCount === 1 ? 'pessoa' : 'pessoas'}`,
    body: `Seu painel reflete a rede de ${firstName(insightTag.nome)} e demais contatos.`,
    grupo: flavor % 2 === 0 ? 'hoje' : 'ontem',
    kind: 'sistema',
    eventAt: null,
    rsvpStatus: null,
    createdAt: hoursAgoDate(flavor % 2 === 0 ? 5 : 20),
  });

  for (const m of messages.slice(0, 3)) {
    const createdAt = new Date(m.createdAt);
    const grupo = grupoFromDate(createdAt);
    if (grupo === 'anteriores' && messages.length > 2) continue;
    feed.push({
      id: -(ID_MESSAGE + m.id),
      userId,
      title: m.read_at ? `Mensagem de ${m.nome}` : `Nova mensagem de ${firstName(m.nome)}`,
      body: truncate(m.content || 'Abra o chat para ler.', 90),
      grupo,
      kind: 'mensagem',
      eventAt: null,
      rsvpStatus: null,
      createdAt,
    });
  }

  if (messages.length === 0 && sorted.length > 0) {
    const c = sorted[flavor % sorted.length];
    feed.push({
      id: -(ID_MESSAGE + c.id + userId * 7),
      userId,
      title: `Nova mensagem de ${firstName(c.nome)}`,
      body: `Oi! Viu o grupo de ${primaryTag(c.tags)}?`,
      grupo: 'hoje',
      kind: 'mensagem',
      eventAt: null,
      rsvpStatus: null,
      createdAt: hoursAgoDate(2 + flavor),
    });
  }

  const order = { hoje: 0, ontem: 1, anteriores: 2 };
  const seen = new Set<string>();
  return feed
    .filter((n) => {
      const k = n.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => {
      const g = order[a.grupo as keyof typeof order] - order[b.grupo as keyof typeof order];
      if (g !== 0) return g;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}
