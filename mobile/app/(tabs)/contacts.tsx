import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SectionList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi, type ContactUser } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';
import { PREDEFINED_CIRCLE_KEYS, CIRCLE_BADGE_BG } from '@/constants/circles';
import { APP_SURFACE_BG, BRAND_ACCENT, BRAND_GRADIENT_COLORS } from '@/constants/brand';
import { LinearGradient } from 'expo-linear-gradient';
import { hrefContactsListBack } from '@/lib/detail-screen-back';
import { isApiUnauthorized } from '@/lib/api-error';

const BRAND = BRAND_ACCENT;
const BG = APP_SURFACE_BG;
const INK = '#1e293b';
const MUTED = '#64748b';
const SEARCH_BG = '#f1f5f9';

function badgeColorForCircle(tag: string): string {
  return CIRCLE_BADGE_BG[tag] ?? '#64748b';
}

export default function ContactsScreen() {
  const params = useLocalSearchParams<{ tag?: string; groupByCircle?: string; backSrc?: string }>();
  const tagParam = typeof params.tag === 'string' ? params.tag : null;
  const groupRaw = params.groupByCircle;
  const groupByCircle =
    groupRaw === '1' ||
    groupRaw === 'true' ||
    (Array.isArray(groupRaw) && (groupRaw[0] === '1' || groupRaw[0] === 'true'));
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<ContactUser[]>([]);
  const router = useRouter();
  const { signOut } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await usersApi.me();
      const res = await usersApi.contactsList();
      setUsers(res.data);
    } catch (err) {
      if (isApiUnauthorized(err)) {
        await signOut();
        router.replace('/(auth)/welcome' as any);
      }
    } finally {
      setLoading(false);
    }
  }, [router, signOut]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openAdd = () => {
    const backSrc = typeof params.backSrc === 'string' ? params.backSrc : undefined;
    router.push({
      pathname: '/(tabs)/add-contact' as any,
      params: { from: backSrc === 'home' ? 'home' : 'contacts' },
    });
  };

  const goBackFromContacts = () => {
    router.navigate(hrefContactsListBack(params as Record<string, string | string[] | undefined>));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tag = (tagParam ?? '').trim().toLowerCase();

    let base = users;
    if (tag) {
      base = base.filter((u) => (u.tags ?? []).some((t) => String(t).toLowerCase() === tag));
    }
    if (!q) return base;
    return base.filter(
      (u) =>
        (u.nome ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q),
    );
  }, [query, tagParam, users]);

  const sections = useMemo(() => {
    if (!groupByCircle) return null;
    return PREDEFINED_CIRCLE_KEYS.map((key) => ({
      title: key,
      data: filtered.filter((u) => (u.tags ?? []).includes(key)),
    })).filter((s) => s.data.length > 0);
  }, [groupByCircle, filtered]);

  const renderItem = ({ item }: { item: ContactUser }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/edit-person' as any,
          params: { userId: String(item.id), from: 'contacts' },
        })
      }
      activeOpacity={0.85}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.nome || '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={1}>
          {item.nome || 'Usuário'}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {item.email}
        </Text>
        {(item.tags?.length ?? 0) > 0 ? (
          <View style={styles.badgeRow}>
            {(item.tags ?? []).map((tag) => (
              <View key={tag} style={[styles.circleBadge, { backgroundColor: badgeColorForCircle(tag) }]}>
                <Text style={styles.circleBadgeText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {item.is_blocked ? <Text style={styles.blocked}>Bloqueado</Text> : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={MUTED} />
    </TouchableOpacity>
  );

  const listEmpty = (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <MaterialIcons name="person-add-alt-1" size={40} color={BRAND} />
      </View>
      <Text style={styles.emptyTitle}>Você ainda não possui contatos cadastrados.</Text>
      <Text style={styles.emptySub}>Toque no + para começar.</Text>
    </View>
  );

  const filteredEmpty = filtered.length === 0 && users.length > 0;

  const sectionEmpty =
    users.length === 0 ? (
      listEmpty
    ) : (
      <View style={styles.emptyWrap}>
        <MaterialIcons name="groups" size={36} color={MUTED} />
        <Text style={styles.emptyTitle}>Nenhum contato classificado nos círculos.</Text>
        <Text style={styles.emptySub}>Atribua tags ao editar um contato.</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...BRAND_GRADIENT_COLORS]} style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topbarIcon} onPress={goBackFromContacts} hitSlop={12}>
          <MaterialIcons name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {groupByCircle ? 'Contatos por círculo' : tagParam ? `Contatos · ${tagParam}` : 'Contatos'}
        </Text>
        <TouchableOpacity style={styles.topbarIcon} onPress={openAdd} hitSlop={12}>
          <MaterialIcons name="add-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.searchArea}>
        <View style={styles.search}>
          <MaterialIcons name="search" size={22} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={BRAND} size="large" />
          <Text style={styles.centerText}>Carregando...</Text>
        </View>
      ) : groupByCircle && sections ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => renderItem({ item })}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeadText}>{title}</Text>
            </View>
          )}
          contentContainerStyle={[
            styles.listPad,
            sections.length === 0 ? styles.flexGrow : null,
          ]}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={sectionEmpty}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listPad, filtered.length === 0 ? styles.flexGrow : null]}
          ListEmptyComponent={
            users.length === 0 ? (
              listEmpty
            ) : filteredEmpty ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="search-off" size={36} color={MUTED} />
                <Text style={styles.emptyTitle}>Nenhum resultado</Text>
                <Text style={styles.emptySub}>Tente outro termo de busca.</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topbar: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
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
  topbarIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center', paddingHorizontal: 4 },
  searchArea: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  search: {
    minHeight: 44,
    borderRadius: 20,
    backgroundColor: SEARCH_BG,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: INK, paddingVertical: Platform.OS === 'ios' ? 10 : 8 },
  listPad: { paddingBottom: 28 },
  flexGrow: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    ...cardShadow,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(44,154,129,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: BRAND, fontWeight: '900', fontSize: 18 },
  name: { fontWeight: '800', color: INK, fontSize: 16 },
  email: { color: MUTED, marginTop: 2, fontSize: 13 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  circleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  circleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  blocked: { color: '#dc2626', marginTop: 6, fontSize: 12, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  centerText: { color: MUTED },
  sectionHead: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  sectionHeadText: { fontSize: 13, fontWeight: '800', color: MUTED, letterSpacing: 0.6 },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 10,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(44,154,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: INK, textAlign: 'center' },
  emptySub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
});
