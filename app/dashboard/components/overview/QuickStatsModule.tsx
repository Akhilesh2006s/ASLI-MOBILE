import React, { memo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { STUDENT, STUDENT_ANIMATION } from '../../../../src/theme/student';

interface QuickStatsModuleProps {
  stats: {
    questionsAnswered: number;
    accuracyRate: number;
    rank: number;
  };
  dark?: boolean;
}

const ITEMS = [
  {
    key: 'questions',
    label: 'Questions Solved',
    icon: 'checkmark-circle' as const,
    gradient: STUDENT.statGradients.questions,
    getValue: (s: QuickStatsModuleProps['stats']) => s.questionsAnswered.toLocaleString(),
  },
  {
    key: 'accuracy',
    label: 'Accuracy Rate',
    icon: 'trending-up' as const,
    gradient: STUDENT.statGradients.accuracy,
    getValue: (s: QuickStatsModuleProps['stats']) => `${s.accuracyRate}%`,
  },
  {
    key: 'rank',
    label: 'Rank',
    icon: 'bar-chart' as const,
    gradient: STUDENT.statGradients.rank,
    getValue: (s: QuickStatsModuleProps['stats']) => (s.rank > 0 ? `#${s.rank}` : '—'),
  },
];

function QuickStatsModuleComponent({ stats }: QuickStatsModuleProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.grid}>
      {ITEMS.map((item, index) => (
        <Animated.View
          key={item.key}
          entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(index * 70)}
          style={styles.cardWrap}
        >
          <LinearGradient
            colors={[...item.gradient]}
            style={[styles.card, compact && styles.cardCompact]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.iconBubble}>
              <Ionicons name={item.icon} size={compact ? 16 : 18} color="#fff" />
            </View>
            <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
              {item.getValue(stats)}
            </Text>
          </LinearGradient>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cardWrap: { flex: 1 },
  card: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 108,
    justifyContent: 'space-between',
    ...STUDENT.shadow.sm,
  },
  cardCompact: {
    minHeight: 96,
    paddingVertical: 12,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  value: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  labelCompact: { fontSize: 10 },
  valueCompact: { fontSize: 17 },
});

export default memo(QuickStatsModuleComponent);
