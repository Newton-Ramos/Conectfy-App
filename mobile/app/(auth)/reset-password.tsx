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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { auth } from '@/api/client';
import { useAuth } from '@/contexts/auth-context';

const BRAND = '#2c9a81';
const PRIMARY = '#0a7ea4';

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova senha</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Token</Text>
        <TextInput
          style={styles.input}
          placeholder="Cole o token recebido"
          placeholderTextColor="#999"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          editable={!loading}
        />
        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          secureTextEntry
          value={nova}
          onChangeText={setNova}
          editable={!loading}
        />
        <Text style={styles.label}>Confirmar senha</Text>
        <TextInput
          style={styles.input}
          placeholder="Repita a senha"
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#c4c4c4' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 16,
    backgroundColor: BRAND,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    minHeight: 56,
  },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontWeight: '700', color: '#111', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  cta: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaOff: { opacity: 0.6 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
