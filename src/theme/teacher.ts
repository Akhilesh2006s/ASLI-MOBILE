/** Clean Classroom — light teacher portal theme */
export const TEACHER = {
  bg: '#FFFFFF',
  cardBg: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceElevated: '#F1F5F9',
  surfaceBorder: '#E2E8F0',
  surfaceHover: '#EEF2FF',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  secondary: '#F97316',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  headerGradient: ['#EEF2FF', '#F5F3FF', '#FFFFFF'] as const,
  cardGradient: ['#EEF2FF', '#FFFFFF'] as const,
  tabBarBg: 'rgba(255,255,255,0.98)',
  tabBarBorder: '#E2E8F0',
  navInactive: '#94A3B8',
  navActiveBg: 'rgba(99,102,241,0.12)',
  navActiveText: '#4F46E5',
  fabGradient: ['#6366F1', '#4F46E5'] as const,
  goldAccent: '#F59E0B',
  shadow: {
    sm: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
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
  section: 28,
};

export const TEACHER_RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  card: 24,
  full: 9999,
  pill: 9999,
  chip: 16,
};

export const TEACHER_TYPO = {
  hero:    { fontSize: 30, fontWeight: '900' as const, letterSpacing: -0.8 },
  section: { fontSize: 20, fontWeight: '800' as const, letterSpacing: -0.4 },
  body:    { fontSize: 15, fontWeight: '500' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.2 },
  label:   { fontSize: 11, fontWeight: '800' as const, letterSpacing: 0.8 },
  number:  { fontSize: 28, fontWeight: '900' as const, letterSpacing: -1.0 },
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
  good:     TEACHER.success,
  average:  TEACHER.warning,
  'at-risk': TEACHER.danger,
} as const;

/** Card style for light surfaces */
export const glassCard = {
  backgroundColor: TEACHER.cardBg,
  borderWidth: 1,
  borderColor: TEACHER.surfaceBorder,
  borderRadius: TEACHER_RADIUS.lg,
  shadowColor: '#64748B',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
} as const;
