import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();

  const normalize = (raw: string) => {
    const s = raw.trim();
    if (!s) return s;
    const withProto = s.includes('://') ? s : `http://${s}`;
    try {
      const u = new URL(withProto);
      // Android emulador: localhost aponta pro emulador, não pro PC
      if (
        Platform.OS === 'android' &&
        (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
      ) {
        u.hostname = '10.0.2.2';
      }
      return u.toString().replace(/\/$/, '');
    } catch {
      return s.replace(/\/$/, '');
    }
  };

  if (fromEnv) return normalize(fromEnv);

  // Emuladores/simuladores: use aliases conhecidos
  const isDevice = !!Constants.isDevice;
  if (!isDevice) {
    return Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://localhost:3333';
  }

  // Celular físico (Expo Go): tente inferir o host real do Metro/Expo.
  // Em geral, o bundle vem de http://<ip-do-pc>:8081/..., então pegamos esse hostname.
  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
    if (scriptURL) {
      const u = new URL(scriptURL);
      if (u.hostname && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
        return `http://${u.hostname}:3333`;
      }
    }
  } catch {
    // ignore
  }

  // Fallback: em alguns casos o Linking já sabe o host do QR (exp://<host>:<port>/--/)
  try {
    const u = new URL(Linking.createURL('/'));
    if (u.hostname && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
      return `http://${u.hostname}:3333`;
    }
  } catch {
    // ignore
  }

  // Último fallback (se não conseguiu inferir)
  return Platform.OS === 'android' ? 'http://10.0.2.2:3333' : 'http://localhost:3333';
}

export const API_URL = resolveApiBaseUrl();
console.log('🔌 API_URL:', API_URL);

export function getApiBaseUrl(): string {
  return API_URL;
}

