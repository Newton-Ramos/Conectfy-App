import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { APP_VERSION, SPLASH_MIN_MS } from '@/constants/theme';

/** Identidade Conectfy (auth / welcome) — animações e fundo alinhados ao app. */
const BRAND_GRADIENT = ['#0F3D3E', '#134e4a', '#1a8a8a'] as const;
const BRAND = '#2c9a81';
const BRAND_LINE = 'rgba(44, 154, 129, 0.35)';
const BRAND_DEEP = '#0a3d3f';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const LOGO_SIZE = Math.min(screenWidth * 0.46, 260);
/** Quadrado maior que a tela para sinapses cobrirem cantos e bordas (diagonal). */
const FULL_BG_ARENA = Math.max(screenWidth, screenHeight) * 1.42;
/** Caixa só para centralizar logo + glow (sem rede aqui). */
const LOGO_STAGE = Math.min(screenWidth * 0.92, LOGO_SIZE * 2.35);
/** Voltas completas da logo (giro no eixo vertical — moeda). */
const LOGO_SPIN_ROTATIONS = 3;

const LOGO_ASSET = require('@/assets/images/Conectfy Logo Grande Fundo Verde Reestilizada.jpg');

type SplashOverlayProps = {
  visible: boolean;
  onDismissComplete: () => void;
};

