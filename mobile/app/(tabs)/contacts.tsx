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
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { usersApi, type ContactUser } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';
import { PREDEFINED_CIRCLE_KEYS } from '@/constants/circles';

export default function ContactsScreen() {
  const params = useLocalSearchParams<{ tag?: string; groupByCircle?: string }>();
  const tagParam = typeof params.tag === 'string' ? params.tag : null;
  const groupRaw = params.groupByCircle;
  const groupByCircle =
    groupRaw === '1' ||
    groupRaw === 'true' ||
    (Array.isArray(groupRaw) && (groupRaw[0] === '1' || groupRaw[0] === 'true'));
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

  const openAdd = () =>
    router.push({
      pathname: '/(tabs)/add-contact' as any,
    });

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
          params: { userId: String(item.id) },
        })
      }>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.nome || '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.nome || 'Usuário'}</Text>
        <Text style={styles.email}>{item.email}</Text>
        {(item.tags?.length ?? 0) > 0 && (
          <Text style={styles.tags}>{item.tags!.join(' · ')}</Text>
        )}
        {item.is_blocked && <Text style={styles.blocked}>Bloqueado</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.topbarIcon} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle} numberOfLines={1}>
          {groupByCircle ? 'Contatos por círculo' : tagParam ? `Contatos · ${tagParam}` : 'Contatos'}
        </Text>
        <TouchableOpacity style={styles.topbarIcon} onPress={openAdd}>
          <MaterialIcons name="add-circle-outline" size={22} color="#111" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchArea}>
        <View style={styles.search}>
          <MaterialIcons name="search" size={20} color="#828282" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar"
            placeholderTextColor="#828282"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.filters}>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>Filtrar</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color="#2c9a81" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn}>
            <Text style={styles.filterText}>Classificar</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color="#2c9a81" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Carregando...</Text>
        </View>
      ) : groupByCircle && sections ? (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${index}-${item.id}`}
          renderItem={({ item }) => renderItem({ item })}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeadText}>{title}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.centerText}>Nenhum contato classificado nos círculos.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.centerText}>Nenhum contato encontrado.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c4c4c4' },
  topbar: {
    paddingTop: 44,
    paddingHorizontal: 12,
    height: 94,
    backgroundColor: '#2c9a81',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  searchArea: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  search: {
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  searchInput: { flex: 1, height: 40, fontSize: 16, color: '#111' },
  filters: { flexDirection: 'row', gap: 8, marginTop: 10 },
  filterBtn: {
    borderWidth: 1,
    borderColor: '#2c9a81',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  filterText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 10,
    marginBottom: 10,
    marginHorizontal: 16,
    backgroundColor: '#dadada',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e6f6fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#0a7ea4', fontWeight: '800', fontSize: 18 },
  name: { fontWeight: '700', color: '#111' },
  email: { color: '#666', marginTop: 2, fontSize: 12 },
  tags: { color: '#2c9a81', marginTop: 4, fontSize: 12, fontWeight: '600' },
  blocked: { color: '#c44', marginTop: 4, fontSize: 12, fontWeight: '700' },
  chevron: { color: '#999', fontSize: 24, paddingHorizontal: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  centerText: { color: '#666' },
  sectionHead: {
    backgroundColor: '#b8b8b8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 6,
  },
  sectionHeadText: { fontSize: 15, fontWeight: '800', color: '#111' },
});
