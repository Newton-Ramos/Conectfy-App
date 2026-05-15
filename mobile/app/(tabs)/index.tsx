import React, { useCallback, useMemo, useState } from 'react';
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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { circlesApi, notificationsApi, type CircleSummary, type NotificationRow } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';
import { BRAND_GRADIENT_COLORS, BRAND_TEAL_DEEP, LOGO_IMAGE, SLOGAN_UPPER } from '@/constants/brand';
import { circleAccentSolid, circleIconBackdrop } from '@/constants/circles';
import { NetworkMotif } from '@/components/brand/NetworkMotif';
import { isDemoOwnerEmail, isRaquelEmail } from '@/lib/demo-owner';
import { isApiUnauthorized } from '@/lib/api-error';

const BRAND = BRAND_TEAL_DEEP;
const PAGE_BG = '#f8fafc';
const INK = '#0f172a';
const MUTED = '#94a3b8';
const SUBTLE = '#64748b';
const GUTTER = 16;
/** Metade da barra de busca “invade” o verde (~26–30px). */
const SEARCH_HALF_OVERLAP = 28;
/** Puxa o corpo para perto da busca (elimina faixa branca vazia). */
const BODY_PULLUP = 30;
/** Altura útil da barra de busca flutuante (minHeight + margem inferior). */
const SEARCH_BAR_HEIGHT = 54;
/** Espaço no topo do scroll para o título não ficar atrás da busca. */
const SCROLL_TOP_INSET = SEARCH_BAR_HEIGHT - BODY_PULLUP + 12;

/** Cards de círculo: fundo colorido suave em todo o chip (sem “quadrado branco”). */
const CIRCLE_CHIPS: {
  key: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  accent: string;
  cardBg: string;
  iconBg: string;
}[] = [
  {
    key: 'Família',
    icon: 'home',
    accent: '#c2410c',
    cardBg: '#fff7ed',
    iconBg: 'rgba(234, 88, 12, 0.22)',
  },
  {
    key: 'Amigos',
    icon: 'favorite',
    accent: '#be123c',
    cardBg: '#fff1f2',
    iconBg: 'rgba(225, 29, 72, 0.2)',
  },
  {
    key: 'Trabalho',
    icon: 'work',
    accent: '#334155',
    cardBg: '#f1f5f9',
    iconBg: 'rgba(71, 85, 105, 0.18)',
  },
  {
    key: 'Networking',
    icon: 'badge',
    accent: '#1d4ed8',
    cardBg: '#eff6ff',
    iconBg: 'rgba(37, 99, 235, 0.18)',
  },
];

type HomeCircleChip = {
  key: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  accent: string;
  cardBg: string;
  iconBg: string;
  pessoas?: number;
};

const CHIP_PRESET = Object.fromEntries(CIRCLE_CHIPS.map((c) => [c.key, c]));

function circleIconName(icon: string): React.ComponentProps<typeof MaterialIcons>['name'] {
  const map: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
    home: 'home',
    work: 'work',
    favorite: 'favorite',
    badge: 'badge',
    'sports-soccer': 'sports-soccer',
    school: 'school',
    label: 'label',
  };
  return map[icon] ?? 'label';
}

function homeChipFromSummary(c: CircleSummary): HomeCircleChip {
  const preset = CHIP_PRESET[c.key];
  if (preset) {
    return { ...preset, pessoas: c.pessoas };
  }
  const accent = circleAccentSolid(c.key);
  return {
    key: c.key,
    icon: circleIconName(c.icon),
    accent,
    cardBg: circleIconBackdrop(c.key, 0.12),
    iconBg: circleIconBackdrop(c.key, 0.22),
    pessoas: c.pessoas,
  };
}

function pickTimelineIcon(n: NotificationRow): {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bubble: string;
} {
  const k = (n.kind || '').toLowerCase();
  const t = (n.title || '').toLowerCase();

  /* Aniversário / Agatha — rosa suave */
  if (k === 'aniversario' || t.includes('aniversário') || t.includes('aniversario') || t.includes('agatha')) {
    return { name: 'cake', color: '#be185d', bubble: '#fce7f3' };
  }

  /* Happy Hour / João / convite — amarelo suave */
  if (
    t.includes('happy hour') ||
    t.includes('joão') ||
    t.includes('joao') ||
    t.includes('convid') ||
    t.includes('bar ')
  ) {
    return { name: 'celebration', color: '#b45309', bubble: '#fef9c3' };
  }

  /* Carina / sistema / grupo — azul suave */
  if (t.includes('carina') || t.includes('adicionad') || t.includes('grupo')) {
    return { name: 'group-add', color: '#1d4ed8', bubble: '#dbeafe' };
  }

  if (k === 'evento') {
    return { name: 'event', color: BRAND_TEAL_DEEP, bubble: '#d1fae5' };
  }

  if (k === 'mensagem') {
    return { name: 'chat-bubble', color: '#0369a1', bubble: '#e0f2fe' };
  }

  return { name: 'notifications', color: SUBTLE, bubble: '#f1f5f9' };
}

function formatFeedRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 48) return `${h} h`;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 420;
  const { signOut, user, isReady: authReady } = useAuth();
  const isDemoOwner = isDemoOwnerEmail(user?.email);
  const isRaquel = isRaquelEmail(user?.email);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [userCircles, setUserCircles] = useState<CircleSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationRow | null>(null);
  const [rsvpBusy, setRsvpBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [notifRes, circlesRes] = await Promise.all([
        notificationsApi.list(),
        isDemoOwner ? Promise.resolve(null) : circlesApi.summary(),
      ]);
      setItems(Array.isArray(notifRes.data) ? notifRes.data : []);
      setUserCircles(
        circlesRes && Array.isArray(circlesRes.data.circles) ? circlesRes.data.circles : [],
      );
    } catch (err) {
      if (isApiUnauthorized(err)) {
        await signOut();
        router.replace('/(auth)/welcome' as any);
        return;
      }
      setItems([]);
      setUserCircles([]);
    } finally {
      setLoading(false);
    }
  }, [router, signOut, isDemoOwner, user?.id, user?.email]);

  useFocusEffect(
    useCallback(() => {
      if (!authReady) return;
      load();
    }, [load, authReady]),
  );

  const circleChips = useMemo((): HomeCircleChip[] => {
    if (isDemoOwner) return CIRCLE_CHIPS;
    return userCircles.map(homeChipFromSummary);
  }, [isDemoOwner, userCircles]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.body || '').toLowerCase().includes(q) ||
        (n.grupo || '').toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const hoje = filteredItems.filter((n) => n.grupo === 'hoje');
  const ontem = filteredItems.filter((n) => n.grupo === 'ontem');
  const rest = filteredItems.filter((n) => n.grupo !== 'hoje' && n.grupo !== 'ontem');

  const badgeCount = items.length > 9 ? '9+' : String(Math.max(items.length, 0));
  const showBadge = items.length > 0;

  const emptyFeedNote = useMemo(() => {
    if (searchQuery.trim()) return 'Nenhum resultado para sua busca.';
    if (items.length > 0) return '';
    if (isDemoOwner) return 'Nenhuma notificação no momento.';
    if (isRaquel) return 'Seu painel está limpo. Adicione contatos quando quiser começar.';
    return 'Nenhuma atualização no momento.';
  }, [items.length, isDemoOwner, isRaquel, searchQuery]);

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

  const renderTimelineItem = (n: NotificationRow, isLast: boolean) => {
    const icon = pickTimelineIcon(n);
    return (
      <View key={n.id} style={styles.tlItem}>
        <View style={styles.tlAxis}>
          {!isLast ? <View style={styles.tlVline} /> : null}
          <View style={[styles.tlDot, { backgroundColor: icon.bubble }]}>
            <MaterialIcons name={icon.name} size={17} color={icon.color} />
          </View>
        </View>
        <TouchableOpacity
          style={styles.tlBody}
          onPress={() => openNotification(n)}
          activeOpacity={0.88}>
          <Text style={styles.tlTitle} numberOfLines={2}>
            {n.title}
          </Text>
          <Text style={styles.tlHint}>
            {formatFeedRelative(n.createdAt)} ·{' '}
            {n.kind === 'evento'
              ? 'Toque para detalhes e presença'
              : n.kind === 'aniversario'
                ? 'Lembrete de aniversário'
                : n.kind === 'sistema'
                  ? 'Atualização de círculo ou grupo'
                  : 'Toque para ver detalhes'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGroup = (label: string, list: NotificationRow[]) => {
    if (list.length === 0) return null;
    return (
      <View style={styles.groupBlock}>
        <Text style={styles.groupLabel}>{label}</Text>
        <View style={styles.tlList}>
          {list.map((n, i) => renderTimelineItem(n, i === list.length - 1))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Bloco de identidade — gradiente + base arredondada */}
      <LinearGradient
        colors={[...BRAND_GRADIENT_COLORS]}
        start={{ x: 0.15, y: 1 }}
        end={{ x: 0.85, y: 0 }}
        style={[
          styles.identityBand,
          {
            paddingTop: insets.top + 14,
            paddingBottom: 12,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          },
        ]}>
        <NetworkMotif opacity={0.22} />
        <View style={styles.headerTop}>
          <View style={styles.brand}>
            <Image source={LOGO_IMAGE} style={styles.brandLogo} contentFit="contain" accessibilityLabel="Conectfy" />
            <View style={styles.brandTextCol}>
              <Text style={styles.brandText}>Conectfy</Text>
              <Text style={styles.brandSlogan} numberOfLines={2}>
                {SLOGAN_UPPER}
              </Text>
            </View>
          </View>

          <View style={[styles.headerIcons, isWide && styles.headerIconsWide]}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/calendar' as any,
                  params: { backSrc: 'home' },
                })
              }
              accessibilityLabel="Calendário e datas importantes">
              <MaterialIcons name="event" size={23} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setNotifCenterOpen(true)}
              accessibilityLabel="Central de notificações">
              {showBadge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeCount}</Text>
                </View>
              ) : null}
              <MaterialIcons name={showBadge ? 'notifications' : 'notifications-none'} size={23} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Busca: ~metade dentro do verde, ~metade no corpo branco */}
      <View style={[styles.searchFloatOuter, { paddingHorizontal: GUTTER, marginTop: -SEARCH_HALF_OVERLAP }]}>
        <View style={styles.searchFloating}>
          <View style={styles.searchIconSlot}>
            <MaterialIcons name="search" size={22} color={SUBTLE} />
          </View>
          <TextInput
            placeholder="Buscar conexões, grupos ou eventos..."
            placeholderTextColor={MUTED}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              style={styles.searchIconSlot}
              onPress={() => setSearchQuery('')}
              hitSlop={10}>
              <MaterialIcons name="close" size={20} color={MUTED} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={BRAND} size="large" />
        </View>
      ) : (
        <ScrollView
          style={[styles.bodyScroll, { marginTop: -BODY_PULLUP }]}
          contentContainerStyle={[
            styles.bodyContent,
            { paddingBottom: 32 + insets.bottom, paddingHorizontal: GUTTER },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionTitle, styles.sectionFirst]}>Círculos</Text>

          {circleChips.length === 0 ? (
            <View style={styles.circlesEmpty}>
              <MaterialIcons name="hub" size={36} color={BRAND} />
              <Text style={styles.circlesEmptyTitle}>Nenhum círculo classificado</Text>
              <Text style={styles.circlesEmptySub}>
                Ao adicionar contatos e marcar tags como Família ou Trabalho, seus círculos aparecem aqui.
              </Text>
              <TouchableOpacity
                style={styles.circlesEmptyBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/add-contact' as any,
                    params: { from: 'home' },
                  })
                }
                activeOpacity={0.9}>
                <Text style={styles.circlesEmptyBtnText}>Adicionar primeiro contato</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.circleRow, circleChips.length < 4 && styles.circleRowSparse]}>
              {circleChips.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.circleCard, { backgroundColor: c.cardBg }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/contacts' as any,
                      params: { tag: c.key, backSrc: 'home' },
                    })
                  }
                  activeOpacity={0.9}>
                  <View style={styles.circleIconShell}>
                    <NetworkMotif opacity={0.35} />
                    <View style={[styles.circleIconRound, { backgroundColor: c.iconBg }]}>
                      <MaterialIcons name={c.icon} size={26} color={c.accent} />
                    </View>
                  </View>
                  <Text style={[styles.circleCardLabel, { color: c.accent }]} numberOfLines={2}>
                    {c.key}
                  </Text>
                  {!isDemoOwner && c.pessoas != null && c.pessoas > 0 ? (
                    <Text style={[styles.circleCardCount, { color: c.accent }]}>
                      {c.pessoas} {c.pessoas === 1 ? 'contato' : 'contatos'}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.quickSectionLabel}>Ações rápidas</Text>
          <View style={[styles.quickRow, isWide && styles.actionRowWide]}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() =>
                router.push({ pathname: '/(tabs)/contacts' as any, params: { backSrc: 'home' } })
              }
              activeOpacity={0.88}>
              <MaterialIcons name="format-list-bulleted" size={22} color={BRAND_TEAL_DEEP} />
              <Text style={styles.quickCardTitle}>Gerenciar Lista</Text>
              <Text style={styles.quickCardSub}>Contatos e círculos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCardPrimary}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/add-contact' as any,
                  params: { from: 'home' },
                })
              }
              activeOpacity={0.9}>
              <MaterialIcons name="person-add-alt-1" size={22} color="#fff" />
              <Text style={styles.quickCardPrimaryTitle}>Adicionar Rápido</Text>
              <Text style={styles.quickCardPrimarySub}>Novo contato</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.notifSection}>
            <Text style={[styles.sectionTitle, styles.notifSectionTitle]}>Painel de Atualizações</Text>
            {renderGroup('Hoje', hoje)}
            {renderGroup('Ontem', ontem)}
            {rest.length > 0 ? renderGroup('Anteriores', rest) : null}
            {filteredItems.length === 0 && emptyFeedNote ? (
              <Text style={styles.emptyNote}>{emptyFeedNote}</Text>
            ) : null}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={notifCenterOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotifCenterOpen(false)}>
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

                {selected.kind === 'evento' ? (
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

const floatShadow = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  identityBand: {
    position: 'relative',
    paddingHorizontal: GUTTER,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#145c4d',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
    }),
  },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 12,
    marginBottom: 40,
    zIndex: 2,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, zIndex: 2 },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  brandTextCol: { flex: 1, minWidth: 0, justifyContent: 'center' },
  brandText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSlogan: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    lineHeight: 12,
  },
  headerIcons: { flexDirection: 'row', gap: 12, flexShrink: 0, alignItems: 'center' },
  headerIconsWide: { gap: 14 },
  headerIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  badge: {
    position: 'absolute',
    right: -5,
    top: -7,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: BRAND_TEAL_DEEP,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  searchFloatOuter: {
    marginBottom: 4,
    zIndex: 10,
  },
  searchFloating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 50,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: '#e8eef4',
    ...floatShadow,
  },
  searchIconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: INK,
    minHeight: 44,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    margin: 0,
    textAlignVertical: 'center',
  },
  bodyScroll: { flex: 1 },
  bodyContent: {
    paddingTop: SCROLL_TOP_INSET,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: INK,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  sectionFirst: {
    marginTop: 0,
    marginBottom: 14,
  },
  circleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 14,
  },
  circleRowSparse: {
    justifyContent: 'flex-start',
  },
  circlesEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  circlesEmptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },
  circlesEmptySub: {
    marginTop: 6,
    fontSize: 13,
    color: SUBTLE,
    textAlign: 'center',
    lineHeight: 19,
  },
  circlesEmptyBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: BRAND_TEAL_DEEP,
  },
  circlesEmptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  circleCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  circleIconShell: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  circleIconRound: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  circleCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 15,
  },
  circleCardCount: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    opacity: 0.85,
  },
  quickSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: SUBTLE,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 20,
  },
  actionRowWide: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  quickCard: {
    flex: 1,
    minHeight: 108,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },
  quickCardSub: {
    fontSize: 11,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
  },
  quickCardPrimary: {
    flex: 1,
    minHeight: 108,
    borderRadius: 16,
    backgroundColor: BRAND_TEAL_DEEP,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_TEAL_DEEP,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  quickCardPrimaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  quickCardPrimarySub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  notifSection: {
    marginTop: 0,
    paddingBottom: 8,
  },
  notifSectionTitle: {
    marginBottom: 8,
  },
  groupBlock: { marginBottom: 14 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: SUBTLE,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tlList: { paddingLeft: 2 },
  tlItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 58,
  },
  tlAxis: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
  },
  /** Linha da timeline — mais grossa e discreta */
  tlVline: {
    position: 'absolute',
    top: 24,
    left: 18,
    width: 4,
    bottom: -6,
    backgroundColor: '#dfe7f0',
    borderRadius: 2,
    opacity: 0.95,
  },
  tlDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginTop: 4,
  },
  tlBody: {
    flex: 1,
    paddingBottom: 14,
    paddingLeft: 10,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8eef4',
  },
  tlTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: INK,
    lineHeight: 21,
  },
  tlHint: {
    fontSize: 13,
    color: MUTED,
    marginTop: 5,
    fontWeight: '500',
  },
  emptyNote: { marginTop: 16, color: SUBTLE, textAlign: 'center', fontSize: 14, lineHeight: 22 },
  modalRoot: { flex: 1, backgroundColor: PAGE_BG },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  modalClose: { fontSize: 16, color: BRAND, fontWeight: '600', width: 56 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: INK },
  centerRow: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
  },
  centerRowTitle: { fontSize: 15, fontWeight: '700', color: INK },
  centerRowSub: { fontSize: 12, color: MUTED, marginTop: 4, textTransform: 'capitalize' },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  detailTitle: { fontSize: 18, fontWeight: '800', color: INK },
  detailBody: { fontSize: 15, color: '#334155', marginTop: 12, lineHeight: 22 },
  detailWhen: { fontSize: 14, color: BRAND, marginTop: 10, fontWeight: '600' },
  rsvpTag: { marginTop: 10, fontSize: 14, fontWeight: '700', color: '#334155' },
  rsvpRow: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  rsvpBtn: { flex: 1, minWidth: 120, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rsvpSim: { backgroundColor: BRAND },
  rsvpNao: { backgroundColor: '#64748b' },
  rsvpBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
  detailCloseBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  detailCloseTxt: { color: BRAND, fontWeight: '700', fontSize: 16 },
});
