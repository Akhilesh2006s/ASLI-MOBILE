import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Item = { color: string; label: string; value?: string | number };

export default function ChartLegend({ items }: { items: Item[] }) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={styles.label}>
            {item.label}
            {item.value != null ? ` · ${item.value}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 12, color: '#4b5563', fontWeight: '600' },
});
