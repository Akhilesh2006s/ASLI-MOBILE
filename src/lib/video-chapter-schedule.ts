/** Chapter/module scheduling for student Today's Tasks (videos only). */

export type ChapterCompletedDates = Record<string, string>;

export function videoNumberOnly(value: string | undefined): string {
  return String(value || '').replace(/\D/g, '');
}

export function getContentSubjectId(content: {
  subject?: { _id?: string; id?: string } | string;
  subjectId?: string;
}): string {
  const s = content?.subject;
  if (s && typeof s === 'object') return String(s._id || s.id || '');
  if (typeof s === 'string') return s;
  return String(content?.subjectId || '');
}

export function getVideoDisplayTitle(content: {
  type?: string;
  title?: string;
  chapter?: string;
  module?: string;
}): string {
  const title = String(content.title || '').trim();
  if (!isVideoContentType(content.type)) return title;
  const chapter = videoNumberOnly(content.chapter);
  const mod = videoNumberOnly(content.module);
  if (!chapter && !mod) return title;
  if (chapter && mod) return `chapter - ${chapter} module - ${mod} · ${title}`;
  if (chapter) return `chapter - ${chapter} · ${title}`;
  return `module - ${mod} · ${title}`;
}

export function getSortedChapterNumbers(videos: { chapter?: string }[]): string[] {
  return [...new Set(videos.map((v) => videoNumberOnly(v.chapter)).filter(Boolean))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );
}

export function isChapterFullyComplete(
  chapterVideos: { _id?: string; id?: string }[],
  completedIds: Set<string>
): boolean {
  if (chapterVideos.length === 0) return false;
  return chapterVideos.every((v) => completedIds.has(String(v._id || v.id)));
}

export function getActiveChapterNumber(
  subjectVideos: { chapter?: string; _id?: string; id?: string }[],
  completedIds: Set<string>,
  chapterCompletedDates: ChapterCompletedDates
): string | null {
  const chapters = getSortedChapterNumbers(subjectVideos);
  if (chapters.length === 0) return null;
  const today = new Date().toDateString();

  for (const ch of chapters) {
    const chVideos = subjectVideos.filter((v) => videoNumberOnly(v.chapter) === ch);
    const allDone = isChapterFullyComplete(chVideos, completedIds);

    if (!allDone) return ch;

    const doneDate = chapterCompletedDates[ch];
    if (!doneDate || doneDate === today) return ch;
  }

  return chapters[chapters.length - 1];
}

export function filterIncompleteVideosForTodaysTasks(
  incompleteVideos: {
    type?: string;
    chapter?: string;
    subject?: { _id?: string; id?: string } | string;
    subjectId?: string;
    _id?: string;
    id?: string;
  }[],
  allVideosForSchedule: typeof incompleteVideos,
  completedIds: Set<string>,
  progressBySubject: Record<string, ChapterCompletedDates>
): typeof incompleteVideos {
  const withoutChapter = incompleteVideos.filter(
    (c) => isVideoContentType(c.type) && !videoNumberOnly(c.chapter)
  );

  const allWithChapter = allVideosForSchedule.filter(
    (c) => isVideoContentType(c.type) && videoNumberOnly(c.chapter)
  );
  const subjectIds = [...new Set(allWithChapter.map(getContentSubjectId).filter(Boolean))];
  const visible: typeof incompleteVideos = [...withoutChapter];

  for (const subjectId of subjectIds) {
    const allSubjectVideos = allWithChapter.filter((v) => getContentSubjectId(v) === subjectId);
    const dates = progressBySubject[subjectId] || {};
    const activeChapter = getActiveChapterNumber(allSubjectVideos, completedIds, dates);
    if (!activeChapter) continue;
    visible.push(
      ...allSubjectVideos.filter((v) => videoNumberOnly(v.chapter) === activeChapter)
    );
  }

  return visible;
}

export const TODAYS_TASKS_DAILY_LIMIT = 4;
/** Pool size before daily cap — large enough to include multiple content types. */
export const TODAYS_TASKS_MAX_NON_VIDEO = 16;

const CONTENT_TYPE_PICK_ORDER = [
  'video',
  'homework',
  'material',
  'textbook',
  'workbook',
  'audio',
  'other',
] as const;

function normalizeContentTypeKey(type: string | undefined): string {
  const t = String(type || 'other').toLowerCase();
  if (t === 'video' || t === 'homework') return t;
  if (t === 'textbook' || t === 'workbook') return t;
  if (t === 'material' || t === 'audio') return t;
  return 'other';
}

