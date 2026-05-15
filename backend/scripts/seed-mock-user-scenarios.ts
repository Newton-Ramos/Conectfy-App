/**
 * Mock completo por conta: contatos, painel (notificações), agenda (calendário).
 * Admin e Raquel: admin intacto; Raquel tudo vazio.
 *
 *   npm run seed:mock-scenarios
 */

import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Client } from 'pg';
import { readPgClientConfig } from './pg-client-config';
import {
  calendarSeedToDate,
  generateMockPack,
  notificationSeedToRow,
} from './mock-pack-generator';
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
  await client.query(`DELETE FROM user_calendar_events WHERE "userId" = $1`, [ownerId]);
  await client.query(
    `
    DELETE FROM messages m
    WHERE m."senderId" = $1 OR m."receiverId" = $1
    `,
    [ownerId],
  );
  await client.query(`DELETE FROM user_contacts WHERE user_id = $1`, [ownerId]);
}

async function insertNotifications(
  client: Client,
  ownerId: number,
  list: MockNotificationSeed[],
) {
  for (const n of list) {
    const { createdAt, eventAt } = notificationSeedToRow(n);
    await client.query(
      `
      INSERT INTO notifications (title, body, grupo, kind, "eventAt", "userId", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [n.title, n.body ?? null, n.grupo, n.kind, eventAt, ownerId, createdAt],
    );
  }
}

async function insertCalendar(
  client: Client,
  ownerId: number,
  pack: ReturnType<typeof generateMockPack>,
) {
  for (const ev of pack.calendarEvents) {
    const dateAt = calendarSeedToDate(ev);
    await client.query(
      `
      INSERT INTO user_calendar_events ("userId", title, notes, "dateAt")
      VALUES ($1, $2, $3, $4)
      `,
      [ownerId, ev.title, ev.notes ?? null, dateAt],
    );
  }
}

async function main() {
  const client = new Client(readPgClientConfig());
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS "user_calendar_events" (
      "id" SERIAL NOT NULL,
      "userId" integer NOT NULL,
      "title" character varying(200) NOT NULL,
      "notes" text,
      "dateAt" TIMESTAMP NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_user_calendar_events" PRIMARY KEY ("id"),
      CONSTRAINT "FK_user_calendar_events_user" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )
  `);

  const adminEmail = process.env.SEED_OWNER_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
  const adminRes = await client.query<{ id: number }>(
    `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
    [adminEmail],
  );
  const adminId = adminRes.rows[0]?.id;
  if (adminId) {
    console.log(`Admin preservado (id=${adminId}) — sem alterar painel/agenda/contatos do admin.`);
  }

  const poolMap = new Map<string, MockContactPoolEntry>();
  const senhaHash = await bcrypt.hash(MOCK_SCENARIO_PASSWORD, 10);

  for (const entry of CONTACT_POOL) {
    const id = await upsertPoolContact(client, entry);
    poolMap.set(entry.key, entry);
    console.log(`Pool: ${entry.nome}`);
  }

  const raquelId = await upsertUser(
    client,
    RAQUEL_SCENARIO.nome,
    RAQUEL_SCENARIO.email,
    senhaHash,
    [],
  );
  await clearOwnerData(client, raquelId);
  console.log(`Raquel: painel e agenda vazios.`);

  console.log('\n--- Contas mock (senha: demo123) ---\n');

  for (const scenario of MOCK_SCENARIO_OWNERS) {
    const ownerId = await upsertUser(
      client,
      scenario.nome,
      scenario.email,
      senhaHash,
      scenario.circulos,
    );
    if (adminId && ownerId === adminId) continue;

    await clearOwnerData(client, ownerId);

    const contactIds: number[] = [];
    for (const key of scenario.contactKeys) {
      const contactId = (
        await client.query<{ id: number }>(
          `SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1`,
          [poolMap.get(key)!.email],
        )
      ).rows[0]?.id;
      if (!contactId) continue;
      await client.query(
        `
        INSERT INTO user_contacts (user_id, contact_id, tags, is_blocked)
        VALUES ($1, $2, $3::jsonb, false)
        ON CONFLICT (user_id, contact_id) DO UPDATE SET tags = EXCLUDED.tags
        `,
        [ownerId, contactId, JSON.stringify(scenario.contactTags[key] ?? [])],
      );
      contactIds.push(contactId);
    }

    const pack = generateMockPack(scenario, poolMap);
    await insertNotifications(client, ownerId, pack.notifications);
    await insertCalendar(client, ownerId, pack);

    if (contactIds[0] && scenario.messages?.length) {
      for (const line of scenario.messages) {
        const createdAt = new Date(Date.now() - line.hoursAgo * 3_600_000);
        const senderId = line.fromContact ? contactIds[0] : ownerId;
        const receiverId = line.fromContact ? ownerId : contactIds[0];
        await client.query(
          `
          INSERT INTO messages ("senderId", "receiverId", content, status, "createdAt", read_at, "deliveredAt")
          VALUES ($1, $2, $3, 'read', $4, $4, $4)
          `,
          [senderId, receiverId, line.text, createdAt],
        );
      }
    }

    console.log(`${scenario.nome}`);
    console.log(`  E-mail: ${scenario.email}`);
    console.log(`  Contatos: ${contactIds.length}`);
    console.log(`  Painel: ${pack.notifications.length} itens`);
    console.log(`  Agenda: ${pack.calendarEvents.length} eventos`);
    console.log('  Painel (amostra):');
    pack.notifications.slice(0, 4).forEach((n) => console.log(`    · [${n.grupo}] ${n.title}`));
    console.log('  Agenda (amostra):');
    pack.calendarEvents.slice(0, 3).forEach((e) => {
      const d = calendarSeedToDate(e);
      console.log(`    · ${e.title} — ${d.toLocaleString('pt-BR')}`);
    });
    console.log('');
  }

  console.log(`Raquel: ${RAQUEL_SCENARIO.email} — vazio`);
  console.log(`Admin: ${adminEmail} — inalterado`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
