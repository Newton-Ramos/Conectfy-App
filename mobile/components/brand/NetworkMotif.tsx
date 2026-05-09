import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
  opacity?: number;
};

export function NetworkMotif({ style, opacity = 0.35 }: Props) {
  return (
    <View style={[styles.wrap, { opacity }, style]} pointerEvents="none">
      <View style={[styles.dot, styles.d1]} />
      <View style={[styles.dot, styles.d2]} />
      <View style={[styles.dot, styles.d3]} />
      <View style={[styles.dot, styles.d4]} />
      <View style={[styles.dot, styles.d5]} />
      <View style={[styles.line, styles.l1]} />
      <View style={[styles.line, styles.l2]} />
      <View style={[styles.line, styles.l3]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
  },
  d1: { left: '10%', top: '20%' },
  d2: { left: '45%', top: '12%' },
  d3: { right: '14%', top: '30%' },
  d4: { left: '24%', bottom: '26%' },
  d5: { right: '20%', bottom: '18%' },
  line: {
    position: 'absolute',
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#ffffff',
    opacity: 0.5,
  },
  l1: { left: '12%', top: '32%', width: '38%' },
  l2: { right: '12%', top: '42%', width: '34%' },
  l3: { left: '26%', bottom: '34%', width: '40%' },
});
