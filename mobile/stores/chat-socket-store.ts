import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { getApiBaseUrl } from '@/api/client';

export type SocketConnStatus = 'idle' | 'connecting' | 'connected';

type ChatSocketState = {
  socket: Socket | null;
  status: SocketConnStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
};

export const useChatSocketStore = create<ChatSocketState>((set, get) => ({
  socket: null,
  status: 'idle',

  connect: async () => {
    const existing = get().socket;
    if (existing?.connected) {
      set({ status: 'connected' });
      return;
    }

    existing?.removeAllListeners();
    existing?.close();

    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return;

    set({ status: 'connecting' });

    const socket = io(getApiBaseUrl(), {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => set({ status: 'connected' }));
    socket.on('disconnect', () => set({ status: 'idle' }));

    set({ socket });
  },

  disconnect: () => {
    const s = get().socket;
    s?.removeAllListeners();
    s?.close();
    set({ socket: null, status: 'idle' });
  },
}));
