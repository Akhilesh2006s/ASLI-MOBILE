import { normalizeBoardKey } from './board-label';

/** Parse Super Admin style subject keys, e.g. Chemistry_10 → class "10", plain "Chemistry". */

export function extractClassNumberFromSubjectName(name: string): string | null {
  const base = String(name || '').split('__deleted__')[0].trim();
  const match = base.match(/_(\d+)$/);
  return match ? match[1] : null;
}

export function isSoftDeletedSubjectName(name: string): boolean {
  return String(name || '').includes('__deleted__');
}

export function extractPlainSubjectName(name: string): string {
  const base = String(name || '').split('__deleted__')[0].trim();
  const match = base.match(/^(.+?)_\d+$/);
  return match ? match[1] : base;
}

export function normalizeSubjectDisplayKey(name: string): string {
  const plain = extractPlainSubjectName(name || '')
    .trim()
    .toLowerCase()
    .replace(/\b(iit|neet|jee)\b/g, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain === 'bio' || plain === 'biology') return 'biology';
  if (plain === 'math' || plain === 'maths' || plain === 'mat' || plain === 'mathematics') {
    return 'math';
  }
  if (plain === 'phy' || plain === 'physics') return 'physics';
  if (plain === 'chem' || plain === 'chemistry') return 'chemistry';
  if (plain === 'sci' || plain === 'science' || plain === 'evs') return 'science';
  if (
    plain === 'sst' ||
    plain === 'social' ||
    plain === 'social science' ||
    plain === 'social studies' ||
    plain === 'history' ||
    plain === 'geography' ||
    plain === 'civics' ||
    plain === 'economics'
  ) {
    return 'social';
  }
  if (plain === 'computer' || plain === 'computers' || plain === 'cs' || plain === 'it') {
    return 'computer';
  }
  if (plain === 'eng' || plain === 'english') return 'english';
  return plain;
}

/** Canonical bucket for teacher learning-path cards (one card per subject name). */
export function subjectCatalogGroupKey(name: string): string {
  return normalizeSubjectDisplayKey(name || '');
}

export function isActiveCatalogSubject(subject: {
  name?: string;
  isActive?: boolean;
}): boolean {
  if (subject.isActive === false) return false;
  if (isSoftDeletedSubjectName(subject.name || '')) return false;
  return true;
}

export function getSubjectClassLabel(subject: {
  name?: string;
  classNumber?: string;
}): string | null {
  if (subject.classNumber != null && String(subject.classNumber).trim() !== '') {
    return String(subject.classNumber).trim();
  }
  return extractClassNumberFromSubjectName(subject.name || '');
}

export function displaySubjectName(name: string): string {
  const base = String(name || '').split('__deleted__')[0].trim();
  return extractPlainSubjectName(base) || base;
}

