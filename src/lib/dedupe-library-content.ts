import { filterContentsBySchoolProgram } from './school-program';

/** Row shape from /api/student/asli-prep-content (and teacher/admin equivalents). */
export type LibraryContentRow = {  _id?: string;
  title?: string;
  type?: string;
  topic?: string;
  fileUrl?: string;
  fileUrls?: string[];
  videoUrl?: string;
  youtubeUrl?: string;
  driveLink?: string;
  subject?: { _id?: string; name?: string } | string;
  subjectId?: { _id?: string; name?: string } | string;
  description?: string;
  duration?: number;
  views?: number;
};

function normalizeUrl(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '');
}

function subjectKey(row: LibraryContentRow): string {
  const sub = row.subjectId ?? row.subject;
  if (!sub) return '';
  if (typeof sub === 'string') return sub.trim().toLowerCase();
  return String(sub.name || sub._id || '')
    .trim()
    .toLowerCase();
}

/** Stable key for duplicate detection — prefers media URL, then title + type + topic. */
export function libraryContentDedupeKey(row: LibraryContentRow): string {
  const url = normalizeUrl(
    row.fileUrl ||
      row.videoUrl ||
      row.youtubeUrl ||
      row.driveLink ||
      (Array.isArray(row.fileUrls) ? row.fileUrls[0] : '')
  );
  if (url) return `media:${url}`;

  const title = String(row.title || '')
    .trim()
    .toLowerCase();
  const type = String(row.type || '')
    .trim()
    .toLowerCase();
  const topic = String(row.topic || '')
    .trim()
    .toLowerCase();
  return `meta:${type}|${title}|${topic}|${subjectKey(row)}`;
}

function rowRichness(row: LibraryContentRow): number {
  let score = 0;
  if (row.duration) score += 4;
  if (row.description?.trim()) score += 2;
  if (normalizeUrl(row.fileUrl || row.videoUrl || row.youtubeUrl)) score += 3;
  if (typeof row.views === 'number' && row.views > 0) score += 1;
  return score;
}

/**
 * Remove duplicate library rows (same video/file uploaded under sibling subjects or twice).
 * Keeps the row with the richest metadata when keys collide.
 */
export function dedupeLibraryContents<T extends LibraryContentRow>(rows: T[]): T[] {
  if (!Array.isArray(rows) || rows.length < 2) return rows || [];

  const byId = new Map<string, T>();
  const byKey = new Map<string, T>();

  for (const row of rows) {
    const id = String(row._id || '').trim();
    if (id && byId.has(id)) continue;

    const key = libraryContentDedupeKey(row);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      if (id) byId.set(id, row);
      continue;
    }

    if (rowRichness(row) > rowRichness(prev)) {
      byKey.set(key, row);
      if (id) byId.set(id, row);
      const prevId = String(prev._id || '').trim();
      if (prevId) byId.delete(prevId);
    }
  }

  const kept = new Set(byKey.values());
  return rows.filter((row) => kept.has(row));
}

/**
 * Apply school-program type rules, then collapse duplicate library rows.
 * Use for every client list built from /asli-prep-content (student, teacher, admin).
 */
export function prepareLibraryContents<T extends LibraryContentRow>(
  rows: T[] | null | undefined,
  isAsliPrepExclusive: boolean
): T[] {
  const filtered = filterContentsBySchoolProgram(Array.isArray(rows) ? rows : [], isAsliPrepExclusive);
  return dedupeLibraryContents(filtered);
}
