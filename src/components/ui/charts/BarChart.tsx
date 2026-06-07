import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { COLORS, FONT, SPACING } from '../../../theme';

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

export default function BarChart({ data, height = 160, maxValue }: Props) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barWidth = 28;
  const gap = 16;
  const chartWidth = data.length * (barWidth + gap);
  const chartHeight = height - 30;

  return (
    <View style={styles.wrap}>
      <Svg width={chartWidth} height={height}>
        {data.map((item, i) => {
          const barHeight = (item.value / max) * chartHeight;
          const x = i * (barWidth + gap);
          const y = chartHeight - barHeight;
          return (
            <Rect
              key={item.label}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={6}
              fill={item.color || COLORS.primary}
            />
          );
        })}
      </Svg>
      <View style={[styles.labels, { width: chartWidth }]}>
        {data.map((item) => (
          <Text key={item.label} style={[styles.label, { width: barWidth + gap }]} numberOfLines={1}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
  },
  labels: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  label: {
    fontSize: FONT.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
