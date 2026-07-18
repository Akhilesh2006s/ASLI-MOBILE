/** Shared visual language for every student and teacher AI experience. */
export const AI = {
  canvas: '#F8FAFF',
  canvasDeep: '#F1F5FF',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  sky: '#0284C7',
  skySoft: '#F0F9FF',
  skyBorder: '#BAE6FD',
  orange: '#C2410C',
  orangeSoft: '#FFF7ED',
  orangeBorder: '#FED7AA',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#047857',
  danger: '#DC2626',
  warning: '#B45309',
  roleStudent: '#047857',
  roleTeacher: '#C2410C',
} as const;

export const AI_RADIUS = {
  sm: 12,
  md: 16,
  lg: 22,
  full: 999,
} as const;

export const AI_SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
} as const;

export const AI_TYPE = {
  eyebrow: { fontSize: 15, lineHeight: 20, fontWeight: '800' as const, letterSpacing: 1 },
  caption: { fontSize: 15, lineHeight: 21, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 26, fontWeight: '500' as const },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '800' as const },
  hero: { fontSize: 32, lineHeight: 39, fontWeight: '900' as const, letterSpacing: -0.6 },
} as const;

export const AI_SHADOW = {
  shadowColor: '#334155',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.09,
  shadowRadius: 20,
  elevation: 4,
} as const;

export const AI_HERO_GRADIENT = ['#EEF2FF', '#FFFFFF', '#FFF7ED'] as const;
