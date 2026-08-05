import type { ReactNode } from 'react';
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [open, setOpen] = useState(
    // All generator sections start expanded so nothing is stuck behind "Unlock".
    typeof defaultOpen === 'boolean' ? defaultOpen : true,
  );
  const displayTitle = formatAiToolText(title);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.card, { borderColor: '#E2E8F0' }]}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        style={styles.header}
      >
        <View style={[styles.numBadge, { backgroundColor: '#F1F5F9' }]}>
          <Text style={[styles.numText, { color: accent }]}>
            {numLabel.length > 3 ? numLabel.slice(0, 2) : numLabel}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{displayTitle}</Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons name={open ? 'chevron-up' : icon} size={18} color="#64748B" />
        </View>
      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

export function AiToolStackedList({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    paddingLeft: 12,
    backgroundColor: '#FFFFFF',
  },
  numBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 13, fontWeight: '800' },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingLeft: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
});
