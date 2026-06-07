import React, { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AdminGridBackground from './AdminGridBackground';
import { useAdminTheme } from './useAdminTheme';

type Props = ScrollViewProps & {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  noPadding?: boolean;
  showGrid?: boolean;
};

export default function AdminScreenShell({
  children,
  refreshing,
  onRefresh,
  noPadding,
  showGrid = false,
  contentContainerStyle,
  style,
  ...rest
}: Props) {
  const { colors, spacing } = useAdminTheme();

  return (
    <Animated.View entering={FadeInDown.duration(350).springify()} style={styles.flex}>
      {showGrid ? <AdminGridBackground /> : null}
      <ScrollView
        {...rest}
        style={[styles.flex, styles.transparent, style]}
        contentContainerStyle={[
          !noPadding && { padding: spacing.md, paddingBottom: spacing.xxl + 56 },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  transparent: { backgroundColor: 'transparent' },
});
