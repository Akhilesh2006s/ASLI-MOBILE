import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Subject {
  _id?: string;
  id?: string;
  name?: string;
}

interface FilterChipsProps {
  selectedSubject: string;
  subjects: Subject[];
  onSelect: (subjectIdOrName: string) => void;
}

function FilterChipsComponent({ selectedSubject, subjects, onSelect }: FilterChipsProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={[styles.chip, selectedSubject === 'all' && styles.chipActive]}
          onPress={() => onSelect('all')}
          activeOpacity={0.85}
        >
          <Text style={[styles.chipText, selectedSubject === 'all' && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>

        {subjects.map((subject) => {
          const value = (subject._id || subject.id || subject.name || '').toString();
          const active = selectedSubject === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(value)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{subject.name || 'Subject'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  container: {
    paddingRight: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextActive: {
    color: '#ffffff',
  },
});

export default memo(FilterChipsComponent);
