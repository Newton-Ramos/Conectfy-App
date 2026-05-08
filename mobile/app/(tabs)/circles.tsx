import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { circlesApi, type CircleSummary } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';

function iconName(icon: string): React.ComponentProps<typeof MaterialIcons>['name'] {
  const map: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
    home: 'home',
    work: 'work',
    favorite: 'favorite',
    badge: 'badge',
    'sports-soccer': 'sports-soccer',
    school: 'school',
  };
  return map[icon] ?? 'label';
}

const BRAND = '#2c9a81';

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
    if (!tag) return;
    router.push({
      pathname: '/(tabs)/contacts' as any,
      params: { tag },
    });
  };

  return (
    <View style={styles.root}>
      <View style={[styles.topbar, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity style={styles.topbarIcon} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          Meus Círculos
        </Text>
        <TouchableOpacity style={styles.topbarIcon}>
          <MaterialIcons name="menu" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2c9a81" />
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={[styles.statsWrap, statsHorizontal && styles.statsWrapRow]}>
            <TouchableOpacity
              style={[styles.statsCard, statsHorizontal && styles.statsCardGrow]}
              onPress={goTotalCirculos}
              activeOpacity={0.85}>
              <MaterialIcons name="apps" size={28} color="#111" />
              <Text style={styles.statsLabel}>Total de Círculos</Text>
              <Text style={styles.statsValue}>{resumo?.totalCirculos ?? 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statsCard, statsHorizontal && styles.statsCardGrow]}
              onPress={goTotalPessoas}
              activeOpacity={0.85}>
              <MaterialIcons name="group" size={28} color="#111" />
              <Text style={styles.statsLabel}>Total de Pessoas</Text>
              <Text style={styles.statsValue}>{resumo?.totalPessoas ?? 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statsCard, statsHorizontal && styles.statsCardGrow]}
              onPress={goMaisPopuloso}
              activeOpacity={0.85}>
              <MaterialIcons name="show-chart" size={28} color="#111" />
              <Text style={styles.statsLabel}>Mais populoso</Text>
              <Text style={[styles.statsLabel, styles.statsPopName]}>{resumo?.maisPopuloso ?? '-'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Seus Círculos</Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#111" />
          </View>

          {circles.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={styles.circleItem}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/contacts' as any,
                  params: { tag: c.key },
                })
              }>
              <View style={styles.circleIconWrap}>
                <MaterialIcons name={iconName(c.icon)} size={26} color="#111" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.circleTitle}>{c.key}</Text>
                <Text style={styles.circleSubtitle}>{c.descricao}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: c.badgeColor }]}>
                <Text style={styles.badgeText}>{c.pessoas} pessoas</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#111" />
            </TouchableOpacity>
          ))}

          <View style={styles.moreRow}>
            <TouchableOpacity style={styles.moreBtn}>
              <Text style={styles.moreText}>Mais</Text>
              <View style={styles.moreDot}>
                <MaterialIcons name="chevron-right" size={18} color="#111" />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#c4c4c4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  topbar: {
    paddingHorizontal: 12,
    minHeight: 56,
    backgroundColor: BRAND,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { fontSize: 17, fontWeight: '700', color: '#111', flex: 1, textAlign: 'center', paddingHorizontal: 4 },
  body: { flex: 1, paddingHorizontal: 12, paddingTop: 10 },
  statsWrap: { gap: 12 },
  statsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    minHeight: 57,
    borderRadius: 15,
    backgroundColor: '#f4eded',
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  statsCardGrow: {
    flex: 1,
    minWidth: 180,
    marginBottom: 12,
  },
  statsLabel: { fontSize: 16, fontWeight: '700', color: '#111', flex: 1, marginHorizontal: 8 },
  statsValue: { fontSize: 32, fontWeight: '900', color: '#111' },
  statsPopName: { fontWeight: '800', flex: 0, maxWidth: '42%', textAlign: 'right' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  circleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f4eded',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  circleIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  circleTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  circleSubtitle: { fontSize: 13, color: '#111', opacity: 0.85, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6 },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  moreRow: { alignItems: 'flex-end', marginTop: 6 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  moreText: { fontSize: 16, fontWeight: '800', color: '#111' },
  moreDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#d5d4d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
