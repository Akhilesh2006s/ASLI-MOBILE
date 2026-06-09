import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ChartLegend from './ChartLegend';

export type HStackSeries = { key: string; color: string; label: string };
export type HStackDatum = { label: string; sublabel?: string; [key: string]: string | number | undefined };

type Props = {
  data: HStackDatum[];
  series: HStackSeries[];
};

export default function HorizontalStackedBarChart({ data, series }: Props) {
  return (
    <View style={styles.wrap}>
      {data.map((row) => {
        const total = series.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0) || 1;
        return (
          <View key={row.label} style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={styles.label} numberOfLines={1}>{row.label}</Text>
              {row.sublabel ? <Text style={styles.sublabel} numberOfLines={1}>{row.sublabel}</Text> : null}
            </View>
            <View style={styles.barTrack}>
              {series.map((s) => {
                const value = Number(row[s.key]) || 0;
                if (value <= 0) return null;
                return (
                  <View
                    key={s.key}
                    style={[styles.segment, { flex: value, backgroundColor: s.color }]}
                  />
                );
              })}
            </View>
            <Text style={styles.total}>{total}</Text>
          </View>
        );
      })}
      <ChartLegend items={series.map((s) => ({ color: s.color, label: s.label }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelCol: { width: 88 },
  label: { fontSize: 11, fontWeight: '700', color: '#1e293b' },
  sublabel: { fontSize: 10, color: '#94a3b8' },
  barTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 14,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  segment: { minWidth: 3 },
  total: { width: 24, textAlign: 'right', fontSize: 11, fontWeight: '700', color: '#64748b' },
});
