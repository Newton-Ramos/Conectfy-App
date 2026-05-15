/**
 * Cenários de demonstração por usuário (exceto admin e Raquel).
 * Senha padrão das contas mock: `demo123`
 */

export const MOCK_SCENARIO_PASSWORD = 'demo123';

export const RAQUEL_SCENARIO = {
  nome: 'Raquel Souza',
  email: 'raquel@mock.conectfy.local',
} as const;

export type MockContactPoolEntry = {
  key: string;
  nome: string;
  email: string;
  /** MM-DD — aniversário “hoje” se coincidir com o dia do seed */
  birthday?: string;
};

export type MockNotificationSeed = {
  title: string;
  body?: string | null;
  grupo: 'hoje' | 'ontem' | 'anteriores';
  kind: 'evento' | 'mensagem' | 'sistema' | 'aniversario';
  hoursAgo?: number;
};

export type MockMessageSeed = {
  fromContact: boolean;
  text: string;
  hoursAgo: number;
};

export type MockScenarioOwner = {
  nome: string;
  email: string;
  circulos: string[];
  contactKeys: string[];
  /** tags por chave do contato */
  contactTags: Record<string, string[]>;
  notifications: MockNotificationSeed[];
  /** mensagens com o primeiro contato da lista (se houver) */
  messages?: MockMessageSeed[];
};

/** Pessoas fictícias usadas como contatos dos cenários (não são donos de conta). */
export const CONTACT_POOL: MockContactPoolEntry[] = [
  { key: 'patricia', nome: 'Patricia Mendes', email: 'patricia.mendes@mock.conectfy.local', birthday: '05-15' },
  { key: 'ricardo', nome: 'Ricardo Alves', email: 'ricardo.alves@mock.conectfy.local' },
  { key: 'fernanda', nome: 'Fernanda Costa', email: 'fernanda.costa@mock.conectfy.local', birthday: '05-15' },
  { key: 'diego', nome: 'Diego Santos', email: 'diego.santos@mock.conectfy.local' },
  { key: 'larissa', nome: 'Larissa Ferreira', email: 'larissa.ferreira@mock.conectfy.local' },
  { key: 'bruno', nome: 'Bruno Oliveira', email: 'bruno.oliveira@mock.conectfy.local' },
  { key: 'marina', nome: 'Marina Rocha', email: 'marina.rocha@mock.conectfy.local' },
  { key: 'felipe', nome: 'Felipe Nunes', email: 'felipe.nunes@mock.conectfy.local' },
  { key: 'beatriz', nome: 'Beatriz Campos', email: 'beatriz.campos@mock.conectfy.local' },
  { key: 'gustavo', nome: 'Gustavo Pires', email: 'gustavo.pires@mock.conectfy.local' },
  { key: 'aline', nome: 'Aline Duarte', email: 'aline.duarte@mock.conectfy.local' },
  { key: 'henrique', nome: 'Henrique Melo', email: 'henrique.melo@mock.conectfy.local' },
];

