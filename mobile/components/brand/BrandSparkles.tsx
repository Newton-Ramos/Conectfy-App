import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** cantos do container */
  corners?: boolean;
  color?: string;
};

/** Estrela de 4 pontas discreta (tipografia). */
export function BrandSparkles({ style, corners = true, color = 'rgba(255,255,255,0.85)' }: Props) {
  const star = <Text style={[styles.star, { color }]}>✦</Text>;
  if (!corners) {
    return <View style={style}>{star}</View>;
  }
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <View style={[styles.corner, styles.topLeft]}>{star}</View>
      <View style={[styles.corner, styles.topRight]}>{star}</View>
      <View style={[styles.corner, styles.bottomLeft]}>{star}</View>
      <View style={[styles.corner, styles.bottomRight]}>{star}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  corner: {
    position: 'absolute',
  },
  topLeft: { top: 10, left: 12 },
  topRight: { top: 10, right: 12 },
  bottomLeft: { bottom: 10, left: 12 },
  bottomRight: { bottom: 10, right: 12 },
  star: {
    fontSize: 11,
    fontWeight: '300',
  },
});
