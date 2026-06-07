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
  cardGradient: readonly [string, string];
  fabGradient: readonly [string, string];
  statGradients: readonly [string, string][];
};

const ADMIN_LIGHT: AdminThemeColors = {
  bg: '#F0F4FF',
  bgElevated: '#E2E8F0',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.78)',
  surfaceBorder: 'rgba(148, 163, 184, 0.25)',
  surfaceHover: '#F8FAFC',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primaryMuted: 'rgba(99, 102, 241, 0.12)',
  secondary: '#0EA5E9',
  accent: '#14B8A6',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.12)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.12)',
  drawerBg: '#1E1B4B',
  drawerSurface: 'rgba(255, 255, 255, 0.08)',
  drawerBorder: 'rgba(255, 255, 255, 0.1)',
  drawerText: '#F8FAFC',
  drawerTextMuted: 'rgba(248, 250, 252, 0.65)',
  overlay: 'rgba(15, 23, 42, 0.55)',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  skeleton: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',
  headerGradient: ['#4338CA', '#6366F1', '#818CF8'] as const,
  drawerGradient: ['#312E81', '#4338CA'] as const,
  navActiveColor: '#4F46E5',
  cardGradient: ['#EEF2FF', '#FFFFFF'] as const,
  fabGradient: ['#6366F1', '#4F46E5'] as const,
  statGradients: [
    ['#818CF8', '#6366F1'],
    ['#38BDF8', '#0EA5E9'],
    ['#2DD4BF', '#14B8A6'],
    ['#A78BFA', '#8B5CF6'],
    ['#34D399', '#10B981'],
    ['#60A5FA', '#3B82F6'],
  ] as const,
};

const ADMIN_DARK: AdminThemeColors = {
  bg: '#0B1120',
  bgElevated: '#111827',
  surface: '#1E293B',
  surfaceGlass: 'rgba(30, 41, 59, 0.78)',
  surfaceBorder: 'rgba(148, 163, 184, 0.18)',
  surfaceHover: '#334155',
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#A5B4FC',
  primaryMuted: 'rgba(129, 140, 248, 0.18)',
  secondary: '#38BDF8',
  accent: '#2DD4BF',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  textInverse: '#0F172A',
  success: '#34D399',
  successMuted: 'rgba(52, 211, 153, 0.15)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.15)',
  danger: '#F87171',
  dangerMuted: 'rgba(248, 113, 113, 0.15)',
  info: '#60A5FA',
  infoMuted: 'rgba(96, 165, 250, 0.15)',
  drawerBg: '#020617',
  drawerSurface: 'rgba(255, 255, 255, 0.05)',
  drawerBorder: 'rgba(255, 255, 255, 0.07)',
  drawerText: '#F8FAFC',
  drawerTextMuted: 'rgba(248, 250, 252, 0.55)',
  overlay: 'rgba(0, 0, 0, 0.65)',
  inputBg: '#1E293B',
  inputBorder: '#334155',
  skeleton: '#334155',
  skeletonHighlight: '#475569',
  headerGradient: ['#312E81', '#4338CA', '#6366F1'] as const,
  drawerGradient: ['#1E1B4B', '#312E81'] as const,
  navActiveColor: '#6366F1',
  cardGradient: ['#1E293B', '#0F172A'] as const,
  fabGradient: ['#6366F1', '#818CF8'] as const,
  statGradients: [
    ['#6366F1', '#4338CA'],
    ['#0284C7', '#0369A1'],
    ['#0D9488', '#047857'],
    ['#7C3AED', '#6D28D9'],
    ['#059669', '#047857'],
    ['#2563EB', '#1D4ED8'],
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
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: ADMIN_RADIUS.lg,
    ...ADMIN_SHADOW.md,
  } as const;
}

export function adminGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
