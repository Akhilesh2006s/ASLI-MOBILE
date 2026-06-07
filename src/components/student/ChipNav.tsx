import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';

type Chip = { id: string; label: string };

type Props = {
  chips: Chip[];
  active: string;
  onChange: (id: string) => void;
};

export default function ChipNav({ chips, active, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const on = chip.id === active;
        return (
          <Pressable
            key={chip.id}
            style={[styles.chip, on && styles.chipActive]}
            onPress={() => onChange(chip.id)}
          >
            <Text style={[styles.text, on && styles.textActive]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.surface,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  chipActive: {
    backgroundColor: '#d1fae5',
    borderColor: STUDENT.primary,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: STUDENT.textMuted,
  },
  textActive: {
    color: STUDENT.text,
  },
});
