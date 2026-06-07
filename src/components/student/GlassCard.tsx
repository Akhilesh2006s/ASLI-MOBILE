import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../theme/student';

type Variant = 'default' | 'elevated' | 'gradient' | 'dark';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  animate?: boolean;
  delay?: number;
  variant?: Variant;
};

const PRESS_SPRING = { damping: 18, stiffness: 260 };

export default function GlassCard({
  children,
  style,
  onPress,
  padding = 16,
  animate = false,
  delay = 0,
  variant = 'default',
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyle = getVariantStyle(variant);
  const cardStyle = [styles.card, variantStyle, styles.cardFill, { padding }];

  const inner =
    variant === 'gradient' ? (
      <LinearGradient colors={[...STUDENT.cardGradient]} style={cardStyle}>
        {children}
      </LinearGradient>
    ) : (
      <View style={cardStyle}>
        {variant === 'elevated' ? <View style={styles.topBar} /> : null}
        {children}
      </View>
    );

  const animatedInner = animate ? (
    <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(delay)}>
      {inner}
    </Animated.View>
  ) : (
    inner
  );

  if (onPress) {
    return (
      <Pressable
        style={[styles.pressable, style]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
      >
        <Animated.View style={animStyle}>{animatedInner}</Animated.View>
      </Pressable>
    );
  }

  if (animate) {
    return (
      <Animated.View
        style={[styles.outer, style]}
        entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(delay)}
      >
        {inner}
      </Animated.View>
    );
  }

  return <View style={[styles.outer, style]}>{inner}</View>;
}

function getVariantStyle(variant: Variant): ViewStyle {
  switch (variant) {
    case 'elevated':
      return {
        backgroundColor: STUDENT.surface,
        borderWidth: 0,
        ...STUDENT.shadow.soft,
      };
    case 'gradient':
      return {
        borderWidth: 1,
        borderColor: STUDENT.surfaceBorder,
        ...STUDENT.shadow.sm,
      };
    case 'dark':
      return {
        backgroundColor: STUDENT.surfaceDark,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        ...STUDENT.shadow.soft,
      };
    default:
      return {
        backgroundColor: STUDENT.surface,
        borderWidth: 1,
        borderColor: STUDENT.surfaceBorder,
        ...STUDENT.shadow.sm,
      };
  }
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  pressable: {
    alignSelf: 'flex-start',
  },
  card: {
    borderRadius: STUDENT_RADIUS.card,
    overflow: 'hidden',
  },
  cardFill: {
    width: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: STUDENT_RADIUS.card,
    borderTopRightRadius: STUDENT_RADIUS.card,
    backgroundColor: STUDENT.primary,
  },
});
