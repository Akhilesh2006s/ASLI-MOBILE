import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatAiToolText } from '../../lib/title-case';

const ACCENTS = [
  ['#6C63FF', '#8B5CF6'],
  ['#0ea5e9', '#2563eb'],
  ['#8b5cf6', '#9333ea'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#ea580c'],
  ['#f43f5e', '#db2777'],
  ['#06b6d4', '#0d9488'],
  ['#6366f1', '#1d4ed8'],
  ['#d946ef', '#9333ea'],
  ['#84cc16', '#059669'],
  ['#f97316', '#ef4444'],
  ['#475569', '#1e293b'],
];

const GRADIENTS: [string, string][] = [
  ['#f5f3ff', '#eef2ff'],
  ['#f0f9ff', '#eff6ff'],
  ['#f5f3ff', '#fdf4ff'],
  ['#ecfdf5', '#f7fee7'],
  ['#fffbeb', '#fff7ed'],
  ['#fff1f2', '#fdf2f8'],
  ['#ecfeff', '#f0fdfa'],
  ['#eef2ff', '#eff6ff'],
  ['#fdf4ff', '#faf5ff'],
  ['#f7fee7', '#ecfdf5'],
  ['#fff7ed', '#fef2f2'],
  ['#f8fafc', '#f1f5f9'],
];

function themeForNum(num: string) {
  const n = parseInt(String(num).replace(/\D/g, ''), 10);
  const i = Number.isFinite(n) && n > 0 ? (n - 1) % ACCENTS.length : 0;
  return { accent: ACCENTS[i], gradient: GRADIENTS[i] };
}

type Props = {
  num: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  children: ReactNode;
};

export default function AiToolStackedSection({
  num,
  title,
  icon = 'layers-outline',
  accentColor,
  children,
}: Props) {
  const numLabel = String(num).replace(/^section\s*/i, '').trim() || num;
  const theme = themeForNum(numLabel);
  const accent = accentColor || theme.accent[0];

  const displayTitle = formatAiToolText(title);

  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <LinearGradient colors={theme.accent} style={styles.numBadge}>
          <Text style={styles.numText}>{numLabel.length > 3 ? numLabel.slice(0, 2) : numLabel}</Text>
        </LinearGradient>
        <View style={styles.headerText}>
          <Text style={styles.sectionLabel}>{formatAiToolText('Section')} {numLabel}</Text>
          <Text style={styles.title}>{displayTitle}</Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
          <Ionicons name={icon} size={22} color={accent} />
        </View>
      </LinearGradient>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function AiToolStackedList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 10,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.18)',
  },
  numBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingLeft: 16,
  },
});
