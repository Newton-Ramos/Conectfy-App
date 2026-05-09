import React, { useEffect, useMemo, useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { WelcomeNetworkLower } from '@/components/brand/WelcomeNetworkLower';
import { BrandSparkles } from '@/components/brand/BrandSparkles';

const BRAND = '#2c9a81';
const PRIMARY = BRAND;
const INK = '#0f172a';
const MUTED = '#64748b';
const BRAND_GRADIENT = ['#0F3D3E', '#134e4a', '#1a8a8a'] as const;

function onlyLettersAndAccents(value: string) {
  return value.replace(/[^\p{L}\p{M} ]/gu, '');
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 9);
  const p4 = digits.slice(9, 11);
  if (digits.length <= 3) return p1;
  if (digits.length <= 6) return `${p1}.${p2}`;
  if (digits.length <= 9) return `${p1}.${p2}.${p3}`;
  return `${p1}.${p2}.${p3}-${p4}`;
}

function maskCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const p1 = digits.slice(0, 5);
  const p2 = digits.slice(5, 8);
  if (digits.length <= 5) return p1;
  return `${p1}-${p2}`;
}

function maskBrDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  if (digits.length <= 2) return dd;
  if (digits.length <= 4) return `${dd}/${mm}`;
  return `${dd}/${mm}/${yyyy}`;
}

