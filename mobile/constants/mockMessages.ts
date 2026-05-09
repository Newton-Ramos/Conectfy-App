/**
 * Prévias de conversa alinhadas a `MESSAGE_THREADS` em `backend/scripts/seed-demo-contact-tags.ts`.
 * A lista real na aba Conversas vem da API (`/messages/conversations`) após rodar o seed.
 */

function todayIso(h: number, m: number, s: number): string {
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d.toISOString();
}

/** Última mensagem de cada thread (horários do mesmo dia — espelho do seed). */
export const MOCK_MESSAGES = [
  {
    nome: 'Newton Ramos',
    lastMessage: 'Sim! Fecho ainda hoje à noite e te mando o link.',
    lastMessageTime: todayIso(9, 18, 0),
  },
  {
    nome: 'LULA PT',
    lastMessage: 'Conto comigo — levo um contato da área também.',
    lastMessageTime: todayIso(10, 22, 0),
  },
  {
    nome: 'Carlos Mendes',
    lastMessage: 'Sim, subo no drive até 17h.',
    lastMessageTime: todayIso(11, 55, 0),
  },
  {
    nome: 'Camila Alcântara',
    lastMessage: 'Perfeito, te espero na entrada!',
    lastMessageTime: todayIso(14, 20, 0),
  },
  {
    nome: 'Teste Usuario',
    lastMessage: 'Confirma o treino de amanhã no grupo de Esportes?',
    lastMessageTime: todayIso(16, 0, 0),
  },
  {
    nome: 'Outro Usuario',
    lastMessage: 'Te mando o resumo da aula para revisarmos juntos.',
    lastMessageTime: todayIso(17, 10, 0),
  },
] as const;
