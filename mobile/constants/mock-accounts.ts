/**
 * Contas de demonstração (backend: npm run seed:mock-scenarios).
 * Senha padrão: demo123
 */
export const MOCK_DEMO_PASSWORD = 'demo123';

export const MOCK_ACCOUNTS = {
  admin: {
    email: 'admin@admin.com',
    note: 'Painel, contatos e conversas demo completos (seed:demo-tags). Não alterar.',
  },
  raquel: {
    email: 'raquel@mock.conectfy.local',
    note: 'Painel e agenda vazios.',
  },
  marcos: { email: 'marcos@mock.conectfy.local' },
  juliana: { email: 'juliana@mock.conectfy.local' },
  pedro: { email: 'pedro@mock.conectfy.local' },
  camila: { email: 'camila@mock.conectfy.local' },
  lucas: { email: 'lucas@mock.conectfy.local' },
} as const;