/** Physics + ALPHA → "Physics IIT Alpha". Empty/General track stays the plain name. */
export function formatSubjectWithIitCategory(
  name: string,
  productCategory?: string | null,
): string {
  const base = displaySubjectName(name) || String(name || '').trim();
  if (!base) return '';
  const rawCat = String(productCategory || '')
    .toUpperCase()
    .trim()
    .replace(/^IIT_/, '');
  if (!rawCat || rawCat === 'GENERAL' || rawCat === 'NONE' || rawCat === 'ALL') {
    return base;
  }
  const trackLabel = rawCat
    .split('_')
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ');
  if (new RegExp(`\\biit\\s+${trackLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(base)) {
    return base;
  }
  return `${base} IIT ${trackLabel}`;
}

export function inferClassNumberFromPrepContent(
  items?: Array<{ classNumber?: string }> | null
): string | null {
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    const cn =
      item?.classNumber != null && String(item.classNumber).trim() !== ''
        ? String(item.classNumber).trim()
        : null;
    if (cn) return cn;
  }
  return null;
}

/** Learning path row may only have class on linked content documents. */
export function getLearningPathClassLabel(subject: {
  name?: string;
  classNumber?: string;
  asliPrepContent?: Array<{ classNumber?: string }>;
}): string | null {
  const fromSubject = getSubjectClassLabel(subject);
  if (fromSubject) return fromSubject;
  return inferClassNumberFromPrepContent(subject.asliPrepContent);
}

/** Board track for a learning-path row (CBSE vs IIT/NEET must not merge). */
export function getLearningPathBoardLabel(subject: {
  board?: string;
  asliPrepContent?: Array<{
    board?: string;
    subject?: { board?: string } | string;
  }>;
}): string {
  if (subject.board != null && String(subject.board).trim() !== '') {
    return normalizeBoardKey(String(subject.board));
  }
  if (!Array.isArray(subject.asliPrepContent)) return '';
  for (const item of subject.asliPrepContent) {
    const fromItem = item?.board;
    if (fromItem != null && String(fromItem).trim() !== '') {
      return normalizeBoardKey(String(fromItem));
    }
    const subj = item?.subject;
    if (subj != null && typeof subj === 'object' && subj.board) {
      return normalizeBoardKey(String(subj.board));
    }
  }
  return '';
}

export type TeacherVidyaSubjectSelectOption = {
  value: string;
  label: string;
  group: 'CBSE' | 'IIT' | 'Other';
};

const CANONICAL_SUBJECT_LABELS: Record<string, string> = {
  biology: 'Biology',
  math: 'Mathematics',
  physics: 'Physics',
  chemistry: 'Chemistry',
  science: 'Science',
  english: 'English',
  social: 'Social Science',
  computer: 'Computer Science',
  hindi: 'Hindi',
  telugu: 'Telugu',
};

function titleCaseSubjectWords(value: string): string {
  return String(value || '')
    .replace(/\biit\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function canonicalTeacherSubjectLabel(name: string): string {
  const key = normalizeSubjectDisplayKey(name);
  if (CANONICAL_SUBJECT_LABELS[key]) return CANONICAL_SUBJECT_LABELS[key];
  const plain = extractPlainSubjectName(String(name || ''))
    .replace(/\b(iit|neet|jee)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return titleCaseSubjectWords(plain) || String(name || '').trim();
}

export function isIitTeacherSubjectTrack(subject: {
  name?: string;
  board?: string;
  productCategory?: string;
}): boolean {
  const board = normalizeBoardKey(String(subject.board || ''));
  if (board.includes('IIT') || board.includes('NEET') || board.includes('JEE')) return true;
  const name = String(subject.name || '');
  if (/\b(iit|neet|jee)\b/i.test(name)) return true;
  const cat = String(subject.productCategory || '')
    .toUpperCase()
    .trim()
    .replace(/^IIT_/, '');
  if (cat && cat !== 'GENERAL' && cat !== 'NONE' && cat !== 'ALL') return true;
  return false;
}

function teacherSubjectValueScore(name: string): number {
  const raw = String(name || '').trim();
  const plain = extractPlainSubjectName(raw);
  let score = plain.length;
  if (!/_\d+$/.test(raw)) score += 40;
  if (!/\b(iit|neet|jee)\b/i.test(raw)) score += 5;
  if (/^(biology|mathematics|chemistry|physics|science|english)/i.test(plain)) score += 25;
  if (/^(bio|maths|math|chem|phy|sci)$/i.test(plain)) score -= 30;
  return score;
}

/** Same CBSE / IIT grouping as the website teacher Vidya picker. */
export function buildTeacherVidyaSubjectSelectOptions(
  subjects: Array<{ name?: string; board?: string; productCategory?: string } | string>,
): TeacherVidyaSubjectSelectOption[] {
  const best = new Map<
    string,
    { value: string; label: string; group: TeacherVidyaSubjectSelectOption['group']; score: number }
  >();

  for (const row of subjects || []) {
    const subject =
      typeof row === 'string'
        ? { name: row }
        : {
            name: row?.name,
            board: row?.board,
            productCategory: row?.productCategory,
          };
    const value = String(subject.name || '').trim();
    if (!value) continue;

    const resolvedGroup: TeacherVidyaSubjectSelectOption['group'] = isIitTeacherSubjectTrack(subject)
      ? 'IIT'
      : 'CBSE';

    const label = canonicalTeacherSubjectLabel(value);
    const key = `${resolvedGroup}|${normalizeSubjectDisplayKey(value)}`;
    const score = teacherSubjectValueScore(value);
    const prev = best.get(key);
    if (!prev || score > prev.score) {
      best.set(key, { value, label, group: resolvedGroup, score });
    }
  }

  const groupOrder: Record<TeacherVidyaSubjectSelectOption['group'], number> = {
    CBSE: 0,
    IIT: 1,
    Other: 2,
  };

  return [...best.values()]
    .map(({ value, label, group }) => ({ value, label, group }))
    .sort((a, b) => {
      const g = groupOrder[a.group] - groupOrder[b.group];
      if (g !== 0) return g;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
}
