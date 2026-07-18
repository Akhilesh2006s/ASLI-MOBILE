import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../theme/teacher';

export type FilterOption = {
  value: string | null;
  label: string;
  count?: number;
};

type Props = {
  label: string;
  value: string | null;
  placeholder: string;
  options: FilterOption[];
  onChange: (value: string | null) => void;
};

export default function FilterDropdown({ label, value, placeholder, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Ionicons name="filter" size={14} color={TEACHER.primaryLight} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={TEACHER.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.label}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {option.label}
                    {option.count != null ? ` (${option.count})` : ''}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color={TEACHER.primaryLight} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.md,
    paddingHorizontal: TEACHER_SPACING.md,
    paddingVertical: 10,
    minWidth: 0,
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.text,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: TEACHER.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: TEACHER_SPACING.lg,
    paddingBottom: TEACHER_SPACING.xxl,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    gap: 4,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEACHER.text,
    marginBottom: TEACHER_SPACING.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: TEACHER_SPACING.md,
    borderRadius: TEACHER_RADIUS.md,
  },
  optionActive: {
    backgroundColor: TEACHER.navActiveBg,
  },
  optionText: {
    fontSize: 14,
    color: TEACHER.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  optionTextActive: {
    color: TEACHER.primaryLight,
    fontWeight: '700',
  },
});
