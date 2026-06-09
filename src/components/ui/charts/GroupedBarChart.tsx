import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import ChartLegend from './ChartLegend';
import ChartGrid from './ChartGrid';
import { DEFAULT_CHART_PADDING, getPlotArea } from './chart-math';

export type GroupedBarSeries = { key: string; color: string; label: string };
export type GroupedBarDatum = { label: string; [key: string]: string | number };

type Props = {
  data: GroupedBarDatum[];
  series: GroupedBarSeries[];
  height?: number;
  barWidth?: number;
  groupGap?: number;
};

export default function GroupedBarChart({
  data,
  series,
  height = 220,
  barWidth = 14,
  groupGap = 24,
}: Props) {
  const padding = DEFAULT_CHART_PADDING;
  const innerGap = 4;
  const groupWidth = series.length * barWidth + (series.length - 1) * innerGap;
  const chartWidth = Math.max(300, data.length * (groupWidth + groupGap) + groupGap + padding.left + padding.right);
  const plotArea = getPlotArea(chartWidth, height, padding);

  const maxValue = Math.max(
    1,
    ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0))
  );

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <Svg width={chartWidth} height={height}>
            <ChartGrid width={chartWidth} height={height} maxValue={maxValue} padding={padding} />
            {data.flatMap((row, groupIndex) => {
              const groupX = padding.left + groupGap + groupIndex * (groupWidth + groupGap);
              return series.map((s, seriesIndex) => {
                const value = Number(row[s.key]) || 0;
                const barHeight = (value / maxValue) * plotArea.height;
                const x = groupX + seriesIndex * (barWidth + innerGap);
                const y = plotArea.baseY - barHeight;
                return (
                  <Rect
                    key={`${row.label}-${s.key}`}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, value > 0 ? 3 : 0)}
                    rx={3}
                    fill={s.color}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                );
              });
            })}
          </Svg>
          <View style={[styles.labels, { width: chartWidth, paddingLeft: padding.left }]}>
            {data.map((row, groupIndex) => {
              const groupX = groupGap + groupIndex * (groupWidth + groupGap);
              return (
                <Text
                  key={row.label}
                  style={[styles.label, { left: groupX, width: groupWidth }]}
                  numberOfLines={2}
                >
                  {row.label}
                </Text>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <ChartLegend items={series.map((s) => ({ color: s.color, label: s.label }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labels: { position: 'relative', height: 40, marginTop: 4 },
  label: {
    position: 'absolute',
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
});
