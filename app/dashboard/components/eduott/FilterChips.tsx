import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ChipOption {
  value: string;
  label: string;
}

interface FilterChipsProps {
  sectionLabel?: string;
  selected: string;
  onSelect: (value: string) => void;
  options: ChipOption[];
}

function FilterChipsComponent({ sectionLabel, selected, onSelect, options }: FilterChipsProps) {
  return (
    <View style={styles.wrapper}>
      {sectionLabel ? <Text style={styles.sectionLabel}>{sectionLabel}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={[styles.chip, selected === 'all' && styles.chipActive]}
          onPress={() => onSelect('all')}
          activeOpacity={0.85}
        >
          <Text style={[styles.chipText, selected === 'all' && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>

        {options.map((opt) => {
          const active = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(opt.value)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
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
