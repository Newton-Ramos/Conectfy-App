import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  ScrollView,
  Linking,
  BackHandler,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Audio, Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import {
  messagesApi,
  usersApi,
  getUserById,
  normalizeHistoryResponse,
  resolveMediaUrl,
  type ChatMessage,
  type PeerContactProfile,
} from '@/api/client';
import { useChatSocketStore } from '@/stores/chat-socket-store';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatSkeleton } from '@/components/chat/ChatSkeleton';
import {
  AttachmentPickerModal,
  type PickedAttachment,
} from '@/components/chat/AttachmentPickerModal';
import { AttachmentPreviewModal } from '@/components/chat/AttachmentPreviewModal';
import { MediaMessageBody } from '@/components/chat/MediaMessageBody';
import { captionForMedia, compressImageIfNeeded } from '@/lib/chat-attachments';
import { navigateToConversations } from '@/lib/navigate-conversations';
import { BRAND_GRADIENT_COLORS } from '@/constants/brand';

const BRAND = '#2c9a81';
const CHAT_BG = '#e9edef';
const TICK_GRAY = '#8696a0';
const TICK_BLUE = '#53bdeb';
const INK = '#0f172a';
const MUTED = '#64748b';

const PAGE_SIZE = 40;

/** Offset extra do KeyboardAvoidingView no iOS — mantém baixo para o campo ficar perto do teclado */
const IOS_KEYBOARD_OFFSET = 0;

type DisplayRow =
  | { type: 'date'; key: string; label: string }
  | { type: 'msg'; key: string; msg: ChatMessage; groupWithPrev: boolean };

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const strip = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ds = strip(d);
  if (ds === strip(today)) return 'Hoje';
  if (ds === strip(yesterday)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function buildDisplayRows(messages: ChatMessage[]): DisplayRow[] {
  const rows: DisplayRow[] = [];
  let prev: ChatMessage | null = null;
  let lastDay = '';
  for (const msg of messages) {
    const dk = dayKey(msg.createdAt);
    if (dk !== lastDay) {
      lastDay = dk;
      rows.push({
        type: 'date',
        key: `date-${dk}`,
        label: formatDayLabel(new Date(msg.createdAt)),
      });
    }
    const groupWithPrev =
      !!prev &&
      prev.senderId === msg.senderId &&
      Math.abs(new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) <
        5 * 60 * 1000;
    rows.push({
      type: 'msg',
      key: `msg-${msg.id}`,
      msg,
      groupWithPrev,
    });
    prev = msg;
  }
  return rows;
}

function voiceWaveHeights(seed: number, count: number): number[] {
  const heights: number[] = [];
  let x = Math.abs(seed) % 10009;
  for (let i = 0; i < count; i++) {
    x = (x * 48271) % 2147483647;
    heights.push(5 + (x % 16));
  }
  return heights;
}

function hasRichMediaBubble(item: ChatMessage): boolean {
  if (!item.mediaUrl || !item.mediaType) return false;
  const t = item.mediaType;
  return t === 'image' || t === 'video' || t === 'document' || t === 'file';
}

function fmtAudioLeft(positionMs: number, durationMs: number): string {
  const left = Math.max(0, durationMs - positionMs) / 1000;
  const s = Math.floor(left);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, '');
}

function dialUri(phone: string | null | undefined): string | null {
  const d = digitsOnly(phone ?? '');
  if (d.length < 10) return null;
  const national = d.length > 11 && d.startsWith('55') ? d.slice(2) : d;
  if (national.length === 11 || national.length === 10) return `tel:+55${national}`;
  return `tel:+${d}`;
}

function whatsAppUri(phone: string | null | undefined): string | null {
  const d = digitsOnly(phone ?? '');
  if (d.length < 10) return null;
  let intl = d;
  if (!d.startsWith('55') || d.length <= 11) intl = `55${d.replace(/^55/, '')}`;
  return `https://wa.me/${intl}`;
}

