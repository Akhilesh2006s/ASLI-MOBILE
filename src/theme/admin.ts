/** Premium Admin Portal — soft mint · sky · blush (light, no yellow) */
import { Platform } from 'react-native';

export type AdminColorScheme = 'light' | 'dark';

export const ADMIN_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const ADMIN_RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
} as const;

export type AdminThemeColors = {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceGlass: string;
  surfaceBorder: string;
  surfaceHover: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  info: string;
  infoMuted: string;
  drawerBg: string;
  drawerSurface: string;
  drawerBorder: string;
  drawerText: string;
  drawerTextMuted: string;
  overlay: string;
  inputBg: string;
  inputBorder: string;
  skeleton: string;
  skeletonHighlight: string;
  headerGradient: readonly [string, string, string];
  drawerGradient: readonly [string, string];
  navActiveColor: string;
  navActiveBg: string;
  navActiveText: string;
  cardGradient: readonly [string, string];
  fabGradient: readonly [string, string];
  statGradients: readonly [string, string][];
  dashboardStatCards: readonly { bg: string; accent: string; iconBg: string }[];
};

/**
 * Soft mint · sky · blush — opaque white surfaces, pastel card washes.
 */
const ADMIN_LIGHT: AdminThemeColors = {
  bg: 'transparent',
  bgElevated: '#EEF2E3',
  surface: '#FFFFFF',
  surfaceGlass: '#FFFFFF',
  surfaceBorder: 'rgba(4, 63, 46, 0.12)',
  surfaceHover: '#D1FAE5',
  primary: '#0F766E',
  primaryDark: '#115E59',
  primaryLight: '#14B8A6',
  primaryMuted: 'rgba(15, 118, 110, 0.14)',
  secondary: '#BE185D',
  accent: '#06B6D4',
  text: '#042F2E',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textInverse: '#FCFCFC',
  success: '#059669',
  successMuted: 'rgba(5, 150, 105, 0.12)',
  warning: '#EA580C',
  warningMuted: 'rgba(234, 88, 12, 0.12)',
  danger: '#E11D48',
  dangerMuted: 'rgba(225, 29, 72, 0.12)',
  info: '#0891B2',
  infoMuted: 'rgba(8, 145, 178, 0.12)',
  drawerBg: '#EEF2E3',
  drawerSurface: '#FFFFFF',
  drawerBorder: 'rgba(4, 63, 46, 0.12)',
  drawerText: '#042F2E',
  drawerTextMuted: '#475569',
  overlay: 'rgba(4, 47, 46, 0.55)',
  inputBg: '#F8FAFC',
  inputBorder: 'rgba(4, 63, 46, 0.16)',
  skeleton: '#E2E8F0',
  skeletonHighlight: '#F8FAFC',
  headerGradient: ['#042F2E', '#0F766E', '#0E7490'] as const,
  drawerGradient: ['#E2E8F0', '#EEF2E3'] as const,
  navActiveColor: '#0F766E',
  navActiveBg: '#CCFBF1',
  navActiveText: '#115E59',
  cardGradient: ['#F8FAFC', '#FFFFFF'] as const,
  fabGradient: ['#14B8A6', '#0F766E'] as const,
  statGradients: [
    ['#34D399', '#059669'],
    ['#22D3EE', '#0891B2'],
    ['#FB7185', '#E11D48'],
    ['#818CF8', '#4F46E5'],
    ['#2DD4BF', '#0D9488'],
    ['#F472B6', '#DB2777'],
  ] as const,
  dashboardStatCards: [
    { bg: '#D1FAE5', accent: '#047857', iconBg: '#A7F3D0' },
    { bg: '#CFFAFE', accent: '#0E7490', iconBg: '#A5F3FC' },
    { bg: '#FCE7F3', accent: '#BE185D', iconBg: '#FBCFE8' },
    { bg: '#E0E7FF', accent: '#4338CA', iconBg: '#C7D2FE' },
  ] as const,
};

const ADMIN_DARK: AdminThemeColors = {
  bg: '#042F2E',
  bgElevated: '#0F3D3A',
  surface: '#134E4A',
  surfaceGlass: 'rgba(19, 78, 74, 0.92)',
  surfaceBorder: 'rgba(45, 212, 191, 0.16)',
  surfaceHover: '#115E59',
  primary: '#2DD4BF',
  primaryDark: '#14B8A6',
  primaryLight: '#5EEAD4',
  primaryMuted: 'rgba(45, 212, 191, 0.16)',
  secondary: '#F472B6',
  accent: '#22D3EE',
  text: '#F0FDFA',
  textSecondary: '#99F6E4',
  textMuted: '#5EEAD4',
  textInverse: '#042F2E',
  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.16)',
  warning: '#FB923C',
  warningMuted: 'rgba(251, 146, 60, 0.16)',
  danger: '#FB7185',
  dangerMuted: 'rgba(251, 113, 133, 0.16)',
  info: '#67E8F9',
  infoMuted: 'rgba(103, 232, 249, 0.16)',
  drawerBg: '#022C2A',
  drawerSurface: 'rgba(240, 253, 250, 0.05)',
  drawerBorder: 'rgba(240, 253, 250, 0.08)',
  drawerText: '#F0FDFA',
  drawerTextMuted: 'rgba(240, 253, 250, 0.55)',
  overlay: 'rgba(0, 0, 0, 0.65)',
  inputBg: '#0F3D3A',
  inputBorder: '#115E59',
  skeleton: '#115E59',
  skeletonHighlight: '#0F766E',
  headerGradient: ['#022C2A', '#0F766E', '#155E75'] as const,
  drawerGradient: ['#022C2A', '#0F3D3A'] as const,
  navActiveColor: '#5EEAD4',
  navActiveBg: 'rgba(45, 212, 191, 0.18)',
  navActiveText: '#F0FDFA',
  cardGradient: ['#134E4A', '#0F3D3A'] as const,
  fabGradient: ['#2DD4BF', '#0F766E'] as const,
  statGradients: [
    ['#34D399', '#059669'],
    ['#22D3EE', '#0891B2'],
    ['#FB7185', '#E11D48'],
    ['#818CF8', '#6366F1'],
    ['#2DD4BF', '#0D9488'],
    ['#F472B6', '#DB2777'],
  ] as const,
  dashboardStatCards: [
    { bg: '#064E3B', accent: '#6EE7B7', iconBg: 'rgba(110, 231, 183, 0.2)' },
    { bg: '#164E63', accent: '#67E8F9', iconBg: 'rgba(103, 232, 249, 0.2)' },
    { bg: '#831843', accent: '#F9A8D4', iconBg: 'rgba(249, 168, 212, 0.2)' },
    { bg: '#312E81', accent: '#A5B4FC', iconBg: 'rgba(165, 180, 252, 0.2)' },
  ] as const,
};

export function getAdminColors(scheme: AdminColorScheme): AdminThemeColors {
  return scheme === 'dark' ? ADMIN_DARK : ADMIN_LIGHT;
}

export const ADMIN_SHADOW = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0F766E',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
    // Elevation on Android is a major scroll FPS killer over ImageBackground.
    default: {},
  })!,
  md: Platform.select({
    ios: {
      shadowColor: '#0F766E',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    default: {},
  })!,
  lg: Platform.select({
    ios: {
      shadowColor: '#0F766E',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
    default: {},
  })!,
} as const;

export const ADMIN_TYPO = {
  hero: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  section: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '600' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  stat: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.8 },
} as const;

export function adminGlassCard(colors: AdminThemeColors) {
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: ADMIN_RADIUS.lg,
    ...ADMIN_SHADOW.md,
  } as const;
}

export function adminGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
