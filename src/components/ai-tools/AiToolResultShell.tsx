import type { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AiToolPremiumIcon from './AiToolPremiumIcon';
import { getAiToolIonicon } from '../../lib/ai-tool-icons';
import {
  getAiToolResultTheme,
  type AiToolResultMeta,
} from '../../lib/ai-tool-result-theme';
import { AI, AI_RADIUS, AI_SPACING, AI_TYPE } from '../../theme/ai';
import { formatAiToolText } from '../../lib/title-case';
import { getAiToolResultTitle } from './AiToolContentRenderer';

type MetaChipProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
};

function MetaChip({ icon, label, value, chipBg, chipBorder, chipText }: MetaChipProps) {
  if (!value.trim()) return null;
  return (
    <View
      style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={13} color={chipText} />
      <Text style={[styles.chipLabel, { color: chipText }]}>{formatAiToolText(label)}</Text>
      <Text style={[styles.chipValue, { color: chipText }]} numberOfLines={1}>
        {formatAiToolText(value)}
      </Text>
    </View>
  );
}

type Props = {
  toolType?: string;
  toolName: string;
  toolDescription?: string;
  meta?: AiToolResultMeta;
  actions?: ReactNode;
  citations?: ReactNode;
  isLoading?: boolean;
  empty?: ReactNode;
  children?: ReactNode;
  accent?: string;
  variant?: 'student' | 'teacher';
};

/** Compact AI tool result chrome — white surfaces, no stamps, tight spacing. */
export default function AiToolResultShell({
  toolType = '',
  toolName,
  toolDescription,
  meta,
  actions,
  citations,
  isLoading,
  empty,
  children,
  accent,
  variant = 'student',
}: Props) {
  const theme = getAiToolResultTheme(toolType);
  const heroColor = accent || theme.badgeText;
  const board = String(meta?.board || '').trim();
  const classLabel = String(meta?.classLabel || '').trim();
  const subject = String(meta?.subject || '').trim();
  const chapter = String(meta?.chapter || '').trim();
  const subtopic = String(meta?.subtopic || '').trim();
  const hasMeta = Boolean(board || classLabel || subject || chapter || subtopic);
  const hasResult = Boolean(children) && !isLoading;
  const displayToolName = formatAiToolText(toolName);
  const displayToolDescription = toolDescription ? formatAiToolText(toolDescription) : undefined;
  const resultTitle = formatAiToolText(getAiToolResultTitle(toolType, variant));

  return (
    <View style={styles.outer}>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={[styles.iconBox, { borderColor: `${heroColor}44` }]}>
            <AiToolPremiumIcon
              name={getAiToolIonicon(toolType)}
              color={heroColor}
              size={44}
              iconSize={22}
            />
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.toolName} numberOfLines={2}>
                {hasResult ? resultTitle : displayToolName}
              </Text>
              <View style={[styles.badge, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                <Ionicons name={hasResult ? 'document-text-outline' : 'sparkles'} size={12} color={AI.textMuted} />
                <Text style={[styles.badgeText, { color: AI.textMuted }]}>
                  {formatAiToolText(hasResult ? 'Result' : 'AI Powered')}
                </Text>
              </View>
            </View>
            {!hasResult && displayToolDescription ? (
              <Text style={styles.description} numberOfLines={2}>
                {displayToolDescription}
              </Text>
            ) : null}
            {citations}
          </View>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>

      {hasMeta && (hasResult || (!children && !isLoading)) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metaOrbit}
          style={styles.metaOrbitWrap}
        >
          <MetaChip icon="school-outline" label="Board" value={board} {...theme} />
          <MetaChip icon="people-outline" label="Class" value={classLabel} {...theme} />
          <MetaChip icon="library-outline" label="Subject" value={subject} {...theme} />
          <MetaChip icon="book-outline" label="Chapter" value={chapter} {...theme} />
          <MetaChip icon="pricetag-outline" label="Subtopic" value={subtopic} {...theme} />
        </ScrollView>
      ) : null}

      <View style={styles.contentArea}>
        {isLoading ? (
          <View style={styles.loadingBox} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
            <AiToolPremiumIcon name={getAiToolIonicon(toolType)} color={heroColor} size={64} iconSize={28} />
            <Text style={styles.loadingTitle}>{formatAiToolText('Generating…')}</Text>
            <Text style={styles.loadingSub}>{formatAiToolText('Please wait a moment.')}</Text>
          </View>
        ) : children ? (
          <View style={styles.resultBody}>{children}</View>
        ) : (
          empty || (
            <View style={styles.emptyBox} accessibilityLiveRegion="polite">
              <Text style={styles.emptyTitle}>{formatAiToolText('Ready to generate')}</Text>
              <Text style={styles.emptyText}>
                {formatAiToolText('Fill the form and tap Generate.')}
              </Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: AI_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    backgroundColor: '#F8FAFC',
  },
  headerText: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  toolName: { ...AI_TYPE.title, fontSize: 17, lineHeight: 22, color: AI.text, flexShrink: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  description: { marginTop: 2, ...AI_TYPE.body, fontSize: 13, color: AI.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaOrbitWrap: {
    maxHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  metaOrbit: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 200,
    backgroundColor: '#FFFFFF',
  },
  chipLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  chipValue: { fontSize: 12, lineHeight: 14, fontWeight: '700', flexShrink: 1 },
  contentArea: { paddingVertical: 4, paddingHorizontal: 0 },
  resultBody: {
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 8,
  },
  loadingTitle: { ...AI_TYPE.title, color: AI.text },
  loadingSub: { ...AI_TYPE.caption, color: AI.textMuted, textAlign: 'center' },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyTitle: { ...AI_TYPE.title, marginBottom: 4, color: AI.text, textAlign: 'center' },
  emptyText: { ...AI_TYPE.body, color: AI.textMuted, textAlign: 'center' },
});
