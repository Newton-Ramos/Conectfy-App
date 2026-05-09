import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { WelcomeNetworkLower } from '@/components/brand/WelcomeNetworkLower';
import { BrandSparkles } from '@/components/brand/BrandSparkles';
import {
  useGoogleLogin,
  openInstagramLogin,
  isGoogleOAuthConfigured,
} from '@/lib/social-login';
import { useAuth } from '@/contexts/auth-context';
import { useAuth as useSocialAuth } from '@/hooks/useAuth';

const BRAND = '#2c9a81';
const PRIMARY = BRAND;
const BG = '#f1f5f9';
const INK = '#0f172a';
const MUTED = '#64748b';
const SLATE_50 = '#f8fafc';
const SLATE_200 = '#e2e8f0';
const SOCIAL_FB = '#1877F2';
const SOCIAL_IG = '#000000';
const GOOGLE_BORDER = '#DCDCDC';
const GOOGLE_TEXT = '#1F1F1F';
const GOOGLE_G_LOGO = require('../../assets/images/Google__G__logo.png');
const BRAND_GRADIENT = ['#0F3D3E', '#134e4a', '#1a8a8a'] as const;

function GoogleOAuthButton(props: {
  socialBusy: string | null;
  setSocialBusy: React.Dispatch<React.SetStateAction<string | null>>;
  persistSession: (access_token: string, user: object) => Promise<void>;
}) {
  const { socialBusy, setSocialBusy, persistSession } = props;
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
        styles.socialFullBtn,
        styles.socialGoogle,
        !!socialBusy && styles.socialOff,
      ]}
      disabled={!!socialBusy}
      onPress={() => googlePromptAsync()}>
      <View style={[styles.socialIconWrap, styles.socialIconWrapGoogle]}>
        {socialBusy === 'google' ? (
          <ActivityIndicator color={GOOGLE_TEXT} />
        ) : (
          <Image source={GOOGLE_G_LOGO} style={styles.googleGLogo} />
        )}
      </View>
      <Text style={[styles.socialFullLabel, styles.socialFullLabelGoogle]}>
        Continuar com o Google
      </Text>
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gutter = Math.min(22, Math.max(12, Math.round(width * 0.045)));
  const gap = Math.max(10, Math.round(height * 0.015));
  const controlPadV = Math.max(10, Math.round(height * 0.015));
  const heroHeight = Math.round(height * 0.22);
  const socialBtnHeight = 44;
  const scale = Math.min(1.05, Math.max(0.85, height / 820));
  // Sem rolagem: layout cabe na tela.

  const logoSize = Math.round(48 * scale);
  const logoRadius = Math.round(logoSize / 2);
  const brandFont = Math.round(28 * scale);
  const logoLetterFont = Math.round(24 * scale);
  const subtitleFont = Math.round(15 * scale);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialBusy, setSocialBusy] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();
  const { signInWithFacebook, isLoading: fbIsLoading } = useSocialAuth();

  const googleConfigured = isGoogleOAuthConfigured();
  const fbConfigured = !!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
  const igConfigured = !!process.env.EXPO_PUBLIC_INSTAGRAM_APP_ID;

  const persistSession = useCallback(
    async (access_token: string, user: object) => {
      await signIn(access_token, user);
      router.replace('/(tabs)' as any);
    },
    [router, signIn],
  );

  // Facebook (Mobile) agora é feito pelo hook `useSocialAuth` → POST /auth/facebook (passport-facebook-token)

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
    <LinearGradient colors={[...BRAND_GRADIENT]} start={{ x: 0.12, y: 1 }} end={{ x: 0.88, y: 0 }} style={styles.root}>
      {/* Controlamos o safe-area no header/footer manualmente para o footer encostar no fim. */}
      <SafeAreaView style={styles.safe} edges={[]}>
        <StatusBar style="light" backgroundColor="#0F3D3E" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.shell}>
          <View style={styles.page}>
            <View style={styles.grow}>
              <LinearGradient
                colors={[...BRAND_GRADIENT]}
                start={{ x: 0.1, y: 1 }}
                end={{ x: 0.9, y: 0 }}
                style={[
                  styles.hero,
                  {
                    height: heroHeight,
                    // Evita “faixa” no topo: o inset fica dentro do header gradiente
                    paddingTop: insets.top + Math.max(10, gap),
                    paddingBottom: gap * 2,
                  },
                ]}>
                <WelcomeNetworkLower opacity={0.14} />
                <View style={styles.heroInner}>
                  <View style={[styles.heroEmblemWrap, { width: logoSize, height: logoSize, borderRadius: logoRadius }]}>
                    <Image
                      source={require('@/assets/images/Conectfy Logo Grande Fundo Verde Reestilizada.jpg')}
                      style={[styles.heroEmblem, { width: logoSize, height: logoSize }]}
                      resizeMode="cover"
                      accessibilityLabel="Conectfy"
                    />
                  </View>
                  <Text style={[styles.brandText, { fontSize: brandFont }]}>Conectfy</Text>
                  <Text style={[styles.heroSubtitle, { fontSize: subtitleFont }]}>Entre com e-mail e senha</Text>
                </View>
              </LinearGradient>

              <View
                style={[
                  styles.card,
                  {
                    marginHorizontal: gutter,
                    paddingHorizontal: gutter + 4,
                    paddingTop: gap * 1.55,
                    paddingBottom: gap * 2.75,
                  },
                ]}>
              <View style={[styles.inputWrap, { marginBottom: gap, minHeight: socialBtnHeight }]}>
                <MaterialIcons name="email" size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingVertical: controlPadV }]}
                  placeholder="E-mail"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
              <View
                style={[
                  styles.inputWrap,
                  { marginBottom: Math.max(gap, 14), minHeight: socialBtnHeight },
                ]}>
                <MaterialIcons name="lock-outline" size={18} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingVertical: controlPadV }]}
                  placeholder="Senha"
                  placeholderTextColor="#94a3b8"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <View style={[styles.rowBetween, { marginBottom: Math.max(gap, 14) }]}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setRemember((v) => !v)}
                  disabled={loading}>
                  <View style={[styles.checkbox, remember && styles.checkboxOn]}>
                    {remember ? <View style={styles.checkboxDot} /> : null}
                  </View>
                  <Text style={styles.checkboxLabel}>Manter conectado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.forgotWrapInline}
                  onPress={() => router.push('/(auth)/forgot-password' as any)}
                  disabled={loading}>
                  <Text style={styles.forgotText}>Esqueci minha senha</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  { paddingVertical: controlPadV, minHeight: socialBtnHeight },
                  loading && styles.disabled,
                ]}
                onPress={handleLogin}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Entrar</Text>
                )}
              </TouchableOpacity>

              <View style={[styles.dividerRow, { marginVertical: 10 }]}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou entre com</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialStack}>
                {googleConfigured ? (
                  <GoogleOAuthButton
                    socialBusy={socialBusy}
                    setSocialBusy={setSocialBusy}
                    persistSession={persistSession}
                  />
                ) : (
                  <TouchableOpacity
                    style={[styles.socialFullBtn, styles.socialGoogle, styles.socialOff]}
                    disabled>
                    <View style={[styles.socialIconWrap, styles.socialIconWrapGoogle]}>
                      <Image source={GOOGLE_G_LOGO} style={styles.googleGLogo} />
                    </View>
                    <Text style={[styles.socialFullLabel, styles.socialFullLabelGoogle]}>
                      Continuar com o Google
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.socialFullBtn,
                    styles.socialFacebook,
                    (!fbConfigured || socialBusy || fbIsLoading) && styles.socialOff,
                  ]}
                  disabled={!fbConfigured || !!socialBusy || fbIsLoading}
                  onPress={() => signInWithFacebook()}>
                  <View style={styles.socialIconWrap}>
                    {fbIsLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <FontAwesome5 name="facebook-f" size={18} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.socialFullLabel}>
                    {fbIsLoading ? 'Conectando...' : 'Continuar com o Facebook'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.socialFullBtn,
                    styles.socialInstagram,
                    (!igConfigured || socialBusy) && styles.socialOff,
                  ]}
                  disabled={!igConfigured || !!socialBusy}
                  onPress={handleInstagram}>
                  <View style={styles.socialIconWrap}>
                    {socialBusy === 'instagram' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <FontAwesome5 name="instagram" size={18} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.socialFullLabel}>Continuar com o Instagram</Text>
                </TouchableOpacity>

                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[
                        styles.socialFullBtn,
                        styles.socialApple,
                        !!socialBusy && styles.socialOff,
                      ]}
                      disabled={!!socialBusy}
                      onPress={() => Alert.alert('Apple', 'Login com Apple em breve.')}>
                      <View style={styles.socialIconWrap}>
                        <FontAwesome5 name="apple" size={18} color="#fff" />
                      </View>
                      <Text style={styles.socialFullLabel}>Continuar com a Apple</Text>
                    </TouchableOpacity>
                  )}
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

              <Text style={styles.terms}>
                Ao continuar, você concorda com os Termos e a Política de Privacidade do Conectfy.
              </Text>

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
            </View>

            <LinearGradient
              colors={[...BRAND_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.siteFooter,
                {
                  paddingBottom: Math.max(10, insets.bottom),
                },
              ]}>
              <BrandSparkles corners color="rgba(255,255,255,0.6)" />
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/welcome' as any)}
                activeOpacity={0.85}
                style={styles.footerTap}>
                <Text style={styles.footerBrand}>© Conectfy 2026</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  shell: { flex: 1, backgroundColor: 'transparent' },
  page: { flex: 1, flexDirection: 'column' },
  grow: { flex: 1, flexDirection: 'column', minHeight: 0 },
  
  hero: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: 'hidden',
  },
  heroInner: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  heroEmblemWrap: {
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: 'rgba(15, 61, 62, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  heroEmblem: {
    opacity: 0.78,
    transform: [{ scale: 1.08 }],
  },
  brandText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.95,
    textAlign: 'center',
  },
  card: {
    flex: 1,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    marginTop: -8,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: INK,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  disabled: { opacity: 0.55 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  forgotWrapInline: { paddingVertical: 6, paddingHorizontal: 6, marginRight: -6 },
  forgotText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: BRAND, backgroundColor: 'rgba(44,154,129,0.14)' },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: BRAND,
  },
  checkboxLabel: { color: MUTED, fontWeight: '600', fontSize: 12, flexShrink: 1 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { color: MUTED, fontSize: 12, fontWeight: '700' },
  socialStack: { gap: 12 },
  socialFullBtn: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  socialGoogle: {
    backgroundColor: '#fff',
    borderColor: GOOGLE_BORDER,
  },
  socialFacebook: {
    backgroundColor: SOCIAL_FB,
  },
  socialInstagram: {
    backgroundColor: SOCIAL_IG,
  },
  socialApple: {
    backgroundColor: '#000',
  },
  socialIconWrap: {
    position: 'absolute',
    left: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  socialIconWrapGoogle: {
    backgroundColor: 'transparent',
  },
  googleGLogo: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  socialOff: { opacity: 0.45 },
  socialFullLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
  socialFullLabelGoogle: {
    color: GOOGLE_TEXT,
  },
  hint: { fontSize: 10, color: MUTED, marginTop: 6, textAlign: 'center' },
  terms: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
  },
  registerWrap: { marginTop: 22, alignItems: 'center' },
  registerText: { color: PRIMARY, fontWeight: '700', fontSize: 15 },
  registerInline: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerInlineText: {
    color: '#E0E0E0',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  siteFooter: {
    marginTop: 0,
    marginHorizontal: 0,
    height: 80,
    borderRadius: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  footerTap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
  },
});
