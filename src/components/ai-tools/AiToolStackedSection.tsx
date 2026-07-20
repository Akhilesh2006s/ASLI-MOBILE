import type { ReactNode } from 'react';
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatAiToolText } from '../../lib/title-case';
import { getAiSectionThemeByNum } from '../../lib/ai-tool-section-palette';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  num: string;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  children: ReactNode;
  /** First two quests start open for curiosity */
  defaultOpen?: boolean;
};

export default function AiToolStackedSection({
  num,
  title,
  icon = 'layers-outline',
  accentColor,
  children,
  defaultOpen,
}: Props) {
  const numLabel = String(num).replace(/^section\s*/i, '').trim() || num;
  const theme = getAiSectionThemeByNum(numLabel);
  const accent = accentColor || theme.hex;
  const accentDeep = theme.hexDeep;
  const n = parseInt(numLabel.replace(/\D/g, ''), 10);
  const [open, setOpen] = useState(
    typeof defaultOpen === 'boolean' ? defaultOpen : !Number.isFinite(n) || n <= 2,
  );
  const displayTitle = formatAiToolText(title);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.card, { borderColor: `${accent}66` }]}>
      <LinearGradient
        colors={[theme.glassFrom, theme.glassTo, 'rgba(255,255,255,0.25)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={[styles.foil, { backgroundColor: `${accent}22` }]} pointerEvents="none" />

      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <LinearGradient
          colors={['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <LinearGradient colors={[accent, accentDeep]} style={styles.numBadge}>
            <Text style={styles.numText}>{numLabel.length > 3 ? numLabel.slice(0, 2) : numLabel}</Text>
          </LinearGradient>
          <View style={styles.headerText}>
            <View style={styles.kickerRow}>
              <View style={[styles.dot, { backgroundColor: accent }]} />
              <Text style={[styles.sectionLabel, { color: accentDeep }]}>
                {formatAiToolText('Quest')} {numLabel}
              </Text>
            </View>
            <Text style={styles.title}>{displayTitle}</Text>
          </View>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}22`, borderColor: `${accent}44` }]}>
            <Ionicons name={open ? 'chevron-up' : icon} size={20} color={accent} />
          </View>
        </LinearGradient>
      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : (
        <Pressable onPress={toggle} style={styles.lockedHint}>
          <Text style={[styles.lockedText, { color: accentDeep }]}>
            {formatAiToolText('Tap to unlock this quest')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function AiToolStackedList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 7,
    zIndex: 2,
  },
  foil: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 90,
    height: 90,
    borderRadius: 28,
    transform: [{ rotate: '18deg' }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 18,
  },
  numBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  headerText: { flex: 1, minWidth: 0 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 99 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingLeft: 18,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.55)',
  },
  lockedHint: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
