import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SPACING } from '../../theme';
import { GLASS_RIM, GLASS_ROW, GLASS_SHADOW } from '../../theme/glass';
import GlassSurface from './GlassSurface';

export type TabItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  roleColor?: string;
};

export default function BottomTabBar({ tabs, activeTab, onTabChange, roleColor = COLORS.primary }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <GlassSurface intensity={58} tone="medium" />
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          const iconName = active && tab.activeIcon ? tab.activeIcon : tab.icon;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              {active ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={[
                    styles.activePill,
                    {
                      backgroundColor: GLASS_ROW.fillStrong,
                      borderColor: `${roleColor}55`,
                    },
                  ]}
                >
                  <Ionicons name={iconName} size={compact ? 18 : 20} color={roleColor} />
                  {!compact ? (
                    <Text style={[styles.activeLabel, { color: roleColor }]} numberOfLines={1}>
                      {tab.label}
                    </Text>
                  ) : null}
                </Animated.View>
              ) : (
                <View style={styles.inactive}>
                  <Ionicons name={iconName} size={compact ? 20 : 22} color={COLORS.textMuted} />
                  {!compact ? (
                    <Text style={styles.inactiveLabel} numberOfLines={1}>
                      {tab.label}
                    </Text>
                  ) : null}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: SPACING.lg,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: GLASS_RIM.border,
    overflow: 'hidden',
    ...GLASS_SHADOW.soft,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inactive: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING.sm,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: FONT.bold,
  },
  inactiveLabel: {
    fontSize: 11,
    fontWeight: FONT.medium,
    color: COLORS.textMuted,
  },
  pressed: { opacity: 0.88 },
});
