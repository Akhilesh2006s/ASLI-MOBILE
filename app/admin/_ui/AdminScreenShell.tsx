import React, { ReactNode } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
} from 'react-native';
import { useAdminTheme } from './useAdminTheme';
import { useAdminResponsiveLayout } from './useAdminResponsiveLayout';

type Props = ScrollViewProps & {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  noPadding?: boolean;
  /** @deprecated Grid SVG is intentionally unused — kept for API compatibility. */
  showGrid?: boolean;
};

/**
 * Admin scroll shell — opaque, no enter animations, no BlurView.
 * Transparent shells over AppBackground + spring enters are a major FPS cliff.
 */
export default function AdminScreenShell({
  children,
  refreshing,
  onRefresh,
  noPadding,
  showGrid: _showGrid,
  contentContainerStyle,
  style,
  nestedScrollEnabled = false,
  ...rest
}: Props) {
  const { colors, spacing } = useAdminTheme();
  const { shellPaddingBottom, isPhone } = useAdminResponsiveLayout();
  const defaultBottomPad = isPhone ? spacing.xl : spacing.lg + 16;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgElevated }]}>
      <ScrollView
        {...rest}
        style={[styles.flex, { backgroundColor: colors.bgElevated }, style]}
        contentContainerStyle={[
          !noPadding && {
            padding: spacing.md,
            paddingBottom: Math.max(shellPaddingBottom, defaultBottomPad),
          },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={nestedScrollEnabled}
        removeClippedSubviews={Platform.OS === 'android'}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
});
