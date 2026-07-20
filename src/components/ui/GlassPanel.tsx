import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import GlassSurface from './GlassSurface';
import {
  GLASS_RADIUS,
  GLASS_RIM,
  GLASS_ROW,
  GLASS_SHADOW,
  glassTone,
  type GlassTone,
} from '../../theme/glass';

export type { GlassTone };

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Corner radius. Defaults to the app's standard card radius. */
  radius?: number;
  tone?: GlassTone;
  /** Override sheen colors (e.g. brand-tinted hero). */
  colors?: [string, string];
  /** Set false to drop the white hairline rim. */
  bordered?: boolean;
  /** Soft liquid shadow. */
  elevated?: boolean;
  /** Press morph for interactive cards. */
  onPress?: () => void;
};

const PRESS_SPRING = { damping: 18, stiffness: 260 };

/**
 * Standard liquid-glass card. Prefer this over opaque `#fff` surfaces.
 */
export default function GlassPanel({
  children,
  style,
  contentStyle,
  radius = GLASS_RADIUS.card,
  tone = 'medium',
  colors,
  bordered = true,
  elevated = false,
  onPress,
}: Props) {
  const { intensity } = glassTone(tone);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const panelBody = (
    <View
      style={[
        styles.panel,
        { borderRadius: radius },
        bordered && styles.bordered,
        elevated && GLASS_SHADOW.soft,
        !onPress && style,
      ]}
    >
      <GlassSurface intensity={intensity} colors={colors} tone={tone} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );

  if (!onPress) return panelBody;

  return (
    <Pressable
      style={style}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.975, PRESS_SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, PRESS_SPRING);
      }}
      accessibilityRole="button"
    >
      <Animated.View style={animStyle}>{panelBody}</Animated.View>
    </Pressable>
  );
}

/** Translucent inner row / cell — use instead of solid white inside glass cards. */
export function GlassRow({
  children,
  style,
  strong = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: strong ? GLASS_ROW.fillStrong : GLASS_ROW.fill,
          borderColor: GLASS_ROW.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const glassRowFill = GLASS_ROW.fill;
export const glassRowFillSoft = GLASS_ROW.fillSoft;
export const glassRowFillStrong = GLASS_ROW.fillStrong;

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  bordered: {
    borderWidth: 1,
    borderColor: GLASS_RIM.border,
  },
  content: {
    position: 'relative',
  },
  row: {
    borderRadius: GLASS_RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
