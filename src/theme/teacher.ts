/** Expert Educator — teacher portal dark slate theme */
export const TEACHER = {
  bg: '#0f172a',
  surface: 'rgba(255,255,255,0.05)',
  surfaceElevated: 'rgba(255,255,255,0.08)',
  surfaceBorder: 'rgba(13,148,136,0.15)',
  surfaceHover: 'rgba(255,255,255,0.10)',
  primary: '#0d9488',
  primaryDark: '#0f766e',
  primaryLight: '#14b8a6',
  secondary: '#f59e0b',
  success: '#22c55e',
  danger: '#ef4444',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textOnPrimary: '#ffffff',
  headerGradient: ['#0f172a', '#134e4a', '#0d9488'] as const,
  cardGradient: ['rgba(13,148,136,0.12)', 'rgba(15,23,42,0.95)'] as const,
  tabBarBg: 'rgba(15,23,42,0.96)',
  tabBarBorder: 'rgba(13,148,136,0.25)',
  navInactive: '#64748b',
  navActiveBg: 'rgba(13,148,136,0.22)',
  navActiveText: '#14b8a6',
  fabGradient: ['#0d9488', '#0f766e'] as const,
  shadow: {
    sm: {
      shadowColor: '#0d9488',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    lg: {
      shadowColor: '#0d9488',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
  },
};

export const TEACHER_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const TEACHER_RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  card: 20,
  full: 9999,
};

export const TEACHER_TYPO = {
  hero: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.6 },
  section: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.3 },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.4 },
};

export function teacherGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function performanceBadge(score: number): 'good' | 'average' | 'at-risk' {
  if (score >= 75) return 'good';
  if (score >= 50) return 'average';
  return 'at-risk';
}

export const PERFORMANCE_COLORS = {
  good: TEACHER.success,
  average: TEACHER.secondary,
  'at-risk': TEACHER.danger,
} as const;