export const MOCK_SCENARIO_OWNERS: MockScenarioOwner[] = [
  {
    nome: 'Marcos Lima',
    email: 'marcos@mock.conectfy.local',
    circulos: ['Trabalho', 'Família'],
    contactKeys: ['patricia', 'ricardo'],
    contactTags: {
      patricia: ['Família'],
      ricardo: ['Trabalho'],
    },
    notifications: [
      {
        title: 'Patricia Mendes enviou uma mensagem',
        body: 'Oi Marcos! Confirmou o almoço de domingo?',
        grupo: 'hoje',
        kind: 'mensagem',
        hoursAgo: 2,
      },
      {
        title: 'Ricardo Alves adicionado ao grupo de Trabalho',
        body: null,
        grupo: 'ontem',
        kind: 'sistema',
        hoursAgo: 28,
      },
    ],
    messages: [
      { fromContact: true, text: 'Oi Marcos! Confirmou o almoço de domingo?', hoursAgo: 2 },
      { fromContact: false, text: 'Confirmado sim, chego ao meio-dia.', hoursAgo: 1.5 },
    ],
  },
  {
    nome: 'Juliana Ribeiro',
    email: 'juliana@mock.conectfy.local',
    circulos: ['Amigos', 'Networking', 'Estudos'],
    contactKeys: ['fernanda', 'diego', 'larissa', 'bruno'],
    contactTags: {
      fernanda: ['Amigos'],
      diego: ['Networking'],
      larissa: ['Estudos'],
      bruno: ['Amigos', 'Networking'],
    },
    notifications: [
      {
        title: 'Fernanda Costa faz aniversário hoje',
        body: 'Mande os parabéns pelo Conectfy.',
        grupo: 'hoje',
        kind: 'aniversario',
        hoursAgo: 1,
      },
      {
        title: 'Diego Santos te convidou para o café das 16h',
        body: 'Coworking Asa Norte — confirme sua presença.',
        grupo: 'hoje',
        kind: 'evento',
        hoursAgo: 4,
      },
      {
        title: 'Larissa Ferreira adicionada ao grupo de Estudos',
        body: null,
        grupo: 'ontem',
        kind: 'sistema',
        hoursAgo: 30,
      },
      {
        title: 'Bruno Oliveira enviou uma mensagem',
        body: 'Juliana, fechamos o grupo do trabalho?',
        grupo: 'ontem',
        kind: 'mensagem',
        hoursAgo: 26,
      },
    ],
    messages: [
      { fromContact: true, text: 'Juliana, fechamos o grupo do trabalho?', hoursAgo: 26 },
      { fromContact: false, text: 'Fechamos sim, mando o link à noite.', hoursAgo: 25 },
    ],
  },
  {
    nome: 'Pedro Henrique',
    email: 'pedro@mock.conectfy.local',
    circulos: ['Esportes', 'Trabalho'],
    contactKeys: ['marina', 'felipe', 'beatriz', 'gustavo', 'aline'],
    contactTags: {
      marina: ['Esportes'],
      felipe: ['Trabalho'],
      beatriz: ['Trabalho'],
      gustavo: ['Esportes'],
      aline: ['Esportes', 'Trabalho'],
    },
    notifications: [
      {
        title: 'Marina Rocha enviou uma mensagem',
        body: 'Treino confirmado amanhã às 7h no parque.',
        grupo: 'hoje',
        kind: 'mensagem',
        hoursAgo: 3,
      },
      {
        title: 'Felipe Nunes adicionado ao grupo de Trabalho',
        body: null,
        grupo: 'hoje',
        kind: 'sistema',
        hoursAgo: 6,
      },
      {
        title: 'Beatriz Campos compartilhou um evento',
        body: 'Reunião de projeto — sexta às 14h.',
        grupo: 'ontem',
        kind: 'evento',
        hoursAgo: 22,
      },
    ],
    messages: [
      { fromContact: true, text: 'Treino confirmado amanhã às 7h no parque.', hoursAgo: 3 },
    ],
  },
  {
    nome: 'Camila Duarte',
    email: 'camila@mock.conectfy.local',
    circulos: ['Família'],
    contactKeys: ['henrique', 'patricia'],
    contactTags: {
      henrique: ['Família'],
      patricia: ['Família'],
    },
    notifications: [
      {
        title: 'Henrique Melo enviou uma mensagem',
        body: 'Camila, a festa da família é no sábado.',
        grupo: 'ontem',
        kind: 'mensagem',
        hoursAgo: 20,
      },
    ],
    messages: [
      { fromContact: true, text: 'Camila, a festa da família é no sábado.', hoursAgo: 20 },
    ],
  },
  {
    nome: 'Lucas Martins',
    email: 'lucas@mock.conectfy.local',
    circulos: ['Networking', 'Amigos', 'Trabalho'],
    contactKeys: ['diego', 'gustavo', 'ricardo', 'marina'],
    contactTags: {
      diego: ['Networking'],
      gustavo: ['Amigos'],
      ricardo: ['Trabalho'],
      marina: ['Networking'],
    },
    notifications: [
      {
        title: 'Diego Santos enviou uma mensagem',
        body: 'Lucas, vi sua vaga no LinkedIn — bora conversar?',
        grupo: 'hoje',
        kind: 'mensagem',
        hoursAgo: 5,
      },
      {
        title: 'Gustavo Pires adicionado ao grupo de Amigos',
        body: null,
        grupo: 'hoje',
        kind: 'sistema',
        hoursAgo: 8,
      },
      {
        title: 'Marina Rocha adicionada ao grupo de Networking',
        body: null,
        grupo: 'ontem',
        kind: 'sistema',
        hoursAgo: 32,
      },
      {
        title: 'Ricardo Alves compartilhou um documento',
        body: 'Proposta comercial — revise quando puder.',
        grupo: 'anteriores',
        kind: 'sistema',
        hoursAgo: 72,
      },
    ],
    messages: [
      { fromContact: true, text: 'Lucas, vi sua vaga no LinkedIn — bora conversar?', hoursAgo: 5 },
      { fromContact: false, text: 'Claro! Te chamo no fim do dia.', hoursAgo: 4 },
    ],
  },
];
