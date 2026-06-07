import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAdminTheme } from './useAdminTheme';
import AdminScalePressable from './AdminScalePressable';

export type FilterChip = {
  id: string;
  label: string;
};

type Props = {
  chips: FilterChip[];
  selected: string;
  onSelect: (id: string) => void;
};

export default function AdminFilterChips({ chips, selected, onSelect }: Props) {
  const { colors, radius } = useAdminTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const active = chip.id === selected;
        return (
          <AdminScalePressable
            key={chip.id}
            onPress={() => onSelect(chip.id)}
            style={[
              styles.chip,
              {
                borderRadius: radius.full,
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.surfaceBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.textInverse : colors.textSecondary },
              ]}
            >
              {chip.label}
            </Text>
          </AdminScalePressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