function getSubjectLabel(item: {
  subject?: { _id?: string; id?: string; name?: string } | string;
  subjectId?: { _id?: string; id?: string; name?: string } | string;
}): string {
  if (typeof item.subject === 'object' && item.subject?.name) return String(item.subject.name);
  if (typeof item.subject === 'string' && item.subject.trim()) return item.subject.trim();
  if (typeof item.subjectId === 'object' && item.subjectId?.name) return String(item.subjectId.name);
  if (typeof item.subjectId === 'string' && item.subjectId.trim()) return item.subjectId.trim();
  return '';
}

/** Stable subject bucket key for round-robin (prefer id, fall back to name). */
export function getTaskSubjectKey(
  item: {
    subject?: { _id?: string; id?: string; name?: string } | string;
    subjectId?: { _id?: string; id?: string; name?: string } | string;
  },
  isQuiz = false
): string {
  const id = getContentSubjectId(item);
  if (id) return `id:${id}`;
  const label = getSubjectLabel(item);
  if (label) return `name:${label.toLowerCase()}`;
  return isQuiz ? 'subject:general' : 'subject:unknown';
}

type SubjectTaskBucket<TQ, TC> = {
  quizzes: TQ[];
  contentByType: Map<string, TC[]>;
};

function groupBySubject<TQ, TC>(
  quizzes: TQ[],
  content: TC[],
  getQuizSubject: (q: TQ) => string,
  getContentSubject: (c: TC) => string
): Map<string, SubjectTaskBucket<TQ, TC>> {
  const buckets = new Map<string, SubjectTaskBucket<TQ, TC>>();

  const ensure = (key: string) => {
    if (!buckets.has(key)) {
      buckets.set(key, { quizzes: [], contentByType: new Map() });
    }
    return buckets.get(key)!;
  };

  for (const quiz of quizzes) {
    ensure(getQuizSubject(quiz)).quizzes.push(quiz);
  }

  for (const item of content) {
    const bucket = ensure(getContentSubject(item));
    const typeKey = normalizeContentTypeKey((item as { type?: string }).type);
    if (!bucket.contentByType.has(typeKey)) bucket.contentByType.set(typeKey, []);
    bucket.contentByType.get(typeKey)!.push(item);
  }

  return buckets;
}

function pickBestFromSubjectBucket<TQ, TC>(
  bucket: SubjectTaskBucket<TQ, TC>
): { kind: 'quiz'; item: TQ } | { kind: 'content'; item: TC } | null {
  if (bucket.quizzes.length > 0) {
    return { kind: 'quiz', item: bucket.quizzes.shift()! };
  }
  for (const typeKey of CONTENT_TYPE_PICK_ORDER) {
    const pool = bucket.contentByType.get(typeKey);
    if (pool?.length) {
      return { kind: 'content', item: pool.shift()! };
    }
  }
  for (const pool of bucket.contentByType.values()) {
    if (pool.length > 0) {
      return { kind: 'content', item: pool.shift()! };
    }
  }
  return null;
}

/** Round-robin across subjects; within each subject pick best available type. */
function pickSubjectWise<T extends { subject?: unknown; subjectId?: unknown }>(
  items: T[],
  maxItems: number,
  getSubject: (item: T) => string
): T[] {
  const bySubject = new Map<string, T[]>();
  for (const item of items) {
    const key = getSubject(item);
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push(item);
  }

  const subjectOrder = [...bySubject.keys()].sort((a, b) => a.localeCompare(b));
  const picked: T[] = [];

  while (picked.length < maxItems) {
    let added = false;
    for (const subject of subjectOrder) {
      const pool = bySubject.get(subject)!;
      if (!pool.length) continue;
      picked.push(pool.shift()!);
      added = true;
      if (picked.length >= maxItems) break;
    }
    if (!added) break;
  }

  return picked;
}

/**
 * Pick up to `limit` daily tasks — one pass per subject (round-robin),
 * using the best content type available in that subject (quiz → video → homework → …).
 */
export function capTodaysTasksForDay<
  T extends { _id?: string; id?: string; subject?: unknown; subjectId?: unknown },
  U extends { type?: string; _id?: string; id?: string; subject?: unknown; subjectId?: unknown },
