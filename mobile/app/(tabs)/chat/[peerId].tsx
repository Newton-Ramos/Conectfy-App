import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Audio } from 'expo-av';
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

const BRAND = '#2c9a81';
const WHATSAPP_BG = '#e5ddd5';
const TICK_GRAY = '#8696a0';
const TICK_BLUE = '#53bdeb';

const PAGE_SIZE = 40;

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
  const [playingId, setPlayingId] = useState<number | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

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
          router.back();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peerId, connectSocket, loadMe, loadHistory, loadPeerName, loadPeerProfile, router]);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      void recordingRef.current?.stopAndUnloadAsync();
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
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
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

  useEffect(() => {
    if (messages.length > 0) {
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

  const send = async () => {
    const text = draft.trim();
    if (!text || peerId === null || myId === null) return;
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

  const sendVoiceMessage = async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (!rec || peerId === null || myId === null) return;
    let uri: string | null = null;
    let durationSec = 1;
    try {
      const beforeStop = await rec.getStatusAsync();
      durationSec = Math.max(
        1,
        Math.round((beforeStop.durationMillis ?? 1000) / 1000),
      );
      await rec.stopAndUnloadAsync();
      uri = rec.getURI() ?? null;
    } catch {
      Alert.alert('Erro', 'Falha ao finalizar a gravação');
      return;
    }
    if (!uri) {
      Alert.alert('Erro', 'Áudio inválido');
      return;
    }
    setSending(true);
    const content = '🎤 Mensagem de voz';
    try {
      const up = await messagesApi.uploadVoice(uri);
      const mediaUrl = up.data.mediaUrl;
      let msg: ChatMessage | null = await sendViaSocket(content, {
        mediaType: 'voice',
        mediaUrl,
        mediaDurationSec: durationSec,
      });
      if (!msg) {
        const res = await messagesApi.send(peerId, content, {
          mediaType: 'voice',
          mediaUrl,
          mediaDurationSec: durationSec,
        });
        msg = res.data as ChatMessage;
      }
      if (msg) setMessages((prev) => mergeUnique(prev, [msg]));
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      Alert.alert('Erro', err.response?.data?.message ?? 'Não foi possível enviar o áudio');
    } finally {
      setSending(false);
    }
  };

  const toggleRecord = async () => {
    if (isRecording) {
      await sendVoiceMessage();
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
      setIsRecording(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
    }
  };

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
      return;
    }
    try {
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: src });
      soundRef.current = sound;
      setPlayingId(msg.id);
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && 'didJustFinish' in st && st.didJustFinish) {
          setPlayingId(null);
          void sound.unloadAsync();
        }
      });
      await sound.playAsync();
    } catch {
      Alert.alert('Erro', 'Não foi possível reproduzir o áudio.');
      setPlayingId(null);
    }
  };

  const loadOlder = async () => {
    if (peerId === null || !hasMore || loadingMore || nextBeforeId == null) return;
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

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
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
            params: { userId: String(peerId) },
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

  const renderMsg = ({ item }: { item: ChatMessage }) => {
    const mine = myId !== null && item.senderId === myId;
    const showDeleted = !!item.deletedAt;
    const isVoice = item.mediaType === 'voice' && !!item.mediaUrl;

    return (
      <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {item.parentMessageId ? (
            <Text style={styles.replyHint}>↪ Resposta</Text>
          ) : null}
          {isVoice && !showDeleted ? (
            <TouchableOpacity
              style={styles.voiceRow}
              onPress={() => void togglePlayVoice(item)}
              hitSlop={8}>
              <MaterialIcons
                name={playingId === item.id ? 'pause' : 'play-arrow'}
                size={28}
                color={mine ? '#075e54' : BRAND}
              />
              <Text style={[styles.bubbleText, mine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                Áudio
                {item.mediaDurationSec != null ? ` · ${item.mediaDurationSec}s` : ''}
              </Text>
            </TouchableOpacity>
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
                <TickRow status={item.status} />
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

  if (peerId === null) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errText}>Contato inválido</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const profile = peerProfile;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <View style={[styles.topbar, { paddingTop: Math.max(insets.top, 8) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
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
              <Text style={styles.typingHint} numberOfLines={1}>
                digitando…
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
      </View>

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
                  params: { userId: String(peerId) },
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMsg}
            contentContainerStyle={styles.msgList}
            onScroll={onScroll}
            scrollEventThrottle={400}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
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
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={onDraftChange}
              placeholder="Mensagem"
              placeholderTextColor="#8696a0"
              multiline
              maxLength={4000}
            />
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnRec]}
              onPress={() => void toggleRecord()}
              disabled={sending}>
              <MaterialIcons name={isRecording ? 'stop' : 'mic'} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, (sending || !draft.trim()) && styles.sendBtnOff]}
              onPress={() => void send()}
              disabled={sending || !draft.trim()}>
              {sending && !isRecording ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <MaterialIcons name="send" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          {isRecording ? (
            <Text style={styles.recordingHint}>Gravando… toque no microfone para enviar</Text>
          ) : null}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHATSAPP_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errText: { fontSize: 16, color: '#333', marginBottom: 12 },
  link: { color: BRAND, fontWeight: '700' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    paddingHorizontal: 4,
    paddingBottom: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
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
  typingHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
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
  msgList: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },
  loadMoreBtn: { alignSelf: 'center', paddingVertical: 10, marginBottom: 8 },
  loadMoreTxt: { color: BRAND, fontWeight: '600', fontSize: 13 },
  emptyChat: {
    textAlign: 'center',
    color: '#8696a0',
    marginTop: 40,
    fontSize: 15,
  },
  bubbleWrap: { marginVertical: 3, maxWidth: '88%' },
  bubbleWrapMine: { alignSelf: 'flex-end' },
  bubbleWrapTheirs: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 1,
      },
      android: { elevation: 1 },
    }),
  },
  bubbleMine: { backgroundColor: '#dcf8c6' },
  bubbleTheirs: { backgroundColor: '#fff' },
  bubbleText: { fontSize: 16, lineHeight: 20 },
  bubbleTextMine: { color: '#111' },
  bubbleTextTheirs: { color: '#111' },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: '#f0f2f5',
    gap: 6,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    marginBottom: 2,
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
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnOff: { opacity: 0.6 },
  recordingHint: {
    textAlign: 'center',
    color: '#c62828',
    fontWeight: '600',
    paddingBottom: 8,
    backgroundColor: '#f0f2f5',
  },
});
