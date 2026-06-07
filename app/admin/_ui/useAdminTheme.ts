import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  ADMIN_RADIUS,
  ADMIN_SHADOW,
  ADMIN_SPACING,
  ADMIN_TYPO,
  adminGlassCard,
  getAdminColors,
  type AdminColorScheme,
  type AdminThemeColors,
} from '../../../src/theme/admin';

export function useAdminTheme() {
  const systemScheme = useColorScheme();
  const scheme: AdminColorScheme = systemScheme === 'dark' ? 'dark' : 'light';
  const colors = useMemo(() => getAdminColors(scheme), [scheme]);
  const isDark = scheme === 'dark';

  return {
    scheme,
    isDark,
    colors,
    spacing: ADMIN_SPACING,
    radius: ADMIN_RADIUS,
    shadow: ADMIN_SHADOW,
    typo: ADMIN_TYPO,
    glassCard: useMemo(() => adminGlassCard(colors), [colors]),
  };
}

export type AdminTheme = ReturnType<typeof useAdminTheme>;
export type { AdminThemeColors };
