import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AI, AI_RADIUS, AI_SPACING } from '../../theme/ai';
import { formatAiToolText } from '../../lib/title-case';

export type AiToolParamItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

type Props = {
  items: AiToolParamItem[];
  accent?: string;
  tabletUi?: boolean;
};

export default function AiToolParamsGrid({ items, accent = AI.primary, tabletUi }: Props) {
  const visible = items.filter((item) => item.value.trim());
  if (!visible.length) return null;

  return (
    <View style={styles.grid} accessibilityLabel="Generation parameters">
      {visible.map((item) => (
        <View key={item.label} style={[styles.box, tabletUi && styles.boxTablet]}>
          <View style={styles.boxHeader}>
            <Ionicons name={item.icon} size={13} color={accent} />
            <Text style={styles.boxLabel}>{formatAiToolText(item.label).toUpperCase()}</Text>
          </View>
          <Text style={styles.boxValue} numberOfLines={2}>
            {formatAiToolText(item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AI_SPACING.sm,
    marginBottom: AI_SPACING.md,
  },
  box: {
    flexGrow: 1,
    flexBasis: '46%',
    borderRadius: AI_RADIUS.sm,
    borderWidth: 1,
    borderColor: AI.border,
    backgroundColor: AI.surface,
    paddingHorizontal: AI_SPACING.sm,
    paddingVertical: AI_SPACING.sm,
  },
  boxTablet: {
    flexBasis: '31%',
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: AI.textMuted,
  },
  boxValue: {
    fontSize: 15,
    fontWeight: '700',
    color: AI.text,
  },
});
