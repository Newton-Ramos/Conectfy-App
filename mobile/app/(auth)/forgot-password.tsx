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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { auth } from '@/api/client';

const BRAND = '#2c9a81';
const PRIMARY = '#0a7ea4';

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recuperar senha</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          A senha antiga será removida. Você receberá um token para cadastrar uma nova senha.
        </Text>
        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="seu@email.com"
          placeholderTextColor="#999"
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
  lead: { color: '#333', marginBottom: 20, lineHeight: 22 },
  label: { fontWeight: '700', color: '#111', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  cta: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaOff: { opacity: 0.6 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: { color: PRIMARY, fontWeight: '600', textAlign: 'center' },
});
