import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  ActionSheetIOS,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Swipeable } from 'react-native-gesture-handler';
import { messagesApi, usersApi, type ConversationPreview, type ContactUser } from '@/api/client';
import {
  loadChatPrefs,
  toggleMute,
  archiveConversation,
  unarchiveConversation,
  clearPeerLocalPrefs,
  type ArchivedChat,
} from '@/lib/chat-local-prefs';

const BRAND = '#2c9a81';
const BG = '#f6f6f6';

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function formatListTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function ConversationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [prefs, setPrefs] = useState<{ archived: ArchivedChat[]; muted: number[] }>({
    archived: [],
    muted: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pickOpen, setPickOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [pickLoading, setPickLoading] = useState(false);
  const [pickQuery, setPickQuery] = useState('');

  const [archivedOpen, setArchivedOpen] = useState(false);

  const refreshPrefs = useCallback(async () => {
    const p = await loadChatPrefs();
    setPrefs({ archived: p.archived, muted: p.muted });
  }, []);

  const load = useCallback(async () => {
    try {
      const [res, p] = await Promise.all([messagesApi.conversations(), loadChatPrefs()]);
      setPrefs({ archived: p.archived, muted: p.muted });
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(
        list.map((row) => ({
          ...row,
          id: Number(row.id),
          unreadCount: Number(row.unreadCount ?? 0),
        })),
      );
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        await load();
        if (alive) setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const archivedIds = useMemo(() => new Set(prefs.archived.map((a) => a.peerId)), [prefs.archived]);

  const visibleItems = useMemo(
    () => items.filter((c) => !archivedIds.has(c.id)),
    [items, archivedIds],
  );

  const openChat = (c: ConversationPreview) => {
    router.push({
      pathname: '/(tabs)/chat/[peerId]',
      params: { peerId: String(c.id), peerName: c.nome ?? '' },
    });
  };

  const openPickContacts = async () => {
    setPickOpen(true);
    setPickQuery('');
    setPickLoading(true);
    try {
      await usersApi.me();
      const res = await usersApi.contactsList();
      setContacts(Array.isArray(res.data) ? res.data : []);
    } catch {
      setContacts([]);
      Alert.alert('Erro', 'Não foi possível carregar os contatos');
    } finally {
      setPickLoading(false);
    }
  };

  const pickFiltered = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (u) =>
        (u.nome ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q),
    );
  }, [contacts, pickQuery]);

  const startChatFromContact = (u: ContactUser) => {
    setPickOpen(false);
    router.push({
      pathname: '/(tabs)/chat/[peerId]',
      params: { peerId: String(u.id), peerName: u.nome ?? '' },
    });
  };

  const handleMarkRead = async (c: ConversationPreview) => {
    try {
      await messagesApi.markRead(c.id);
      await load();
    } catch {
      Alert.alert('Erro', 'Não foi possível marcar como lido');
    }
  };

  const handleArchive = async (c: ConversationPreview) => {
    await archiveConversation(c.id, c.nome ?? '');
    await refreshPrefs();
  };

  const handleDelete = (c: ConversationPreview) => {
    Alert.alert(
      'Excluir conversa?',
      'As mensagens serão removidas. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await messagesApi.deleteConversation(c.id);
              await clearPeerLocalPrefs(c.id);
              await load();
              await refreshPrefs();
            } catch (e: any) {
              Alert.alert('Erro', e.response?.data?.message ?? 'Falha ao excluir');
            }
          },
        },
      ],
    );
  };

  const showRowMenu = (c: ConversationPreview) => {
    const muted = prefs.muted.includes(c.id);
    const muteLabel = muted ? 'Reativar notificações' : 'Silenciar notificações';

    const runMute = async () => {
      await toggleMute(c.id);
      await refreshPrefs();
    };

    const runRead = () => handleMarkRead(c);
    const runArchive = () => handleArchive(c);
    const runDelete = () => handleDelete(c);

    if (Platform.OS === 'ios') {
      const opts = [muteLabel, 'Marcar como lido', 'Arquivar conversa', 'Excluir conversa', 'Cancelar'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: opts,
          cancelButtonIndex: 4,
          destructiveButtonIndex: 3,
          userInterfaceStyle: 'light',
        },
        (i) => {
          if (i === 0) void runMute();
          else if (i === 1) void runRead();
          else if (i === 2) void runArchive();
          else if (i === 3) runDelete();
        },
      );
    } else {
      Alert.alert(c.nome || 'Conversa', undefined, [
        { text: muteLabel, onPress: () => void runMute() },
        { text: 'Marcar como lido', onPress: () => void runRead() },
        { text: 'Arquivar conversa', onPress: () => void runArchive() },
        { text: 'Excluir conversa', style: 'destructive', onPress: () => runDelete() },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const renderRightActions = (c: ConversationPreview) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        activeOpacity={0.85}
        onPress={() => handleDelete(c)}>
        <MaterialIcons name="delete" size={24} color="#fff" />
        <Text style={styles.deleteText}>Excluir</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: ConversationPreview }) => {
    const muted = prefs.muted.includes(item.id);
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        rightThreshold={56}>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => openChat(item)}
          onLongPress={() => showRowMenu(item)}
          delayLongPress={380}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(item.nome || '?')}</Text>
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.peerName} numberOfLines={1}>
                {item.nome || 'Usuário'}
              </Text>
              <View style={styles.rowTopRight}>
                {muted ? (
                  <MaterialIcons name="notifications-off" size={16} color="#8696a0" style={styles.muteIcon} />
                ) : null}
                <Text style={styles.time}>{formatListTime(item.lastMessageTime)}</Text>
              </View>
            </View>
            <View style={styles.rowBottom}>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage || 'Sem mensagens'}
              </Text>
              {item.unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversas</Text>
        <TouchableOpacity
          onPress={openPickContacts}
          hitSlop={12}
          style={styles.headerBtn}
          accessibilityLabel="Nova conversa">
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {prefs.archived.length > 0 ? (
        <TouchableOpacity style={styles.archivedBar} onPress={() => setArchivedOpen(true)} activeOpacity={0.7}>
          <MaterialIcons name="archive" size={22} color={BRAND} />
          <Text style={styles.archivedBarText}>Arquivadas ({prefs.archived.length})</Text>
          <MaterialIcons name="chevron-right" size={22} color="#8696a0" />
        </TouchableOpacity>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            visibleItems.length === 0 ? styles.emptyContainer : styles.listContent
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
              <Text style={styles.emptySub}>
                Toque em + para escolher um contato e começar.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}

      <Modal visible={pickOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickOpen(false)}>
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPickOpen(false)} hitSlop={12}>
              <Text style={styles.modalCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nova conversa</Text>
            <View style={{ width: 72 }} />
          </View>
          <View style={styles.pickSearch}>
            <MaterialIcons name="search" size={22} color="#8696a0" />
            <TextInput
              style={styles.pickSearchInput}
              placeholder="Buscar contato"
              placeholderTextColor="#8696a0"
              value={pickQuery}
              onChangeText={setPickQuery}
            />
          </View>
          {pickLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={BRAND} />
            </View>
          ) : (
            <FlatList
              data={pickFiltered}
              keyExtractor={(u) => String(u.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickRow} onPress={() => startChatFromContact(item)}>
                  <View style={styles.pickAvatar}>
                    <Text style={styles.pickAvatarTxt}>{initials(item.nome || '?')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickName}>{item.nome || 'Usuário'}</Text>
                    <Text style={styles.pickEmail} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                  <MaterialIcons name="chat" size={22} color={BRAND} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.pickEmpty}>Nenhum contato encontrado.</Text>
              }
              contentContainerStyle={styles.pickList}
            />
          )}
        </View>
      </Modal>

      <Modal visible={archivedOpen} animationType="fade" transparent onRequestClose={() => setArchivedOpen(false)}>
        <Pressable style={styles.archOverlay} onPress={() => setArchivedOpen(false)}>
          <Pressable style={styles.archSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.archSheetTitle}>Conversas arquivadas</Text>
            <FlatList
              data={prefs.archived}
              keyExtractor={(a) => String(a.peerId)}
              renderItem={({ item }) => (
                <View style={styles.archRow}>
                  <Text style={styles.archName} numberOfLines={1}>
                    {item.nome}
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      await unarchiveConversation(item.peerId);
                      await refreshPrefs();
                    }}>
                    <Text style={styles.archUn}>Desarquivar</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.pickEmpty}>Nenhuma arquivada.</Text>}
            />
            <TouchableOpacity style={styles.archCloseBtn} onPress={() => setArchivedOpen(false)}>
              <Text style={styles.archCloseTxt}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 8,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', flex: 1 },
  headerBtn: { padding: 6 },
  archivedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e9edef',
  },
  archivedBarText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 24 },
  emptyContainer: { flexGrow: 1 },
  emptyInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySub: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  rowPressed: { backgroundColor: '#f0f2f5' },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#c8ebe3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: BRAND },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  rowTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muteIcon: { marginRight: 2 },
  peerName: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111' },
  time: { fontSize: 12, color: '#889096', fontVariant: ['tabular-nums'] },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 15, color: '#667781' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#e9edef', marginLeft: 82 },
  modalRoot: { flex: 1, backgroundColor: BG },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  modalCancel: { fontSize: 17, color: BRAND, width: 72 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  pickSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#fff',
    gap: 8,
  },
  pickSearchInput: { flex: 1, fontSize: 16, color: '#111', paddingVertical: 8 },
  pickList: { paddingBottom: 40 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e9edef',
    gap: 12,
  },
  pickAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#c8ebe3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickAvatarTxt: { fontSize: 16, fontWeight: '800', color: BRAND },
  pickName: { fontSize: 16, fontWeight: '700', color: '#111' },
  pickEmail: { fontSize: 14, color: '#667781', marginTop: 2 },
  pickEmpty: { textAlign: 'center', color: '#8696a0', marginTop: 24, paddingHorizontal: 24 },
  deleteAction: {
    backgroundColor: '#e53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 92,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  archOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  archSheet: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    maxHeight: '70%',
  },
  archSheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: '#111' },
  archRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 12,
  },
  archName: { flex: 1, fontSize: 16, color: '#111' },
  archUn: { fontSize: 15, fontWeight: '700', color: BRAND },
  archCloseBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },
  archCloseTxt: { fontSize: 16, fontWeight: '600', color: BRAND },
});
