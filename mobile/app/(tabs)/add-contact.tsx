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
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
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

const BRAND = '#2c9a81';
const PRIMARY = '#0a7ea4';

export default function AddContactScreen() {
  const router = useRouter();
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
  const [fieldErrors, setFieldErrors] = useState<{
    nome?: string;
    email?: string;
    telefone?: string;
  }>({});

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  /** Valida nome, e-mail e telefone antes de qualquer chamada à API */
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

  const handleSave = async () => {
    if (!runValidation()) return;

    const nomeTrim = nome.trim();
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
      router.back();
    } catch (e: unknown) {
      Alert.alert('Erro', getApiErrorMessage(e, 'Falha ao adicionar'));
    } finally {
      setSaving(false);
    }
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
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.topbarIcon} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>Adicionar contato</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          O e-mail precisa ser de alguém já cadastrado no Conectfy. Nesta tela não aparece lista de usuários.
        </Text>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={[styles.input, fieldErrors.nome ? styles.inputError : null]}
          value={nome}
          onChangeText={(t) => {
            setNome(onlyLettersAndAccents(t));
            setFieldErrors((e) => ({ ...e, nome: undefined }));
          }}
          placeholder="Nome da pessoa"
          autoCapitalize="words"
        />
        {fieldErrors.nome ? <Text style={styles.errorText}>{fieldErrors.nome}</Text> : null}

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={[styles.input, fieldErrors.email ? styles.inputError : null]}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setFieldErrors((e) => ({ ...e, email: undefined }));
          }}
          placeholder="email@exemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={[styles.input, fieldErrors.telefone ? styles.inputError : null]}
          value={telefone}
          onChangeText={(t) => {
            setTelefone(maskPhoneBr(t));
            setFieldErrors((e) => ({ ...e, telefone: undefined }));
          }}
          placeholder="(61) 99999-9999"
          keyboardType="phone-pad"
        />
        {fieldErrors.telefone ? <Text style={styles.errorText}>{fieldErrors.telefone}</Text> : null}

        <Text style={styles.label}>Tags de contato</Text>
        <TextInput
          style={styles.input}
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="familia, trabalho, amigo"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Nota de contato</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notaContato}
          onChangeText={setNotaContato}
          placeholder="Anotações sobre esse contato"
          multiline
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()} disabled={saving}>
            <Text style={styles.secondaryBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.btnOff]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Adicionar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#c4c4c4' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: '#666' },
  topbar: {
    paddingTop: 44,
    paddingHorizontal: 12,
    minHeight: 86,
    backgroundColor: BRAND,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  body: { padding: 16, paddingBottom: 40 },
  hint: { color: '#333', opacity: 0.85, fontSize: 13, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputError: {
    borderColor: '#c62828',
    borderWidth: 2,
  },
  errorText: {
    color: '#c62828',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primaryBtn: {
    flex: 1,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    width: 120,
    borderWidth: 1,
    borderColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    minHeight: 48,
  },
  secondaryBtnText: { color: PRIMARY, fontWeight: '800' },
  btnOff: { opacity: 0.6 },
});
