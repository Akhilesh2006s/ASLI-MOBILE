const CHAPTER_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/** Extract chapter/unit number from labels like "Chapter 10 - …" or "Ch 3: …". */
export function chapterNumberFromLabel(value: string): number | null {
  const s = String(value || '').trim();
  if (!s) return null;
  const chapterMatch = s.match(/\b(?:chapter|ch\.?|unit)\s*[-–—.#:]?\s*(\d+)\b/i);
  if (chapterMatch) {
    const n = parseInt(chapterMatch[1], 10);
    return Number.isNaN(n) ? null : n;
  }
  const leading = s.match(/^(\d+)\s*[.\):\-–]/);
  if (leading) {
    const n = parseInt(leading[1], 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** Strip Chapter/Unit prefixes so bare titles and Chapter-N labels share an identity. */
export function canonicalTopicKey(value: string): string {
  let s = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!s) return '';
  s = s
    .replace(/^(chapter|ch\.?|unit)\s*[-–—.]?\s*\d+\s*[-–—:.]\s*/i, '')
    .replace(/^(chapter|ch\.?|unit)\s*[-–—.]?\s*\d+\s*/i, '')
    .replace(/^\d+\s*[.\):\-–—]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

function topicLabelScore(value: string): number {
  const s = String(value || '').trim();
  if (!s) return -1;
  let score = s.length;
  if (chapterNumberFromLabel(s) != null) score += 1000;
  if (/^(chapter|ch\.?|unit)\b/i.test(s)) score += 100;
  return score;
}

/** Chapter 1, 2, … 9, 10, 11 — not Chapter 1, 10, 11, 2 (string sort). */
export function compareChapterWiseLabels(a: string, b: string): number {
  const aCh = chapterNumberFromLabel(a);
  const bCh = chapterNumberFromLabel(b);
  if (aCh != null && bCh != null && aCh !== bCh) return aCh - bCh;
  if (aCh != null && bCh == null) return -1;
  if (aCh == null && bCh != null) return 1;
  return CHAPTER_COLLATOR.compare(a, b);
}

export function sortChapterWiseLabels(labels: string[]): string[] {
  return [...labels].sort(compareChapterWiseLabels);
}

/**
 * Keep admin/API order first; append extras without reordering the primary list.
 * Chapter-aware: "Elementary Shapes" is dropped when "Chapter-5 - Elementary Shapes" exists.
 */
export function mergePreservingPrimaryOrder(primary: string[], secondary: string[]): string[] {
  const byKey = new Map<string, string>();
  const order: string[] = [];

  const upsert = (value: string, appendIfNew: boolean) => {
    const label = String(value || '').trim();
    if (!label) return;
    const key = canonicalTopicKey(label) || label.toLowerCase();
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, label);
      if (appendIfNew) order.push(key);
      return;
    }
    if (topicLabelScore(label) > topicLabelScore(prev)) {
      byKey.set(key, label);
    }
  };

  for (const value of primary) {
    const label = String(value || '').trim();
    if (!label) continue;
    const key = canonicalTopicKey(label) || label.toLowerCase();
    if (!byKey.has(key)) order.push(key);
    upsert(label, false);
  }
  for (const value of secondary) {
    upsert(value, true);
  }

  return order.map((key) => byKey.get(key)!).filter(Boolean);
}

/** Alpha / IIT Alpha → ALPHA (matches backend productCategory). */
export function normalizeProductCategory(value?: string | null): string {
  if (!value) return '';
  let u = String(value)
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!u) return '';
  if (u.startsWith('IIT_')) u = u.slice(4);
  if (u === 'GENERAL' || u === 'NONE' || u === 'ALL') return '';
  return u;
}
