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

  return ordered.map((type) => ({ type, items: grouped[type] }));
}
