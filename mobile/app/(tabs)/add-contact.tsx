import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { hrefAfterAddContact } from '@/lib/detail-screen-back';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, usersApi, type ContactUser } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuth } from '@/contexts/auth-context';
import {
  maskPhoneBr,
  onlyLettersAndAccents,
  validateEmailBasico,
  validateNomeCadastro,
  validateTelefoneBrObrigatorio,
} from '@/lib/contact-validation';
import { APP_SURFACE_BG, BRAND_ACCENT, BRAND_GRADIENT_COLORS } from '@/constants/brand';

const BRAND = BRAND_ACCENT;
const BG = APP_SURFACE_BG;
const INPUT_BORDER = '#e2e8f0';
const LABEL_COLOR = '#475569';
const INFO_BG = '#e0f2fe';
const INFO_BORDER = '#bae6fd';
const INFO_INK = '#0c4a6e';
const GHOST_TEXT = '#64748b';

type FocusField = 'nome' | 'email' | 'telefone' | 'tags' | 'nota' | null;

/** Heurística simples para habilitar o CTA (evita envio óbvio; submit ainda valida com `validateEmailBasico`). */
function emailMeetsBasicUiRule(emailRaw: string): boolean {
  const t = emailRaw.trim().toLowerCase();
  return t.includes('@') && t.includes('.com');
}

