import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import ChartLegend from './ChartLegend';
import ChartGrid from './ChartGrid';
import { DEFAULT_CHART_PADDING, getPlotArea } from './chart-math';

export type StackedBarSeries = { key: string; color: string; label: string };
export type StackedBarDatum = { label: string; [key: string]: string | number };

type Props = {
  data: StackedBarDatum[];
  series: StackedBarSeries[];
  height?: number;
  barWidth?: number;
  gap?: number;
};

export default function StackedBarChart({
  data,
  series,
  height = 220,
  barWidth = 36,
  gap = 28,
}: Props) {
  const padding = DEFAULT_CHART_PADDING;
  const chartWidth = Math.max(300, data.length * (barWidth + gap) + gap + padding.left + padding.right);
  const plotArea = getPlotArea(chartWidth, height, padding);

  const maxValue = Math.max(
    1,
    ...data.map((row) => series.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0))
  );

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <Svg width={chartWidth} height={height}>
            <ChartGrid width={chartWidth} height={height} maxValue={maxValue} padding={padding} />
            {data.map((row, index) => {
              const x = padding.left + gap + index * (barWidth + gap);
              let offsetY = plotArea.baseY;
              return (
                <React.Fragment key={row.label}>
                  {series.map((s) => {
                    const value = Number(row[s.key]) || 0;
                    const segmentHeight = (value / maxValue) * plotArea.height;
                    offsetY -= segmentHeight;
                    return (
                      <Rect
                        key={`${row.label}-${s.key}`}
                        x={x}
                        y={offsetY}
                        width={barWidth}
                        height={Math.max(segmentHeight, value > 0 ? 3 : 0)}
                        fill={s.color}
                        stroke="#ffffff"
                        strokeWidth={1}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </Svg>
          <View style={[styles.labels, { width: chartWidth, paddingLeft: padding.left }]}>
            {data.map((row, index) => (
              <Text
                key={row.label}
                style={[styles.label, { left: gap + index * (barWidth + gap), width: barWidth }]}
                numberOfLines={2}
              >
                {row.label}
              </Text>
            ))}
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
