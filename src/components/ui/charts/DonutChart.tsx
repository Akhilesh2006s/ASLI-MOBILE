import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, FONT } from '../../../theme';

type Segment = {
  value: number;
  color: string;
  label?: string;
};

type Props = {
  segments: Segment[];
  size?: number;
  centerLabel?: string;
};

export default function DonutChart({ segments, size = 120, centerLabel }: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.divider}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          const circle = (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
          );
          offset += dash;
          return circle;
        })}
      </Svg>
      {centerLabel ? (
        <View style={[styles.center, { width: size, height: size }]}>
          <Text style={styles.centerText}>{centerLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.text,
  },
});
