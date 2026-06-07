import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../theme/student';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  animate?: boolean;
  delay?: number;
};

export default function GlassCard({
  children,
  style,
  onPress,
  padding = 16,
  animate = false,
  delay = 0,
}: Props) {
  const card = (
    <View style={[styles.card, { padding }, style]}>{children}</View>
  );

  const wrapped = animate ? (
    <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(delay)}>
      {card}
    </Animated.View>
  ) : (
    card
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        {wrapped}
      </Pressable>
    );
  }
  return wrapped;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: STUDENT.surface,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.lg,
    overflow: 'hidden',
    ...STUDENT.shadow.sm,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
});
