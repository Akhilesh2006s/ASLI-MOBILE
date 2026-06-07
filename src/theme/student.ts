/** Student theme — premium scholar UI */
export const STUDENT = {
  bg: '#f4f7fb',
  bgAccent: '#ecfdf5',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceBorder: '#e2e8f0',
  surfaceHover: '#f8fafc',
  primary: '#10b981',
  primaryDark: '#047857',
  primaryLight: '#34d399',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  warning: '#f59e0b',
  danger: '#ef4444',
  success: '#10b981',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textOnPrimary: '#ffffff',
  headerGradient: ['#047857', '#059669', '#10b981', '#34d399'] as const,
  heroGradient: ['#064e3b', '#047857', '#10b981'] as const,
  cardGradient: ['#ecfdf5', '#f0fdf4'] as const,
  tabBarBg: 'rgba(255,255,255,0.94)',
  tabBarBorder: 'rgba(16,185,129,0.18)',
  navInactive: '#94a3b8',
  navActiveBg: '#d1fae5',
  navActiveText: '#047857',
  statGradients: {
    today: ['#f97316', '#fb923c'] as const,
    study: ['#2563eb', '#3b82f6'] as const,
    week: ['#0d9488', '#14b8a6'] as const,
    efficiency: ['#7c3aed', '#8b5cf6'] as const,
    rank: ['#2563eb', '#3b82f6'] as const,
    accuracy: ['#16a34a', '#22c55e'] as const,
    questions: ['#d97706', '#f59e0b'] as const,
  },
  shadow: {
    sm: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    md: {
      shadowColor: '#047857',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
    lg: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 12,
    },
  },
};

export const STUDENT_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const STUDENT_RADIUS = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999,
};

export const STUDENT_ANIMATION = {
  fast: 180,
  normal: 280,
  slow: 420,
};

export function studentGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
