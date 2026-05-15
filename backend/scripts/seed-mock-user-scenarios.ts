/**
 * Cenários mock por usuário: contatos aleatórios + painel de atualizações.
 * Não altera admin@admin.com (rode antes ou depois de seed:demo-tags).
 *
 * Raquel → sem contatos e sem painel.
 * Demais contas mock → contatos + notificações distintas.
 *
 * Uso (pasta backend):
 *   npm run seed:mock-scenarios
 */

import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';
import { readPgClientConfig } from './pg-client-config';
import {
  CONTACT_POOL,
  MOCK_SCENARIO_OWNERS,
  MOCK_SCENARIO_PASSWORD,
  RAQUEL_SCENARIO,
  type MockContactPoolEntry,
  type MockNotificationSeed,
} from './mock-scenarios.data';

const DEFAULT_ADMIN_EMAIL = 'admin@admin.com';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function birthdayTodayIso(entry: MockContactPoolEntry): string | null {
  if (entry.key === 'fernanda') {
    const t = new Date();
    return `${1992}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
  }
  if (!entry.birthday) return null;
  const [mm, dd] = entry.birthday.split('-');
  return `${1990}-${mm}-${dd}`;
}

async function upsertUser(
  client: Client,
  nome: string,
  email: string,
  senhaHash: string,
  circulos: string[],
): Promise<number> {
  const r = await client.query<{ id: number }>(
    `
    INSERT INTO users (nome, email, senha, circulos, afinidades)
    VALUES ($1, $2, $3, $4::jsonb, '[]'::jsonb)
    ON CONFLICT (email) DO UPDATE SET
      nome = EXCLUDED.nome,
      senha = COALESCE(users.senha, EXCLUDED.senha),
      circulos = EXCLUDED.circulos
    RETURNING id
    `,
    [nome, email, senhaHash, JSON.stringify(circulos)],
  );
  return r.rows[0].id;
}

async function upsertPoolContact(
  client: Client,
  entry: MockContactPoolEntry,
): Promise<number> {
  const dob = birthdayTodayIso(entry);
  const r = await client.query<{ id: number }>(
    `
    INSERT INTO users (nome, email, senha, "dataNascimento", circulos, afinidades)
    VALUES ($1, $2, NULL, $3::date, '[]'::jsonb, '[]'::jsonb)
    ON CONFLICT (email) DO UPDATE SET
      nome = EXCLUDED.nome,
      "dataNascimento" = COALESCE(EXCLUDED."dataNascimento", users."dataNascimento")
    RETURNING id
    `,
    [entry.nome, entry.email, dob],
  );
  return r.rows[0].id;
}

async function clearOwnerData(client: Client, ownerId: number) {
  await client.query(`DELETE FROM notifications WHERE "userId" = $1`, [ownerId]);
  await client.query(
    `
    DELETE FROM messages m
    WHERE m."senderId" = $1 OR m."receiverId" = $1
    `,
    [ownerId],
  );
  await client.query(`DELETE FROM user_contacts WHERE user_id = $1`, [ownerId]);
}

async function insertNotification(
  client: Client,
  ownerId: number,
  n: MockNotificationSeed,
) {
  const createdAt = new Date(Date.now() - (n.hoursAgo ?? 0) * 3_600_000);
  let eventAt: Date | null = null;
  if (n.kind === 'evento') {
    eventAt = new Date(createdAt.getTime() + 2 * 3_600_000);
  }
  await client.query(
    `
    INSERT INTO notifications (title, body, grupo, kind, "eventAt", "userId", "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [n.title, n.body ?? null, n.grupo, n.kind, eventAt, ownerId, createdAt],
  );
}

async function main() {
  const client = new Client(readPgClientConfig());
  await client.connect();

  const adminEmail = process.env.SEED_OWNER_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
  const adminRes = await client.query<{ id: number }>(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [adminEmail],
  );
  const adminId = adminRes.rows[0]?.id;
  if (adminId) {
    console.log(`Admin preservado (id=${adminId}, ${adminEmail}) — sem alterações.`);
  }

  const senhaHash = await bcrypt.hash(MOCK_SCENARIO_PASSWORD, 10);
  const poolIds = new Map<string, number>();
  for (const entry of CONTACT_POOL) {
    const id = await upsertPoolContact(client, entry);
    poolIds.set(entry.key, id);
    console.log(`Pool contato: ${entry.nome} (id=${id})`);
  }

  const raquelId = await upsertUser(
    client,
    RAQUEL_SCENARIO.nome,
    RAQUEL_SCENARIO.email,
    senhaHash,
    [],
  );
  await clearOwnerData(client, raquelId);
  console.log(`Raquel (${RAQUEL_SCENARIO.email}): painel e contatos vazios.`);

  for (const scenario of MOCK_SCENARIO_OWNERS) {
    const ownerId = await upsertUser(
      client,
      scenario.nome,
      scenario.email,
      senhaHash,
      scenario.circulos,
    );
    if (adminId && ownerId === adminId) {
      console.warn(`Ignorando cenário ${scenario.email} — colide com admin.`);
      continue;
    }

    await clearOwnerData(client, ownerId);

    const contactIds: number[] = [];
    for (const key of scenario.contactKeys) {
      const contactId = poolIds.get(key);
      if (!contactId) {
        console.warn(`Contato pool "${key}" não encontrado.`);
        continue;
      }
      const tags = scenario.contactTags[key] ?? [];
      await client.query(
        `
        INSERT INTO user_contacts (user_id, contact_id, tags, is_blocked)
        VALUES ($1, $2, $3::jsonb, false)
        ON CONFLICT (user_id, contact_id)
        DO UPDATE SET tags = EXCLUDED.tags
        `,
        [ownerId, contactId, JSON.stringify(tags)],
      );
      contactIds.push(contactId);
    }

    for (const n of scenario.notifications) {
      await insertNotification(client, ownerId, n);
    }

    const peerId = contactIds[0];
    if (peerId && scenario.messages?.length) {
      for (const line of scenario.messages) {
        const createdAt = new Date(Date.now() - line.hoursAgo * 3_600_000);
        const senderId = line.fromContact ? peerId : ownerId;
        const receiverId = line.fromContact ? ownerId : peerId;
        await client.query(
          `
          INSERT INTO messages ("senderId", "receiverId", content, status, "createdAt", read_at, "deliveredAt")
          VALUES ($1, $2, $3, 'read', $4, $4, $4)
          `,
          [senderId, receiverId, line.text, createdAt],
        );
      }
    }

    console.log(
      `Cenário ${scenario.nome} <${scenario.email}>: ${contactIds.length} contato(s), ${scenario.notifications.length} notificação(ões).`,
    );
  }

  console.log('\nContas mock (senha demo123):');
  console.log(`  ${RAQUEL_SCENARIO.email} — vazio`);
  for (const s of MOCK_SCENARIO_OWNERS) {
    console.log(`  ${s.email}`);
  }
  console.log('\nAdmin inalterado:', adminEmail);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
