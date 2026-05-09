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
import { hrefAfterEditPerson } from '@/lib/detail-screen-back';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_SURFACE_BG, BRAND_ACCENT, BRAND_GRADIENT_COLORS } from '@/constants/brand';
import { usersApi, getUserById, type ContactUser } from '@/api/client';
import {
  maskPhoneBr,
  onlyLettersAndAccents,
  validateNomeCadastro,
  validateTelefoneBrOpcional,
} from '@/lib/contact-validation';
import {
  maskCpfBr,
  maskCepBr,
  maskDataBr,
  digitsCpf,
  digitsCep,
  formatCpfFromApi,
  formatDateFromApi,
  parseCidadeUf,
  validateCpfOpcional,
  validateCepOpcional,
  validateNascimentoOpcional,
} from '@/lib/profile-masks';

export default function EditPersonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string; from?: string; peerName?: string }>();
  const targetId = useMemo(() => {
    const n = params.userId ? Number(params.userId) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [params.userId]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);

  const [nome, setNome] = useState('');
  const [emailSelf, setEmailSelf] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidadeUf, setCidadeUf] = useState('');
  const [complemento, setComplemento] = useState('');

  const [notas, setNotas] = useState('');
  const [telefone, setTelefone] = useState('');
  const [notaContato, setNotaContato] = useState('');
  const [blocked, setBlocked] = useState(false);

  const [emailOther, setEmailOther] = useState('');

  const isSelf = targetId === null || (myId !== null && targetId === myId);

  const leaveScreen = useCallback(() => {
    router.navigate(hrefAfterEditPerson(params as Record<string, string | string[] | undefined>));
  }, [router, params]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await usersApi.me();
      const mid = meRes.data.id as number;
      setMyId(mid);

      const uid = targetId ?? mid;

      if (uid === mid) {
        const u = meRes.data as any;

        setNome(u.nome ?? '');
        setEmailSelf(u.email ?? '');
        setLocalidade(u.localidade ?? '');

        setCpf(formatCpfFromApi(u.cpf));
        setNascimento(formatDateFromApi(u.dataNascimento));

        const cepDigits = u.cep ? String(u.cep).replace(/\D/g, '').slice(0, 8) : '';
        setCep(cepDigits ? maskCepBr(cepDigits) : '');
        setRua(u.logradouro ?? u.rua ?? '');
        setBairro(u.bairro ?? '');
        setCidadeUf(
          [u.cidade, u.uf].filter(Boolean).join(' / ') ||
            (typeof u.cidade_uf === 'string' ? u.cidade_uf : ''),
        );
        setComplemento(u.complemento ?? '');

        setNotas(u.notas ?? '');
      } else {
        const listRes = await usersApi.contactsList();
        const list = listRes.data as ContactUser[];
        let row = list.find((u) => u.id === uid);
        if (!row) {
          const ures = await getUserById(uid);
          const u = ures.data as any;
          setNome(u.nome ?? '');
          setEmailOther(u.email ?? '');
          setLocalidade(
            u.localidade ?? ([u.cidade, u.uf].filter(Boolean).join(', ') || ''),
          );
          setNotaContato('');
          setTelefone('');
          setBlocked(false);
        } else {
          setNome(row.nome ?? '');
          setEmailOther(row.email ?? '');
          setLocalidade(row.localidade ?? '');
          setNotaContato(row.contactNote ?? '');
          setTelefone(maskPhoneBr(String(row.contactPhone ?? '')));
          setBlocked(!!row.is_blocked);
        }
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os dados');
      leaveScreen();
    } finally {
      setLoading(false);
    }
  }, [leaveScreen, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (myId === null) return;
    setSaving(true);
    try {
      if (isSelf) {
        const nomeTrim = nome.trim();
        const nomeErr = validateNomeCadastro(nomeTrim);
        if (nomeErr) {
          Alert.alert('Erro', nomeErr);
          return;
        }

        const cpfErr = validateCpfOpcional(cpf);
        const cepErr = validateCepOpcional(cep);
        const nascErr = validateNascimentoOpcional(nascimento);
        if (cpfErr || cepErr || nascErr) {
          Alert.alert('Erro', cpfErr ?? cepErr ?? nascErr ?? 'Dados inválidos');
          return;
        }

        const dCpf = digitsCpf(cpf);
        const dCep = digitsCep(cep);
        const nTrim = nascimento.trim();
        const { cidade, uf } = parseCidadeUf(cidadeUf);

        await usersApi.updateProfile({
          nome: nomeTrim || undefined,
          localidade: localidade.trim() || undefined,
          notas: notas,
          ...(dCpf.length === 11 ? { cpf: dCpf } : {}),
          ...(nTrim ? { dataNascimento: nTrim } : {}),
          ...(dCep.length === 8 ? { cep: dCep } : {}),
          ...(rua.trim() ? { logradouro: rua.trim() } : {}),
          ...(bairro.trim() ? { bairro: bairro.trim() } : {}),
          ...(complemento.trim() ? { complemento: complemento.trim() } : {}),
          ...(cidade?.trim() ? { cidade: cidade.trim() } : {}),
          ...(uf ? { uf } : {}),
        });
        Alert.alert('Salvo', 'Perfil atualizado');
      } else if (targetId) {
        const telErr = validateTelefoneBrOpcional(telefone);
        if (telErr) {
          Alert.alert('Erro', telErr);
          return;
        }
        await usersApi.updateContactDetails(targetId, {
          telefone: telefone.trim() || undefined,
          nota: notaContato || undefined,
        });
        Alert.alert('Salvo', 'Contato atualizado');
      }
      leaveScreen();
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!targetId) return;
    try {
      const res = await usersApi.toggleBlock(targetId);
      setBlocked(res.data.blocked);
      Alert.alert('Bloqueio', res.data.blocked ? 'Contato bloqueado' : 'Contato desbloqueado');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Falha');
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={BRAND_ACCENT} />
        <Text style={styles.muted}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...BRAND_GRADIENT_COLORS]} style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topbarIcon} onPress={leaveScreen}>
          <MaterialIcons name="chevron-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topbarTitle}>{isSelf ? 'Meu perfil' : 'Editar contato'}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 28 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {!isSelf && (
          <>
            <Text style={styles.label}>Nome</Text>
            <Text style={styles.readonly}>{nome}</Text>
            <Text style={styles.label}>E-mail</Text>
            <Text style={styles.readonly}>{emailOther}</Text>
            {!!localidade && (
              <>
                <Text style={styles.label}>Localidade</Text>
                <Text style={styles.readonly}>{localidade}</Text>
              </>
            )}
          </>
        )}

        {isSelf && (
          <>
            <Text style={styles.sectionTitle}>Perfil</Text>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={(t) => setNome(onlyLettersAndAccents(t))}
              placeholder="Nome"
            />

            <Text style={styles.label}>E-mail</Text>
            <Text style={styles.readonly}>{emailSelf || '—'}</Text>

            <Text style={styles.label}>Localidade</Text>
            <TextInput
              style={styles.input}
              value={localidade}
              onChangeText={setLocalidade}
              placeholder="Brasília, DF"
            />

            <Text style={styles.sectionTitle}>Dados</Text>
            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={styles.input}
              value={cpf}
              onChangeText={(t) => setCpf(maskCpfBr(t))}
              placeholder="000.000.000-00"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Nascimento</Text>
            <TextInput
              style={styles.input}
              value={nascimento}
              onChangeText={(t) => setNascimento(maskDataBr(t))}
              placeholder="dd/mm/aaaa"
              keyboardType="number-pad"
            />

            <Text style={styles.sectionTitle}>Endereço</Text>
            <Text style={styles.label}>CEP</Text>
            <TextInput
              style={styles.input}
              value={cep}
              onChangeText={(t) => setCep(maskCepBr(t))}
              placeholder="00000-000"
              keyboardType="number-pad"
            />

            <Text style={styles.label}>Rua</Text>
            <TextInput
              style={styles.input}
              value={rua}
              onChangeText={setRua}
              placeholder="Logradouro"
            />

            <Text style={styles.label}>Bairro</Text>
            <TextInput
              style={styles.input}
              value={bairro}
              onChangeText={setBairro}
              placeholder="Bairro"
            />

            <Text style={styles.label}>Cidade / UF</Text>
            <TextInput
              style={styles.input}
              value={cidadeUf}
              onChangeText={setCidadeUf}
              placeholder="Brasília / DF"
            />

            <Text style={styles.label}>Complemento</Text>
            <TextInput
              style={styles.input}
              value={complemento}
              onChangeText={setComplemento}
              placeholder="Apto, bloco, …"
            />

            <Text style={styles.label}>Notas</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notas}
              onChangeText={setNotas}
              multiline
              placeholder="Anotações"
            />
          </>
        )}

        {!isSelf && targetId && (
          <>
            <Text style={styles.label}>Nota do contato</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={notaContato}
              onChangeText={setNotaContato}
              multiline
            />
            <Text style={styles.label}>Telefone (anotação)</Text>
            <TextInput
              style={styles.input}
              value={telefone}
              onChangeText={(t) => setTelefone(maskPhoneBr(t))}
              placeholder="(61) 99999-9999"
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[styles.blockBtn, blocked && styles.blockBtnOn]}
              onPress={handleBlock}>
              <Text style={styles.blockBtnText}>
                {blocked ? 'Desbloquear contato' : 'Bloquear contato'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnOff]}
          onPress={handleSave}
          disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: APP_SURFACE_BG },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#64748b' },
  topbar: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  topbarIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topbarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  body: { padding: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 12, marginBottom: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: BRAND_ACCENT, marginTop: 16, marginBottom: 8 },
  readonly: { fontSize: 16, color: '#1e293b', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },
  blockBtn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#c44',
    alignItems: 'center',
  },
  blockBtnOn: { backgroundColor: '#ffecec' },
  blockBtnText: { fontWeight: '800', color: '#a33' },
  saveBtn: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: BRAND_ACCENT,
    alignItems: 'center',
  },
  saveBtnOff: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