export default function RegisterScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gutter = Math.min(22, Math.max(12, Math.round(width * 0.045)));
  const gap = Math.max(10, Math.round(height * 0.015));
  const controlPadV = Math.max(10, Math.round(height * 0.015));
  const heroHeight = Math.round(height * 0.19);
  const socialBtnHeight = 48;
  const scale = Math.min(1.05, Math.max(0.85, height / 820));
  const logoSize = Math.round(44 * scale);
  const logoRadius = Math.round(logoSize / 2);
  const brandFont = Math.round(26 * scale);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const router = useRouter();
  const routeParams = useLocalSearchParams<{ email?: string }>();

  const cepDigits = useMemo(() => cep.replace(/\D/g, ''), [cep]);

  useEffect(() => {
    if (routeParams.email && typeof routeParams.email === 'string') {
      setEmail(routeParams.email);
    }
  }, [routeParams.email]);

  useEffect(() => {
    const run = async () => {
      if (cepDigits.length !== 8) return;
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        const data = await res.json();
        if (data?.erro) {
          Alert.alert('Erro', 'CEP não encontrado');
          return;
        }
        setLogradouro(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setUf((data.uf || '').toUpperCase());
      } catch {
        Alert.alert('Erro', 'Falha ao consultar CEP');
      } finally {
        setCepLoading(false);
      }
    };
    run();
  }, [cepDigits]);

  const goWelcome = () => {
    router.replace('/(auth)/welcome' as never);
  };

  const handleRegister = async () => {
    const nomeTrim = nome.trim();

    if (!nomeTrim || !email || !cpf || !dataNascimento || !cep || !numero || !senha || !confirmSenha) {
      Alert.alert('Erro', 'Todos os campos são obrigatórios');
      return;
    }

    if (nomeTrim.length < 3 || !/^[\p{L}\p{M} ]+$/u.test(nomeTrim)) {
      Alert.alert('Erro', 'Nome deve conter apenas letras e acentos (mínimo 3 letras)');
      return;
    }

    if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf)) {
      Alert.alert('Erro', 'CPF deve estar no formato xxx.xxx.xxx-xx');
      return;
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataNascimento)) {
      Alert.alert('Erro', 'Data de nascimento deve estar no formato dd/mm/aaaa');
      return;
    }

    if (!/^\d{5}-\d{3}$/.test(cep)) {
      Alert.alert('Erro', 'CEP deve estar no formato xxxxx-xxx');
      return;
    }

    if (!logradouro || !bairro || !cidade || !uf) {
      Alert.alert('Erro', 'Preencha um CEP válido para carregar o endereço');
      return;
    }

    const ufUpper = uf.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(ufUpper)) {
      Alert.alert('Erro', 'UF deve conter 2 letras (ex: SP)');
      return;
    }

    if (senha !== confirmSenha) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (senha.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await auth.register({
        nome: nomeTrim,
        email: email.trim(),
        senha,
        cpf,
        dataNascimento,
        cep,
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        uf: ufUpper,
      });
      Alert.alert('Sucesso', 'Conta criada com sucesso! Faça login agora.');
      router.replace('/(auth)/login' as any);
    } catch (error: unknown) {
      Alert.alert('Erro', getApiErrorMessage(error, 'Falha ao criar conta'));
    } finally {
      setLoading(false);
    }
  };

  const fieldGap = { marginBottom: Math.max(8, gap * 0.88) };

  return (
    <LinearGradient
      colors={[...BRAND_GRADIENT]}
      start={{ x: 0.12, y: 1 }}
      end={{ x: 0.88, y: 0 }}
      style={styles.root}>
      <SafeAreaView style={styles.safe} edges={[]}>
        <StatusBar style="light" backgroundColor="#0F3D3E" />
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                      paddingTop: insets.top + Math.max(6, gap * 0.55),
                      paddingBottom: gap * 0.65,
                    },
                  ]}>
                  <WelcomeNetworkLower opacity={0.14} />

                  <View style={styles.heroTopRow}>
                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={goWelcome}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Voltar ao início">
                      <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.heroCenter}>
                      <View
                        style={[
                          styles.heroEmblemWrap,
                          { width: logoSize, height: logoSize, borderRadius: logoRadius },
                        ]}>
                        <Image
                          source={require('@/assets/images/Conectfy Logo Grande Fundo Verde Restilizada.jpg')}
                          style={[styles.heroEmblem, { width: logoSize, height: logoSize }]}
                          resizeMode="cover"
                          accessibilityLabel="Conectfy"
                        />
                      </View>
                      <Text style={[styles.brandText, { fontSize: brandFont }]}>Conectfy</Text>
                    </View>

                    <View style={styles.heroTopRowSpacer} />
                  </View>
                </LinearGradient>

                <View
                  style={[
                    styles.card,
                    {
                      marginHorizontal: gutter,
                      paddingHorizontal: gutter + 4,
                      paddingTop: Math.max(16, Math.round(gap * 1.05)),
                      paddingBottom: gap * 1.5,
                    },
                  ]}>
                  <ScrollView
                    style={styles.cardScroll}
                    contentContainerStyle={styles.cardScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="person-outline" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingVertical: controlPadV }]}
                        placeholder="Nome completo"
                        placeholderTextColor="#94a3b8"
                        value={nome}
                        onChangeText={(v) => setNome(onlyLettersAndAccents(v))}
                        editable={!loading}
                      />
                    </View>

                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="email" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingVertical: controlPadV }]}
                        placeholder="E-mail"
                        placeholderTextColor="#94a3b8"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        editable={!loading}
                        autoCapitalize="none"
                      />
                    </View>

                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="badge" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingVertical: controlPadV }]}
                        placeholder="CPF (xxx.xxx.xxx-xx)"
                        placeholderTextColor="#94a3b8"
                        value={cpf}
                        onChangeText={(v) => setCpf(maskCpf(v))}
                        editable={!loading}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="cake" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingVertical: controlPadV }]}
                        placeholder="Data de nascimento (dd/mm/aaaa)"
                        placeholderTextColor="#94a3b8"
                        value={dataNascimento}
                        onChangeText={(v) => setDataNascimento(maskBrDate(v))}
                        editable={!loading}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="location-on" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingVertical: controlPadV }]}
                        placeholder="CEP (xxxxx-xxx)"
                        placeholderTextColor="#94a3b8"
                        value={cep}
                        onChangeText={(v) => setCep(maskCep(v))}
                        editable={!loading}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View style={[styles.inputWrap, styles.inputWrapFrozen, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="signpost" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputFrozen, { paddingVertical: controlPadV }]}
                        placeholder="Logradouro"
                        placeholderTextColor="#94a3b8"
                        value={logradouro}
                        editable={false}
                      />
                    </View>

                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="pin-drop" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingVertical: controlPadV }]}
                        placeholder="Número"
                        placeholderTextColor="#94a3b8"
                        value={numero}
                        onChangeText={setNumero}
                        editable={!loading}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="apartment" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingVertical: controlPadV }]}
                        placeholder="Complemento (opcional)"
                        placeholderTextColor="#94a3b8"
                        value={complemento}
                        onChangeText={setComplemento}
                        editable={!loading}
                      />
                    </View>

                    <View style={[styles.inputWrap, styles.inputWrapFrozen, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="home-work" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputFrozen, { paddingVertical: controlPadV }]}
                        placeholder="Bairro"
                        placeholderTextColor="#94a3b8"
                        value={bairro}
                        editable={false}
                      />
                    </View>

                    <View style={[styles.inputWrap, styles.inputWrapFrozen, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="location-city" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputFrozen, { paddingVertical: controlPadV }]}
                        placeholder="Cidade"
                        placeholderTextColor="#94a3b8"
                        value={cidade}
                        editable={false}
                      />
                    </View>

                    <View style={[styles.inputWrap, styles.inputWrapFrozen, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="map" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputFrozen, { paddingVertical: controlPadV }]}
                        placeholder="UF"
                        placeholderTextColor="#94a3b8"
                        value={uf}
                        editable={false}
                      />
                    </View>

                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="lock-outline" size={18} color={MUTED} style={styles.inputIcon} />
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

                    <View style={[styles.inputWrap, fieldGap, { minHeight: socialBtnHeight }]}>
                      <MaterialIcons name="check-circle-outline" size={18} color={MUTED} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { paddingVertical: controlPadV }]}
                        placeholder="Confirmar senha"
                        placeholderTextColor="#94a3b8"
                        value={confirmSenha}
                        onChangeText={setConfirmSenha}
                        secureTextEntry
                        editable={!loading}
                      />
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        {
                          paddingVertical: controlPadV,
                          minHeight: socialBtnHeight,
                          marginTop: gap * 0.5,
                        },
                        (loading || cepLoading) && styles.disabled,
                      ]}
                      onPress={handleRegister}
                      disabled={loading || cepLoading}>
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          {cepLoading ? 'Buscando CEP...' : 'Cadastrar'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <View style={[styles.dividerRow, { marginVertical: Math.max(14, gap) }]}>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity
                      style={styles.loginLinkWrap}
                      onPress={() => router.push('/(auth)/login' as never)}
                      disabled={loading}>
                      <Text style={styles.loginLinkText}>Já tem conta? Faça login</Text>
                    </TouchableOpacity>

                    <Text style={styles.terms}>
                      Ao cadastrar-se, você concorda com os Termos e a Política de Privacidade do Conectfy.
                    </Text>
                  </ScrollView>
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
                  onPress={goWelcome}
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
  kav: { flex: 1 },
  shell: { flex: 1, backgroundColor: 'transparent' },
  page: { flex: 1, flexDirection: 'column' },
  grow: { flex: 1, flexDirection: 'column', minHeight: 0 },
  hero: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    flex: 1,
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 61, 62, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTopRowSpacer: {
    width: 44,
    height: 44,
  },
  heroEmblemWrap: {
    overflow: 'hidden',
    marginBottom: 6,
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
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    minHeight: 0,
  },
  cardScroll: { flex: 1 },
  cardScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  inputWrapFrozen: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: INK,
  },
  inputFrozen: {
    color: MUTED,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  loginLinkWrap: { alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { color: PRIMARY, fontWeight: '700', fontSize: 15 },
  terms: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    color: MUTED,
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