>(quizzes: T[], content: U[], limit = TODAYS_TASKS_DAILY_LIMIT): { quizzes: T[]; content: U[] } {
  const buckets = groupBySubject(
    [...quizzes],
    [...content],
    (q) => getTaskSubjectKey(q, true),
    (c) => getTaskSubjectKey(c, false)
  );

  const subjectOrder = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
  const pickedQuizzes: T[] = [];
  const pickedContent: U[] = [];

  while (pickedQuizzes.length + pickedContent.length < limit) {
    let added = false;
    for (const subjectKey of subjectOrder) {
      if (pickedQuizzes.length + pickedContent.length >= limit) break;
      const bucket = buckets.get(subjectKey)!;
      const next = pickBestFromSubjectBucket(bucket);
      if (!next) continue;
      if (next.kind === 'quiz') pickedQuizzes.push(next.item);
      else pickedContent.push(next.item);
      added = true;
    }
    if (!added) break;
  }

  return { quizzes: pickedQuizzes, content: pickedContent };
}

function sortByNewestFirst(a: { createdAt?: string; date?: string }, b: { createdAt?: string; date?: string }) {
  const dateA = new Date(a.createdAt || a.date || 0).getTime();
  const dateB = new Date(b.createdAt || b.date || 0).getTime();
  return dateB - dateA;
}

export function isVideoContentType(type: string | undefined): boolean {
  return String(type || '').toLowerCase() === 'video';
}

export function isHomeworkContentType(type: string | undefined): boolean {
  return String(type || '').toLowerCase() === 'homework';
}

export type BuildTodaysTasksOptions = {
  maxNonVideo?: number;
  includeHomework?: boolean;
};

export function buildTodaysTasksContentList(
  allContent: {
    type?: string;
    chapter?: string;
    subject?: { _id?: string; id?: string } | string;
    subjectId?: string;
    _id?: string;
    id?: string;
    createdAt?: string;
    date?: string;
  }[],
  videoCompletedIds: Set<string>,
  progressBySubject: Record<string, ChapterCompletedDates>,
  options: BuildTodaysTasksOptions = {}
) {
  const maxNonVideo = options.maxNonVideo ?? TODAYS_TASKS_MAX_NON_VIDEO;
  const includeHomework = options.includeHomework ?? true;

  const incompleteNonVideo = allContent.filter((content) => {
    if (isVideoContentType(content.type)) return false;
    if (!includeHomework && isHomeworkContentType(content.type)) return false;
    return true;
  });

  const incompleteVideos = allContent.filter((content) => {
    const contentId = String(content._id || content.id);
    return (
      !isHomeworkContentType(content.type) &&
      isVideoContentType(content.type) &&
      !videoCompletedIds.has(contentId)
    );
  });

  const allVideos = allContent.filter((c) => isVideoContentType(c.type));
  const gatedVideos = filterIncompleteVideosForTodaysTasks(
    incompleteVideos,
    allVideos,
    videoCompletedIds,
    progressBySubject
  );

  incompleteNonVideo.sort(sortByNewestFirst);
  gatedVideos.sort(sortByNewestFirst);

  const diverseNonVideo = pickSubjectWise(incompleteNonVideo, maxNonVideo, (item) =>
    getTaskSubjectKey(item, false)
  );
  const diverseVideos = pickSubjectWise(gatedVideos, gatedVideos.length, (item) =>
    getTaskSubjectKey(item, false)
  );
  return [...diverseNonVideo, ...diverseVideos];
}

export function nextChapterCompletedDates(
  subjectId: string,
  allVideos: { type?: string; chapter?: string; subject?: unknown; subjectId?: string }[],
  completedIds: Set<string>,
  currentDates: ChapterCompletedDates
): ChapterCompletedDates | null {
  const subjectVideos = allVideos.filter(
    (v) => isVideoContentType(v.type) && getContentSubjectId(v) === subjectId && videoNumberOnly(v.chapter)
  );
  if (subjectVideos.length === 0) return null;

  const activeChapter = getActiveChapterNumber(subjectVideos, completedIds, currentDates);
  if (!activeChapter) return null;

  const chVideos = subjectVideos.filter((v) => videoNumberOnly(v.chapter) === activeChapter);
  if (!isChapterFullyComplete(chVideos, completedIds)) return null;

  const today = new Date().toDateString();
  if (currentDates[activeChapter] === today) return null;

  return { ...currentDates, [activeChapter]: today };
}
