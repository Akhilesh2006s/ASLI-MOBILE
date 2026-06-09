import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { COLORS, FONT, SPACING } from '../../../theme';
import ChartGrid from './ChartGrid';
import { DEFAULT_CHART_PADDING, getPlotArea } from './chart-math';

type DataPoint = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: DataPoint[];
  height?: number;
  maxValue?: number;
};

export default function BarChart({ data, height = 180, maxValue }: Props) {
  const padding = DEFAULT_CHART_PADDING;
  const barWidth = 28;
  const gap = 16;
  const chartWidth = Math.max(240, data.length * (barWidth + gap) + gap + padding.left + padding.right);
  const plotArea = getPlotArea(chartWidth, height, padding);
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <Svg width={chartWidth} height={height}>
            <ChartGrid width={chartWidth} height={height} maxValue={max} padding={padding} />
            {data.map((item, i) => {
              const barHeight = (item.value / max) * plotArea.height;
              const x = padding.left + gap + i * (barWidth + gap);
              const y = plotArea.baseY - barHeight;
              return (
                <Rect
                  key={item.label}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, item.value > 0 ? 3 : 0)}
                  rx={6}
                  fill={item.color || COLORS.primary}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
              );
            })}
          </Svg>
          <View style={[styles.labels, { width: chartWidth, paddingLeft: padding.left + gap }]}>
            {data.map((item, i) => (
              <Text
                key={item.label}
                style={[styles.label, { left: i * (barWidth + gap), width: barWidth }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
  },
  labels: {
    position: 'relative',
    height: 24,
    marginTop: SPACING.xs,
  },
  label: {
    position: 'absolute',
    fontSize: FONT.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
