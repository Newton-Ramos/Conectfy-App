import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const BRAND = '#2c9a81';
const MINT = '#7cbcad';
const GRADIENT_END = '#1a6b5a';
const SLATE_100 = '#f1f5f9';
const SLATE_50 = '#f8fafc';
const SLATE_200 = '#e2e8f0';

const highlights = [
  {
    title: 'Hub de Conhecimento',
    desc: 'Documente processos e tome decisões onde a conversa acontece.',
    cardBg: ['#f0fdfa', '#ecfdf5'] as const,
  },
  {
    title: 'Contexto Integrado',
    desc: 'Chega de perder informações em chats infinitos. Organize por tópicos.',
    cardBg: ['#ecfeff', '#f0fdfa'] as const,
  },
  {
    title: 'Fluxo de Trabalho',
    desc: 'Transforme mensagens em ações e mantenha o time alinhado.',
    cardBg: ['#fffbeb', '#fff1f2'] as const,
  },
] as const;

const mainFeatures = [
  { label: 'Networking', href: '/(auth)/login' as const, icon: '🤝' },
  { label: 'Conexão', href: '/(auth)/login' as const, icon: '🔗' },
  { label: 'Comunidade', href: '/(auth)/login' as const, icon: '🌍' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const highlightCardWidth = useMemo(() => width * 0.82, [width]);
  const snapInterval = highlightCardWidth + 12;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces>
        {/* Hero — alinhado à home do frontend (page.tsx) */}
        <View
          style={[
            styles.hero,
            { paddingTop: Math.max(36, insets.top) },
          ]}>
          <View style={styles.orbTop} />
          <View style={styles.orbBottom} />

          <View style={styles.brandRow}>
            <View style={styles.logoRing}>
              <Text style={styles.logoLetter}>C</Text>
            </View>
            <View style={styles.brandTextCol}>
              <Text style={styles.brandText} numberOfLines={1}>
                Conectfy
              </Text>
              <Text style={styles.brandTagline}>Sua produtividade, conectada</Text>
            </View>
          </View>

          <View style={styles.heroTextBlock}>
            <Text style={styles.title}>Onde a conversa encontra a organização</Text>
            <Text style={styles.subtitle}>
              Gerencie projetos, centralize documentos e converse com sua equipe em um único lugar, sem ruídos.
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comece sua nova rotina</Text>
            <Text style={styles.cardSubtitle}>
              Crie seu workspace e convide seu time para colaborar agora.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(auth)/login' as never)}
              activeOpacity={0.9}>
              <Ionicons name="log-in-outline" size={20} color="#fff" style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Entrar na conta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/(auth)/register' as never)}
              activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={20} color={BRAND} style={styles.btnIcon} />
              <Text style={styles.secondaryBtnText}>Criar conta</Text>
            </TouchableOpacity>

            <Text style={styles.cardFootnote}>
              Acesso seguro e sincronizado. Suas notas e mensagens disponíveis em qualquer dispositivo.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Diferenciais</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={snapInterval}
              snapToAlignment="start"
              disableIntervalMomentum
              contentContainerStyle={[styles.highlightsRow, { paddingRight: 16 }]}>
              {highlights.map((h, i) => (
                <LinearGradient
                  key={h.title}
                  colors={[...h.cardBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.highlightCard, { width: highlightCardWidth, marginRight: i === highlights.length - 1 ? 0 : 12 }]}>
                  <Text style={styles.highlightTitle}>{h.title}</Text>
                  <Text style={styles.highlightDesc}>{h.desc}</Text>
                </LinearGradient>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.resourcesHeading}>Recursos principais</Text>
            <View style={styles.resourcesRow}>
              {mainFeatures.map((c) => (
                <Link key={c.label} href={c.href} asChild>
                  <Pressable style={styles.resourceItem}>
                    <View style={[styles.resourceTile, { backgroundColor: MINT }]}>
                      <Text style={styles.resourceEmoji}>{c.icon}</Text>
                    </View>
                    <Text style={styles.resourceLabel}>{c.label}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>

          <LinearGradient
            colors={[BRAND, GRADIENT_END]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBanner}>
            <Text style={styles.ctaTitle}>Evolua sua comunicação</Text>
            <Text style={styles.ctaSubtitle}>
              Centralize tudo o que é importante e elimine a dispersão de ferramentas.
            </Text>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/(auth)/login' as never)}
              activeOpacity={0.9}>
              <Text style={styles.ctaBtnText}>Começar agora</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Rodapé no estilo SiteFooter do frontend */}
      <View style={[styles.siteFooter, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <Text style={styles.footerBrand}>Conectfy</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SLATE_100,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  hero: {
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  orbTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  orbBottom: {
    position: 'absolute',
    bottom: -24,
    left: -64,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  brandTextCol: {
    alignItems: 'flex-start',
    minWidth: 0,
    flexShrink: 1,
  },
  logoRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logoLetter: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  brandText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  heroTextBlock: {
    marginTop: 28,
    gap: 8,
    maxWidth: 360,
    alignSelf: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 20,
  },
  card: {
    marginTop: -32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  cardSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: BRAND,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 10,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BRAND,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: BRAND,
    fontWeight: '700',
    fontSize: 15,
  },
  btnIcon: { marginRight: 8 },
  cardFootnote: {
    marginTop: 12,
    fontSize: 10,
    lineHeight: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 2,
  },
  highlightsRow: {
    paddingLeft: 0,
    paddingBottom: 4,
  },
  highlightCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.95)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  highlightDesc: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: '#374151',
  },
  resourcesHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  resourcesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  resourceItem: {
    width: 96,
    alignItems: 'center',
    gap: 10,
  },
  resourceTile: {
    width: 88,
    height: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  resourceEmoji: {
    fontSize: 28,
    opacity: 0.9,
  },
  resourceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  ctaBanner: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  ctaSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  ctaBtn: {
    marginTop: 16,
    height: 44,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  siteFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SLATE_200,
    backgroundColor: SLATE_50,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND,
  },
});