export function resolveMediaUrl(pathOrUrl: string | null | undefined): string | null {
  if (pathOrUrl == null || pathOrUrl === '') return null;
  const p = pathOrUrl.trim();
  if (/^https?:\/\//i.test(p)) return p;
  const base = API_URL.replace(/\/$/, '');
  return `${base}${p.startsWith('/') ? '' : '/'}${p}`;
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export type NotificationRow = {
  id: number;
  title: string;
  body?: string | null;
  grupo: string;
  createdAt: string;
  kind?: string;
  eventAt?: string | null;
  rsvpStatus?: string | null;
};

export type CircleSummary = {
  key: string;
  descricao: string;
  badgeColor: string;
  icon: string;
  pessoas: number;
};

export type CirclesResponse = {
  resumo: {
    totalCirculos: number;
    totalPessoas: number;
    maisPopuloso: string;
  };
  circles: CircleSummary[];
};

export type ContactUser = {
  id: number;
  nome: string;
  email: string;
  tags?: string[];
  is_blocked?: boolean;
  contactNote?: string | null;
  contactPhone?: string | null;
  localidade?: string | null;
  circulos?: string[] | null;
  afinidades?: string[] | null;
};

export type PeerContactProfile = {
  id: number;
  nome: string;
  email: string;
  localidade?: string | null;
  contactPhone?: string | null;
  contactNote?: string | null;
  tags?: string[];
  is_blocked?: boolean;
  inContacts?: boolean;
};

export const auth = {
  checkEmail: (email: string) => api.post<{ exists: boolean }>('/auth/check-email', { email }),

  login: (email: string, senha: string) =>
    api.post('/auth/login', { email, senha }),

  forgotPassword: (email: string) =>
    api.post<{ message: string; resetToken?: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, novaSenha: string) =>
    api.post<{ access_token: string; user: { id: number; nome: string; email: string } }>(
      '/auth/reset-password',
      { token, novaSenha },
    ),

  oauthGoogle: (idToken: string) =>
    api.post<{ access_token: string; user: { id: number; nome: string; email: string } }>(
      '/auth/oauth/google',
      { idToken },
    ),

  oauthGoogleAccess: (accessToken: string) =>
    api.post<{ access_token: string; user: { id: number; nome: string; email: string } }>(
      '/auth/oauth/google-access',
      { accessToken },
    ),

  oauthFacebook: (accessToken: string) =>
    api.post<{ access_token: string; user: { id: number; nome: string; email: string } }>(
      '/auth/oauth/facebook',
      { accessToken },
    ),

  /**
   * Mobile (Expo): endpoint Passport `POST /auth/facebook`
   * Body esperado pelo passport-facebook-token: `{ access_token: string }`
   */
  facebookToken: (access_token: string) =>
    api.post<{ access_token: string; user: { id: number; nome: string; email: string } }>(
      '/auth/facebook',
      { access_token },
    ),

  oauthInstagramComplete: (code: string, redirectUri: string) =>
    api.post<{ access_token: string; user: { id: number; nome: string; email: string } }>(
      '/auth/oauth/instagram/complete',
      { code, redirectUri },
    ),

  register: (data: {
    nome: string;
    email: string;
    senha: string;
    cpf: string;
    dataNascimento: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  }) => api.post('/users', data),

  getUsers: () => api.get('/users'),
};

export const usersApi = {
  me: () => api.get('/users/me'),

  updateProfile: (body: {
    nome?: string;
    email?: string;
    localidade?: string;
    notas?: string;
    circulos?: string[];
    afinidades?: string[];
    cpf?: string;
    dataNascimento?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  }) => api.patch('/users/me/profile', body),

  contactsList: () => api.get<ContactUser[]>('/users/contacts/list'),

  addContact: (contactId: number, tags?: string[]) =>
    api.post(`/users/contacts/${contactId}`, { tags }),

  updateContactDetails: (
    contactId: number,
    data: { telefone?: string; nota?: string; tags?: string[] },
  ) => api.patch(`/users/${contactId}/details`, data),

  toggleBlock: (contactId: number) =>
    api.patch<{ blocked: boolean }>(`/users/${contactId}/toggle-block`),

  contactProfile: (contactId: number) =>
    api.get<PeerContactProfile>(`/users/contacts/detail/${contactId}`),
};

export const notificationsApi = {
  list: () => api.get<NotificationRow[]>('/notifications'),

  rsvp: (id: number, status: 'sim' | 'nao') =>
    api.patch<NotificationRow>(`/notifications/${id}/rsvp`, { status }),
};

export const circlesApi = {
  summary: () => api.get<CirclesResponse>('/circles'),
};

export const getUserById = (id: number) => api.get(`/users/${id}`);

export type ChatReaction = { userId: number; emoji: string };

/** Estado apenas no cliente (mensagens otimistas / upload) */
export type ClientUploadState = {
  phase: 'compressing' | 'uploading' | 'sending' | 'failed';
  progress?: number;
  localUri?: string;
};

export type ChatMessage = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  status: string;
  read_at?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  parentMessageId?: number | null;
  mediaType?: string;
  mediaUrl?: string | null;
  mediaDurationSec?: number | null;
  reactions?: ChatReaction[];
  /** Overlay UX upload — não vem da API */
  clientUpload?: ClientUploadState;
};

export type ChatHistoryPage = {
  messages: ChatMessage[];
  nextBeforeId: number | null;
  hasMore: boolean;
};

export type ConversationPreview = {
  id: number;
  nome: string;
  telefone?: string | null;
  nota?: string | null;
  is_blocked?: boolean | null;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
};

export const messagesApi = {
  conversations: () => api.get<ConversationPreview[]>('/messages/conversations'),

  history: (
    contactId: number,
    params?: { limit?: number; beforeId?: number },
  ) =>
    api.get<ChatMessage[] | ChatHistoryPage>(`/messages/history/${contactId}`, {
      params,
    }),

  send: (
    receiverId: number,
    content: string,
    opts?: {
      parentMessageId?: number;
      mediaType?: string;
      mediaUrl?: string | null;
      mediaDurationSec?: number | null;
    },
  ) =>
    api.post<ChatMessage>('/messages', {
      receiverId,
      content,
      ...(opts?.parentMessageId != null ? { parentMessageId: opts.parentMessageId } : {}),
      ...(opts?.mediaType ? { mediaType: opts.mediaType } : {}),
      ...(opts?.mediaUrl != null ? { mediaUrl: opts.mediaUrl } : {}),
      ...(opts?.mediaDurationSec != null ? { mediaDurationSec: opts.mediaDurationSec } : {}),
    }),

  uploadVoice: (fileUri: string, mimeType = 'audio/m4a') => {
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: 'voice.m4a',
      type: mimeType,
    } as unknown as Blob);
    return api.post<{ mediaUrl: string; filename: string }>('/messages/upload-voice', form, {
      timeout: 90000,
    });
  },

  uploadMedia: (
    fileUri: string,
    filename: string,
    mimeType: string,
    opts?: {
      signal?: AbortSignal;
      onProgress?: (percent: number) => void;
    },
  ) => {
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);
    return api.post<{
      mediaUrl: string;
      filename: string;
      mediaType: string;
      size: number;
    }>('/messages/upload-media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600_000,
      signal: opts?.signal,
      onUploadProgress: (ev) => {
        const total = ev.total ?? 0;
        if (total > 0 && opts?.onProgress) {
          opts.onProgress(Math.min(100, Math.round((ev.loaded / total) * 100)));
        }
      },
    });
  },

  addReaction: (messageId: number, emoji: string) =>
    api.post(`/messages/${messageId}/reactions`, { emoji }),

  removeReaction: (messageId: number) => api.delete(`/messages/${messageId}/reactions`),

  markRead: (contactId: number) => api.patch(`/messages/read/${contactId}`),

  deleteConversation: (peerId: number) =>
    api.delete<{ success: boolean }>(`/messages/conversation/${peerId}`),
};

export function normalizeHistoryResponse(
  data: ChatMessage[] | ChatHistoryPage,
): { messages: ChatMessage[]; nextBeforeId: number | null; hasMore: boolean } {
  if (Array.isArray(data)) {
    return { messages: data, nextBeforeId: null, hasMore: false };
  }
  return {
    messages: data.messages ?? [],
    nextBeforeId: data.nextBeforeId ?? null,
    hasMore: !!data.hasMore,
  };
}