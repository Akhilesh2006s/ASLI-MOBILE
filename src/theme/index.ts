export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  secondary: '#7C3AED',
  accent: '#06B6D4',

  student: '#10B981',
  teacher: '#F59E0B',
  admin: '#3B82F6',
  superAdmin: '#8B5CF6',

  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#F1F5F9',

  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  gradientStudent: ['#10B981', '#059669'] as const,
  gradientTeacher: ['#F59E0B', '#D97706'] as const,
  gradientAdmin: ['#3B82F6', '#2563EB'] as const,
  gradientSuperAdmin: ['#8B5CF6', '#7C3AED'] as const,
  gradientBlue: ['#2563EB', '#7C3AED'] as const,
  gradientSky: ['#0EA5E9', '#2563EB'] as const,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const FONT = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  h1: 28,
  h0: 32,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export type UserRole = 'student' | 'teacher' | 'admin' | 'super-admin';

export function getRoleGradient(role: UserRole): readonly [string, string] {
  switch (role) {
    case 'student':
      return COLORS.gradientStudent;
    case 'teacher':
      return COLORS.gradientTeacher;
    case 'admin':
      return COLORS.gradientAdmin;
    case 'super-admin':
      return COLORS.gradientSuperAdmin;
    default:
      return COLORS.gradientBlue;
  }
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'student':
      return COLORS.student;
    case 'teacher':
      return COLORS.teacher;
    case 'admin':
      return COLORS.admin;
    case 'super-admin':
      return COLORS.superAdmin;
    default:
      return COLORS.primary;
  }
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
