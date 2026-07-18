import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AiToolPremiumIcon from './AiToolPremiumIcon';
import { getAiToolIonicon } from '../../lib/ai-tool-icons';
import {
  getAiToolResultTheme,
  type AiToolResultMeta,
} from '../../lib/ai-tool-result-theme';
import { AI, AI_HERO_GRADIENT, AI_RADIUS, AI_SHADOW, AI_SPACING, AI_TYPE } from '../../theme/ai';
import { formatAiToolText } from '../../lib/title-case';

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
    <View style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]} accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={16} color={chipText} />
      <Text style={[styles.chipLabel, { color: chipText }]}>{formatAiToolText(label)}:</Text>
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
};

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
}: Props) {
  const theme = getAiToolResultTheme(toolType);
  const heroColor = accent || theme.badgeText;
  const board = String(meta?.board || '').trim();
  const classLabel = String(meta?.classLabel || '').trim();
  const subject = String(meta?.subject || '').trim();
  const chapter = String(meta?.chapter || '').trim();
  const subtopic = String(meta?.subtopic || '').trim();
  const hasMeta = Boolean(board || classLabel || subject || chapter || subtopic);
  const showMetaChips = hasMeta && !children && !isLoading;
  const displayToolName = formatAiToolText(toolName);
  const displayToolDescription = toolDescription ? formatAiToolText(toolDescription) : undefined;

  return (
    <LinearGradient
      colors={[...AI_HERO_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.outer}
    >
      <View style={styles.innerCard}>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <View style={[styles.iconBox, { backgroundColor: theme.iconBg, borderColor: theme.iconBorder }]}>
              <AiToolPremiumIcon
                name={getAiToolIonicon(toolType)}
                color={heroColor}
                size={56}
                iconSize={26}
              />
            </View>
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <Text style={styles.toolName}>{displayToolName}</Text>
                <View style={[styles.badge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                  <Ionicons name="sparkles" size={11} color={theme.badgeText} />
                  <Text style={[styles.badgeText, { color: theme.badgeText }]}>
                    {formatAiToolText('AI Powered')}
                  </Text>
                </View>
              </View>
              {displayToolDescription ? <Text style={styles.description}>{displayToolDescription}</Text> : null}
              {citations}
            </View>
          </View>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>

        {showMetaChips ? (
          <View style={styles.metaRow}>
            <MetaChip icon="school-outline" label="Board" value={board} {...theme} />
            <MetaChip icon="people-outline" label="Class" value={classLabel} {...theme} />
            <MetaChip icon="library-outline" label="Subject" value={subject} {...theme} />
            <MetaChip icon="book-outline" label="Chapter" value={chapter} {...theme} />
            <MetaChip icon="pricetag-outline" label="Subtopic" value={subtopic} {...theme} />
          </View>
        ) : null}

        <View style={styles.contentArea}>
          {isLoading ? (
            <View style={styles.loadingBox} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
              <AiToolPremiumIcon name={getAiToolIonicon(toolType)} color={heroColor} size={72} iconSize={32} />
              <Text style={styles.loadingTitle}>{formatAiToolText('Creating Your Content')}</Text>
              <Text style={styles.loadingSub}>
                {formatAiToolText('Vidya AI Is Organising A Clear, Classroom-Ready Result.')}
              </Text>
              <View style={styles.loadingPreview} importantForAccessibility="no-hide-descendants">
                <View style={[styles.loadingBar, styles.loadingBarShort]} />
                <View style={styles.loadingBar} />
                <View style={[styles.loadingBar, styles.loadingBarMedium]} />
              </View>
            </View>
          ) : children ? (
            <View style={styles.resultBodyPlain}>{children}</View>
          ) : (
            empty || (
              <View style={styles.emptyBox} accessibilityLiveRegion="polite">
                <View style={styles.emptyIcon}>
                  <Ionicons name="sparkles-outline" size={28} color={AI.primary} />
                </View>
                <Text style={styles.emptyTitle}>{formatAiToolText('Your Result Will Appear Here')}</Text>
                <Text style={styles.emptyText}>
                  {formatAiToolText('Generate Content To See Your Result Here.')}
                </Text>
              </View>
            )
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: AI_RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: AI.primaryBorder,
    ...AI_SHADOW,
  },
  innerCard: {
    borderRadius: AI_RADIUS.md,
    backgroundColor: AI.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: AI.border,
  },
  header: {
    padding: AI_SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: AI.border,
    gap: AI_SPACING.md,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AI_SPACING.md,
  },
  iconBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  toolName: {
    ...AI_TYPE.title,
    color: AI.text,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  description: {
    marginTop: 4,
    ...AI_TYPE.body,
    color: AI.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AI_SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AI_SPACING.sm,
    paddingHorizontal: AI_SPACING.lg,
    paddingVertical: AI_SPACING.md,
    backgroundColor: AI.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: AI.border,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  chipLabel: {
    fontSize: 15,
    lineHeight: 21,
    opacity: 0.75,
  },
  chipValue: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    flexShrink: 1,
  },
  contentArea: {
    padding: AI_SPACING.lg,
  },
  resultBodyPlain: {
    width: '100%',
  },
  resultBody: {
    borderRadius: 16,
    backgroundColor: AI.surfaceMuted,
    padding: AI_SPACING.xs,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    paddingVertical: 48,
    paddingHorizontal: AI_SPACING.lg,
    gap: 10,
  },
  loadingTitle: {
    ...AI_TYPE.title,
    color: AI.text,
  },
  loadingSub: {
    ...AI_TYPE.caption,
    color: AI.textMuted,
    textAlign: 'center',
  },
  loadingPreview: {
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  loadingBar: {
    height: 12,
    width: '100%',
    borderRadius: 999,
    backgroundColor: AI.border,
  },
  loadingBarShort: {
    width: '65%',
    alignSelf: 'center',
    backgroundColor: AI.primaryBorder,
  },
  loadingBarMedium: {
    width: '84%',
    alignSelf: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 38,
    paddingHorizontal: AI_SPACING.lg,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    marginBottom: AI_SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AI_RADIUS.md,
    backgroundColor: AI.primarySoft,
  },
  emptyTitle: {
    ...AI_TYPE.title,
    marginBottom: AI_SPACING.xs,
    color: AI.text,
    textAlign: 'center',
  },
  emptyText: {
    ...AI_TYPE.body,
    color: AI.textMuted,
    textAlign: 'center',
  },
});
