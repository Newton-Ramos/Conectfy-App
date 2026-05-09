import React from 'react';
import { View, StyleSheet } from 'react-native';

/** Rede decorativa no terço inferior da hero Welcome (sem transform para compat RN). */
export function WelcomeNetworkLower({ opacity = 0.55 }: { opacity?: number }) {
  return (
    <View style={[styles.zone, { opacity }]} pointerEvents="none">
      <View style={[styles.dot, styles.s1]} />
      <View style={[styles.dot, styles.s2]} />
      <View style={[styles.dot, styles.s3]} />
      <View style={[styles.dotSm, styles.s4]} />
      <View style={[styles.dotLg, styles.s5]} />
      <View style={[styles.dotSm, styles.s6]} />
      <View style={[styles.dot, styles.s7]} />
      <View style={[styles.dotLg, styles.s8]} />
      <View style={[styles.line, styles.l1]} />
      <View style={[styles.line, styles.l2]} />
      <View style={[styles.line, styles.l3]} />
      <View style={[styles.line, styles.l4]} />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
    overflow: 'hidden',
    /** Sobre o gradiente / orbes (0), abaixo do texto do hero (zIndex maior). */
    zIndex: 1,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  dotSm: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dotLg: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  s1: { left: '8%', bottom: '68%' },
  s2: { left: '26%', bottom: '52%' },
  s3: { left: '54%', bottom: '76%' },
  s4: { right: '20%', bottom: '58%' },
  s5: { right: '10%', bottom: '40%' },
  s6: { left: '16%', bottom: '32%' },
  s7: { left: '44%', bottom: '20%' },
  s8: { right: '32%', bottom: '24%' },
  line: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 1,
  },
  l1: { left: '6%', bottom: '48%', width: '44%' },
  l2: { left: '34%', bottom: '62%', width: '40%' },
  l3: { right: '6%', bottom: '52%', width: '42%' },
  l4: { left: '12%', bottom: '36%', width: '52%' },
});
