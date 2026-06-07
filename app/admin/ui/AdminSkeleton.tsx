import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
};

export function AdminSkeletonBox({ width = '100%', height = 16, style, borderRadius = 8 }: Props) {
  const { colors } = useAdminTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
        },
        animStyle,
        style,
      ]}
    />
  );
}

export function AdminSkeletonStats() {
  const { spacing } = useAdminTheme();
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AdminSkeletonBox height={96} style={{ flex: 1 }} borderRadius={20} />
        <AdminSkeletonBox height={96} style={{ flex: 1 }} borderRadius={20} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <AdminSkeletonBox height={96} style={{ flex: 1 }} borderRadius={20} />
        <AdminSkeletonBox height={96} style={{ flex: 1 }} borderRadius={20} />
      </View>
      <AdminSkeletonBox height={200} borderRadius={20} />
      <AdminSkeletonBox height={120} borderRadius={20} />
    </View>
  );
}

export function AdminSkeletonList({ count = 5 }: { count?: number }) {
  const { spacing } = useAdminTheme();
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <AdminSkeletonBox key={i} height={72} borderRadius={16} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({});
