import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminTheme } from './useAdminTheme';

type Props = TextInputProps & {
  sticky?: boolean;
};

export default function AdminSearchBar({ sticky, style, ...rest }: Props) {
  const { colors, radius, spacing } = useAdminTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.inputBg,
          borderColor: colors.inputBorder,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
        },
        sticky && styles.sticky,
      ]}
    >
      <Ionicons name="search" size={18} color={colors.textMuted} />
      <TextInput
        {...rest}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text }, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
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
