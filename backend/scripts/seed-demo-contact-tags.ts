/**
 * Seed demo: tags de círculos + mensagens fictícias para a conta dono (padrão admin@admin.com).
 * Também atualiza o perfil completo do dono (nome demo “Helena Martins”, endereço CEUB/Brasília, círculos, afinidades).
 *
 * Organização de círculos (contatos):
 * - Networking (mais populoso): LULA PT, Joao da Silva, Newton Ramos
 * - Trabalho: Carlos Mendes
 * - Amigos: Camila Alcântara
 * - Esportes: Teste Usuario | Estudos: Outro Usuario
 *
 * Mensagens: threads estendidas com todos os contatos acima (incl. João da Silva).
 *
 * Uso (pasta backend):
 *   npm run seed:demo-tags
 */

import 'dotenv/config';
import { Client, type QueryResult } from 'pg';
import { readPgClientConfig } from './pg-client-config';

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

type OptionalMsgCols = { readAt: string | null; deliveredAt: string | null };

async function resolveOptionalMsgCols(client: Client): Promise<OptionalMsgCols> {
  const r = await client.query<{ column_name: string }>(
    `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages'
    `,
  );
  const names = r.rows.map((x) => x.column_name);
  const pick = (...cands: string[]) => {
    for (const c of cands) {
      const n = c.toLowerCase().replace(/_/g, '');
      const hit = names.find((x) => x.toLowerCase().replace(/_/g, '') === n);
      if (hit) return quoteIdent(hit);
    }
    return null;
  };
  return {
    readAt: pick('read_at', 'readAt'),
    deliveredAt: pick('deliveredAt', 'delivered_at'),
  };
}

type DemoLine = {
  adminSends: boolean;
  text: string;
  h: number;
  m: number;
  s: number;
  /**
   * Mensagem do contato → admin: `false` simula não lida (bolinha + contagem na lista).
   * Padrão `true` (lida).
   */
  markRead?: boolean;
  /**
   * Mensagem do admin → contato: ticks no chat (`read` = dois azuis).
   * Padrão `read`.
   */
  outgoingTick?: 'sent' | 'delivered' | 'read';
};

function seedLineMeta(
  line: DemoLine,
  created: Date,
): { status: string; readAt: Date | null; deliveredAt: Date | null } {
  if (line.adminSends) {
    const tick = line.outgoingTick ?? 'read';
    if (tick === 'sent') {
      return { status: 'sent', readAt: null, deliveredAt: null };
    }
    if (tick === 'delivered') {
      return { status: 'delivered', readAt: null, deliveredAt: created };
    }
    return { status: 'read', readAt: created, deliveredAt: created };
  }
  const read = line.markRead !== false;
  if (read) {
    return { status: 'read', readAt: created, deliveredAt: null };
  }
  return { status: 'sent', readAt: null, deliveredAt: null };
}

function atToday(h: number, m: number, sec: number): Date {
  const d = new Date();
  d.setHours(h, m, sec, 0);
  return d;
}

/**
 * Histórico fictício (última mensagem = maior horário do dia por contato).
 * Cenários: não lidas (markRead: false) | só lidas (última do contato, tudo lido) | respondidas (última do admin).
 */
