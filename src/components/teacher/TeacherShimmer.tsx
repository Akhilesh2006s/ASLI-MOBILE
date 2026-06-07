import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';

function ShimmerBlock({ style }: { style?: ViewStyle }) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.75, { duration: 900 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.block, style, animStyle]} />;
}

type Props = {
  variant?: 'card' | 'list' | 'stats';
  count?: number;
};

export default function TeacherShimmer({ variant = 'card', count = 3 }: Props) {
  if (variant === 'stats') {
    return (
      <View style={styles.statsRow}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerBlock key={i} style={styles.statBlock} />
        ))}
      </View>
    );
  }

  if (variant === 'list') {
    return (
      <View style={styles.list}>
        {Array.from({ length: count }).map((_, i) => (
          <ShimmerBlock key={i} style={styles.listBlock} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerBlock key={i} style={styles.cardBlock} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: TEACHER.primary,
    borderRadius: TEACHER_RADIUS.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: TEACHER_SPACING.md,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.md,
  },
  statBlock: {
    width: 80,
    height: 64,
    borderRadius: TEACHER_RADIUS.lg,
  },
  list: {
    gap: TEACHER_SPACING.md,
    padding: TEACHER_SPACING.lg,
  },
  listBlock: {
    height: 72,
    borderRadius: TEACHER_RADIUS.lg,
  },
  cardBlock: {
    height: 140,
    borderRadius: TEACHER_RADIUS.card,
  },
});