export default function AddContactScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const [myContacts, setMyContacts] = useState<ContactUser[]>([]);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [notaContato, setNotaContato] = useState('');
  const [focusField, setFocusField] = useState<FocusField>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    nome?: string;
    email?: string;
    telefone?: string;
  }>({});

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const canPressAdd = emailMeetsBasicUiRule(email) && !saving;

  const runValidation = (): boolean => {
    const nomeTrim = nome.trim();
    const telTrim = telefone.trim();
    const next: { nome?: string; email?: string; telefone?: string } = {};

    if (!nomeTrim) next.nome = 'Informe o nome';
    else {
      const ne = validateNomeCadastro(nomeTrim);
      if (ne) next.nome = ne;
    }

    const ee = validateEmailBasico(normalizedEmail);
    if (ee) next.email = ee;

    if (!telTrim) next.telefone = 'Informe o telefone';
    else {
      const te = validateTelefoneBrObrigatorio(telTrim);
      if (te) next.telefone = te;
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await usersApi.me();
      setMyId(me.data.id as number);
      const res = await usersApi.contactsList();
      setMyContacts(res.data);
    } catch {
      await signOut();
      router.replace('/(auth)/welcome' as any);
    } finally {
      setLoading(false);
    }
  }, [router, signOut]);

  useEffect(() => {
    load();
  }, [load]);

  const leaveScreen = () => {
    router.navigate(hrefAfterAddContact(params as Record<string, string | string[] | undefined>));
  };

  const handleSave = async () => {
    if (!canPressAdd) return;
    if (!runValidation()) return;

    const telefoneTrim = telefone.trim();
    const emailLower = normalizedEmail;

    const existing = myContacts.find((c) => String(c.email ?? '').trim().toLowerCase() === emailLower);
    if (existing) {
      setFieldErrors((prev) => ({ ...prev, email: 'Esse contato já está na sua lista' }));
      return;
    }

    const tags = tagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await auth.getUsers();
      const list = res.data as ContactUser[];
      const match = list.find((u) => String(u.email ?? '').trim().toLowerCase() === emailLower) ?? null;

      if (!match) {
        Alert.alert('Erro', 'Nenhum usuário cadastrado com esse e-mail');
        return;
      }
      if (myId !== null && match.id === myId) {
        Alert.alert('Erro', 'Você não pode adicionar você mesmo como contato');
        return;
      }

      await usersApi.addContact(match.id, tags.length ? tags : undefined);
      await usersApi.updateContactDetails(match.id, {
        telefone: telefoneTrim || undefined,
        nota: notaContato || undefined,
        tags: tags.length ? tags : undefined,
      });

      Alert.alert('OK', 'Contato adicionado');
      leaveScreen();
    } catch (e: unknown) {
      Alert.alert('Erro', getApiErrorMessage(e, 'Falha ao adicionar'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (key: Exclude<FocusField, null>, hasError?: boolean) => {
    return [
      styles.input,
      hasError ? styles.inputError : null,
      !hasError && focusField === key ? styles.inputFocused : null,
    ];
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={BRAND} />
        <Text style={styles.muted}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...BRAND_GRADIENT_COLORS]} style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topbarIcon} onPress={leaveScreen} hitSlop={12}>
          <MaterialIcons name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Adicionar contato</Text>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={20} color={INFO_INK} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            O e-mail precisa ser de alguém já cadastrado no Conectfy. Nesta tela não aparece lista de
            usuários.
          </Text>
        </View>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={inputStyle('nome', Boolean(fieldErrors.nome))}
          value={nome}
          onChangeText={(t) => {
            setNome(onlyLettersAndAccents(t));
            setFieldErrors((e) => ({ ...e, nome: undefined }));
          }}
          onFocus={() => setFocusField('nome')}
          onBlur={() => setFocusField(null)}
          placeholder="Nome da pessoa"
          placeholderTextColor="#94a3b8"
          autoCapitalize="words"
        />
        {fieldErrors.nome ? <Text style={styles.errorText}>{fieldErrors.nome}</Text> : null}

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={inputStyle('email', Boolean(fieldErrors.email))}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setFieldErrors((e) => ({ ...e, email: undefined }));
          }}
          onFocus={() => setFocusField('email')}
          onBlur={() => setFocusField(null)}
          placeholder="email@exemplo.com"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={inputStyle('telefone', Boolean(fieldErrors.telefone))}
          value={telefone}
          onChangeText={(t) => {
            setTelefone(maskPhoneBr(t));
            setFieldErrors((e) => ({ ...e, telefone: undefined }));
          }}
          onFocus={() => setFocusField('telefone')}
          onBlur={() => setFocusField(null)}
          placeholder="(00) 00000-0000"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
        />
        {fieldErrors.telefone ? <Text style={styles.errorText}>{fieldErrors.telefone}</Text> : null}

        <Text style={styles.label}>Tags de contato</Text>
        <Text style={styles.tagsHint}>Separe as tags por vírgula (ex: Trabalho, Família)</Text>
        <TextInput
          style={inputStyle('tags')}
          value={tagsText}
          onChangeText={setTagsText}
          onFocus={() => setFocusField('tags')}
          onBlur={() => setFocusField(null)}
          placeholder="Ex: Networking, Amigos..."
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Nota de contato</Text>
        <TextInput
          style={[inputStyle('nota'), styles.textarea]}
          value={notaContato}
          onChangeText={setNotaContato}
          onFocus={() => setFocusField('nota')}
          onBlur={() => setFocusField(null)}
          placeholder="Anotações sobre esse contato"
          placeholderTextColor="#94a3b8"
          multiline
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={leaveScreen}
            disabled={saving}
            activeOpacity={0.7}>
            <Text style={styles.ghostBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, (!canPressAdd || saving) && styles.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={!canPressAdd}
            activeOpacity={0.88}>
            {saving ? (
              <View style={styles.primaryBtnInner}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.primaryBtnText}>Adicionar</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Adicionar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: '#64748b', fontSize: 14 },
  topbar: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  topbarIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: INFO_BG,
    borderWidth: 1,
    borderColor: INFO_BORDER,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  infoIcon: { marginTop: 1 },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: INFO_INK,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: LABEL_COLOR,
    marginBottom: 6,
    marginTop: 4,
  },
  tagsHint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    marginTop: -2,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: INPUT_BORDER,
  },
  inputFocused: {
    borderColor: BRAND,
    borderWidth: 1,
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 1,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  textarea: { minHeight: 108, textAlignVertical: 'top', paddingTop: 12 },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginTop: 28,
  },
  ghostBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'transparent',
  },
  ghostBtnText: {
    color: GHOST_TEXT,
    fontWeight: '600',
    fontSize: 15,
  },
  primaryBtn: {
    flex: 2,
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryBtnDisabled: {
    opacity: 0.42,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
