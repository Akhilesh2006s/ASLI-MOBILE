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

export const TODAYS_TASKS_MAX_NON_VIDEO = 10;

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

  return [...incompleteNonVideo.slice(0, maxNonVideo), ...gatedVideos];
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
