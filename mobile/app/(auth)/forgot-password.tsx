import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { auth } from '@/api/client';
import { AUTH_GRADIENT_COLORS, BRAND_ACCENT } from '@/constants/brand';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    const e = email.trim().toLowerCase();
    if (!e) {
      Alert.alert('Atenção', 'Informe o e-mail');
      return;
    }
    setLoading(true);
    try {
      const res = await auth.forgotPassword(e);
      const token = res.data.resetToken;
      if (token) {
        router.push({
          pathname: '/(auth)/reset-password' as any,
          params: { token },
        });
        return;
      }
      Alert.alert('Recuperação', res.data.message);
      router.back();
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message ?? 'Tente novamente');
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
          <Text style={styles.headerTitle}>Recuperar senha</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.lead}>
              A senha antiga será removida. Você receberá um token para cadastrar uma nova senha.
            </Text>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              placeholderTextColor="#8696a0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.cta, loading && styles.ctaOff]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaText}>Enviar recuperação</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/reset-password' as any)}>
              <Text style={styles.link}>Já tenho o token — definir nova senha</Text>
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
  lead: { color: '#334155', marginBottom: 20, lineHeight: 22, fontSize: 15 },
  label: { fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    color: '#0f172a',
  },
  cta: {
    backgroundColor: BRAND_ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaOff: { opacity: 0.6 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { color: BRAND_ACCENT, fontWeight: '700', textAlign: 'center', fontSize: 15 },
});
