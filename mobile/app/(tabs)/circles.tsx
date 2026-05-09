import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { circlesApi, type CircleSummary } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';
import { circleAccentSolid, circleIconBackdrop } from '@/constants/circles';

function iconName(icon: string): React.ComponentProps<typeof MaterialIcons>['name'] {
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

const BRAND = '#2c9a81';
const BG = '#f8fafc';
const INK = '#1e293b';
const MUTED = '#64748b';
const BADGE_EMPTY = '#94a3b8';

/** Gradiente do card “Mais populoso”: BRAND → tom mais claro. */
const FEATURED_GRADIENT = ['#2c9a81', '#52cba8'] as const;
const FEATURED_GRADIENT_EMPTY = ['#94a3b8', '#cbd5e1'] as const;

export default function CirclesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const statsHorizontal = width >= 720;
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<{
    totalCirculos: number;
    totalPessoas: number;
    maisPopuloso: string;
  } | null>(null);
  const [circles, setCircles] = useState<CircleSummary[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await circlesApi.summary();
      setResumo(res.data.resumo);
      setCircles(res.data.circles);
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

  const maisPopTag = resumo?.maisPopuloso?.trim();
  const hasMaisPopuloso = Boolean(maisPopTag && maisPopTag !== '-');

  const maisPopCount = useMemo(() => {
    if (!hasMaisPopuloso || !maisPopTag) return 0;
    const row = circles.find((c) => c.key === maisPopTag);
    return row?.pessoas ?? 0;
  }, [circles, hasMaisPopuloso, maisPopTag]);

  const maisPopSubtitle = useMemo(() => {
    if (!hasMaisPopuloso) {
      return 'Classifique seus contatos por círculo para ver este insight aqui.';
    }
    const n = maisPopCount;
    const word = n === 1 ? 'conexão' : 'conexões';
    return `Sua maior rede atual com ${n} ${word}`;
  }, [hasMaisPopuloso, maisPopCount]);

  const goTotalCirculos = () => {
    router.push({
      pathname: '/(tabs)/contacts' as any,
      params: { groupByCircle: '1' },
    });
  };

  const goTotalPessoas = () => {
    router.push('/(tabs)/contacts' as any);
  };

  const goMaisPopuloso = () => {
    const tag = resumo?.maisPopuloso?.trim();
    if (!tag || tag === '-') return;
    router.push({
      pathname: '/(tabs)/contacts' as any,
      params: { tag },
    });
  };

  const featuredInk = hasMaisPopuloso ? '#ffffff' : '#334155';
  const featuredMuted = hasMaisPopuloso ? 'rgba(255,255,255,0.88)' : '#475569';

  return (
    <View style={styles.root}>
      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topbarIcon} onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          Meus Círculos
        </Text>
        <TouchableOpacity style={styles.topbarIcon} hitSlop={12}>
          <MaterialIcons name="menu" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={BRAND} />
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
          <View style={[styles.statsWrap, statsHorizontal && styles.statsWrapRow]}>
            <TouchableOpacity
              style={[styles.statsCard, statsHorizontal && styles.statsCardGrow]}
              onPress={goTotalCirculos}
              activeOpacity={0.85}>
              <MaterialIcons name="apps" size={26} color={BRAND} />
              <Text style={styles.statsLabel}>Total de Círculos</Text>
              <Text style={styles.statsValue}>{resumo?.totalCirculos ?? 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statsCard, statsHorizontal && styles.statsCardGrow]}
              onPress={goTotalPessoas}
              activeOpacity={0.85}>
              <MaterialIcons name="group" size={26} color={BRAND} />
              <Text style={styles.statsLabel}>Total de Pessoas</Text>
              <Text style={styles.statsValue}>{resumo?.totalPessoas ?? 0}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.featuredWrap}
            onPress={goMaisPopuloso}
            activeOpacity={hasMaisPopuloso ? 0.92 : 1}
            disabled={!hasMaisPopuloso}>
            <LinearGradient
              colors={hasMaisPopuloso ? [...FEATURED_GRADIENT] : [...FEATURED_GRADIENT_EMPTY]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featuredCard}>
              <View style={styles.featuredTitleRow}>
                <MaterialIcons name="emoji-events" size={26} color={featuredInk} />
                <Text style={[styles.featuredKicker, { color: featuredMuted }]}>Mais populoso</Text>
              </View>
              <Text style={[styles.featuredCategory, { color: featuredInk }]} numberOfLines={2}>
                {hasMaisPopuloso ? maisPopTag : '—'}
              </Text>
              <Text style={[styles.featuredSub, { color: featuredMuted }]}>{maisPopSubtitle}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Seus Círculos</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={INK} />
          </View>

          {circles.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="groups" size={40} color={BRAND} />
              <Text style={styles.emptyTitle}>Nenhum círculo ainda</Text>
              <Text style={styles.emptySub}>
                Ao classificar contatos com tags (Família, Trabalho…), eles aparecem aqui automaticamente.
              </Text>
            </View>
          ) : (
            circles.map((c) => {
              const hasPeople = c.pessoas > 0;
              const accent = circleAccentSolid(c.key);
              const iconBg = circleIconBackdrop(c.key, 0.1);
              const badgeBg = hasPeople ? accent : BADGE_EMPTY;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={styles.circleItem}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/contacts' as any,
                      params: { tag: c.key },
                    })
                  }
                  activeOpacity={0.85}>
                  <View style={[styles.circleIconWrap, { backgroundColor: iconBg }]}>
                    <MaterialIcons name={iconName(c.icon)} size={26} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.circleTitle}>{c.key}</Text>
                    <Text style={styles.circleSubtitle} numberOfLines={2}>
                      {c.descricao}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                    <Text style={styles.badgeText}>
                      {c.pessoas} {c.pessoas === 1 ? 'pessoa' : 'pessoas'}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={MUTED} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
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

const featuredShadow = Platform.select({
  ios: {
    shadowColor: '#15a085',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
  },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  topbar: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    backgroundColor: BRAND,
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
  body: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
  statsWrap: { gap: 12, marginBottom: 28 },
  statsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    minHeight: 64,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...cardShadow,
  },
  statsCardGrow: {
    flex: 1,
    minWidth: 160,
    marginBottom: 0,
  },
  statsLabel: { fontSize: 14, fontWeight: '700', color: INK, flex: 1, marginHorizontal: 10 },
  statsValue: { fontSize: 28, fontWeight: '900', color: INK },
  featuredWrap: {
    marginBottom: 22,
    borderRadius: 16,
    overflow: 'hidden',
    ...featuredShadow,
  },
  featuredCard: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  featuredKicker: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  featuredCategory: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  featuredSub: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: INK },
  circleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    ...cardShadow,
  },
  circleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTitle: { fontSize: 16, fontWeight: '800', color: INK },
  circleSubtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...cardShadow,
  },
  emptyTitle: { marginTop: 12, fontSize: 17, fontWeight: '800', color: INK },
  emptySub: { marginTop: 8, fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
});
