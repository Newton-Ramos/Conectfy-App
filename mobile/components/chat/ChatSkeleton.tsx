import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const BRAND = '#2c9a81';

function ShimmerBar({
  width,
  height,
  alignSelf,
}: {
  width: `${number}%` | number;
  height: number;
  alignSelf?: 'flex-start' | 'flex-end' | 'center';
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
  }, [t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.5, 1], [0.35, 0.7, 0.35]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: height / 2,
          alignSelf,
          backgroundColor: 'rgba(44,154,129,0.18)',
          marginBottom: 10,
        },
        style,
      ]}
    />
  );
}

export function ChatSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Carregando mensagens">
      <ShimmerBar width="42%" height={12} alignSelf="center" />
      <ShimmerBar width="72%" height={38} alignSelf="flex-start" />
      <ShimmerBar width="58%" height={38} alignSelf="flex-start" />
      <ShimmerBar width="68%" height={44} alignSelf="flex-end" />
      <ShimmerBar width="52%" height={36} alignSelf="flex-end" />
      <ShimmerBar width="64%" height={40} alignSelf="flex-start" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 20, flex: 1 },
});
