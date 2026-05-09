import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SLOGAN_UPPER } from '@/constants/brand';
import { WelcomeNetworkLower } from '@/components/brand/WelcomeNetworkLower';
import { BrandSparkles } from '@/components/brand/BrandSparkles';

// Paleta baseada na identidade (verde petróleo + teal) para casar com a logo metálica.
const BRAND_GRADIENT = ['#0F3D3E', '#134e4a', '#1a8a8a'] as const;
const BRAND_TEAL_DEEP = '#0F3D3E';
const BRAND_TEAL_MID = '#1a8a8a';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const heroMinHeight = useMemo(() => Math.round(height * 0.62), [height]);

  return (
    <LinearGradient colors={[...BRAND_GRADIENT]} style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.shell}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 18, minHeight: heroMinHeight }]}>
          <WelcomeNetworkLower opacity={0.14} />

          <View style={styles.heroInner}>
            {/* Remove o slogan do topo; mantém apenas abaixo do nome. */}
            <View style={styles.heroEmblemWrap}>
              <Image
                source={require('@/assets/images/Conectfy Logo Grande Fundo Verde Reestilizada.jpg')}
                style={styles.heroEmblem}
                resizeMode="cover"
                accessibilityLabel="Conectfy"
              />
            </View>
            <Text style={styles.heroBrandName}>Conectfy</Text>
            <Text style={styles.heroSloganSecondary}>{SLOGAN_UPPER}</Text>

            <View style={styles.heroTextBlock}>
              <Text style={styles.heroMainTitle}>Onde a conversa encontra a organização</Text>
              <Text style={styles.heroMainSubtitle}>
                Gerencie projetos, centralize documentos e converse com sua equipe em um único lugar.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comece sua nova rotina</Text>
            <Text style={styles.cardSubtitle}>
              Crie seu workspace e convide seu time para colaborar agora.
            </Text>

            <TouchableOpacity
              style={styles.btnOutlineLogin}
              onPress={() => router.push('/(auth)/login' as never)}
              activeOpacity={0.88}>
              <Ionicons name="log-in-outline" size={22} color={BRAND_TEAL_DEEP} style={styles.btnIcon} />
              <Text style={styles.btnOutlineLoginText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnOutlineCreate}
              onPress={() => router.push('/(auth)/register' as never)}
              activeOpacity={0.88}>
              <Ionicons name="person-add-outline" size={22} color={BRAND_TEAL_MID} style={styles.btnIcon} />
              <Text style={styles.btnOutlineCreateText}>Criar conta</Text>
            </TouchableOpacity>

            <Text style={styles.cardLegal}>Acesso seguro e sincronizado em qualquer dispositivo.</Text>
          </View>
        </View>
      </ScrollView>

      <LinearGradient
        colors={[...BRAND_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(10, insets.bottom),
          },
        ]}>
        <BrandSparkles corners color="rgba(255,255,255,0.6)" />
        <View style={styles.footerInner}>
          <Text style={styles.footerCopyright}>©</Text>
          <Text style={styles.footerLegal}>Todos os direitos reservados ao Conectfy 2026</Text>
        </View>
      </LinearGradient>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shell: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 0 },
  hero: {
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroInner: { zIndex: 10, alignItems: 'center', width: '100%' },
  heroEmblem: {
    width: 110,
    height: 110,
    opacity: 0.78,
    transform: [{ scale: 1.08 }],
  },
  heroEmblemWrap: {
    width: 110,
    height: 110,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 6,
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
  heroBrandName: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  heroSloganSecondary: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 18,
  },
  heroTextBlock: { alignItems: 'center', gap: 8, maxWidth: 360 },
  heroMainTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  heroMainSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  content: { paddingHorizontal: 20, marginTop: -46 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#111' },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  cardLegal: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
  },
  btnIcon: { marginRight: 10 },
  btnOutlineLogin: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BRAND_TEAL_DEEP,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnOutlineLoginText: { color: BRAND_TEAL_DEEP, fontWeight: '800', fontSize: 16 },
  btnOutlineCreate: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BRAND_TEAL_MID,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineCreateText: { color: BRAND_TEAL_MID, fontWeight: '800', fontSize: 16 },
  footer: {
    marginTop: 0,
    marginHorizontal: 0,
    alignSelf: 'stretch',
    width: '100%',
    height: 80,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  footerInner: {
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  footerCopyright: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  footerLegal: { color: '#E0E0E0', fontSize: 12, fontWeight: '600', opacity: 0.95, zIndex: 2, textAlign: 'center' },
});
