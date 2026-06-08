import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  noAnimation?: boolean;
};

export default function AdminGlassCard({ children, style, delay = 0, noAnimation }: Props) {
  const { glassCard, spacing } = useAdminTheme();

  const content = (
    <View style={[glassCard, styles.inner, { padding: spacing.md }, style]}>
      {children}
    </View>
  );

  if (noAnimation) return content;

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400).springify()}>
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: {
    overflow: 'hidden',
  },
});
