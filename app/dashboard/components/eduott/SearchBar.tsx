import React, { memo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING, STUDENT_TYPO } from '../../../../src/theme/student';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

function SearchBarComponent({ value, onChangeText, placeholder = 'Search videos...' }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={STUDENT.navInactive} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={STUDENT.navInactive}
      />
      <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
        <Ionicons name="options-outline" size={18} color={STUDENT.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
        <Ionicons name="mic-outline" size={18} color={STUDENT.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: STUDENT_RADIUS.inner,
    backgroundColor: STUDENT.surface,
    paddingHorizontal: STUDENT_SPACING.md,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    ...STUDENT.shadow.sm,
    marginBottom: STUDENT_SPACING.sm,
  },
  input: {
    flex: 1,
    height: 46,
    ...STUDENT_TYPO.body,
    color: STUDENT.text,
    paddingHorizontal: STUDENT_SPACING.sm,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: STUDENT_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: STUDENT_SPACING.xs,
  },
});

export default memo(SearchBarComponent);
