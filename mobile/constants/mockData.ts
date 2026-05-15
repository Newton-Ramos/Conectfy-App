/**
 * Dados de referência para demos / testes de UI (mesma organização do seed do backend).
 * Na API real, as tags vêm de `user_contacts.tags`; aqui usamos `circle` + `tags` alinhados.
 */

/**
 * Conta dona dos vínculos demo no seed (`SEED_OWNER_EMAIL` no backend; padrão `admin@admin.com`).
 * O mesmo script (`seed-demo-contact-tags.ts`) preenche o perfil demo dessa conta (nome, endereço CEUB/Brasília, círculos, afinidades, notas).
 */
export const MOCK_OWNER_EMAIL = 'admin@admin.com' as const;

/**
 * Cenários mock (`backend`: `npm run seed:mock-scenarios`). Senha das contas: `demo123`.
 * - admin@admin.com — demo completo (seed:demo-tags)
 * - raquel@mock.conectfy.local — vazio
 * - marcos, juliana, pedro, camila, lucas @mock.conectfy.local — painéis distintos
 */
export const MOCK_SCENARIO_PASSWORD_HINT = 'demo123' as const;

export type DemoCircleTag =
  | 'Família'
  | 'Trabalho'
  | 'Amigos'
  | 'Networking'
  | 'Esportes'
  | 'Estudos';

export type DemoContactRow = {
  nome: string;
  /** Círculo principal (uma tag) — espelha o seed `seed-demo-contact-tags.ts`. */
  circle: DemoCircleTag;
  /** Formato da API (`ContactUser.tags`). */
  tags: readonly string[];
};

/**
 * Organização alinhada ao seed `seed-demo-contact-tags.ts`:
 * - Networking (mais populoso): LULA PT, Joao da Silva, Newton Ramos
 * - Trabalho: Carlos Mendes
 * - Amigos: Camila Alcântara
 * - Esportes: Teste Usuario | Estudos: Outro Usuario
 */
export const MOCK_CONTACTS_WITH_CIRCLE: readonly DemoContactRow[] = [
  { nome: 'LULA PT', circle: 'Networking', tags: ['Networking'] },
  { nome: 'Joao da Silva', circle: 'Networking', tags: ['Networking'] },
  { nome: 'Newton Ramos', circle: 'Networking', tags: ['Networking'] },
  { nome: 'Carlos Mendes', circle: 'Trabalho', tags: ['Trabalho'] },
  { nome: 'Camila Alcântara', circle: 'Amigos', tags: ['Amigos'] },
  { nome: 'Teste Usuario', circle: 'Esportes', tags: ['Esportes'] },
  { nome: 'Outro Usuario', circle: 'Estudos', tags: ['Estudos'] },
] as const;
