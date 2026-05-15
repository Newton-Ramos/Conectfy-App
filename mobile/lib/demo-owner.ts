import { MOCK_OWNER_EMAIL } from '@/constants/mockData';

/** Conta com seed demo completo (notificações globais, chips fixos na home, etc.). */
export function isDemoOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === MOCK_OWNER_EMAIL.toLowerCase();
}

/** Raquel — painel e contatos vazios (qualquer e-mail raquel@…). */
export function isRaquelEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase().startsWith('raquel@');
}

/** Contas com cenário mock (`npm run seed:mock-scenarios` no backend). Senha: demo123 */
export const MOCK_SCENARIO_EMAILS = [
  'marcos@mock.conectfy.local',
  'juliana@mock.conectfy.local',
  'pedro@mock.conectfy.local',
  'camila@mock.conectfy.local',
  'lucas@mock.conectfy.local',
  'raquel@mock.conectfy.local',
] as const;

export function isMockScenarioEmail(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase();
  return (MOCK_SCENARIO_EMAILS as readonly string[]).includes(e);
}
