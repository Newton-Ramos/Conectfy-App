import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { auth } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';
import { AUTH_GRADIENT_COLORS, BRAND_ACCENT } from '@/constants/brand';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState('');
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.token && typeof params.token === 'string') {
      setToken(params.token);
    }
  }, [params.token]);

  const handleSubmit = async () => {
    if (!token.trim()) {
      Alert.alert('Atenção', 'Cole o token de recuperação');
      return;
    }
    if (nova.length < 6) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (nova !== confirma) {
      Alert.alert('Atenção', 'As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.resetPassword(token.trim(), nova);
      await signIn(res.data.access_token, res.data.user);
      Alert.alert('Pronto', 'Senha alterada com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)' as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message ?? 'Token inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[...AUTH_GRADIENT_COLORS]} style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nova senha</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.label}>Token</Text>
            <TextInput
              style={styles.input}
              placeholder="Cole o token recebido"
              placeholderTextColor="#8696a0"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              editable={!loading}
            />
            <Text style={styles.label}>Nova senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#8696a0"
              secureTextEntry
              value={nova}
              onChangeText={setNova}
              editable={!loading}
            />
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Repita a senha"
              placeholderTextColor="#8696a0"
              secureTextEntry
              value={confirma}
              onChangeText={setConfirma}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.cta, loading && styles.ctaOff]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Salvar nova senha</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 16,
    minHeight: 52,
  },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 20,
    padding: 22,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  label: { fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    color: '#0f172a',
  },
  cta: {
    backgroundColor: BRAND_ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaOff: { opacity: 0.6 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
