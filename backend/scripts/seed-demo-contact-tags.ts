/**
 * Seed demo: tags de círculos + mensagens fictícias para a conta dono (padrão admin@admin.com).
 *
 * Organização de círculos (contatos):
 * - Networking (mais populoso): LULA PT, Joao da Silva, Newton Ramos
 * - Trabalho: Carlos Mendes
 * - Amigos: Camila Alcântara
 * - Esportes: Teste Usuario | Estudos: Outro Usuario
 *
 * Mensagens: conversas entre o dono e Newton, LULA, Carlos, Camila (+ opcional Teste/Outro).
 *
 * Uso (pasta backend):
 *   npm run seed:demo-tags
 */

import 'dotenv/config';
import { Client, type QueryResult } from 'pg';

const DEFAULT_SEED_OWNER_EMAIL = 'admin@admin.com';

/** Igual a `MOCK_OWNER_EMAIL` / `MOCK_CONTACTS_WITH_CIRCLE` no mobile. */
const CONTACT_TAG_ROWS: { nome: string; tags: string[] }[] = [
  { nome: 'LULA PT', tags: ['Networking'] },
  { nome: 'Joao da Silva', tags: ['Networking'] },
  { nome: 'Newton Ramos', tags: ['Networking'] },
  { nome: 'Carlos Mendes', tags: ['Trabalho'] },
  { nome: 'Camila Alcântara', tags: ['Amigos'] },
  { nome: 'Teste Usuario', tags: ['Esportes'] },
  { nome: 'Outro Usuario', tags: ['Estudos'] },
];

const DEMO_EXTRA_USERS: { nome: string; email: string }[] = [
  { nome: 'Teste Usuario', email: 'teste.usuario@mock.conectfy.local' },
  { nome: 'Outro Usuario', email: 'outro.usuario@mock.conectfy.local' },
];

type MsgCol = { sender: string; receiver: string; created: string; media: string };

/** Alinha nomes do information_schema (minúsculas) ao camelCase do TypeORM em `messages`. */
function canonicalMessageColumn(raw: string): string {
  const k = raw.toLowerCase().replace(/_/g, '');
  const map: Record<string, string> = {
    senderid: 'senderId',
    receiverid: 'receiverId',
    createdat: 'createdAt',
    mediatype: 'mediaType',
  };
  return map[k] ?? raw;
}

