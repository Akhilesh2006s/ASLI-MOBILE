import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { STUDENT, STUDENT_RADIUS } from '../../theme/student';
import { GLASS_RIM, GLASS_ROW } from '../../theme/glass';
import GlassSurface from '../ui/GlassSurface';

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

export default function ChipNav({ chips, active, onChange }: Props) {
  const { width } = useWindowDimensions();
  const isMobile = width < TABLET_MIN_WIDTH;
  const scrollable = chips.length > 4;

  const row = (
    <>
      {chips.map((chip) => {
        const isActive = chip.id === active;
        const caption = tabCaption(chip, isMobile);
        return (
          <Pressable
            key={chip.id}
            onPress={() => onChange(chip.id)}
            style={[
              styles.tab,
              isMobile && styles.tabMobile,
              scrollable && styles.tabCompact,
              isActive && styles.tabActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={chip.label}
          >
            {isActive ? (
              <View style={styles.activePill}>
                <Text style={styles.tabTextActive} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {caption}
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.tabText, isMobile && styles.tabTextMobile]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {caption}
              </Text>
            )}
          </Pressable>
        );
      })}
    </>
  );

  return (
    <View style={styles.wrap}>
      <GlassSurface intensity={50} tone="medium" />
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}
        >
          {row}
        </ScrollView>
      ) : (
        <View style={styles.row}>{row}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: STUDENT_RADIUS.lg,
    borderWidth: 1,
    borderColor: GLASS_RIM.border,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    zIndex: 1,
  },
  scrollRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minWidth: '100%',
    padding: 4,
    zIndex: 1,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabMobile: {
    paddingVertical: 8,
  },
  tabCompact: {
    flex: 0,
    minWidth: 100,
    paddingHorizontal: 6,
  },
  tabActive: {},
  activePill: {
    backgroundColor: GLASS_ROW.fillStrong,
    borderRadius: STUDENT_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(109,91,208,0.35)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '100%',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: STUDENT.textMuted,
    textAlign: 'center',
    paddingVertical: 10,
  },
  tabTextMobile: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    fontSize: 13,
    color: STUDENT.primaryDark,
    fontWeight: '800',
    textAlign: 'center',
  },
});
