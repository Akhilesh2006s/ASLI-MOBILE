/**
 * Label / place library materials by Super Admin parent slot
 * (classNumber + productCategory / Alpha|Beta), not generic file titles.
 */

export type LibrarySubjectRef = {
  _id?: string;
  name?: string;
  classNumber?: string | number | null;
  productCategory?: string | null;
  board?: string | null;
};

export type LibraryContentLike = {
  title?: string | null;
  topic?: string | null;
  type?: string | null;
  classNumber?: string | number | null;
  productCategory?: string | null;
  subject?: LibrarySubjectRef | string | null;
  subjectId?: LibrarySubjectRef | string | null;
};

function asSubjectRef(value: LibraryContentLike['subject'] | LibraryContentLike['subjectId']): LibrarySubjectRef | null {
  if (!value) return null;
  if (typeof value === 'string') return { _id: value };
  return value;
}

export function normalizeLibraryClassNumber(value: unknown): string {
  const trimmed = value != null ? String(value).trim() : '';
  if (!trimmed) return '';
  const parsed = parseInt(trimmed, 10);
  if (!Number.isNaN(parsed) && parsed > 0) return String(parsed);
  return trimmed;
}

/** ALPHA → Alpha, BETA → Beta, IIT_FOUNDATION → IIT Foundation */
export function formatProductCategoryLabel(value: unknown): string {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, ' ');
  if (!raw) return '';
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function getLibraryContentClassNumber(row: LibraryContentLike): string {
  const direct = normalizeLibraryClassNumber(row.classNumber);
  if (direct) return direct;
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  return normalizeLibraryClassNumber(subject?.classNumber);
}

export function getLibraryContentProductCategory(row: LibraryContentLike): string {
  const direct = String(row.productCategory || '')
    .trim()
    .toUpperCase();
  if (direct) return direct;
  const subject = asSubjectRef(row.subject) || asSubjectRef(row.subjectId);
  return String(subject?.productCategory || '')
    .trim()
    .toUpperCase();
}

function titleAlreadyHasClassOrTrack(title: string, classNumber: string, trackLabel: string): boolean {
  const t = title.toLowerCase();
  if (classNumber) {
    const classRe = new RegExp(
      `\\b(?:class\\s*)?${classNumber}(?:st|nd|rd|th)?\\b|\\b${classNumber}(?:st|nd|rd|th)\\b`,
      'i',
    );
    if (classRe.test(title)) return true;
  }
  if (trackLabel && t.includes(trackLabel.toLowerCase())) return true;
  return false;
}

function ordinalClassLabel(classNumber: string): string {
  const n = parseInt(classNumber, 10);
  if (Number.isNaN(n)) return `Class ${classNumber}`;
  const mod100 = n % 100;
  const mod10 = n % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? 'th' : mod10 === 1 ? 'st' : mod10 === 2 ? 'nd' : mod10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/**
 * Prefer parent-slot metadata (class + Alpha/Beta) over a generic filename like "Physics".
 * Keeps titles that already encode grade/track.
 */
export function getLibraryContentDisplayTitle(row: LibraryContentLike): string {
  const base = String(row.title || row.topic || '')
    .trim()
    .replace(/\.(pdf|docx?|pptx?|xlsx?|zip)$/i, '');
  const classNumber = getLibraryContentClassNumber(row);
  const track = formatProductCategoryLabel(getLibraryContentProductCategory(row));

  if (!base) {
    const bits = ['Material'];
    if (classNumber) bits.push(ordinalClassLabel(classNumber));
    if (track) bits.push(track);
    return bits.join(' ');
  }

  if (titleAlreadyHasClassOrTrack(base, classNumber, track)) {
    return base;
  }

  const bits = [base];
  if (classNumber) bits.push(ordinalClassLabel(classNumber));
  if (track) bits.push(track);
  return bits.length > 1 ? bits.join(' ') : base;
}

export type LibrarySubjectContext = {
  classNumber?: string | number | null;
  productCategory?: string | null;
};

/**
 * Keep only materials that belong to the opened subject's class + Alpha/Beta slot.
 * When the subject slot is known, drop rows tagged for a different class/track.
 * Untagged rows are kept only if they have no conflicting class/track metadata.
 */
export function filterLibraryContentsForSubjectSlot<T extends LibraryContentLike>(
  rows: T[],
  subject?: LibrarySubjectContext | null,
): T[] {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const wantClass = normalizeLibraryClassNumber(subject?.classNumber);
  const wantTrack = String(subject?.productCategory || '')
    .trim()
    .toUpperCase();
  if (!wantClass && !wantTrack) return rows;

  return rows.filter((row) => {
    const rowClass = getLibraryContentClassNumber(row);
    const rowTrack = getLibraryContentProductCategory(row);

    if (wantClass) {
      if (rowClass && rowClass !== wantClass) return false;
      // Prefer parent-slot placement: if subject class is known, require class on content
      // only when track/class metadata exists somewhere on the row or its subject.
      if (!rowClass && rowTrack && wantTrack && rowTrack !== wantTrack) return false;
    }
    if (wantTrack) {
      if (rowTrack && rowTrack !== wantTrack) return false;
    }
    return true;
  });
}
