const CHAPTER_COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

/** Extract chapter/unit number from labels like "Chapter 10 - …" or "Ch 3: …". */
export function chapterNumberFromLabel(value: string): number | null {
  const s = String(value || '').trim();
  if (!s) return null;
  const chapterMatch = s.match(/\b(?:chapter|ch\.?|unit)\s*[#:]?\s*(\d+)\b/i);
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