/** Nó de ligação: círculo com anel (terminal da rede). */
function SynapseJunction({
  x,
  y,
  index,
  total,
  phase,
  phaseBias = 0,
  variant,
}: {
  x: number;
  y: number;
  index: number;
  total: number;
  phase: SharedValue<number>;
  phaseBias?: number;
  variant: 'outer' | 'inner' | 'hub';
}) {
  const size = variant === 'outer' ? 14 : variant === 'inner' ? 9 : 17;
  const left = x - size / 2;
  const top = y - size / 2;
  const baseStyle =
    variant === 'outer' ? styles.junctionOuter : variant === 'inner' ? styles.junctionInner : styles.junctionHub;

  const style = useAnimatedStyle(() => {
    const p = (phase.value + phaseBias) % 1;
    if (variant === 'hub') {
      const w = ((p * 28 + index * 0.15) % 28 + 28) % 28;
      const lit = w < 8 ? 1 : 0.2;
      return {
        opacity: 0.35 + lit * 0.55,
        transform: [{ scale: 0.92 + lit * 0.14 }],
      };
    }
    const wave = ((p * total + index) % total + total) % total;
    const lit = wave < 2.4 ? 1 : 0.22;
    return {
      opacity: 0.22 + lit * 0.78,
      transform: [{ scale: 0.88 + lit * 0.22 }],
    };
  });

  return (
    <Animated.View
      style={[
        baseStyle,
        {
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    />
  );
}

type SynapseEdgeProps = {
  index: number;
  total: number;
  cx: number;
  cy: number;
  orbitR: number;
  phase: SharedValue<number>;
  phaseBias?: number;
};

/** Linha genérica (cordas / teia) entre dois pontos — mesmo pulso da rede. */
function SynapseWebLine({
  x1,
  y1,
  x2,
  y2,
  phase,
  phaseBias = 0,
  pulseSeed,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  phase: SharedValue<number>;
  phaseBias?: number;
  pulseSeed: number;
}) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (dist < 0.5) return null;
  const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  const style = useAnimatedStyle(() => {
    const p = (phase.value + phaseBias) % 1;
    const wave = ((p * 53 + pulseSeed * 0.19) % 53 + 53) % 53;
    const lit = wave < 12 ? 1 : 0.11;
    return { opacity: 0.05 + lit * 0.4 };
  });

  return (
    <Animated.View
      style={[
        styles.synapseWeb,
        {
          left: x1,
          top: y1,
          width: dist,
          transform: [{ rotate: `${angleDeg}deg` }],
        },
        style,
      ]}
    />
  );
}

/** Ligação entre dois nós consecutivos — “axon” com pulso de sinal. */
function SynapseEdge({ index, total, cx, cy, orbitR, phase, phaseBias = 0 }: SynapseEdgeProps) {
  const a1 = (index / total) * Math.PI * 2;
  const a2 = ((index + 1) / total) * Math.PI * 2;
  const x1 = cx + Math.cos(a1) * orbitR;
  const y1 = cy + Math.sin(a1) * orbitR;
  const x2 = cx + Math.cos(a2) * orbitR;
  const y2 = cy + Math.sin(a2) * orbitR;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  const style = useAnimatedStyle(() => {
    const p = (phase.value + phaseBias) % 1;
    const wave = ((p * total + index + 0.5) % total + total) % total;
    const lit = wave < 2 ? 1 : 0.2;
    return { opacity: 0.08 + lit * 0.55 };
  });

  return (
    <Animated.View
      style={[
        styles.synapseEdge,
        {
          left: x1,
          top: y1,
          width: dist,
          transform: [{ rotate: `${angleDeg}deg` }],
        },
        style,
      ]}
    />
  );
}

/** Ramificações curtas centro → periferia (efeito sinapse). */
function SynapseSpoke({
  index,
  total,
  cx,
  cy,
  innerR,
  outerR,
  phase,
  phaseBias = 0,
}: {
  index: number;
  total: number;
  cx: number;
  cy: number;
  innerR: number;
  outerR: number;
  phase: SharedValue<number>;
  phaseBias?: number;
}) {
  const angle = (index / total) * Math.PI * 2 + Math.PI / total;
  const x1 = cx + Math.cos(angle) * innerR;
  const y1 = cy + Math.sin(angle) * innerR;
  const x2 = cx + Math.cos(angle) * outerR;
  const y2 = cy + Math.sin(angle) * outerR;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const angleDeg = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  const style = useAnimatedStyle(() => {
    const p = (phase.value + phaseBias) % 1;
    const wave = ((p * total + index) % total + total) % total;
    const lit = wave < 1.8 ? 1 : 0.15;
    return { opacity: 0.06 + lit * 0.45 };
  });

  return (
    <Animated.View
      style={[
        styles.synapseSpoke,
        {
          left: x1,
          top: y1,
          width: dist,
          transform: [{ rotate: `${angleDeg}deg` }],
        },
        style,
      ]}
    />
  );
}

function SplashSynapseField({
  arena,
  phase,
  dimFactor = 1,
  orbitOuterRatio = 0.42,
  innerRatio = 0.19,
  nodeCount = 18,
  phaseBias = 0,
  showCentralHub = true,
}: {
  arena: number;
  phase: SharedValue<number>;
  dimFactor?: number;
  orbitOuterRatio?: number;
  innerRatio?: number;
  nodeCount?: number;
  /** 0–1 desloca o pulso na rede (segunda camada). */
  phaseBias?: number;
  /** Um único hub no centro evita duplicar brilho em camadas sobrepostas. */
  showCentralHub?: boolean;
}) {
  const cx = arena / 2;
  const cy = arena / 2;
  const orbitR = arena * orbitOuterRatio;
  const innerR = arena * innerRatio;
  const n = nodeCount;

  /** Cordas na periferia (pula k vértices) + anel interno + travessas — efeito teia. */
  const chordSkips = Array.from(
    new Set([
      2,
      3,
      Math.max(2, Math.min(Math.floor(n / 4), 7)),
    ]),
  ).sort((a, b) => a - b);
  const crossOffset = Math.max(2, Math.min(Math.floor(n / 5), 6));

  const pt = (r: number, i: number) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.synapseArena, { opacity: dimFactor }]}
      pointerEvents="none">
      {chordSkips.flatMap((skip) =>
        Array.from({ length: n }, (_, i) => {
          const a = pt(orbitR, i);
          const b = pt(orbitR, (i + skip) % n);
          return (
            <SynapseWebLine
              key={`chord-${skip}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              phase={phase}
              phaseBias={phaseBias}
              pulseSeed={i * 17 + skip * 41}
            />
          );
        }),
      )}
      {Array.from({ length: n }, (_, i) => {
        const inner = pt(innerR, i);
        const outer = pt(orbitR, (i + crossOffset) % n);
        return (
          <SynapseWebLine
            key={`cross-${i}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            phase={phase}
            phaseBias={phaseBias}
            pulseSeed={i * 23 + 300}
          />
        );
      })}
      {Array.from({ length: n }, (_, i) => {
        const a = pt(innerR, i);
        const b = pt(innerR, (i + 1) % n);
        return (
          <SynapseWebLine
            key={`inner-ring-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            phase={phase}
            phaseBias={phaseBias}
            pulseSeed={i * 11 + 180}
          />
        );
      })}
      {Array.from({ length: n }).map((_, i) => (
        <SynapseSpoke
          key={`spoke-${i}`}
          index={i}
          total={n}
          cx={cx}
          cy={cy}
          innerR={innerR}
          outerR={orbitR}
          phase={phase}
          phaseBias={phaseBias}
        />
      ))}
      {Array.from({ length: n }).map((_, i) => (
        <SynapseEdge
          key={`edge-${i}`}
          index={i}
          total={n}
          cx={cx}
          cy={cy}
          orbitR={orbitR}
          phase={phase}
          phaseBias={phaseBias}
        />
      ))}
      {showCentralHub ? (
        <SynapseJunction
          key="hub"
          x={cx}
          y={cy}
          index={0}
          total={n}
          phase={phase}
          phaseBias={phaseBias}
          variant="hub"
        />
      ) : null}
      {Array.from({ length: n }, (_, i) => {
        const p = pt(innerR, i);
        return (
          <SynapseJunction
            key={`junction-inner-${i}`}
            x={p.x}
            y={p.y}
            index={i}
            total={n}
            phase={phase}
            phaseBias={phaseBias}
            variant="inner"
          />
        );
      })}
      {Array.from({ length: n }, (_, i) => {
        const p = pt(orbitR, i);
        return (
          <SynapseJunction
            key={`junction-outer-${i}`}
            x={p.x}
            y={p.y}
            index={i}
            total={n}
            phase={phase}
            phaseBias={phaseBias}
            variant="outer"
          />
        );
      })}
    </View>
  );
}

/**
 * Splash interativa: logo recortada em círculo (como Welcome), gradiente da marca,
 * anel de sinapses animado e barra no verde Conectfy.
 */
export default function Splash() {
  const glowPulse = useSharedValue(0.35);
  const synapsePhase = useSharedValue(0);
  const progress = useSharedValue(0);
  const logoSpin = useSharedValue(0);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(0.85, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    synapsePhase.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.linear }),
      -1,
      false,
    );
    logoSpin.value = withDelay(
      320,
      withTiming(360 * LOGO_SPIN_ROTATIONS, {
        duration: Math.min(3800, Math.max(2800, SPLASH_MIN_MS - 450)),
        easing: Easing.inOut(Easing.cubic),
      }),
    );
    progress.value = withDelay(
      100,
      withTiming(1, {
        duration: Math.max(1200, SPLASH_MIN_MS - 320),
        easing: Easing.inOut(Easing.cubic),
      }),
    );
  }, [glowPulse, synapsePhase, progress, logoSpin]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0.35, 0.85], [0.25, 0.55]),
    transform: [{ scale: interpolate(glowPulse.value, [0.35, 0.85], [0.92, 1.08]) }],
  }));

  const barFillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const captionOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0, 1, 1]),
  }));

  /** Giro em moeda: duas faces (frente + verso espelhado) — um único plano só mostra o fundo verde no verso. */
  const emblemSpinStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { rotateY: `${logoSpin.value}deg` },
    ],
  }));

  const glowSize = LOGO_SIZE * 1.22;
  const glowOffset = (LOGO_STAGE - glowSize) / 2;
  const emblemOffset = (LOGO_STAGE - LOGO_SIZE) / 2;
  const bgSynapseLeft = (screenWidth - FULL_BG_ARENA) / 2;
  const bgSynapseTop = (screenHeight - FULL_BG_ARENA) / 2;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...BRAND_GRADIENT]}
        start={{ x: 0.08, y: 1 }}
        end={{ x: 0.92, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', `${BRAND_DEEP}44`, 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Sinapses em todo o fundo (camadas sobrepostas, atrás do logo) */}
      <View
        style={[
          styles.bgSynapseWrap,
          {
            left: bgSynapseLeft,
            top: bgSynapseTop,
            width: FULL_BG_ARENA,
            height: FULL_BG_ARENA,
          },
        ]}
        pointerEvents="none">
        <SplashSynapseField
          arena={FULL_BG_ARENA}
          phase={synapsePhase}
          dimFactor={0.52}
          orbitOuterRatio={0.44}
          innerRatio={0.2}
          nodeCount={22}
        />
        <SplashSynapseField
          arena={FULL_BG_ARENA}
          phase={synapsePhase}
          dimFactor={0.38}
          orbitOuterRatio={0.28}
          innerRatio={0.11}
          nodeCount={16}
          phaseBias={0.5}
          showCentralHub={false}
        />
      </View>

      <View style={[styles.logoStage, { width: LOGO_STAGE, height: LOGO_STAGE }]}>
        <Animated.View
          style={[
            styles.glowDisc,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              left: glowOffset,
              top: glowOffset,
            },
            glowStyle,
          ]}
        />

        <Animated.View
          entering={FadeIn.delay(280).duration(720)}
          style={[
            styles.emblemWrap,
            {
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: LOGO_SIZE / 2,
              left: emblemOffset,
              top: emblemOffset,
            },
          ]}>
          <Animated.View style={[styles.emblemCoin, emblemSpinStyle]}>
            <View style={styles.emblemFaceFront} pointerEvents="none">
              <Image
                source={LOGO_ASSET}
                style={[styles.emblemImg, { width: LOGO_SIZE, height: LOGO_SIZE }]}
                resizeMode="cover"
                accessibilityLabel="Conectfy"
              />
            </View>
            <View style={styles.emblemFaceBack} pointerEvents="none">
              <Image
                source={LOGO_ASSET}
                style={[styles.emblemImg, styles.emblemImgBack, { width: LOGO_SIZE, height: LOGO_SIZE }]}
                resizeMode="cover"
                accessibilityLabel=""
                importantForAccessibility="no-hide-descendants"
              />
            </View>
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(520).duration(620)} style={styles.footer}>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFillWrap, barFillStyle]}>
            <LinearGradient
              colors={[BRAND, '#5eead4']}
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
    backgroundColor: BRAND_GRADIENT[0],
  },
  bgSynapseWrap: {
    position: 'absolute',
    zIndex: 0,
  },
  logoStage: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 2,
  },
  synapseArena: {
    zIndex: 0,
  },
  junctionOuter: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(167, 243, 208, 0.88)',
    backgroundColor: 'rgba(44, 154, 129, 0.5)',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 7,
    elevation: 0,
  },
  junctionInner: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(94, 234, 212, 0.75)',
    backgroundColor: 'rgba(15, 61, 62, 0.55)',
  },
  junctionHub: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'rgba(94, 234, 212, 0.65)',
    backgroundColor: 'rgba(10, 61, 63, 0.42)',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 0,
  },
  synapseEdge: {
    position: 'absolute',
    height: 3.5,
    borderRadius: 2,
    backgroundColor: BRAND_LINE,
    transformOrigin: 'left center',
  },
  synapseWeb: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(44, 154, 129, 0.42)',
    transformOrigin: 'left center',
  },
  synapseSpoke: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(94, 234, 212, 0.45)',
    transformOrigin: 'left center',
  },
  glowDisc: {
    position: 'absolute',
    backgroundColor: 'rgba(44, 154, 129, 0.22)',
    zIndex: 1,
  },
  emblemWrap: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 61, 62, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  /** Container que recebe perspective + rotateY (filhos são frente e verso da moeda). */
  emblemCoin: {
    width: '100%',
    height: '100%',
  },
  emblemFaceFront: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  emblemFaceBack: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    transform: [{ rotateY: '180deg' }],
  },
  emblemImg: {
    opacity: 0.78,
    transform: [{ scale: 1.08 }],
  },
  /** Verso visível na meia-volta (espelho horizontal = “C” invertido). */
  emblemImgBack: {
    transform: [{ scaleX: -1 }, { scale: 1.08 }],
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    zIndex: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(15, 61, 62, 0.65)',
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
    color: 'rgba(248, 250, 252, 0.95)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 5,
  },
  versionText: {
    color: 'rgba(148, 163, 184, 0.95)',
    fontSize: 10,
  },
});
