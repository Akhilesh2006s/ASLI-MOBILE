import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analysisStyles, ANALYSIS } from './exam-analysis-ui';

type Props = {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  children: React.ReactNode;
};

export default function AnalysisCard({ title, icon = 'document-text', accent = ANALYSIS.accent, children }: Props) {
  return (
    <View style={analysisStyles.card}>
      <View style={[analysisStyles.cardAccent, { backgroundColor: accent }]} />
      <View style={analysisStyles.cardHeader}>
        <View style={analysisStyles.cardIconWrap}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={analysisStyles.cardTitle}>{title}</Text>
      </View>
      <View style={analysisStyles.cardBody}>{children}</View>
    </View>
  );
}
