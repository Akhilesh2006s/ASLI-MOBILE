import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';
import { STUDENTS_UI } from '../../lib/students-ui';

export type ChipItem = {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  items: ChipItem[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'default' | 'students';
};

export default function SubNavChips({ items, active, onChange, variant = 'default' }: Props) {
  const isStudents = variant === 'students';

  const content = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={[styles.row, isStudents && styles.studentsRow]}
    >
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[
              styles.chip,
              isStudents && styles.studentsChip,
              selected && (isStudents ? styles.studentsChipActive : styles.chipActive),
            ]}
          >
            {item.icon ? (
              <Ionicons
                name={item.icon}
                size={14}
                color={
                  selected
                    ? isStudents
                      ? '#fff'
                      : TEACHER.primaryLight
                    : isStudents
                      ? STUDENTS_UI.emeraldDark
                      : TEACHER.textMuted
                }
              />
            ) : null}
            <Text
              style={[
                styles.chipText,
                isStudents && styles.studentsChipText,
                selected && (isStudents ? styles.studentsChipTextActive : styles.chipTextActive),
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (isStudents) {
    return <View style={styles.studentsWrap}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 52,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.sm,
    paddingVertical: TEACHER_SPACING.sm,
    paddingHorizontal: TEACHER_SPACING.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.sm,
    borderRadius: TEACHER_RADIUS.full,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  chipActive: {
    backgroundColor: TEACHER.navActiveBg,
    borderColor: TEACHER.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.textMuted,
  },
  chipTextActive: {
    color: TEACHER.primaryLight,
    fontWeight: '700',
  },
  studentsWrap: {
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  studentsRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  studentsChip: {
    borderRadius: 12,
    backgroundColor: '#fff',
    borderColor: STUDENTS_UI.emeraldBorder,
  },
  studentsChipActive: {
    backgroundColor: STUDENTS_UI.emerald,
    borderColor: STUDENTS_UI.emerald,
  },
  studentsChipText: {
    color: STUDENTS_UI.emeraldDark,
    fontWeight: '700',
  },
  studentsChipTextActive: {
    color: '#fff',
  },
});
