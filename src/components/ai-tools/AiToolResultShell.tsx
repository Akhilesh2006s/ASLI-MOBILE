import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import AiToolPremiumIcon from './AiToolPremiumIcon';
import { getAiToolIonicon } from '../../lib/ai-tool-icons';
import {
  getAiToolResultTheme,
  type AiToolResultMeta,
} from '../../lib/ai-tool-result-theme';
import { AI, AI_RADIUS, AI_SPACING, AI_TYPE } from '../../theme/ai';
import { GLASS_ROW, GLASS_VIOLET } from '../../theme/glass';
import { formatAiToolText } from '../../lib/title-case';
import GlassPanel from '../ui/GlassPanel';
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

function AuroraOrb({
  colors,
  style,
  delay = 0,
}: {
  colors: [string, string];
  style: object;
  delay?: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [delay, t]);
  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.35, 0.75], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [-8, 14]) },
      { scale: interpolate(t.value, [0, 1], [0.92, 1.12]) },
    ],
  }));
  return (
    <Animated.View style={[styles.orb, style, anim]} pointerEvents="none">
      <LinearGradient colors={colors} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    </Animated.View>
  );
}

function PortalStamp({ color }: { color: string }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withSequence(
      withTiming(1, { duration: 520, easing: Easing.out(Easing.back) }),
      withTiming(1, { duration: 0 }),
    );
  }, [s]);
  const anim = useAnimatedStyle(() => ({
    opacity: s.value,
    transform: [
      { rotate: '-10deg' },
      { scale: interpolate(s.value, [0, 1], [1.45, 1]) },
    ],
  }));
  return (
    <Animated.View style={[styles.stamp, { borderColor: `${color}99` }, anim]}>
      <Text style={[styles.stampText, { color }]}>Portal{'\n'}Open</Text>
    </Animated.View>
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

/** Cinematic Study Portal chrome for AI tool results. */
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

  const reveal = useSharedValue(hasResult ? 1 : 0);
  useEffect(() => {
    reveal.value = withTiming(hasResult ? 1 : 0, { duration: 420 });
  }, [hasResult, reveal]);
  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(reveal.value, [0, 1], [0.88, 1]),
    transform: [{ translateY: interpolate(reveal.value, [0, 1], [10, 0]) }],
  }));

  return (
    <GlassPanel
      tone="strong"
      elevated
      radius={AI_RADIUS.lg}
      colors={[...GLASS_VIOLET]}
      style={styles.outer}
      contentStyle={styles.innerCard}
    >
      {hasResult ? (
        <View style={styles.auroraLayer} pointerEvents="none">
          <AuroraOrb colors={['rgba(139,92,246,0.55)', 'rgba(139,92,246,0)']} style={styles.orbA} />
          <AuroraOrb colors={['rgba(14,165,233,0.45)', 'rgba(14,165,233,0)']} style={styles.orbB} delay={700} />
          <AuroraOrb colors={['rgba(244,63,94,0.35)', 'rgba(244,63,94,0)']} style={styles.orbC} delay={1400} />
        </View>
      ) : null}

      <View style={[styles.header, hasResult && styles.headerPortal]}>
        {hasResult ? <PortalStamp color={heroColor} /> : null}
        <View style={styles.headerMain}>
          <LinearGradient
            colors={[`${heroColor}33`, `${heroColor}10`]}
            style={[styles.iconBox, hasResult && styles.iconBoxPortal, { borderColor: `${heroColor}55` }]}
          >
            <AiToolPremiumIcon
              name={getAiToolIonicon(toolType)}
              color={heroColor}
              size={hasResult ? 52 : 56}
              iconSize={hasResult ? 24 : 26}
            />
          </LinearGradient>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={[styles.toolName, hasResult && styles.toolNamePortal]} numberOfLines={2}>
                {hasResult ? resultTitle : displayToolName}
              </Text>
              <View style={[styles.badge, hasResult && styles.badgePortal, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                <Ionicons
                  name={hasResult ? 'planet-outline' : 'sparkles'}
                  size={12}
                  color={theme.badgeText}
                />
                <Text style={[styles.badgeText, { color: theme.badgeText }]}>
                  {formatAiToolText(hasResult ? 'Study Portal' : 'AI Powered')}
                </Text>
              </View>
            </View>
            {hasResult ? (
              <Text style={styles.readySub} numberOfLines={2}>
                {formatAiToolText(`${displayToolName} · tap quests below to explore`)}
              </Text>
            ) : displayToolDescription ? (
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
            <View style={styles.loadingAura}>
              <AuroraOrb colors={['rgba(139,92,246,0.5)', 'transparent']} style={styles.loadingOrb} />
              <AiToolPremiumIcon name={getAiToolIonicon(toolType)} color={heroColor} size={72} iconSize={32} />
            </View>
            <Text style={styles.loadingTitle}>{formatAiToolText('Opening Your Study Portal')}</Text>
            <Text style={styles.loadingSub}>
              {formatAiToolText('Vidya is weaving quests, colours, and surprise into your result…')}
            </Text>
            <View style={styles.loadingPreview} importantForAccessibility="no-hide-descendants">
              <View style={[styles.loadingBar, styles.loadingBarShort]} />
              <View style={styles.loadingBar} />
              <View style={[styles.loadingBar, styles.loadingBarMedium]} />
            </View>
          </View>
        ) : children ? (
          <Animated.View style={[styles.resultFrame, revealStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.55)', 'rgba(237,233,254,0.35)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resultPortal}
            >
              <View style={[styles.resultRim, { borderColor: `${heroColor}44` }]} />
              <View style={styles.resultBody}>{children}</View>
            </LinearGradient>
          </Animated.View>
        ) : (
          empty || (
            <View style={styles.emptyBox} accessibilityLiveRegion="polite">
              <View style={styles.emptyIcon}>
                <Ionicons name="planet-outline" size={28} color={AI.primary} />
              </View>
              <Text style={styles.emptyTitle}>{formatAiToolText('Your Portal Awaits')}</Text>
              <Text style={styles.emptyText}>
                {formatAiToolText('Generate once — then explore quests, not a wall of text.')}
              </Text>
            </View>
          )
        )}
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  outer: { width: '100%' },
  innerCard: { overflow: 'hidden' },
  auroraLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  orbA: { width: 180, height: 180, top: -40, left: -30 },
  orbB: { width: 160, height: 160, top: 20, right: -40 },
  orbC: { width: 120, height: 120, top: 110, left: 80 },
  header: {
    padding: AI_SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AI.border,
    gap: AI_SPACING.md,
  },
  headerPortal: {
    paddingTop: AI_SPACING.xl,
    paddingBottom: AI_SPACING.md,
  },
  stamp: {
    position: 'absolute',
    right: 16,
    top: 14,
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    zIndex: 4,
  },
  stampText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 13,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AI_SPACING.md,
    paddingRight: 70,
  },
  iconBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    backgroundColor: GLASS_ROW.fill,
  },
  iconBoxPortal: {
    borderRadius: 20,
    padding: 4,
  },
  headerText: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  toolName: { ...AI_TYPE.title, color: AI.text, flexShrink: 1 },
  toolNamePortal: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgePortal: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  description: { marginTop: 4, ...AI_TYPE.body, color: AI.textSecondary },
  readySub: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: AI.textMuted,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: AI_SPACING.sm },
  metaOrbitWrap: {
    maxHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AI.border,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  metaOrbit: {
    paddingHorizontal: AI_SPACING.lg,
    paddingVertical: AI_SPACING.sm,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 220,
    backgroundColor: GLASS_ROW.fillStrong,
  },
  chipLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  chipValue: { fontSize: 13, lineHeight: 16, fontWeight: '700', flexShrink: 1 },
  contentArea: { paddingVertical: AI_SPACING.md, paddingHorizontal: 0 },
  resultFrame: {
    paddingHorizontal: AI_SPACING.md,
    paddingBottom: AI_SPACING.md,
  },
  resultPortal: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 200,
  },
  resultRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  resultBody: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
    paddingVertical: 48,
    paddingHorizontal: AI_SPACING.lg,
    gap: 10,
  },
  loadingAura: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOrb: { width: 120, height: 120, top: 0, left: 0 },
  loadingTitle: { ...AI_TYPE.title, color: AI.text },
  loadingSub: { ...AI_TYPE.caption, color: AI.textMuted, textAlign: 'center' },
  loadingPreview: { width: '100%', gap: 10, marginTop: 18 },
  loadingBar: {
    height: 12,
    width: '100%',
    borderRadius: 999,
    backgroundColor: GLASS_ROW.fillStrong,
  },
  loadingBarShort: {
    width: '65%',
    alignSelf: 'center',
    backgroundColor: AI.primaryBorder,
  },
  loadingBarMedium: { width: '84%', alignSelf: 'center' },
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AI.primaryBorder,
  },
  emptyTitle: { ...AI_TYPE.title, marginBottom: AI_SPACING.xs, color: AI.text, textAlign: 'center' },
  emptyText: { ...AI_TYPE.body, color: AI.textMuted, textAlign: 'center' },
});
