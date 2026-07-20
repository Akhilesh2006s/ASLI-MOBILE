import React, { ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GlassPanel } from '../../../src/components/ui';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  noAnimation?: boolean;
};

/**
 * Style keys that govern how the CHILDREN are laid out (plus padding, which has
 * always sat inside the card). GlassPanel wraps children in its own content
 * view, so these have to ride on that inner view — otherwise a caller passing a
 * row/gap card style would silently collapse back to a column.
 */
const INNER_STYLE_KEYS: readonly string[] = [
  'flexDirection',
  'flexWrap',
  'alignItems',
  'alignContent',
  'justifyContent',
  'gap',
  'rowGap',
  'columnGap',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingHorizontal',
  'paddingVertical',
  'paddingStart',
  'paddingEnd',
];

function splitCardStyle(flat: ViewStyle) {
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  Object.entries(flat).forEach(([key, value]) => {
    if (INNER_STYLE_KEYS.includes(key)) inner[key] = value;
    else outer[key] = value;
  });
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

export default function AdminGlassCard({ children, style, delay = 0, noAnimation }: Props) {
  const { radius, spacing } = useAdminTheme();

  // The opaque `glassCard` surface is dropped in favour of a real frosted panel
  // over the app artwork; only the caller's own layout styles carry through.
  const { outer, inner } = useMemo(() => {
    const flat = (StyleSheet.flatten([{ padding: spacing.md }, style]) ?? {}) as ViewStyle;
    return splitCardStyle(flat);
  }, [style, spacing.md]);

  const cardRadius = (outer.borderRadius as number | undefined) ?? radius.lg;

  const content = (
    <GlassPanel style={[styles.card, outer]} radius={cardRadius} tone="medium">
      <View style={[styles.inner, inner]}>{children}</View>
    </GlassPanel>
  );

  if (noAnimation) return content;

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400).springify()}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  inner: {
    flexDirection: 'column',
  },
});
