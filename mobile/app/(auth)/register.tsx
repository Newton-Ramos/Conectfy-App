import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth } from '@/api/client';
import { getApiErrorMessage } from '@/lib/api-error';

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
  const { width } = useWindowDimensions();
  const pad = Math.min(24, Math.max(14, Math.round(width * 0.05)));
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

  const handleBackToLogin = () => {
    router.back();
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.container,
        { paddingHorizontal: pad, maxWidth: 440, width: '100%', alignSelf: 'center' },
      ]}>
      <Text style={styles.title}>Conectfy</Text>
      <Text style={styles.subtitle}>Crie sua conta</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome completo"
        placeholderTextColor="#6b7280"
        value={nome}
        onChangeText={(v) => setNome(onlyLettersAndAccents(v))}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#6b7280"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        editable={!loading}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="CPF (xxx.xxx.xxx-xx)"
        placeholderTextColor="#6b7280"
        value={cpf}
        onChangeText={(v) => setCpf(maskCpf(v))}
        editable={!loading}
        keyboardType="number-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Data de nascimento (dd/mm/aaaa)"
        placeholderTextColor="#6b7280"
        value={dataNascimento}
        onChangeText={(v) => setDataNascimento(maskBrDate(v))}
        editable={!loading}
        keyboardType="number-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="CEP (xxxxx-xxx)"
        placeholderTextColor="#6b7280"
        value={cep}
        onChangeText={(v) => setCep(maskCep(v))}
        editable={!loading}
        keyboardType="number-pad"
      />

      <TextInput
        style={[styles.input, styles.inputDisabled]}
        placeholder="Logradouro"
        placeholderTextColor="#6b7280"
        value={logradouro}
        editable={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Número"
        placeholderTextColor="#6b7280"
        value={numero}
        onChangeText={setNumero}
        editable={!loading}
        keyboardType="number-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Complemento (opcional)"
        placeholderTextColor="#6b7280"
        value={complemento}
        onChangeText={setComplemento}
        editable={!loading}
      />

      <TextInput
        style={[styles.input, styles.inputDisabled]}
        placeholder="Bairro"
        placeholderTextColor="#6b7280"
        value={bairro}
        editable={false}
      />

      <TextInput
        style={[styles.input, styles.inputDisabled]}
        placeholder="Cidade"
        placeholderTextColor="#6b7280"
        value={cidade}
        editable={false}
      />

      <TextInput
        style={[styles.input, styles.inputDisabled]}
        placeholder="UF"
        placeholderTextColor="#6b7280"
        value={uf}
        editable={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#6b7280"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar senha"
        placeholderTextColor="#6b7280"
        value={confirmSenha}
        onChangeText={setConfirmSenha}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, (loading || cepLoading) && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading || cepLoading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{cepLoading ? 'Buscando CEP...' : 'Cadastrar'}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.linkButton} onPress={handleBackToLogin} disabled={loading}>
        <Text style={styles.linkText}>Já tem conta? Faça login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingBottom: 40,
    backgroundColor: '#f4f4f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#0a7ea4',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    marginBottom: 12,
    borderRadius: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#111827',
  },
  button: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 20,
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 8,
  },
  linkText: {
    color: '#0a7ea4',
    fontSize: 14,
    fontWeight: '600',
  },
});
