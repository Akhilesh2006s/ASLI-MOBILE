/** Premium Admin Portal — light/dark adaptive theme tokens */
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

const ADMIN_LIGHT: AdminThemeColors = {
  bg: '#EBEFF4',
  bgElevated: '#E2E7EE',
  surface: '#F3F5F9',
  surfaceGlass: 'rgba(243, 245, 249, 0.9)',
  surfaceBorder: 'rgba(148, 163, 184, 0.22)',
  surfaceHover: '#E8ECF2',
  primary: '#5568A8',
  primaryDark: '#475985',
  primaryLight: '#6B7DB8',
  primaryMuted: 'rgba(85, 104, 168, 0.12)',
  secondary: '#3D8FA8',
  accent: '#3A9A8C',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  success: '#059669',
  successMuted: 'rgba(5, 150, 105, 0.1)',
  warning: '#D97706',
  warningMuted: 'rgba(217, 119, 6, 0.1)',
  danger: '#DC2626',
  dangerMuted: 'rgba(220, 38, 38, 0.1)',
  info: '#2563EB',
  infoMuted: 'rgba(37, 99, 235, 0.1)',
  drawerBg: '#F0F3F8',
  drawerSurface: '#E8EDF5',
  drawerBorder: 'rgba(148, 163, 184, 0.28)',
  drawerText: '#334155',
  drawerTextMuted: '#64748B',
  overlay: 'rgba(15, 23, 42, 0.45)',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  skeleton: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',
  headerGradient: ['#4A5F7A', '#5C7390', '#6D86A3'] as const,
  drawerGradient: ['#E8ECF2', '#F0F3F8'] as const,
  navActiveColor: '#475985',
  navActiveBg: '#DCE3EE',
  navActiveText: '#475985',
  cardGradient: ['#EEF1F5', '#F3F5F9'] as const,
  fabGradient: ['#5568A8', '#475985'] as const,
  statGradients: [
    ['#7C7FD4', '#5B5FC7'],
    ['#5BAED4', '#0E8FC4'],
    ['#3DAFA0', '#0F9B8E'],
    ['#9B8FD4', '#7C6BC4'],
    ['#4CAF8A', '#059669'],
    ['#6B9FE8', '#2563EB'],
  ] as const,
  dashboardStatCards: [
    { bg: '#E8EDF6', accent: '#475985', iconBg: '#D8E0ED' },
    { bg: '#E6F0F4', accent: '#2F6F85', iconBg: '#D4E8EF' },
    { bg: '#E6F2EF', accent: '#2F7A6E', iconBg: '#D4EBE5' },
    { bg: '#EDEAF4', accent: '#5E5085', iconBg: '#E2DCEC' },
  ] as const,
};

const ADMIN_DARK: AdminThemeColors = {
  bg: '#0F1419',
  bgElevated: '#161D27',
  surface: '#1A2332',
  surfaceGlass: 'rgba(26, 35, 50, 0.88)',
  surfaceBorder: 'rgba(148, 163, 184, 0.12)',
  surfaceHover: '#243044',
  primary: '#9CA3F0',
  primaryDark: '#818CF8',
  primaryLight: '#B4B8F5',
  primaryMuted: 'rgba(156, 163, 240, 0.14)',
  secondary: '#67C8E8',
  accent: '#5CB8AA',
  text: '#E8ECF2',
  textSecondary: '#A8B4C4',
  textMuted: '#6B7A8F',
  textInverse: '#0F1419',
  success: '#5CB896',
  successMuted: 'rgba(92, 184, 150, 0.14)',
  warning: '#D4A84A',
  warningMuted: 'rgba(212, 168, 74, 0.14)',
  danger: '#E07A7A',
  dangerMuted: 'rgba(224, 122, 122, 0.14)',
  info: '#7AA8E8',
  infoMuted: 'rgba(122, 168, 232, 0.14)',
  drawerBg: '#10151D',
  drawerSurface: 'rgba(255, 255, 255, 0.04)',
  drawerBorder: 'rgba(255, 255, 255, 0.06)',
  drawerText: '#CBD5E1',
  drawerTextMuted: 'rgba(203, 213, 225, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  inputBg: '#1A2332',
  inputBorder: '#2A3548',
  skeleton: '#2A3548',
  skeletonHighlight: '#364155',
  headerGradient: ['#2A3544', '#3D4D62', '#4F6278'] as const,
  drawerGradient: ['#0E1218', '#181F28'] as const,
  navActiveColor: '#A5B4FC',
  navActiveBg: 'rgba(156, 163, 240, 0.14)',
  navActiveText: '#E8ECF2',
  cardGradient: ['#1A2332', '#161D27'] as const,
  fabGradient: ['#5B5FC7', '#6B6FD4'] as const,
  statGradients: [
    ['#5B5FC7', '#4A4E9E'],
    ['#0E8FC4', '#0C6F96'],
    ['#0F9B8E', '#0C7A70'],
    ['#7C6BC4', '#6554A8'],
    ['#059669', '#047857'],
    ['#2563EB', '#1D4ED8'],
  ] as const,
  dashboardStatCards: [
    { bg: '#1C2238', accent: '#A5B4FC', iconBg: 'rgba(165, 180, 252, 0.14)' },
    { bg: '#172530', accent: '#7DD3FC', iconBg: 'rgba(125, 211, 252, 0.12)' },
    { bg: '#152A28', accent: '#5EEAD4', iconBg: 'rgba(94, 234, 212, 0.12)' },
    { bg: '#1E1A30', accent: '#C4B5FD', iconBg: 'rgba(196, 181, 253, 0.12)' },
  ] as const,
};

export function getAdminColors(scheme: AdminColorScheme): AdminThemeColors {
  return scheme === 'dark' ? ADMIN_DARK : ADMIN_LIGHT;
}

export const ADMIN_SHADOW = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
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
