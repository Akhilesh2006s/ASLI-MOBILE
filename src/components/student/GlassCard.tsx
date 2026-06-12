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
  const fillsParent =
    !!style &&
    ((style as ViewStyle).height === '100%' ||
      (style as ViewStyle).flex === 1 ||
      (style as ViewStyle).minHeight != null);

  const cardStyle = [
    styles.card,
    variantStyle,
    styles.cardFill,
    fillsParent && styles.cardFillParent,
    { padding },
  ];

  const inner =
    variant === 'gradient' ? (
      <LinearGradient colors={[...STUDENT.cardGradient]} style={cardStyle}>
        {children}
      </LinearGradient>
    ) : (
      <View style={cardStyle}>{children}</View>
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
        style={[styles.pressable, fillsParent && styles.pressableFill, style]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, PRESS_SPRING);
        }}
      >
        <Animated.View style={[animStyle, fillsParent && styles.pressableInnerFill]}>
          {animatedInner}
        </Animated.View>
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
  pressableFill: {
    alignSelf: 'stretch',
    height: '100%',
    flex: 1,
  },
  pressableInnerFill: {
    flex: 1,
    width: '100%',
  },
  card: {
    borderRadius: STUDENT_RADIUS.card,
    overflow: 'hidden',
  },
  cardFill: {
    width: '100%',
  },
  cardFillParent: {
    flex: 1,
    minHeight: '100%',
  },
});
