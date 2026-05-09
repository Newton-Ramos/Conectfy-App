/**
 * Prévias de conversa alinhadas a `MESSAGE_THREADS` em `backend/scripts/seed-demo-contact-tags.ts`.
 * A lista real na aba Conversas vem da API (`/messages/conversations`) após rodar o seed.
 * Ordem ~ por horário da última mensagem (mais recente primeiro).
 *
 * Cenários após `npm run seed:demo-tags` no backend:
 * - **unread**: mensagens do contato ainda não lidas → bolinha + contagem
 * - **read**: tudo lido; última mensagem é do contato (você abriu mas não respondeu depois)
 * - **replied**: última mensagem é sua (Helena / admin)
 */

function todayIso(h: number, m: number, s: number): string {
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d.toISOString();
}

export type MockConversationScenario = 'unread' | 'read' | 'replied';

export type MockConversationRow = {
  nome: string;
  lastMessage: string;
  lastMessageTime: string;
  scenario: MockConversationScenario;
  /** Quantidade esperada de não lidas (só faz sentido com scenario `unread`) */
  unreadCountHint?: number;
};

export const MOCK_MESSAGES: readonly MockConversationRow[] = [
  {
    nome: 'Newton Ramos',
    lastMessage: 'Pronto! Confere na pasta Compartilhados.',
    lastMessageTime: todayIso(20, 15, 0),
    scenario: 'unread',
    unreadCountHint: 2,
  },
  {
    nome: 'Camila Alcântara',
    lastMessage: 'Cheguei aqui no lounge — quando quiser desce.',
    lastMessageTime: todayIso(19, 25, 0),
    scenario: 'unread',
    unreadCountHint: 1,
  },
  {
    nome: 'LULA PT',
    lastMessage: 'Show. Levo mais um lead de dados pra apresentar lá.',
    lastMessageTime: todayIso(18, 50, 0),
    scenario: 'unread',
    unreadCountHint: 1,
  },
  {
    nome: 'Joao da Silva',
    lastMessage: 'Combinado. Qualquer coisa me chama no zap.',
    lastMessageTime: todayIso(17, 5, 0),
    scenario: 'read',
  },
  {
    nome: 'Outro Usuario',
    lastMessage: 'Qualquer dúvida me marca — boa prova!',
    lastMessageTime: todayIso(16, 48, 0),
    scenario: 'read',
  },
  {
    nome: 'Teste Usuario',
    lastMessage: 'Fecho então — 19h na quadra do CEUB.',
    lastMessageTime: todayIso(15, 8, 0),
    scenario: 'replied',
  },
  {
    nome: 'Carlos Mendes',
    lastMessage: 'Recebi e revisei. Valeu pelo capricho!',
    lastMessageTime: todayIso(13, 45, 0),
    scenario: 'replied',
  },
] as const;
