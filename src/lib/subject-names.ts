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
  const plain = extractPlainSubjectName(name || '').trim().toLowerCase();
  if (plain === 'bio' || plain === 'biology') return 'biology';
  if (plain === 'math' || plain === 'maths' || plain === 'mat' || plain === 'mathematics') {
    return 'math';
  }
  return plain;
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
