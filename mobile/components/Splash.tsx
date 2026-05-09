import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { WelcomeNetworkLower } from '@/components/brand/WelcomeNetworkLower';
import { APP_VERSION, COLORS, SPLASH_MIN_MS } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');
/** Logo responsiva (~50% da largura, com teto para tablets). */
const LOGO_SIZE = Math.min(screenWidth * 0.5, 280);

type SplashOverlayProps = {
  visible: boolean;
  onDismissComplete: () => void;
};

/**
 * Tela de splash interativa (logo 1024, gradiente, glow, barra de progresso).
 * Export default = conteúdo visual; `SplashOverlay` = uso no root com fade-out.
 */
export default function Splash() {
  const glowOpacity = useSharedValue(0.3);
  const progress = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.7, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    progress.value = withDelay(
      100,
      withTiming(1, {
        duration: Math.max(1200, SPLASH_MIN_MS - 320),
        easing: Easing.inOut(Easing.cubic),
      }),
    );
  }, [glowOpacity, progress]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowOpacity.value + 0.6 }],
  }));

  const barFillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const captionOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 1, 1]),
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, '#0f172a', '#171717']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
      />

      <View style={[StyleSheet.absoluteFill, styles.orangeVeil]} />

      <WelcomeNetworkLower opacity={0.08} />

      <Animated.View style={[styles.glowRing, animatedGlowStyle]} />

      <Animated.Image
        entering={FadeIn.delay(300).duration(800)}
        source={require('@/assets/images/Conectfy Logo 1024 x 1024.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Conectfy"
      />

      <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.footer}>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFillWrap, barFillStyle]}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.statusText, captionOpacity]}>INICIANDO CONECTFY</Animated.Text>
        <Text style={styles.versionText}>v{APP_VERSION}</Text>
      </Animated.View>
    </View>
  );
}

/** Overlay em tela cheia com fade ao encerrar (integração com `SplashGate`). */
export function SplashOverlay({ visible, onDismissComplete }: SplashOverlayProps) {
  const fade = useSharedValue(1);

  useEffect(() => {
    if (visible) return;
    fade.value = withTiming(
      0,
      { duration: 800, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onDismissComplete)();
      },
    );
  }, [visible, fade, onDismissComplete]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View style={[styles.overlayRoot, rootStyle]} pointerEvents={visible ? 'auto' : 'none'}>
      <Splash />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  orangeVeil: {
    backgroundColor: COLORS.accent,
    opacity: 0.03,
  },
  glowRing: {
    position: 'absolute',
    width: LOGO_SIZE * 1.3,
    height: LOGO_SIZE * 1.3,
    borderRadius: (LOGO_SIZE * 1.3) / 2,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    zIndex: 1,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    zIndex: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
  },
  progressBarBg: {
    width: '100%',
    height: 3,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBarFillWrap: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statusText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 5,
  },
  versionText: {
    color: '#64748b',
    fontSize: 10,
  },
});
