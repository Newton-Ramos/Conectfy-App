import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { APP_SURFACE_BG, BRAND_ACCENT, BRAND_GRADIENT_COLORS } from '@/constants/brand';
import { isApiUnauthorized } from '@/lib/api-error';

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

function formatBrDate(value: string | null | undefined): string {
  if (!value) return '-';
  // aceita ISO (YYYY-MM-DD ou com horário) e também já em DD/MM/YYYY
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  return raw;
}

function formatCpf(value: string | null | undefined): string {
  if (!value) return '-';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string }>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

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
      } catch (err) {
        if (isApiUnauthorized(err)) {
          await signOut();
          router.replace('/(auth)/welcome' as any);
        }
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

  const handleAvatarAction = () => {
    if (!avatarUri) {
      void handlePickAvatar();
      return;
    }

    Alert.alert('Foto do perfil', 'O que você deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Selecionar nova foto', onPress: () => void handlePickAvatar() },
      { text: 'Remover foto', style: 'destructive', onPress: () => setAvatarUri(null) },
    ]);
  };

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Foto', 'Permissão para acessar a galeria é necessária.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (uri) setAvatarUri(uri);
    } catch {
      Alert.alert('Foto', 'Não foi possível selecionar a imagem.');
    }
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

  const isMe = !targetUserId;
  const fullName = user.nome || 'Usuário';
  const email = user.email || '';
  const headerTitle = isMe ? 'Perfil' : 'Contato';

  const addressLine = [
    user.logradouro || null,
    user.numero || null,
    user.bairro || null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>
      <LinearGradient
        colors={[...BRAND_GRADIENT_COLORS]}
        style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarLg}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={[styles.avatarLgText, { color: BRAND_ACCENT }]}>
                  {(fullName || '?').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            {!targetUserId ? (
              <TouchableOpacity
                style={styles.avatarEditBtn}
                activeOpacity={0.8}
                onPress={handleAvatarAction}
                accessibilityLabel={avatarUri ? 'Editar foto' : 'Adicionar foto'}>
                <MaterialCommunityIcons name="pencil" size={14} color={BRAND_ACCENT} />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.nameLg} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
          {user.localidade ? (
            <Text style={styles.subtle} numberOfLines={1}>
              {user.localidade}
            </Text>
          ) : null}
        </View>

        {circulos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CÍRCULOS</Text>
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
            <Text style={styles.sectionTitle}>AFINIDADES</Text>
            <Text style={styles.item} numberOfLines={3}>
              {afinidades.join(', ')}
            </Text>
          </View>
        )}

        {user.notas ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTAS</Text>
            <Text style={styles.item}>{user.notas}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DADOS PESSOAIS</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={18}
                color={stylesVars.muted}
              />
              <Text style={styles.infoLabel}>CPF</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{formatCpf(user.cpf)}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cake-variant-outline" size={18} color={stylesVars.muted} />
              <Text style={styles.infoLabel}>Nascimento</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {formatBrDate(user.dataNascimento)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ENDEREÇO</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="mailbox-outline" size={18} color={stylesVars.muted} />
              <Text style={styles.infoLabel}>CEP</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user.cep || '-'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={18} color={stylesVars.muted} />
              <Text style={styles.infoLabel}>Rua</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {addressLine || '-'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="city-variant-outline" size={18} color={stylesVars.muted} />
              <Text style={styles.infoLabel}>Cidade/UF</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {(user.cidade || '-') + ' / ' + (user.uf || '-')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="text-box-outline" size={18} color={stylesVars.muted} />
              <Text style={styles.infoLabel}>Complemento</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user.complemento || '-'}
              </Text>
            </View>
          </View>
        </View>

        {!targetUserId && (
          <>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                router.push({ pathname: '/(tabs)/edit-person' as any, params: { from: 'profile' } })
              }>
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#fff" />
              <Text style={styles.editButtonText}>Editar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <MaterialCommunityIcons name="logout" size={18} color={stylesVars.danger} />
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
                params: { userId: String(targetUserId), from: 'profile' },
              })
            }>
            <MaterialCommunityIcons name="pencil-outline" size={18} color="#fff" />
            <Text style={styles.editButtonText}>Editar contato</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const stylesVars = {
  bg: APP_SURFACE_BG,
  ink: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  danger: '#ef4444',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_SURFACE_BG },
  scrollContent: { paddingBottom: 40 },
  body: { paddingHorizontal: 16 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: stylesVars.muted },
  header: {
    height: 180,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  profileCard: {
    marginTop: -64,
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  avatarWrap: { position: 'relative' },
  avatarLg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLgText: { fontWeight: '900', fontSize: 34 },
  avatarEditBtn: {
    position: 'absolute',
    right: -2,
    top: 62,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  nameLg: { marginTop: 12, fontSize: 22, fontWeight: '800', color: stylesVars.ink },
  email: { marginTop: 4, fontSize: 14, color: stylesVars.muted },
  subtle: { marginTop: 6, fontSize: 13, color: stylesVars.muted },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: 10,
    color: stylesVars.muted,
    letterSpacing: 0.8,
    fontSize: 12,
    marginLeft: 4,
  },
  item: { color: stylesVars.ink },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  infoLabel: { width: 110, color: stylesVars.muted, fontWeight: '700' },
  infoValue: { flex: 1, color: stylesVars.ink, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(44,154,129,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: { fontWeight: '700', color: '#0d4a3e' },
  editButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: BRAND_ACCENT,
  },
  editButtonText: { color: '#fff', fontWeight: '800' },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: stylesVars.border,
  },
  logoutText: { color: stylesVars.danger, fontWeight: '800' },
});
