import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';

export type Chip = { id: string; label: string; shortLabel?: string };

type Props = {
  chips: Chip[];
  active: string;
  onChange: (id: string) => void;
};

const TABLET_MIN_WIDTH = 768;

function tabCaption(chip: Chip, mobile: boolean) {
  if (mobile && chip.shortLabel) return chip.shortLabel;
  return chip.label;
}

function TabDivider({ narrow }: { narrow?: boolean }) {
  return (
    <View style={[styles.dividerWrap, narrow && styles.dividerWrapNarrow]} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={styles.dividerText}>|</Text>
    </View>
  );
}

function TabItem({
  chip,
  active,
  onChange,
  mobile,
  compact,
}: {
  chip: Chip;
  active: boolean;
  onChange: (id: string) => void;
  mobile?: boolean;
  compact?: boolean;
}) {
  const caption = tabCaption(chip, !!mobile);

  return (
    <Pressable
      onPress={() => onChange(chip.id)}
      style={[
        styles.tab,
        mobile && styles.tabMobile,
        compact && styles.tabCompact,
        active && styles.tabActive,
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={chip.label}
    >
      <Text
        style={[styles.tabText, mobile && styles.tabTextMobile, active && styles.tabTextActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

function TabRow({
  chips,
  active,
  onChange,
  mobile,
  compact,
}: {
  chips: Chip[];
  active: string;
  onChange: (id: string) => void;
  mobile?: boolean;
  compact?: boolean;
}) {
  return (
    <>
      {chips.map((chip, index) => (
        <React.Fragment key={chip.id}>
          {index > 0 ? <TabDivider narrow={mobile} /> : null}
          <TabItem
            chip={chip}
            active={chip.id === active}
            onChange={onChange}
            mobile={mobile}
            compact={compact}
          />
        </React.Fragment>
      ))}
    </>
  );
}

export default function ChipNav({ chips, active, onChange }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < TABLET_MIN_WIDTH;
  const scrollable = chips.length > 4;

  if (scrollable) {
    return (
      <View style={styles.wrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          <TabRow chips={chips} active={active} onChange={onChange} mobile={isMobile} compact />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TabRow chips={chips} active={active} onChange={onChange} mobile={isMobile} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.lg,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    overflow: 'hidden',
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minWidth: '100%',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    backgroundColor: STUDENT.surface,
  },
  tabMobile: {
    paddingVertical: 15,
    paddingHorizontal: 2,
  },
  tabCompact: {
    flex: 0,
    minWidth: 96,
    paddingHorizontal: 12,
  },
  tabActive: {
    backgroundColor: STUDENT.navActiveBg,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: STUDENT.textMuted,
    textAlign: 'center',
  },
  tabTextMobile: {
    fontSize: 16,
    fontWeight: '700',
  },
  tabTextActive: {
    color: STUDENT.primaryDark,
    fontWeight: '800',
  },
  dividerWrap: {
    width: 14,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: STUDENT.surface,
  },
  dividerWrapNarrow: {
    width: 10,
  },
  dividerText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#94a3b8',
    lineHeight: 18,
  },
});
