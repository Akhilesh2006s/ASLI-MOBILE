import React, { memo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

function SearchBarComponent({ value, onChangeText, placeholder = 'Search videos...' }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color="#94a3b8" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#94a3b8"
      />
      <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
        <Ionicons name="options-outline" size={18} color="#64748b" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton} activeOpacity={0.8}>
        <Ionicons name="mic-outline" size={18} color="#64748b" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0f172a',
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});

export default memo(SearchBarComponent);