function quoteIdent(c: string): string {
  const canon = canonicalMessageColumn(c);
  const safe = canon.replace(/"/g, '');
  const plainSnake = /^[a-z][a-z0-9_]*$/.test(safe) && safe === safe.toLowerCase();
  if (plainSnake) return safe;
  return `"${safe}"`;
}

function detectMessageColumns(q: QueryResult): MsgCol | null {
  const names = q.fields?.map((f) => f.name) ?? [];
  if (names.length === 0) return null;
  const sender =
    names.find((n) => n === 'senderId' || n.toLowerCase() === 'senderid') ??
    names.find((n) => /sender/i.test(n));
  const receiver =
    names.find((n) => n === 'receiverId' || n.toLowerCase() === 'receiverid') ??
    names.find((n) => /receiver/i.test(n));
  const created =
    names.find((n) => n === 'createdAt' || n.toLowerCase() === 'createdat') ??
    names.find((n) => /created/i.test(n));
  const media =
    names.find((n) => n === 'mediaType' || n.toLowerCase() === 'mediatype') ??
    names.find((n) => /^mediatype$/i.test(n));
  if (!sender || !receiver || !created || !media) return null;
  return {
    sender: quoteIdent(sender),
    receiver: quoteIdent(receiver),
    created: quoteIdent(created),
    media: quoteIdent(media),
  };
}

async function resolveMsgCols(client: Client): Promise<MsgCol | null> {
  const empty = await client.query('SELECT * FROM messages LIMIT 0');
  let c = detectMessageColumns(empty);
  if (c) return c;

  const r = await client.query<{ column_name: string }>(
    `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages'
    `,
  );
  const names = r.rows.map((x) => x.column_name);
  const fake = { fields: names.map((name) => ({ name })) } as unknown as QueryResult;
  return detectMessageColumns(fake);
}

function atToday(h: number, m: number, sec: number): Date {
  const d = new Date();
  d.setHours(h, m, sec, 0);
  return d;
}

/** Histórico fictício (última mensagem = maior horário do dia). */
const MESSAGE_THREADS: {
  peerNome: string;
  lines: { adminSends: boolean; text: string; h: number; m: number; s: number }[];
}[] = [
  {
    peerNome: 'Newton Ramos',
    lines: [
      {
        adminSends: true,
        text: 'Oi Newton, você já revisou o material do projeto da faculdade?',
        h: 9,
        m: 12,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Sim! Fecho ainda hoje à noite e te mando o link.',
        h: 9,
        m: 18,
        s: 0,
      },
    ],
  },
  {
    peerNome: 'LULA PT',
    lines: [
      {
        adminSends: true,
        text: 'Confirma presença no evento de networking quinta às 19h?',
        h: 10,
        m: 5,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Conto comigo — levo um contato da área também.',
        h: 10,
        m: 22,
        s: 0,
      },
    ],
  },
  {
    peerNome: 'Carlos Mendes',
    lines: [
      {
        adminSends: true,
        text: 'Carlos, consegue enviar o relatório pendente até amanhã?',
        h: 11,
        m: 40,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Sim, subo no drive até 17h.',
        h: 11,
        m: 55,
        s: 0,
      },
    ],
  },
  {
    peerNome: 'Camila Alcântara',
    lines: [
      {
        adminSends: true,
        text: 'Bora um café amanhã às 15h perto da faculdade?',
        h: 14,
        m: 3,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Perfeito, te espero na entrada!',
        h: 14,
        m: 20,
        s: 0,
      },
    ],
  },
  {
    peerNome: 'Teste Usuario',
    lines: [
      {
        adminSends: true,
        text: 'Confirma o treino de amanhã no grupo de Esportes?',
        h: 16,
        m: 0,
        s: 0,
      },
    ],
  },
  {
    peerNome: 'Outro Usuario',
    lines: [
      {
        adminSends: false,
        text: 'Te mando o resumo da aula para revisarmos juntos.',
        h: 17,
        m: 10,
        s: 0,
      },
    ],
  },
];

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'conectfy',
  });
  await client.connect();

  for (const u of DEMO_EXTRA_USERS) {
    await client.query(
      `
      INSERT INTO users (nome, email, senha, circulos, afinidades)
      VALUES ($1, $2, NULL, '[]'::jsonb, '[]'::jsonb)
      ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome
      `,
      [u.nome, u.email],
    );
    console.log(`Usuário demo garantido: ${u.nome} <${u.email}>`);
  }

  const res = await client.query<{ user_id: number; contact_id: number; nome: string }>(`
    SELECT uc.user_id, uc.contact_id, u.nome AS nome
    FROM user_contacts uc
    JOIN users u ON u.id = uc.contact_id
    WHERE uc.contact_id <> uc.user_id
  `);

  let updated = 0;
  for (const row of res.rows) {
    const tags = resolveTags(row.nome);
    if (!tags) continue;
    await client.query(
      `UPDATE user_contacts SET tags = $1::jsonb WHERE user_id = $2 AND contact_id = $3`,
      [JSON.stringify(tags), row.user_id, row.contact_id],
    );
    updated++;
    console.log(`Tags atualizadas (vínculo existente) → ${row.nome}: ${tags.join(', ')}`);
  }
  console.log(`Atualizações em vínculos existentes: ${updated}`);

  const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim() || DEFAULT_SEED_OWNER_EMAIL;
  console.log(`Dono do demo (upsert + mensagens): ${ownerEmail}`);

  const ownerRes = await client.query<{ id: number }>(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [ownerEmail],
  );
  const ownerId = ownerRes.rows[0]?.id;
  if (!ownerId) {
    console.warn(`Usuário dono não encontrado: ${ownerEmail}. Cadastre-o ou ajuste SEED_OWNER_EMAIL.`);
    await client.end();
    return;
  }

  let upserts = 0;
  for (const row of CONTACT_TAG_ROWS) {
    const users = await client.query<{ id: number; nome: string }>(
      `SELECT id, nome FROM users WHERE lower(trim(nome)) = lower(trim($1)) AND id <> $2`,
      [row.nome, ownerId],
    );
    for (const u of users.rows) {
      await client.query(
        `
        INSERT INTO user_contacts (user_id, contact_id, tags, is_blocked)
        VALUES ($1, $2, $3::jsonb, false)
        ON CONFLICT (user_id, contact_id)
        DO UPDATE SET tags = EXCLUDED.tags
        `,
        [ownerId, u.id, JSON.stringify(row.tags)],
      );
      upserts++;
      console.log(`Upsert contato ${u.nome} → ${row.tags.join(', ')}`);
    }
  }

  const joaoAccent = await client.query<{ id: number; nome: string }>(
    `SELECT id, nome FROM users WHERE lower(trim(nome)) = lower(trim($1)) AND id <> $2`,
    ['João da Silva', ownerId],
  );
  for (const u of joaoAccent.rows) {
    await client.query(
      `
      INSERT INTO user_contacts (user_id, contact_id, tags, is_blocked)
      VALUES ($1, $2, $3::jsonb, false)
      ON CONFLICT (user_id, contact_id)
      DO UPDATE SET tags = EXCLUDED.tags
      `,
      [ownerId, u.id, JSON.stringify(['Networking'])],
    );
    upserts++;
    console.log(`Upsert João da Silva → Networking`);
  }
  console.log(`Upserts de contatos: ${upserts}`);

  const cols = await resolveMsgCols(client);
  if (!cols) {
    console.warn('Não foi possível detectar colunas de messages; pulando inserção de mensagens.');
    await client.end();
    return;
  }

  const peerIds = new Set<number>();
  const nomeToId = async (nome: string): Promise<number | null> => {
    const r = await client.query<{ id: number }>(
      `SELECT id FROM users WHERE lower(trim(nome)) = lower(trim($1)) AND id <> $2 LIMIT 1`,
      [nome, ownerId],
    );
    return r.rows[0]?.id ?? null;
  };

  for (const th of MESSAGE_THREADS) {
    const pid = await nomeToId(th.peerNome);
    if (pid != null) peerIds.add(pid);
  }

  if (peerIds.size > 0) {
    const ids = [...peerIds];
    await client.query(
      `
      DELETE FROM messages m
      WHERE (
        (m.${cols.sender} = $1 AND m.${cols.receiver} = ANY($2::int[]))
        OR (m.${cols.receiver} = $1 AND m.${cols.sender} = ANY($2::int[]))
      )
      `,
      [ownerId, ids],
    );
    console.log(`Mensagens anteriores removidas entre dono e ${ids.length} contato(s) demo.`);
  }

  let msgCount = 0;
  for (const th of MESSAGE_THREADS) {
    const peerId = await nomeToId(th.peerNome);
    if (peerId == null) {
      console.warn(`Contato não encontrado para mensagens: ${th.peerNome}`);
      continue;
    }
    for (const line of th.lines) {
      const created = atToday(line.h, line.m, line.s);
      const fromId = line.adminSends ? ownerId : peerId;
      const toId = line.adminSends ? peerId : ownerId;
      await client.query(
        `
        INSERT INTO messages (${cols.sender}, ${cols.receiver}, content, status, ${cols.created}, ${cols.media})
        VALUES ($1, $2, $3, 'sent', $4, 'text')
        `,
        [fromId, toId, line.text, created],
      );
      msgCount++;
    }
    console.log(`Mensagens inseridas: ${th.peerNome} (${th.lines.length})`);
  }
  console.log(`Total de mensagens inseridas: ${msgCount}`);

  await client.end();
}

function resolveTags(nome: string): string[] | null {
  const t = nome.trim();
  const lower = t.toLowerCase();

  const row = CONTACT_TAG_ROWS.find((r) => r.nome.toLowerCase() === lower);
  if (row) return [...row.tags];

  if (lower === 'joão da silva') return ['Networking'];
  if (lower === 'camila alcantara') return ['Amigos'];

  if (/jo[aã]o\s+da\s+silva/i.test(t)) return ['Networking'];
  if (/camila/i.test(t) && (/alcântara/i.test(t) || /alcantara/i.test(t))) return ['Amigos'];
  if (/lula/i.test(t) && /pt/i.test(t)) return ['Networking'];

  return null;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
