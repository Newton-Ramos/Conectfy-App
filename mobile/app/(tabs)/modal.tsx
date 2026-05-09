import { Link } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AUTH_GRADIENT_COLORS, BRAND_ACCENT } from '@/constants/brand';

export default function ModalScreen() {
  return (
    <LinearGradient colors={[...AUTH_GRADIENT_COLORS]} style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>Conectfy</Text>
        <Text style={styles.sub}>
          Tela auxiliar. Use o atalho abaixo para voltar à área principal do app.
        </Text>
        <Link href="/(tabs)/explore" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>Ir para conversas</Text>
          </Pressable>
        </Link>
        <Link href="/(tabs)" asChild>
          <Pressable style={styles.linkWrap}>
            <Text style={styles.link}>Ir para início (abas)</Text>
          </Pressable>
        </Link>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    backgroundColor: BRAND_ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginBottom: 16,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  linkWrap: { paddingVertical: 12 },
  link: { color: 'rgba(255,255,255,0.95)', fontWeight: '700', fontSize: 15, textDecorationLine: 'underline' },
});
