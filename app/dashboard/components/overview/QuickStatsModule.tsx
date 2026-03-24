import React, { memo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickStatsModuleProps {
  stats: {
    questionsAnswered: number;
    accuracyRate: number;
    rank: number;
  };
}

function QuickStatsModuleComponent({ stats }: QuickStatsModuleProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const isTablet = width >= 768;
  const iconSize = compact ? 18 : 22;

  return (
    <View style={styles.grid}>
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <Ionicons name="checkmark-circle" size={iconSize} color="#f97316" />
        <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>Questions Solved</Text>
        <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>{stats.questionsAnswered.toLocaleString()}</Text>
      </View>
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <Ionicons name="trending-up" size={iconSize} color="#2563eb" />
        <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>Accuracy Rate</Text>
        <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>{stats.accuracyRate}%</Text>
      </View>
      <View style={[styles.card, isTablet && styles.cardTablet]}>
        <Ionicons name="bar-chart" size={iconSize} color="#0f766e" />
        <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>Rank</Text>
        <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>#{stats.rank || 0}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTablet: {
    minHeight: 94,
  },
  label: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
  value: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: '800',
  },
  labelCompact: {
    fontSize: 10,
  },
  valueCompact: {
    fontSize: 15,
  },
});

export default memo(QuickStatsModuleComponent);
