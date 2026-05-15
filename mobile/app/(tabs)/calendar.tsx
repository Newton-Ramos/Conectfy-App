import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { hrefCalendarBack } from '@/lib/detail-screen-back';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { calendarApi, type CalendarEventRow } from '@/api/client';
import { APP_SURFACE_BG, BRAND_ACCENT, BRAND_GRADIENT_COLORS } from '@/constants/brand';

const BRAND = BRAND_ACCENT;
const BG = APP_SURFACE_BG;
const INK = '#1e293b';
const MUTED = '#64748b';

export default function CalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ backSrc?: string }>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<CalendarEventRow[]>([]);

  const refresh = useCallback(async () => {
    try {
      const res = await calendarApi.list();
      const list = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
      setItems(list);
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const goBack = () => {
    router.navigate(hrefCalendarBack(params as Record<string, string | string[] | undefined>));
  };

  const openNew = () => {
    router.push('/(tabs)/event-create' as never);
  };

  const removeEv = (id: number) => {
    Alert.alert('Remover?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await calendarApi.remove(id);
            await refresh();
          } catch {
            Alert.alert('Erro', 'Não foi possível remover o evento.');
          }
        },
      },
    ]);
  };

  const formatRow = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...BRAND_GRADIENT_COLORS]} style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topbarIcon} onPress={goBack} hitSlop={12}>
          <MaterialIcons name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Calendário</Text>
        <TouchableOpacity style={styles.topbarIcon} onPress={openNew} hitSlop={12}>
          <MaterialIcons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name="event-busy" size={34} color={BRAND} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum evento ainda</Text>
            <Text style={styles.emptySub}>Toque em + para criar um evento ou data importante.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDate}>{formatRow(item.dateIso)}</Text>
              {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => removeEv(item.id)} hitSlop={10}>
              <MaterialIcons name="delete-outline" size={22} color="#a33" />
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={openNew}>
        <MaterialIcons name="event" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topbar: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  topbarIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  listPad: { padding: 16, paddingBottom: 100 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: 60 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(44,154,129,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: INK },
  emptySub: { marginTop: 6, fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: INK },
  cardDate: { fontSize: 13, color: MUTED, marginTop: 4 },
  cardNotes: { fontSize: 13, color: MUTED, marginTop: 6 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
