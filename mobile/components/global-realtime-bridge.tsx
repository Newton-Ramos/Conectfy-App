import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useInAppNotify } from '@/contexts/in-app-notify-context';
import { usersApi, notificationsApi } from '@/api/client';
import { useChatSocketStore } from '@/stores/chat-socket-store';
import type { ChatMessage } from '@/api/client';

const POLL_MS = 75_000;

/** Mensagens recebidas fora da conversa ativa + lembretes de eventos próximos (via API). */
export function GlobalRealtimeBridge() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useInAppNotify();
  const pathname = usePathname();
  const socket = useChatSocketStore((s) => s.socket);
  const connect = useChatSocketStore((s) => s.connect);
  const disconnect = useChatSocketStore((s) => s.disconnect);

  const myIdRef = useRef<number | null>(null);
  const remindedEventsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      myIdRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await usersApi.me();
        if (!cancelled && res.data?.id != null) myIdRef.current = Number(res.data.id);
      } catch {
        myIdRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnect();
      return;
    }
    void connect();
  }, [isAuthenticated, connect, disconnect]);

  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const onReceive = (msg: ChatMessage) => {
      const myId = myIdRef.current;
      if (myId == null || msg.receiverId !== myId || msg.deletedAt) return;
      if (msg.senderId === myId) return;

      const peerPath = `/chat/${msg.senderId}`;
      if (pathname?.includes(peerPath)) return;

      const preview =
        msg.mediaType === 'voice'
          ? 'Mensagem de voz'
          : (msg.content ?? '').trim().slice(0, 120) || 'Nova mensagem';
      showToast('message', 'Nova mensagem', preview);
    };

    socket.on('receive_message', onReceive);
    return () => {
      socket.off('receive_message', onReceive);
    };
  }, [socket, isAuthenticated, pathname, showToast]);

  const checkUpcomingEvents = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.list();
      const list = Array.isArray(res.data) ? res.data : [];
      const now = Date.now();
      const horizon = now + 100 * 60 * 1000;

      for (const n of list) {
        if (n.kind !== 'evento' || !n.eventAt) continue;
        const t = new Date(n.eventAt).getTime();
        if (Number.isNaN(t) || t < now || t > horizon) continue;
        if (remindedEventsRef.current.has(n.id)) continue;
        remindedEventsRef.current.add(n.id);
        showToast(
          'event',
          'Evento em breve',
          `${n.title}${n.body ? ` — ${n.body}` : ''}`.slice(0, 200),
        );
      }
    } catch {
      /* ignore */
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void checkUpcomingEvents();
    const id = setInterval(() => void checkUpcomingEvents(), POLL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, checkUpcomingEvents]);

  return null;
}
