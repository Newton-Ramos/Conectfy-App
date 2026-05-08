import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { auth } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  useGoogleLogin,
  useFacebookLogin,
  openInstagramLogin,
  isGoogleOAuthConfigured,
} from '@/lib/social-login';
import { useAuth } from '@/contexts/auth-context';

const BRAND = '#2c9a81';
const PRIMARY = '#0a7ea4';
const BG = '#c4c4c4';

function GoogleOAuthButton(props: {
  width: number;
  socialBusy: string | null;
  setSocialBusy: React.Dispatch<React.SetStateAction<string | null>>;
  persistSession: (access_token: string, user: object) => Promise<void>;
}) {
  const { width, socialBusy, setSocialBusy, persistSession } = props;
  const [, googleResponse, googlePromptAsync] = useGoogleLogin();

  useEffect(() => {
    const run = async () => {
      if (googleResponse?.type !== 'success') return;
      const idToken =
        googleResponse.params?.id_token ??
        (googleResponse.authentication as { idToken?: string } | null)?.idToken;
      const accessToken = googleResponse.authentication?.accessToken;
      setSocialBusy('google');
      try {
        let res;
        if (idToken) {
          res = await auth.oauthGoogle(idToken);
        } else if (accessToken) {
          res = await auth.oauthGoogleAccess(accessToken);
        } else {
          Alert.alert(
            'Google',
            'Não recebemos token do Google. Confira EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID e o SHA-1 no Google Cloud (Android).',
          );
          return;
        }
        await persistSession(res.data.access_token, res.data.user);
      } catch (e: any) {
        Alert.alert('Google', e.response?.data?.message ?? 'Falha no login');
      } finally {
        setSocialBusy(null);
      }
    };
    run();
  }, [googleResponse, persistSession, setSocialBusy]);

  return (
    <TouchableOpacity
      style={[
        styles.socialBtn,
        width < 360 && styles.socialBtnFull,
        !!socialBusy && styles.socialOff,
      ]}
      disabled={!!socialBusy}
      onPress={() => googlePromptAsync()}>
      {socialBusy === 'google' ? (
        <ActivityIndicator />
      ) : (
        <FontAwesome5 name="google" size={20} color="#4285F4" />
      )}
      <Text style={styles.socialLabel}>Google</Text>
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const gutter = Math.min(22, Math.max(12, Math.round(width * 0.045)));
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialBusy, setSocialBusy] = useState<string | null>(null);
  const router = useRouter();
  const { signIn } = useAuth();

  const googleConfigured = isGoogleOAuthConfigured();
  const fbConfigured = !!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const igConfigured = !!process.env.EXPO_PUBLIC_INSTAGRAM_APP_ID;

  const [, fbResponse, fbPromptAsync] = useFacebookLogin();

  const persistSession = useCallback(
    async (access_token: string, user: object) => {
      await signIn(access_token, user);
      router.replace('/(tabs)' as any);
    },
    [router, signIn],
  );

  useEffect(() => {
    const run = async () => {
      if (fbResponse?.type !== 'success') return;
      const at =
        fbResponse.authentication?.accessToken ?? fbResponse.params?.access_token;
      if (!at) return;
      setSocialBusy('facebook');
      try {
        const res = await auth.oauthFacebook(at);
        await persistSession(res.data.access_token, res.data.user);
      } catch (e: any) {
        Alert.alert('Facebook', e.response?.data?.message ?? 'Falha no login');
      } finally {
        setSocialBusy(null);
      }
    };
    run();
  }, [fbResponse, persistSession]);

  const handleLogin = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !senha) {
      Alert.alert('Erro', 'E-mail e senha são obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const response = await auth.login(e, senha);
      await persistSession(response.data.access_token, response.data.user);
    } catch (error: unknown) {
      Alert.alert('Erro', getApiErrorMessage(error, 'E-mail ou senha inválidos'));
    } finally {
      setLoading(false);
    }
  };

  const handleInstagram = async () => {
    if (!igConfigured) {
      Alert.alert(
        'Instagram',
        'Configure EXPO_PUBLIC_INSTAGRAM_APP_ID e o redirect no Meta Developer Console.',
      );
      return;
    }
    setSocialBusy('instagram');
    try {
      const got = await openInstagramLogin();
      if (!got) {
        setSocialBusy(null);
        return;
      }
      const res = await auth.oauthInstagramComplete(got.code, got.redirectUri);
      await persistSession(res.data.access_token, res.data.user);
    } catch (e: any) {
      Alert.alert('Instagram', e.message ?? e.response?.data?.message ?? 'Falha no login');
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.brandRow}>
              <View style={styles.logoRing}>
                <Text style={styles.logoLetter}>C</Text>
              </View>
              <Text style={styles.brandText}>Conectfy</Text>
            </View>
            <Text style={styles.heroSubtitle}>Entre com e-mail e senha</Text>
          </View>

          <View style={[styles.card, { marginHorizontal: gutter, paddingHorizontal: gutter + 4 }]}>
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#828282"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#828282"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Entrar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.forgotWrap}
              onPress={() => router.push('/(auth)/forgot-password' as any)}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou entre com</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={[styles.socialRow, width < 360 && styles.socialRowStack]}>
              {googleConfigured ? (
                <GoogleOAuthButton
                  width={width}
                  socialBusy={socialBusy}
                  setSocialBusy={setSocialBusy}
                  persistSession={persistSession}
                />
              ) : (
                <TouchableOpacity
                  style={[
                    styles.socialBtn,
                    width < 360 && styles.socialBtnFull,
                    styles.socialOff,
                  ]}
                  disabled>
                  <FontAwesome5 name="google" size={20} color="#4285F4" />
                  <Text style={styles.socialLabel}>Google</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  width < 360 && styles.socialBtnFull,
                  (!fbConfigured || socialBusy) && styles.socialOff,
                ]}
                disabled={!fbConfigured || !!socialBusy}
                onPress={() => fbPromptAsync()}>
                {socialBusy === 'facebook' ? (
                  <ActivityIndicator />
                ) : (
                  <FontAwesome5 name="facebook-f" size={20} color="#1877F2" />
                )}
                <Text style={styles.socialLabel}>Facebook</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.socialBtn,
                  width < 360 && styles.socialBtnFull,
                  (!igConfigured || socialBusy) && styles.socialOff,
                ]}
                disabled={!igConfigured || !!socialBusy}
                onPress={handleInstagram}>
                {socialBusy === 'instagram' ? (
                  <ActivityIndicator />
                ) : (
                  <MaterialIcons name="photo-camera" size={22} color="#E1306C" />
                )}
                <Text style={styles.socialLabel}>Instagram</Text>
              </TouchableOpacity>
            </View>
            {!googleConfigured && (
              <Text style={styles.hint}>
                Google: defina EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (e no Android, opcionalmente
                EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID + SHA-1 no Google Cloud)
              </Text>
            )}
            {!fbConfigured && (
              <Text style={styles.hint}>Facebook: defina EXPO_PUBLIC_FACEBOOK_APP_ID</Text>
            )}
            {!igConfigured && (
              <Text style={styles.hint}>Instagram: defina EXPO_PUBLIC_INSTAGRAM_APP_ID</Text>
            )}

            <TouchableOpacity
              style={styles.registerWrap}
              onPress={() =>
                router.push({
                  pathname: '/(auth)/register' as any,
                  params: { email: email.trim().toLowerCase() },
                })
              }
              disabled={loading}>
              <Text style={styles.registerText}>Não tem conta? Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  hero: {
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  logoRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: { color: '#fff', fontSize: 24, fontWeight: '900' },
  brandText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  heroSubtitle: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.9,
    textAlign: 'center',
  },
  card: {
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    marginTop: -16,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.55 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  forgotWrap: { marginTop: 14, alignItems: 'center' },
  forgotText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#ddd' },
  dividerText: { color: '#666', fontSize: 12, fontWeight: '600' },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  socialRowStack: {
    flexDirection: 'column',
  },
  socialBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  socialBtnFull: {
    width: '100%',
    flex: 0,
    minHeight: 52,
    flexDirection: 'row',
  },
  socialOff: { opacity: 0.45 },
  socialLabel: { fontSize: 11, fontWeight: '700', color: '#333' },
  hint: { fontSize: 10, color: '#888', marginTop: 6, textAlign: 'center' },
  registerWrap: { marginTop: 22, alignItems: 'center' },
  registerText: { color: PRIMARY, fontWeight: '700', fontSize: 15 },
});
