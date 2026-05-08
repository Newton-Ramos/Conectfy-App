import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';

type User = {
  id: number;
  nome: string;
  email: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  localidade?: string | null;
  notas?: string | null;
  circulos?: string[] | null;
  afinidades?: string[] | null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const params = useLocalSearchParams<{ userId?: string }>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const targetUserId = useMemo(() => {
    const id = params.userId ? Number(params.userId) : NaN;
    return Number.isFinite(id) ? id : null;
  }, [params.userId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (targetUserId) {
          const res = await api.get(`/users/${targetUserId}`);
          setUser(res.data);
          return;
        }

        const res = await api.get('/users/me');
        setUser(res.data);
      } catch {
        await signOut();
        router.replace('/(auth)/welcome' as any);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router, signOut, targetUserId]);

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/welcome' as any);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={styles.muted}>Carregando...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Usuário não encontrado.</Text>
      </View>
    );
  }

  const circulos = user.circulos ?? [];
  const afinidades = user.afinidades ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.nome || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.nome}</Text>
          <Text style={styles.muted}>{user.email}</Text>
          {user.localidade ? (
            <Text style={styles.localidade}>{user.localidade}</Text>
          ) : null}
        </View>
      </View>

      {circulos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Círculos</Text>
          <View style={styles.chipRow}>
            {circulos.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {afinidades.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Afinidades</Text>
          <Text style={styles.item}>{afinidades.join(', ')}</Text>
        </View>
      )}

      {user.notas ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Text style={styles.item}>{user.notas}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados</Text>
        <Text style={styles.item}>
          <Text style={styles.label}>CPF:</Text> {user.cpf || '-'}
        </Text>
        <Text style={styles.item}>
          <Text style={styles.label}>Nascimento:</Text>{' '}
          {user.dataNascimento
            ? String(user.dataNascimento).slice(0, 10)
            : '-'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Endereço</Text>
        <Text style={styles.item}>
          <Text style={styles.label}>CEP:</Text> {user.cep || '-'}
        </Text>
        <Text style={styles.item}>
          <Text style={styles.label}>Rua:</Text> {user.logradouro || '-'}, {user.numero || '-'}
        </Text>
        <Text style={styles.item}>
          <Text style={styles.label}>Bairro:</Text> {user.bairro || '-'}
        </Text>
        <Text style={styles.item}>
          <Text style={styles.label}>Cidade/UF:</Text> {user.cidade || '-'} / {user.uf || '-'}
        </Text>
        <Text style={styles.item}>
          <Text style={styles.label}>Complemento:</Text> {user.complemento || '-'}
        </Text>
      </View>

      {!targetUserId && (
        <>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/(tabs)/edit-person' as any)}>
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </>
      )}

      {targetUserId ? (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/edit-person' as any,
              params: { userId: String(targetUserId) },
            })
          }>
          <Text style={styles.editButtonText}>Editar contato</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#0a7ea4', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e6f6fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#0a7ea4', fontWeight: '900', fontSize: 20 },
  name: { fontWeight: '800', color: '#111', fontSize: 16 },
  muted: { color: '#666' },
  localidade: { color: '#2c9a81', marginTop: 4, fontWeight: '600' },
  section: {
    borderWidth: 1,
    borderColor: '#f2f2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  sectionTitle: { fontWeight: '800', marginBottom: 8, color: '#111' },
  item: { color: '#222', marginBottom: 4 },
  label: { fontWeight: '700', color: '#333' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#b8e6d9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { fontWeight: '600', color: '#0d4a3e' },
  editButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#2c9a81',
  },
  editButtonText: { color: '#fff', fontWeight: '800' },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#e84b3c',
  },
  logoutText: { color: '#fff', fontWeight: '800' },
});
