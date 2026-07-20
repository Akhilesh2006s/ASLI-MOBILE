import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '../../../src/components/ui';
import { useAdminTheme } from './useAdminTheme';

type Props = TextInputProps & {
  sticky?: boolean;
};

export default function AdminSearchBar({ sticky, style, ...rest }: Props) {
  const { colors, radius, spacing } = useAdminTheme();

  return (
    // Frosted input surface; the row layout sits on the inner view because
    // GlassPanel wraps children in its own content view.
    <GlassPanel
      style={[styles.wrap, { borderRadius: radius.md }, sticky && styles.sticky]}
      radius={radius.md}
      tone="strong"
    >
      <View style={[styles.wrapInner, { paddingHorizontal: spacing.md }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          {...rest}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }, style]}
        />
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 48,
  },
  wrapInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  sticky: {
    zIndex: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 10,
  },
});
