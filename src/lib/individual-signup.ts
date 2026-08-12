/** Shared options for individual teacher/student signup (mobile — mirrors web). */
export const INDIVIDUAL_TRIAL_DAYS = 7;

export const INDIVIDUAL_COURSE_OPTIONS = [
  'CBSE',
  'STATE',
  'IIT Foundation',
  'NEET',
  'Board Exams',
] as const;

export const INDIVIDUAL_SUBJECT_OPTIONS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Science',
  'English',
  'Social Science',
  'Hindi',
  'Telugu',
] as const;

export const INDIVIDUAL_CLASS_OPTIONS = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
] as const;

export const CURRICULUM_BOARD_OPTIONS = [
  'CBSE',
  'STATE',
  'SSC',
  'ICSE',
  'IB',
  'CAMBRIDGE',
] as const;

/** Fallback IIT product tracks when /api/product-categories is unavailable. */
export const IIT_CATEGORY_FALLBACK = ['ALPHA', 'BETA', 'GAMMA', 'DELTA'] as const;

export function formatIitCategoryLabel(
  value?: string | null,
  labelMap?: Record<string, string>,
): string {
  const c = String(value || '')
    .toUpperCase()
    .trim();
  if (!c) return 'General';
  if (labelMap?.[c]) return labelMap[c];
  return c
    .split('_')
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ');
}
