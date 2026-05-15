export const DEFAULT_DEMO_OWNER_EMAIL = 'admin@admin.com';

/** Conta com painel e rede demo completos (não alterar no seed de cenários). */
export function isDemoOwnerEmail(email: string | null | undefined): boolean {
  const demoEmail = (
    process.env.SEED_OWNER_EMAIL?.trim() || DEFAULT_DEMO_OWNER_EMAIL
  ).toLowerCase();
  return (email ?? '').trim().toLowerCase() === demoEmail;
}

/** Raquel — painel e contatos vazios. Aceita qualquer e-mail que comece com raquel@ */
export function isRaquelEmail(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase();
  return e.startsWith('raquel@');
}

/** E-mails com cenário mockado via `npm run seed:mock-scenarios`. */
export const MOCK_SCENARIO_EMAILS = [
  'marcos@mock.conectfy.local',
  'juliana@mock.conectfy.local',
  'pedro@mock.conectfy.local',
  'camila@mock.conectfy.local',
  'lucas@mock.conectfy.local',
] as const;

export function isMockScenarioEmail(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase();
  return (MOCK_SCENARIO_EMAILS as readonly string[]).includes(e);
}