const MESSAGE_THREADS: { peerNome: string; lines: DemoLine[] }[] = [
  {
    /** Não lidas — 2 mensagens do contato sem ler */
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
        markRead: true,
      },
      {
        adminSends: true,
        text: 'Maravilha — quando subir me marca aqui.',
        h: 19,
        m: 0,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Tô subindo o arquivo agora — dois minutinhos.',
        h: 19,
        m: 40,
        s: 0,
        markRead: false,
      },
      {
        adminSends: false,
        text: 'Pronto! Confere na pasta Compartilhados.',
        h: 20,
        m: 15,
        s: 0,
        markRead: false,
      },
    ],
  },
  {
    /** Não lida — última só do contato */
    peerNome: 'Camila Alcântara',
    lines: [
      {
        adminSends: true,
        text: 'Bora um café amanhã perto da faculdade?',
        h: 14,
        m: 3,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Topo! 15h na entrada do bloco B?',
        h: 14,
        m: 20,
        s: 0,
        markRead: true,
      },
      {
        adminSends: true,
        text: 'Combinado. Te aviso se atrasar um pouco.',
        h: 18,
        m: 30,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Cheguei aqui no lounge — quando quiser desce.',
        h: 19,
        m: 25,
        s: 0,
        markRead: false,
      },
    ],
  },
  {
    /** Não lida */
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
        markRead: true,
      },
      {
        adminSends: true,
        text: 'Te coloquei na lista VIP da entrada.',
        h: 15,
        m: 0,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Show. Levo mais um lead de dados pra apresentar lá.',
        h: 18,
        m: 50,
        s: 0,
        markRead: false,
      },
    ],
  },
  {
    /** Só lidas — última é do contato; você leu e ainda não respondeu */
    peerNome: 'Joao da Silva',
    lines: [
      {
        adminSends: true,
        text: 'João, fecha contigo o café com o time de dados?',
        h: 11,
        m: 5,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Consigo na terça. Te encaixo na agenda?',
        h: 11,
        m: 25,
        s: 0,
        markRead: true,
      },
      {
        adminSends: true,
        text: 'Perfeito — mando o invite com link do Meet.',
        h: 16,
        m: 55,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Combinado. Qualquer coisa me chama no zap.',
        h: 17,
        m: 5,
        s: 0,
        markRead: true,
      },
    ],
  },
  {
    /** Só lidas */
    peerNome: 'Outro Usuario',
    lines: [
      {
        adminSends: false,
        text: 'Te mando o resumo da aula pra gente revisar junto?',
        h: 15,
        m: 10,
        s: 0,
        markRead: true,
      },
      {
        adminSends: true,
        text: 'Manda sim — principalmente os exercícios 3 e 4.',
        h: 15,
        m: 35,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Enviei no grupo agora há pouco.',
        h: 16,
        m: 12,
        s: 0,
        markRead: true,
      },
      {
        adminSends: true,
        text: 'Vi aqui, obrigada — ficou ótimo.',
        h: 16,
        m: 45,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Qualquer dúvida me marca — boa prova!',
        h: 16,
        m: 48,
        s: 0,
        markRead: true,
      },
    ],
  },
  {
    /** Respondida — última mensagem é sua (admin); ticks lidos pelo contato */
    peerNome: 'Teste Usuario',
    lines: [
      {
        adminSends: true,
        text: 'Confirma o treino de quinta com o pessoal de Esportes?',
        h: 14,
        m: 10,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Sim, levo a bola e as redes.',
        h: 14,
        m: 22,
        s: 0,
        markRead: true,
      },
      {
        adminSends: true,
        text: 'Fecho então — 19h na quadra do CEUB.',
        h: 15,
        m: 8,
        s: 0,
        outgoingTick: 'read',
      },
    ],
  },
  {
    /** Respondida */
    peerNome: 'Carlos Mendes',
    lines: [
      {
        adminSends: true,
        text: 'Carlos, consegue fechar o relatório pendente até sexta?',
        h: 10,
        m: 20,
        s: 0,
      },
      {
        adminSends: false,
        text: 'Sim — subo até amanhã às 17h no drive.',
        h: 10,
        m: 40,
        s: 0,
        markRead: true,
      },
      {
        adminSends: false,
        text: 'Arquivo novo na pasta Projetos, já conferi os números.',
        h: 12,
        m: 30,
        s: 0,
        markRead: true,
      },
      {
        adminSends: true,
        text: 'Recebi e revisei. Valeu pelo capricho!',
        h: 13,
        m: 45,
        s: 0,
        outgoingTick: 'read',
      },
    ],
  },
];

async function main() {
  const client = new Client(readPgClientConfig());
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

  /** Perfil fictício do dono da conta demo (admin@admin.com) — alinhado às telas Perfil / Editar pessoa. */
  await client.query(
    `
    UPDATE users SET
      nome = $2,
      cpf = $3,
      "dataNascimento" = $4::date,
      cep = $5,
      logradouro = $6,
      numero = $7,
      complemento = $8,
      bairro = $9,
      cidade = $10,
      uf = $11,
      localidade = $12,
      notas = $13,
      circulos = $14::jsonb,
      afinidades = $15::jsonb
    WHERE id = $1
    `,
    [
      ownerId,
      'Helena Martins',
      '52998224725',
      '1998-06-14',
      '70200510',
      'SGAN Quadra 602',
      '401',
      'Bloco B',
      'Asa Norte',
      'Brasília',
      'DF',
      'Brasília, DF',
      'Coordena integrações e demos no Conectfy; orienta uso do app na turma e eventos CEUB.',
      JSON.stringify(['Networking', 'Trabalho', 'Estudos']),
      JSON.stringify([
        'Organização de eventos',
        'Trabalho em equipe',
        'Produtividade acadêmica',
        'Comunicação assertiva',
      ]),
    ],
  );
  console.log('Perfil do dono demo atualizado (Helena Martins / admin).');

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
  const extraCols = await resolveOptionalMsgCols(client);
  if (!cols) {
    console.warn('Não foi possível detectar colunas de messages; pulando inserção de mensagens.');
    await client.end();
    return;
  }

  const peerIds = new Set<number>();
  const nomeToId = async (nome: string): Promise<number | null> => {
    const tryNames = /^jo[aã]o\s+da\s+silva$/i.test(nome.trim())
      ? [nome, 'João da Silva', 'Joao da Silva']
      : [nome];
    for (const n of tryNames) {
      const r = await client.query<{ id: number }>(
        `SELECT id FROM users WHERE lower(trim(nome)) = lower(trim($1)) AND id <> $2 LIMIT 1`,
        [n, ownerId],
      );
      const id = r.rows[0]?.id;
      if (id != null) return id;
    }
    return null;
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
      const meta = seedLineMeta(line, created);
      const insertCols = [
        cols.sender,
        cols.receiver,
        'content',
        'status',
        cols.created,
        cols.media,
      ];
      const vals: unknown[] = [fromId, toId, line.text, meta.status, created, 'text'];
      if (extraCols.readAt) {
        insertCols.push(extraCols.readAt);
        vals.push(meta.readAt);
      }
      if (extraCols.deliveredAt) {
        insertCols.push(extraCols.deliveredAt);
        vals.push(meta.deliveredAt);
      }
      const ph = vals.map((_, i) => `$${i + 1}`).join(', ');
      await client.query(
        `
        INSERT INTO messages (${insertCols.join(', ')})
        VALUES (${ph})
        `,
        vals,
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
