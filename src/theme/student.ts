/**
 * Student theme — premium scholar UI.
 *
 * Violet-family, sitting on the shared pastel artwork (see AppBackground).
 * Deliberately a step away from the teacher theme's indigo (#6366F1) so the two
 * roles stay tellable apart, while staying in the same tonal family so they
 * read as one product. Replaced the previous emerald palette, whose white-on-
 * primary buttons only reached 2.54:1; this primary holds 5.17:1.
 */
import { GLASS_ROW, GLASS_VIOLET } from './glass';

export const STUDENT = {
  bg: '#f5f3ff',
  bgAccent: '#ede9fe',
  surface: 'rgba(255,255,255,0.48)',
  surfaceGlass: GLASS_ROW.fillStrong,
  glassSheen: GLASS_VIOLET,
  surfaceDark: '#0f172a',
  surfaceElevated: 'rgba(255,255,255,0.58)',
  surfaceBorder: 'rgba(255,255,255,0.65)',
  surfaceHover: 'rgba(255,255,255,0.36)',
  primary: '#6d5bd0',
  primaryDark: '#5443b8',
  primaryLight: '#9b8ae6',
  accent: '#2563eb',
  accentSoft: '#dbeafe',
  warning: '#f59e0b',
  danger: '#ef4444',
  // Semantic success stays green — it encodes meaning, not brand.
  success: '#059669',
  text: '#0f172a',
  textSecondary: '#475569',
  // Darkened for legibility over the pastel page artwork (see AppBackground).
  textMuted: '#5b6779',
  textOnPrimary: '#ffffff',
  headerGradient: ['#4C3BA6', '#5F4CC4', '#7C6BDA'] as const,
  heroGradient: ['#4C3BA6', '#6D5BD0', '#8B7AE0'] as const,
  cardGradient: ['#ede9fe', '#f5f3ff'] as const,
  tabBarBg: 'rgba(255,255,255,0.92)',
  tabBarBorder: 'rgba(109,91,208,0.20)',
  // Inactive tab labels sit at 9px on a translucent bar — #94a3b8 was unreadable.
  navInactive: '#5b6779',
  navActiveBg: '#e8e3fa',
  navActiveText: '#5443b8',
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
    soft: {
      shadowColor: '#6d5bd0',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 8,
    },
    sm: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    md: {
      shadowColor: '#5443b8',
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

export const STUDENT_SHADOW = STUDENT.shadow;

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
  card: 24,
  inner: 16,
  full: 9999,
};

export const STUDENT_ANIMATION = {
  fast: 180,
  normal: 280,
  slow: 420,
};

export const STUDENT_TYPO = {
  hero: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1 },
  section: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.4 },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
  label: { fontSize: 11, fontWeight: '700' as const },
};

export const SUBJECT_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
] as const;

export function studentGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