function TickRow({ status }: { status: string }) {
  if (status === 'read') {
    return <MaterialIcons name="done-all" size={14} color={TICK_BLUE} />;
  }
  if (status === 'delivered') {
    return <MaterialIcons name="done-all" size={14} color={TICK_GRAY} />;
  }
  return <MaterialIcons name="done" size={14} color={TICK_GRAY} />;
}

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ peerId?: string; peerName?: string }>();
  const peerId = useMemo(() => {
    const n = params.peerId ? Number(params.peerId) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [params.peerId]);

  const socket = useChatSocketStore((s) => s.socket);
  const connectSocket = useChatSocketStore((s) => s.connect);

  const [myId, setMyId] = useState<number | null>(null);
  const [peerName, setPeerName] = useState(params.peerName ?? '');
  const [peerProfile, setPeerProfile] = useState<PeerContactProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [typingPeer, setTypingPeer] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [voiceDraft, setVoiceDraft] = useState<{
    uri: string;
    durationSec: number;
  } | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [playingDraft, setPlayingDraft] = useState(false);
  const [voicePlayback, setVoicePlayback] = useState<{
    id: number;
    positionMillis: number;
    durationMillis: number;
  } | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState(1);

  const [peerOnline, setPeerOnline] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<PickedAttachment | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [videoModalUri, setVideoModalUri] = useState<string | null>(null);

  const uploadAbortMap = useRef(new Map<number, AbortController>());
  const retryAssetMap = useRef(new Map<number, PickedAttachment>());

  const scrollNearBottomRef = useRef(true);
  const listRef = useRef<FlatList<DisplayRow>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const draftSoundRef = useRef<Audio.Sound | null>(null);
  const recordingTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);

  const displayRows = useMemo(() => buildDisplayRows(messages), [messages]);

  useEffect(() => {
    if (params.peerName) setPeerName(params.peerName);
  }, [params.peerName]);

  const title = peerName.trim() || peerProfile?.nome?.trim() || 'Conversa';

  const loadMe = useCallback(async () => {
    const res = await usersApi.me();
    setMyId(res.data.id as number);
  }, []);

  const mergeUnique = useCallback((prev: ChatMessage[], incoming: ChatMessage[]) => {
    const map = new Map<number, ChatMessage>();
    for (const m of prev) map.set(m.id, m);
    for (const m of incoming) map.set(m.id, m);
    return [...map.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, []);

  const loadHistory = useCallback(async () => {
    if (peerId === null) return;
    const res = await messagesApi.history(peerId, { limit: PAGE_SIZE });
    const norm = normalizeHistoryResponse(res.data);
    setMessages(norm.messages.filter((m) => !m.deletedAt));
    setNextBeforeId(norm.nextBeforeId);
    setHasMore(norm.hasMore);
  }, [peerId]);

  const loadPeerName = useCallback(async () => {
    if (peerId === null || (params.peerName ?? '').trim()) return;
    try {
      const res = await getUserById(peerId);
      const nome = (res.data as { nome?: string })?.nome;
      if (nome) setPeerName(nome);
    } catch {
      /* noop */
    }
  }, [peerId, params.peerName]);

  const loadPeerProfile = useCallback(async () => {
    if (peerId === null) return;
    try {
      const res = await usersApi.contactProfile(peerId);
      setPeerProfile(res.data);
      const n = res.data.nome?.trim();
      if (n && !(params.peerName ?? '').trim()) setPeerName(n);
    } catch {
      setPeerProfile(null);
    }
  }, [peerId, params.peerName]);

  useEffect(() => {
    if (peerId === null) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await connectSocket();
        await loadMe();
        await loadHistory();
        await messagesApi.markRead(peerId);
        await Promise.all([loadPeerName(), loadPeerProfile()]);
      } catch {
        if (!cancelled) {
          Alert.alert('Erro', 'Não foi possível carregar o chat');
          navigateToConversations(router);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peerId, connectSocket, loadMe, loadHistory, loadPeerName, loadPeerProfile, router]);

  useFocusEffect(
    useCallback(() => {
      if (peerId === null) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        navigateToConversations(router);
        return true;
      });
      return () => sub.remove();
    }, [router, peerId]),
  );

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      void draftSoundRef.current?.unloadAsync();
      void recordingRef.current?.stopAndUnloadAsync();
      if (recordingTickRef.current) clearInterval(recordingTickRef.current);
    };
  }, []);

  useEffect(() => {
    if (!socket || peerId === null || myId === null) return;

    const onReceive = (msg: ChatMessage) => {
      const involves =
        (msg.senderId === peerId && msg.receiverId === myId) ||
        (msg.senderId === myId && msg.receiverId === peerId);
      if (!involves) return;
      if (msg.deletedAt) return;
      setMessages((prev) => mergeUnique(prev, [msg]));
      if (msg.receiverId === myId && msg.senderId === peerId) {
        socket.emit('message_ack_delivered', { messageIds: [msg.id] });
      }
      const fromMe = myId !== null && msg.senderId === myId;
      if (scrollNearBottomRef.current || fromMe) {
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      }
    };

    const onTyping = (payload: { senderId: number; typing: boolean }) => {
      if (payload.senderId !== peerId) return;
      setTypingPeer(!!payload.typing);
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (payload.typing) {
        typingStopTimer.current = setTimeout(() => setTypingPeer(false), 2500);
      }
    };

    socket.on('receive_message', onReceive);
    socket.on('typing_status', onTyping);

    return () => {
      socket.off('receive_message', onReceive);
      socket.off('typing_status', onTyping);
    };
  }, [socket, peerId, myId, mergeUnique]);

  /** Presença: online/offline do peer (eventos globais do gateway) */
  useEffect(() => {
    if (!socket || peerId === null) return;

    const onOnline = (p: { userId: number }) => {
      if (p.userId === peerId) setPeerOnline(true);
    };
    const onOffline = (p: { userId: number }) => {
      if (p.userId === peerId) setPeerOnline(false);
    };

    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);

    return () => {
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
    };
  }, [socket, peerId]);

  /** Scroll inicial / mantém fim só quando perto da base */
  useEffect(() => {
    if (messages.length > 0 && scrollNearBottomRef.current) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [messages.length]);

  const emitTyping = useCallback(
    (typing: boolean) => {
      if (!socket?.connected || peerId === null) return;
      socket.emit('typing_status', { receiverId: peerId, typing });
    },
    [socket, peerId],
  );

  const onDraftChange = (t: string) => {
    setDraft(t);
    if (!socket?.connected || peerId === null) return;
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 800);
  };

  const sendViaSocket = useCallback(
    (
      text: string,
      extra?: { mediaType?: string; mediaUrl?: string; mediaDurationSec?: number },
    ): Promise<ChatMessage | null> => {
      return new Promise((resolve) => {
        if (!socket?.connected || peerId === null) {
          resolve(null);
          return;
        }
        const t = setTimeout(() => resolve(null), 12000);
        socket.emit(
          'send_message',
          {
            receiverId: peerId,
            content: text,
            ...extra,
          },
          (resp: unknown) => {
            clearTimeout(t);
            if (!resp || typeof resp !== 'object') {
              resolve(null);
              return;
            }
            const r = resp as { status?: string; data?: ChatMessage };
            if (r.status === 'ok' && r.data) resolve(r.data);
            else resolve(null);
          },
        );
      });
    },
    [socket, peerId],
  );

  const sendAttachmentPipeline = async (
    asset: PickedAttachment,
    reuseTempId?: number,
  ) => {
    if (peerId === null || myId === null) throw new Error('Chat inválido');

    const tempId = reuseTempId ?? -Math.abs(Date.now() + Math.floor(Math.random() * 9999));

    const provisionalType =
      asset.kind === 'image'
        ? 'image'
        : asset.kind === 'video'
          ? 'video'
          : asset.kind === 'document'
            ? 'document'
            : 'file';

    const initialCaption = captionForMedia(provisionalType, asset.name, asset.size ?? 0);

    const optimistic: ChatMessage = {
      id: tempId,
      senderId: myId,
      receiverId: peerId,
      content: initialCaption,
      createdAt: new Date().toISOString(),
      status: 'sending',
      mediaType: provisionalType,
      mediaUrl: asset.uri,
      mediaDurationSec: asset.durationSec ?? null,
      clientUpload: {
        phase: 'compressing',
        progress: 0,
        localUri: asset.uri,
      },
    };

    if (reuseTempId == null) {
      setMessages((prev) => mergeUnique(prev, [optimistic]));
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === reuseTempId
            ? {
                ...optimistic,
                id: reuseTempId,
              }
            : m,
        ),
      );
    }

    retryAssetMap.current.set(tempId, asset);

    let uploadUri = asset.uri;
    let mime = asset.mimeType;
    let uploadName = asset.name;

    try {
      if (asset.kind === 'image') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  clientUpload: { phase: 'compressing', progress: 8, localUri: asset.uri },
                }
              : m,
          ),
        );
        const compressed = await compressImageIfNeeded(asset.uri);
        uploadUri = compressed.uri;
        mime = compressed.mime;
        uploadName = uploadName.replace(/\.[^.]+$/, '') + '.jpg';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  mediaUrl: uploadUri,
                  clientUpload: { phase: 'uploading', progress: 0, localUri: uploadUri },
                }
              : m,
          ),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  clientUpload: { phase: 'uploading', progress: 0, localUri: uploadUri },
                }
              : m,
          ),
        );
      }

      const ac = new AbortController();
      uploadAbortMap.current.set(tempId, ac);

      const uploadRes = await messagesApi.uploadMedia(uploadUri, uploadName, mime, {
        signal: ac.signal,
        onProgress: (pct) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    clientUpload: {
                      phase: 'uploading',
                      progress: pct,
                      localUri: uploadUri,
                    },
                  }
                : m,
            ),
          );
        },
      });

      uploadAbortMap.current.delete(tempId);

      const up = uploadRes.data;
      const caption = captionForMedia(up.mediaType, up.filename, up.size);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                content: caption,
                mediaType: up.mediaType,
                mediaUrl: up.mediaUrl,
                clientUpload: { phase: 'sending', progress: 100, localUri: uploadUri },
              }
            : m,
        ),
      );

      let msg: ChatMessage | null = await sendViaSocket(caption, {
        mediaType: up.mediaType,
        mediaUrl: up.mediaUrl,
        mediaDurationSec: asset.durationSec ?? undefined,
      });

      if (!msg) {
        const res = await messagesApi.send(peerId, caption, {
          mediaType: up.mediaType,
          mediaUrl: up.mediaUrl,
          mediaDurationSec: asset.durationSec ?? null,
        });
        msg = res.data as ChatMessage;
      }

      if (!msg) throw new Error('Falha ao registrar mensagem');

      setMessages((prev) => {
        const cleared = prev.filter((m) => m.id !== tempId);
        const cleaned: ChatMessage = { ...msg, clientUpload: undefined };
        return mergeUnique(cleared, [cleaned]);
      });
      retryAssetMap.current.delete(tempId);
    } catch (e) {
      uploadAbortMap.current.delete(tempId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...m,
                clientUpload: {
                  phase: 'failed',
                  progress: 0,
                  localUri: asset.uri,
                },
              }
            : m,
        ),
      );
      throw e;
    }
  };

  const retryAttachment = (tempId: number) => {
    const asset = retryAssetMap.current.get(tempId);
    if (!asset) return;
    void sendAttachmentPipeline(asset, tempId).catch(() => {
      Alert.alert('Erro', 'Não foi possível reenviar.');
    });
  };

  const confirmAttachmentSend = async () => {
    if (!previewAsset) return;
    const asset = previewAsset;
    setPreviewBusy(true);
    try {
      await sendAttachmentPipeline(asset);
      setPreviewOpen(false);
      setPreviewAsset(null);
      scrollNearBottomRef.current = true;
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        /* noop */
      }
    } catch {
      Alert.alert('Envio', 'Não foi possível concluir o envio.');
    } finally {
      setPreviewBusy(false);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || peerId === null || myId === null) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* noop */
    }
    scrollNearBottomRef.current = true;
    setSending(true);
    setDraft('');
    emitTyping(false);
    try {
      let msg: ChatMessage | null = await sendViaSocket(text);
      if (!msg) {
        const res = await messagesApi.send(peerId, text);
        msg = res.data as ChatMessage;
      }
      if (msg) setMessages((prev) => mergeUnique(prev, [msg]));
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e: unknown) {
      setDraft(text);
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Erro', err.response?.data?.message ?? 'Não foi possível enviar');
    } finally {
      setSending(false);
    }
  };

  const cancelVoiceDraft = useCallback(async () => {
    try {
      await draftSoundRef.current?.stopAsync();
      await draftSoundRef.current?.unloadAsync();
    } catch {
      /* noop */
    }
    draftSoundRef.current = null;
    setPlayingDraft(false);
    setVoiceDraft(null);
  }, []);

  const abortRecording = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      /* noop */
    }
    const rec = recordingRef.current;
    recordingRef.current = null;
    recordingStartedAtRef.current = null;
    if (recordingTickRef.current) clearInterval(recordingTickRef.current);
    recordingTickRef.current = null;
    setIsRecording(false);
    setRecordingMs(0);
    if (rec) {
      try {
        await rec.stopAndUnloadAsync();
      } catch {
        /* noop */
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (sending || isRecording) return;
    if (voiceDraft) {
      // Se já existe prévia, não inicia outra gravação.
      return;
    }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permissão', 'É necessário permitir o microfone para gravar áudio.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      recordingStartedAtRef.current = Date.now();
      setRecordingMs(0);
      setIsRecording(true);
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        /* noop */
      }
      if (recordingTickRef.current) clearInterval(recordingTickRef.current);
      recordingTickRef.current = setInterval(() => {
        const start = recordingStartedAtRef.current;
        if (!start) return;
        setRecordingMs(Date.now() - start);
      }, 120);
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
    }
  }, [isRecording, sending, voiceDraft]);

  const stopRecordingToDraft = useCallback(async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    const start = recordingStartedAtRef.current;
    recordingStartedAtRef.current = null;
    if (recordingTickRef.current) clearInterval(recordingTickRef.current);
    recordingTickRef.current = null;
    setIsRecording(false);

    if (!rec) return;

    let uri: string | null = null;
    let durationSec = 0;
    try {
      const st = await rec.getStatusAsync();
      durationSec = Math.max(
        0,
        Math.round((st.durationMillis ?? (Date.now() - (start ?? Date.now()))) / 1000),
      );
      await rec.stopAndUnloadAsync();
      uri = rec.getURI() ?? null;
    } catch {
      // se falhar, só aborta
      return;
    }

    // Evita enviar/gravar "toques" muito curtos
    if (!uri || durationSec < 1) {
      setRecordingMs(0);
      return;
    }

    setVoiceDraft({ uri, durationSec });
    setRecordingMs(0);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* noop */
    }
  }, []);

  const sendVoiceDraft = useCallback(async () => {
    if (!voiceDraft || peerId === null || myId === null) return;
    setSending(true);
    const content = '🎤 Mensagem de voz';
    try {
      const up = await messagesApi.uploadVoice(voiceDraft.uri);
      const mediaUrl = up.data.mediaUrl;
      let msg: ChatMessage | null = await sendViaSocket(content, {
        mediaType: 'voice',
        mediaUrl,
        mediaDurationSec: voiceDraft.durationSec,
      });
      if (!msg) {
        const res = await messagesApi.send(peerId, content, {
          mediaType: 'voice',
          mediaUrl,
          mediaDurationSec: voiceDraft.durationSec,
        });
        msg = res.data as ChatMessage;
      }
      if (msg) setMessages((prev) => mergeUnique(prev, [msg]));
      await cancelVoiceDraft();
      scrollNearBottomRef.current = true;
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Erro', err.response?.data?.message ?? 'Não foi possível enviar o áudio');
    } finally {
      setSending(false);
    }
  }, [voiceDraft, peerId, myId, mergeUnique, sendViaSocket, cancelVoiceDraft]);

  const togglePlayDraft = useCallback(async () => {
    if (!voiceDraft) return;
    if (playingDraft) {
      try {
        await draftSoundRef.current?.stopAsync();
      } catch {
        /* noop */
      }
      setPlayingDraft(false);
      return;
    }
    try {
      await draftSoundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: voiceDraft.uri });
      draftSoundRef.current = sound;
      setPlayingDraft(true);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && 'didJustFinish' in st && st.didJustFinish) {
          setPlayingDraft(false);
          void sound.unloadAsync();
        }
      });
      await sound.playAsync();
    } catch {
      Alert.alert('Erro', 'Não foi possível reproduzir o áudio.');
      setPlayingDraft(false);
    }
  }, [voiceDraft, playingDraft]);

  const toggleVoiceSpeed = useCallback(async () => {
    if (!soundRef.current || playingId == null) return;
    const next = voiceSpeed >= 1.5 ? 1 : 2;
    setVoiceSpeed(next);
    try {
      await soundRef.current.setRateAsync(next, true);
      try {
        await Haptics.selectionAsync();
      } catch {
        /* noop */
      }
    } catch {
      /* noop */
    }
  }, [playingId, voiceSpeed]);

  const togglePlayVoice = async (msg: ChatMessage) => {
    const src = resolveMediaUrl(msg.mediaUrl);
    if (!src) return;
    if (playingId === msg.id) {
      try {
        await soundRef.current?.stopAsync();
        await soundRef.current?.unloadAsync();
      } catch {
        /* noop */
      }
      soundRef.current = null;
      setPlayingId(null);
      setVoicePlayback(null);
      return;
    }
    try {
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: src });
      soundRef.current = sound;
      setPlayingId(msg.id);
      setVoiceSpeed(1);
      await sound.setRateAsync(1, true);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (!st.isLoaded) return;
        if ('didJustFinish' in st && st.didJustFinish) {
          setPlayingId(null);
          setVoicePlayback(null);
          void sound.unloadAsync();
          return;
        }
        if (
          st.isPlaying &&
          'positionMillis' in st &&
          typeof st.positionMillis === 'number' &&
          typeof st.durationMillis === 'number'
        ) {
          setVoicePlayback({
            id: msg.id,
            positionMillis: st.positionMillis,
            durationMillis: Math.max(1, st.durationMillis),
          });
        }
      });
      await sound.playAsync();
    } catch {
      Alert.alert('Erro', 'Não foi possível reproduzir o áudio.');
      setPlayingId(null);
      setVoicePlayback(null);
    }
  };

  const loadOlder = async () => {
    if (peerId === null || !hasMore || loadingMore || nextBeforeId == null) return;
    scrollNearBottomRef.current = false;
    setLoadingMore(true);
    try {
      const res = await messagesApi.history(peerId, {
        limit: PAGE_SIZE,
        beforeId: nextBeforeId,
      });
      const norm = normalizeHistoryResponse(res.data);
      const older = norm.messages.filter((m) => !m.deletedAt);
      setMessages((prev) => [...older, ...prev]);
      setNextBeforeId(norm.nextBeforeId);
      setHasMore(norm.hasMore);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar mensagens antigas');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const distFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    scrollNearBottomRef.current = distFromBottom < 96;
    const y = contentOffset.y;
    if (y <= 24 && hasMore && !loadingMore) void loadOlder();
  };

  const phoneForActions = peerProfile?.contactPhone ?? '';

  const openVoiceCall = () => {
    const tel = dialUri(phoneForActions);
    if (!tel) {
      Alert.alert(
        'Telefone',
        'Salve o telefone deste contato em Contatos → Editar pessoa para poder ligar.',
      );
      return;
    }
    void Linking.openURL(tel);
  };

  const openVideoCall = () => {
    const wa = whatsAppUri(phoneForActions);
    if (!wa) {
      Alert.alert(
        'Telefone',
        'Salve o telefone deste contato em Contatos → Editar pessoa. No WhatsApp você pode iniciar chamada de vídeo.',
      );
      return;
    }
    Alert.alert(
      'Chamada de vídeo',
      'Abrir o WhatsApp com este número? Por lá você pode iniciar uma chamada de vídeo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir WhatsApp', onPress: () => void Linking.openURL(wa) },
      ],
    );
  };

  const confirmDeleteConversation = () => {
    if (peerId === null) return;
    Alert.alert(
      'Excluir conversa?',
      'As mensagens serão removidas para você no servidor. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagesApi.deleteConversation(peerId);
              router.replace('/(tabs)/explore');
            } catch (e: unknown) {
              const err = e as { response?: { data?: { message?: string } } };
              Alert.alert('Erro', err.response?.data?.message ?? 'Falha ao excluir');
            }
          },
        },
      ],
    );
  };

  const openChatMenu = () => {
    Alert.alert(title, undefined, [
      {
        text: 'Informações do perfil',
        onPress: () => setProfileOpen(true),
      },
      {
        text: 'Editar contato',
        onPress: () =>
          router.push({
            pathname: '/(tabs)/edit-person',
            params: { userId: String(peerId), from: 'chat', peerName: title },
          }),
      },
      {
        text: 'Excluir conversa',
        style: 'destructive',
        onPress: () => confirmDeleteConversation(),
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const renderBubble = (item: ChatMessage, groupWithPrev: boolean) => {
    const mine = myId !== null && item.senderId === myId;
    const showDeleted = !!item.deletedAt;
    const isVoice = item.mediaType === 'voice' && !!item.mediaUrl;
    const playingThis = playingId === item.id;
    const vp = voicePlayback;
    const progressOk =
      playingThis && vp?.id === item.id && vp.durationMillis > 0;
    const progressPct =
      progressOk && vp
        ? Math.min(100, (vp.positionMillis / vp.durationMillis) * 100)
        : 0;
    const accent = mine ? '#075e54' : BRAND;

    return (
      <View
        style={[
          styles.bubbleWrap,
          mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs,
          { marginTop: groupWithPrev ? 2 : 10 },
        ]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {item.parentMessageId ? (
            <Text style={styles.replyHint}>↪ Resposta</Text>
          ) : null}
          {isVoice && !showDeleted ? (
            <View style={styles.voiceRow}>
              <TouchableOpacity
                onPress={() => void togglePlayVoice(item)}
                hitSlop={10}
                style={styles.voicePlayHit}
                accessibilityLabel={playingThis ? 'Pausar áudio' : 'Reproduzir áudio'}>
                <MaterialIcons
                  name={playingThis ? 'pause' : 'play-arrow'}
                  size={26}
                  color={accent}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.voiceTapArea}
                onPress={() => void togglePlayVoice(item)}
                activeOpacity={0.88}>
                <View style={styles.voiceBody}>
                  <View style={styles.voiceWave}>
                    {voiceWaveHeights(item.id, 18).map((h, i) => (
                      <View
                        key={i}
                        style={[
                          styles.voiceBar,
                          {
                            height: h,
                            opacity: playingThis ? 0.95 : 0.45,
                            backgroundColor: accent,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  {progressOk ? (
                    <View style={styles.voiceProgressTrack}>
                      <View style={[styles.voiceProgressFill, { width: `${progressPct}%` }]} />
                    </View>
                  ) : null}
                  <Text
                    style={[styles.voiceMetaTxt, mine ? styles.voiceMetaMine : styles.voiceMetaTheirs]}>
                    {progressOk && vp
                      ? fmtAudioLeft(vp.positionMillis, vp.durationMillis)
                      : item.mediaDurationSec != null
                        ? `${item.mediaDurationSec}s`
                        : 'Áudio'}
                  </Text>
                </View>
              </TouchableOpacity>
              {playingThis ? (
                <TouchableOpacity
                  onPress={() => void toggleVoiceSpeed()}
                  hitSlop={10}
                  style={styles.voiceSpeedBtn}
                  accessibilityLabel="Velocidade do áudio">
                  <Text style={styles.voiceSpeedTxt}>{voiceSpeed}x</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.voiceSpeedSpacer} />
              )}
            </View>
          ) : hasRichMediaBubble(item) && !showDeleted ? (
            <MediaMessageBody
              item={item}
              mine={mine}
              onPressImage={(uri) => setLightboxUri(uri)}
              onPressVideo={(uri) => setVideoModalUri(uri)}
              onPressDocument={(uri) => {
                const full =
                  uri.startsWith('http') || uri.startsWith('file') || uri.startsWith('content')
                    ? uri
                    : resolveMediaUrl(uri) ?? uri;
                void Linking.openURL(full).catch(() =>
                  Alert.alert('Erro', 'Não foi possível abrir o arquivo'),
                );
              }}
              onRetry={
                item.clientUpload?.phase === 'failed'
                  ? () => retryAttachment(item.id)
                  : undefined
              }
            />
          ) : (
            <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
              {showDeleted ? 'Esta mensagem foi apagada.' : item.content}
            </Text>
          )}
          {item.editedAt && !showDeleted ? (
            <Text style={styles.editedHint}>editada</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={[styles.metaTime, mine ? styles.metaMine : styles.metaTheirs]}>
              {new Date(item.createdAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {mine && !showDeleted ? (
              <View style={styles.tickPad}>
                {item.clientUpload?.phase === 'compressing' ||
                item.clientUpload?.phase === 'uploading' ||
                item.clientUpload?.phase === 'sending' ? (
                  <ActivityIndicator size={11} color="#667781" />
                ) : item.clientUpload?.phase === 'failed' ? (
                  <MaterialIcons name="error-outline" size={14} color="#dc2626" />
                ) : (
                  <TickRow status={item.status} />
                )}
              </View>
            ) : null}
          </View>
          {item.reactions && item.reactions.length > 0 ? (
            <Text style={styles.reactions}>
              {item.reactions.map((r, i) => (
                <Text key={`${r.userId}-${i}`}>{r.emoji} </Text>
              ))}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderRow = ({ item }: { item: DisplayRow }) => {
    if (item.type === 'date') {
      return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.dateChipWrap}>
          <View style={styles.dateChip}>
            <Text style={styles.dateChipTxt}>{item.label}</Text>
          </View>
        </Animated.View>
      );
    }
    return renderBubble(item.msg, item.groupWithPrev);
  };

  if (peerId === null) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errText}>Contato inválido</Text>
        <TouchableOpacity onPress={() => navigateToConversations(router)}>
          <Text style={styles.link}>Voltar às conversas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profile = peerProfile;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? IOS_KEYBOARD_OFFSET : 0}>
      <LinearGradient colors={[...BRAND_GRADIENT_COLORS]} style={[styles.topbar, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigateToConversations(router)}
          hitSlop={12}
          accessibilityLabel="Voltar para conversas">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.topbarCenter}
          onPress={() => setProfileOpen(true)}
          activeOpacity={0.8}>
          <View style={styles.smallAvatar}>
            <Text style={styles.smallAvatarTxt}>{(title[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.topbarTitle} numberOfLines={1}>
              {title}
            </Text>
            {typingPeer ? (
              <View style={styles.typingRow}>
                <TypingIndicator />
              </View>
            ) : peerOnline ? (
              <Text style={styles.onlineHint} numberOfLines={1}>
                online
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={openVideoCall} hitSlop={8}>
          <MaterialIcons name="videocam" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={openVoiceCall} hitSlop={8}>
          <MaterialIcons name="call" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={openChatMenu} hitSlop={8}>
          <MaterialIcons name="more-vert" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <Modal
        visible={profileOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setProfileOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setProfileOpen(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Contato</Text>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>Nome</Text>
              <Text style={styles.modalValue}>{profile?.nome ?? title}</Text>
              <Text style={styles.modalLabel}>E-mail</Text>
              <Text style={styles.modalValue}>{profile?.email ?? '—'}</Text>
              <Text style={styles.modalLabel}>Telefone (salvo)</Text>
              <Text style={styles.modalValue}>{profile?.contactPhone?.trim() || '—'}</Text>
              <Text style={styles.modalLabel}>Categorias / tags</Text>
              <Text style={styles.modalValue}>
                {(profile?.tags?.length ?? 0) > 0 ? profile!.tags!.join(', ') : '—'}
              </Text>
              <Text style={styles.modalLabel}>Observação</Text>
              <Text style={styles.modalValue}>{profile?.contactNote?.trim() || '—'}</Text>
              {profile?.localidade ? (
                <>
                  <Text style={styles.modalLabel}>Localidade</Text>
                  <Text style={styles.modalValue}>{profile.localidade}</Text>
                </>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => {
                setProfileOpen(false);
                router.push({
                  pathname: '/(tabs)/edit-person',
                  params: { userId: String(peerId), from: 'chat', peerName: title },
                });
              }}>
              <Text style={styles.modalPrimaryTxt}>Editar contato</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setProfileOpen(false)}>
              <Text style={styles.modalCloseTxt}>Fechar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <ChatSkeleton />
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={displayRows}
            keyExtractor={(row) => row.key}
            renderItem={renderRow}
            contentContainerStyle={styles.msgList}
            onScroll={handleListScroll}
            scrollEventThrottle={16}
            onContentSizeChange={() => {
              if (scrollNearBottomRef.current) {
                listRef.current?.scrollToEnd({ animated: false });
              }
            }}
            initialNumToRender={22}
            maxToRenderPerBatch={14}
            windowSize={14}
            removeClippedSubviews={Platform.OS === 'android'}
            ListHeaderComponent={
              hasMore ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => void loadOlder()}
                  disabled={loadingMore}>
                  {loadingMore ? (
                    <ActivityIndicator color={BRAND} />
                  ) : (
                    <Text style={styles.loadMoreTxt}>Carregar mensagens anteriores</Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              <Text style={styles.emptyChat}>Nenhuma mensagem. Diga oi!</Text>
            }
          />
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => setPickerOpen(true)}
              hitSlop={10}
              accessibilityLabel="Anexar arquivo">
              <MaterialIcons name="attach-file" size={24} color="#475569" />
            </TouchableOpacity>
            <View style={styles.composerPill}>
              <TextInput
                style={styles.inputInPill}
                value={draft}
                onChangeText={onDraftChange}
                placeholder="Mensagem"
                placeholderTextColor="#8696a0"
                multiline
                maxLength={4000}
                textAlignVertical="center"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendInPill,
                  (sending || (!draft.trim() && !voiceDraft)) && styles.sendBtnOff,
                  pressed && (draft.trim() || voiceDraft) && styles.sendBtnPressed,
                ]}
                onPress={() => void (draft.trim() ? send() : sendVoiceDraft())}
                disabled={sending || (!draft.trim() && !voiceDraft)}
                accessibilityLabel={draft.trim() ? 'Enviar mensagem' : 'Enviar áudio'}>
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialIcons name="send" size={20} color="#fff" />
                )}
              </Pressable>
            </View>
            <TouchableOpacity
              style={[
                styles.micBtn,
                isRecording && styles.micBtnRec,
                (sending || !!voiceDraft) && styles.micBtnOff,
              ]}
              onPress={() => {
                if (isRecording) void stopRecordingToDraft();
                else void startRecording();
              }}
              disabled={sending || !!voiceDraft}
              accessibilityLabel={isRecording ? 'Parar gravação' : 'Gravar áudio'}>
              <MaterialIcons name={isRecording ? 'stop' : 'mic'} size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          {isRecording ? (
            <View style={styles.recordingHintRow}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingHintTxt}>
                Gravando ·{' '}
                {`${String(Math.floor(recordingMs / 60000)).padStart(2, '0')}:${String(
                  Math.floor((recordingMs / 1000) % 60),
                ).padStart(2, '0')}`}
              </Text>
              <Text style={styles.recordingHintSub}>Toque no mic para parar</Text>
              <TouchableOpacity
                style={styles.recordingCancelBtn}
                onPress={() => void abortRecording()}
                hitSlop={10}>
                <Text style={styles.recordingCancelTxt}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {voiceDraft ? (
            <View style={styles.voiceDraftBar}>
              <TouchableOpacity
                style={styles.voiceDraftPlay}
                onPress={() => void togglePlayDraft()}
                hitSlop={8}>
                <MaterialIcons
                  name={playingDraft ? 'pause' : 'play-arrow'}
                  size={26}
                  color={BRAND}
                />
              </TouchableOpacity>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.voiceDraftTitle} numberOfLines={1}>
                  Mensagem de voz
                </Text>
                <Text style={styles.voiceDraftMeta}>
                  {voiceDraft.durationSec}s · toque em enviar ou descarte
                </Text>
              </View>
              <TouchableOpacity
                style={styles.voiceDraftTrash}
                onPress={() => void cancelVoiceDraft()}
                hitSlop={8}>
                <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : null}

          <AttachmentPickerModal
            visible={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={(a) => {
              setPickerOpen(false);
              setPreviewAsset(a);
              setPreviewOpen(true);
              try {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {
                /* noop */
              }
            }}
          />
          <AttachmentPreviewModal
            visible={previewOpen && !!previewAsset}
            asset={previewAsset}
            onCancel={() => {
              if (!previewBusy) {
                setPreviewOpen(false);
                setPreviewAsset(null);
              }
            }}
            onConfirm={() => void confirmAttachmentSend()}
            busy={previewBusy}
          />

          <Modal
            visible={!!lightboxUri}
            transparent
            animationType="fade"
            onRequestClose={() => setLightboxUri(null)}>
            <Pressable style={styles.lightboxBackdrop} onPress={() => setLightboxUri(null)}>
              {lightboxUri ? (
                <Image
                  source={{ uri: lightboxUri }}
                  style={styles.lightboxImage}
                  contentFit="contain"
                  transition={220}
                />
              ) : null}
            </Pressable>
          </Modal>

          <Modal
            visible={!!videoModalUri}
            animationType="fade"
            onRequestClose={() => setVideoModalUri(null)}>
            <View style={styles.videoModalRoot}>
              <TouchableOpacity
                style={[styles.videoModalClose, { top: Math.max(insets.top, 12) + 8 }]}
                onPress={() => setVideoModalUri(null)}
                hitSlop={14}>
                <MaterialIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              {videoModalUri ? (
                <Video
                  source={{ uri: videoModalUri }}
                  useNativeControls
                  style={styles.videoPlayer}
                  resizeMode={ResizeMode.CONTAIN}
                />
              ) : null}
            </View>
          </Modal>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CHAT_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errText: { fontSize: 16, color: '#333', marginBottom: 12 },
  link: { color: BRAND, fontWeight: '700' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  iconBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  topbarTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  typingRow: { marginTop: 4, alignSelf: 'flex-start' },
  onlineHint: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: '78%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    marginTop: 10,
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 12 },
  modalScroll: { maxHeight: 360 },
  modalLabel: {
    fontSize: 12,
    color: '#8696a0',
    marginTop: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  modalValue: { fontSize: 16, color: '#111', marginTop: 4 },
  modalPrimaryBtn: {
    marginTop: 16,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalCloseBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
  modalCloseTxt: { color: BRAND, fontWeight: '600', fontSize: 16 },
  msgList: { paddingHorizontal: 10, paddingVertical: 14, flexGrow: 1 },
  dateChipWrap: { alignItems: 'center', marginVertical: 14 },
  dateChip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dateChipTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#54656f',
    textTransform: 'capitalize',
  },
  loadMoreBtn: { alignSelf: 'center', paddingVertical: 10, marginBottom: 8 },
  loadMoreTxt: { color: BRAND, fontWeight: '600', fontSize: 13 },
  emptyChat: {
    textAlign: 'center',
    color: '#8696a0',
    marginTop: 40,
    fontSize: 15,
  },
  bubbleWrap: { marginVertical: 0, maxWidth: '86%' },
  bubbleWrapMine: { alignSelf: 'flex-end' },
  bubbleWrapTheirs: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  bubbleMine: { backgroundColor: '#d9fdd3' },
  bubbleTheirs: { backgroundColor: '#fff' },
  bubbleText: { fontSize: 16.5, lineHeight: 22 },
  bubbleTextMine: { color: INK },
  bubbleTextTheirs: { color: INK },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 200 },
  voicePlayHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTapArea: { flex: 1, minWidth: 0 },
  voiceSpeedSpacer: { width: 44 },
  voiceBody: { flex: 1, minWidth: 0 },
  voiceWave: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 28, marginBottom: 6 },
  voiceBar: { width: 3, borderRadius: 2 },
  voiceProgressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  voiceProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(44,154,129,0.55)',
  },
  voiceMetaTxt: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  voiceMetaMine: { color: '#54656f' },
  voiceMetaTheirs: { color: '#54656f' },
  voiceSpeedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(44,154,129,0.15)',
  },
  voiceSpeedTxt: { fontSize: 11, fontWeight: '800', color: BRAND },
  replyHint: { fontSize: 11, color: '#667781', marginBottom: 4 },
  editedHint: { fontSize: 10, color: '#8696a0', marginTop: 2, fontStyle: 'italic' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  metaTime: { fontSize: 11 },
  metaMine: { color: '#667781' },
  metaTheirs: { color: '#667781' },
  tickPad: { paddingLeft: 4, justifyContent: 'center' },
  reactions: { marginTop: 4, fontSize: 14 },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    padding: 12,
  },
  lightboxImage: { width: '100%', height: '100%' },
  videoModalRoot: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  videoModalClose: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  videoPlayer: { flex: 1, width: '100%' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: CHAT_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d1d7db',
    gap: 6,
  },
  composerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    minWidth: 0,
    minHeight: 44,
    maxHeight: 132,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d7db',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    marginBottom: 2,
  },
  inputInPill: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    paddingHorizontal: 4,
    fontSize: 16,
    color: INK,
  },
  sendInPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#54656f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micBtnRec: { backgroundColor: '#c62828' },
  micBtnOff: { opacity: 0.55 },
  sendBtnOff: { opacity: 0.45 },
  sendBtnPressed: { transform: [{ scale: 0.94 }], opacity: 0.92 },
  recordingHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: 'rgba(241,245,249,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  recordingHintTxt: { color: INK, fontWeight: '800', fontSize: 12 },
  recordingHintSub: { color: MUTED, fontWeight: '600', fontSize: 12, flex: 1, textAlign: 'right' },
  recordingCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  recordingCancelTxt: { color: '#dc2626', fontWeight: '800', fontSize: 13 },
  voiceDraftBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  voiceDraftPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44,154,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceDraftTitle: { color: INK, fontWeight: '800', fontSize: 13 },
  voiceDraftMeta: { color: MUTED, fontWeight: '600', fontSize: 11, marginTop: 2 },
  voiceDraftTrash: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
