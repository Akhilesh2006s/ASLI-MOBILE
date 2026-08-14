import { sortContentsChapterWise } from './video-chapter-schedule';

export const CONTENT_TYPE_ORDER = [
  'Video',
  'TextBook',
  'Workbook',
  'Material',
  'Audio',
  'Homework',
] as const;

export type LearningPathContentType = (typeof CONTENT_TYPE_ORDER)[number] | string;

export type GroupableContent = {
  _id: string;
  type: string;
  [key: string]: unknown;
};

export function groupContentsByType<T extends GroupableContent>(items: T[]): { type: string; items: T[] }[] {
  const grouped = items.reduce<Record<string, T[]>>((acc, item) => {
    const type = item.type?.trim() || 'Content';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const ordered = [
    ...CONTENT_TYPE_ORDER.filter((type) => grouped[type]?.length),
    ...Object.keys(grouped).filter((type) => !CONTENT_TYPE_ORDER.includes(type as (typeof CONTENT_TYPE_ORDER)[number])),
  ];

  return ordered.map((type) => ({
    type,
    items:
      String(type).toLowerCase() === 'video'
        ? sortContentsChapterWise(grouped[type])
        : grouped[type],
  }));
}

/** Split board type sections + a trailing IIT section (peer to TextBook / Materials). */
export function groupLearningPathContentsWithIit<T extends GroupableContent>(
  items: T[],
  isIit: (item: T) => boolean,
): { type: string; items: T[]; iit?: boolean }[] {
  const board = items.filter((item) => !isIit(item));
  const iit = items.filter(
    (item) => isIit(item) && String(item.type || '').toLowerCase() !== 'video',
  );
  const sections = groupContentsByType(board).map((s) => ({ ...s, iit: false as boolean | undefined }));
  if (iit.length > 0) {
    sections.push({ type: 'IIT', items: iit, iit: true });
  }
  return sections;
}
