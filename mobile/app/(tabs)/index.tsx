import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
  useWindowDimensions,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationsApi, type NotificationRow } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';

const BRAND = '#2c9a81';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 420;
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const [rsvpBusy, setRsvpBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      await signOut();
      router.replace('/(auth)/welcome' as any);
    } finally {
      setLoading(false);
    }
  }, [router, signOut]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const hoje = items.filter((n) => n.grupo === 'hoje');
  const ontem = items.filter((n) => n.grupo === 'ontem');
  const rest = items.filter((n) => n.grupo !== 'hoje' && n.grupo !== 'ontem');

  const openNotification = (n: NotificationRow) => {
    setSelected(n);
    setDetailOpen(true);
  };

  const submitRsvp = async (status: 'sim' | 'nao') => {
    if (!selected) return;
    setRsvpBusy(true);
    try {
      const res = await notificationsApi.rsvp(selected.id, status);
      setItems((prev) => prev.map((x) => (x.id === selected.id ? { ...x, ...res.data } : x)));
      setSelected((s) => (s ? { ...s, ...res.data } : null));
      Alert.alert('Presença', status === 'sim' ? 'Confirmado!' : 'Resposta registrada.');
      setDetailOpen(false);
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a confirmação.');
    } finally {
      setRsvpBusy(false);
    }
  };

  const formatEventWhen = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNoticeRow = (n: NotificationRow) => (
    <TouchableOpacity key={n.id} style={styles.noticeCard} onPress={() => openNotification(n)} activeOpacity={0.85}>
      <Text style={styles.noticeText}>{n.title}</Text>
      {n.kind === 'evento' ? (
        <Text style={styles.noticeHint}>Toque para detalhes e presença</Text>
      ) : (
        <Text style={styles.noticeHint}>Toque para ver</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerTop}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>C</Text>
            </View>
            <Text style={styles.brandText}>Conectfy</Text>
          </View>

          <View style={[styles.headerIcons, isWide && styles.headerIconsWide]}>
            <TouchableOpacity
              style={[styles.headerIcon, styles.headerIconGrow]}
              onPress={() => router.push('/(tabs)/calendar' as any)}
              accessibilityLabel="Calendário e datas importantes">
              <MaterialIcons name="event" size={22} color="#111" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIcon, styles.headerIconGrow]}
              onPress={() => setNotifCenterOpen(true)}
              accessibilityLabel="Central de notificações">
              {items.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{items.length > 9 ? '9+' : String(items.length)}</Text>
                </View>
              )}
              <MaterialIcons name="notifications" size={22} color="#111" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.search}>
          <MaterialIcons name="search" size={20} color="#828282" />
          <TextInput placeholder="Buscar" placeholderTextColor="#828282" style={styles.searchInput} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2c9a81" />
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={styles.sectionTitle}>Círculos</Text>

          <View style={[styles.circleRow, isWide && styles.circleRowWide]}>
            <TouchableOpacity
              style={[styles.circleCard, isWide ? styles.circleCardWide : styles.circleCardNarrow]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/contacts' as any,
                  params: { tag: 'Família' },
                })
              }>
              <MaterialIcons name="home" size={28} color="#111" />
              <Text style={styles.circleLabel}>Família</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.circleCard, isWide ? styles.circleCardWide : styles.circleCardNarrow]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/contacts' as any,
                  params: { tag: 'Amigos' },
                })
              }>
              <MaterialIcons name="favorite" size={28} color="#111" />
              <Text style={styles.circleLabel}>Amigos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.circleCard, isWide ? styles.circleCardWide : styles.circleCardNarrow]}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/contacts' as any,
                  params: { tag: 'Trabalho' },
                })
              }>
              <MaterialIcons name="work" size={28} color="#111" />
              <Text style={styles.circleLabel}>Trabalho</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.actionRow, isWide && styles.actionRowWide]}>
            <TouchableOpacity style={[styles.pill, styles.pillFlex]} onPress={() => router.push('/(tabs)/contacts' as any)}>
              <Text style={styles.pillText}>Contatos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, styles.pillFlex, styles.pillGrow]}
              onPress={() => router.push('/(tabs)/add-contact' as any)}>
              <Text style={styles.pillText}>Adicionar novo contato</Text>
              <MaterialIcons name="add-circle-outline" size={18} color="#111" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.pill, styles.pillSelfStart]}
            onPress={() => router.push('/(tabs)/calendar' as any)}>
            <Text style={styles.pillText}>Eventos e datas</Text>
            <MaterialIcons name="calendar-month" size={18} color="#111" />
          </TouchableOpacity>

          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Notificações importantes</Text>
            {hoje.length > 0 && <Text style={styles.subHeader}>Hoje</Text>}
            {hoje.map(renderNoticeRow)}
            {ontem.length > 0 && <Text style={styles.subHeader}>Ontem</Text>}
            {ontem.map(renderNoticeRow)}
            {rest.length > 0 && <Text style={styles.subHeader}>Mais</Text>}
            {rest.map(renderNoticeRow)}
            {items.length === 0 && (
              <Text style={styles.emptyNote}>Nenhuma notificação no momento.</Text>
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={notifCenterOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNotifCenterOpen(false)}>
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNotifCenterOpen(false)} hitSlop={12}>
              <Text style={styles.modalClose}>Fechar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Notificações</Text>
            <View style={{ width: 56 }} />
          </View>
          <FlatList
            data={items}
            keyExtractor={(n) => String(n.id)}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.centerRow}
                onPress={() => {
                  setNotifCenterOpen(false);
                  openNotification(item);
                }}>
                <Text style={styles.centerRowTitle}>{item.title}</Text>
                <Text style={styles.centerRowSub}>{item.grupo}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyNote}>Nada por aqui.</Text>}
          />
        </View>
      </Modal>

      <Modal visible={detailOpen} transparent animationType="fade" onRequestClose={() => setDetailOpen(false)}>
        <Pressable style={styles.detailOverlay} onPress={() => setDetailOpen(false)}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            {selected ? (
              <>
                <Text style={styles.detailTitle}>{selected.title}</Text>
                {selected.body ? <Text style={styles.detailBody}>{selected.body}</Text> : null}
                {selected.kind === 'evento' && selected.eventAt ? (
                  <Text style={styles.detailWhen}>{formatEventWhen(selected.eventAt)}</Text>
                ) : null}
                {selected.rsvpStatus ? (
                  <Text style={styles.rsvpTag}>
                    Presença: {selected.rsvpStatus === 'sim' ? 'Sim' : 'Não'}
                  </Text>
                ) : null}

                {selected?.kind === 'evento' ? (
                  <View style={styles.rsvpRow}>
                    <TouchableOpacity
                      style={[styles.rsvpBtn, styles.rsvpSim]}
                      disabled={rsvpBusy}
                      onPress={() => void submitRsvp('sim')}>
                      <Text style={styles.rsvpBtnTxt}>Confirmar presença</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rsvpBtn, styles.rsvpNao]}
                      disabled={rsvpBusy}
                      onPress={() => void submitRsvp('nao')}>
                      <Text style={styles.rsvpBtnTxt}>Não vou</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setDetailOpen(false)}>
                  <Text style={styles.detailCloseTxt}>Fechar</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#c4c4c4' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    backgroundColor: BRAND,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  brandMarkText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  brandText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  headerIcons: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  headerIconsWide: { gap: 12 },
  headerIcon: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 18,
    backgroundColor: '#d5d4d4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerIconGrow: { flexGrow: 1, maxWidth: 160 },
  badge: {
    position: 'absolute',
    right: -2,
    top: -6,
    minWidth: 16,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#ff2b2b',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  search: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 16, color: '#111' },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 10 },
  circleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10, justifyContent: 'space-between' },
  circleRowWide: { justifyContent: 'flex-start', gap: 16 },
  circleCard: {
    backgroundColor: '#7cbcad',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 14,
  },
  circleCardNarrow: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    maxWidth: '33%',
    minHeight: 104,
  },
  circleCardWide: {
    flex: 1,
    minWidth: 120,
    maxWidth: 200,
    minHeight: 104,
  },
  circleLabel: { fontSize: 16, fontWeight: '700', color: '#111', textAlign: 'center' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  actionRowWide: { gap: 16 },
  pill: {
    minHeight: 44,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  pillFlex: { minWidth: 118 },
  pillGrow: { flex: 1, minWidth: 160 },
  pillSelfStart: { alignSelf: 'flex-start', marginTop: 10 },
  pillText: { fontSize: 14, fontWeight: '600', color: '#111', flexShrink: 1 },
  subHeader: { marginTop: 8, color: '#111', fontSize: 16 },
  noticeCard: {
    marginTop: 8,
    backgroundColor: '#f4eded',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  noticeText: { fontSize: 14, fontWeight: '600', color: '#111', textAlign: 'center' },
  noticeHint: { fontSize: 12, color: '#555', marginTop: 6 },
  emptyNote: { marginTop: 8, color: '#666', textAlign: 'center' },
  modalRoot: { flex: 1, backgroundColor: '#e8e8e8' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  modalClose: { fontSize: 16, color: BRAND, fontWeight: '600', width: 56 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  centerRow: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    backgroundColor: '#f4eded',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
  },
  centerRowTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  centerRowSub: { fontSize: 12, color: '#666', marginTop: 4, textTransform: 'capitalize' },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  detailTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  detailBody: { fontSize: 15, color: '#333', marginTop: 12, lineHeight: 22 },
  detailWhen: { fontSize: 14, color: BRAND, marginTop: 10, fontWeight: '600' },
  rsvpTag: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#333' },
  rsvpRow: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  rsvpBtn: { flex: 1, minWidth: 120, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rsvpSim: { backgroundColor: BRAND },
  rsvpNao: { backgroundColor: '#888' },
  rsvpBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  detailCloseBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  detailCloseTxt: { color: BRAND, fontWeight: '700', fontSize: 16 },
});
