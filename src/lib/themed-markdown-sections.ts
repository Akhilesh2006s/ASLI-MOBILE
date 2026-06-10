import { formatInlineMarkdown } from './render-teacher-markdown';

/** `# Title` or `## Title` (without `N.` prefix) — common Super Admin doc headers. */
export function parseMarkdownDocTitle(line: string): string | null {
  const t = line.trim();
  const h1 = t.match(/^#\s+(.+)$/);
  if (h1 && !t.startsWith('##')) return h1[1].trim();
  const h2 = t.match(/^##\s+(.+)$/);
  if (h2 && !t.startsWith('###')) {
    const inner = h2[1].trim();
    if (!/^\d{1,2}\.\s/.test(inner)) return inner;
  }
  return null;
}

export function themedSection1TitleCardHtml(opts: {
  title: string;
  badge: string;
  border: string;
  bg: string;
  labelClass: string;
  badgeClass: string;
}): string {
  const safeTitle = opts.title.trim() || 'Untitled';
  return (
    `<section class="mb-3 overflow-hidden rounded-xl border ${opts.border} ${opts.bg} shadow-sm">` +
    `<div class="px-3 py-3 sm:px-4 sm:py-3.5">` +
    `<p class="text-[9px] font-bold uppercase tracking-wider ${opts.labelClass}">Section 1</p>` +
    `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold mt-1 ${opts.badgeClass}">${opts.badge}</span>` +
    `<h3 class="text-lg font-bold leading-snug text-slate-900 mt-2">${formatInlineMarkdown(safeTitle)}</h3>` +
    `</div></section>`
  );
}

export function themedNumberedSectionCardHtml(opts: {
  sectionNum: number;
  sectionTitle: string;
  bodyHtml: string;
  border: string;
  bg: string;
  titleClass: string;
  labelClass: string;
}): string {
  const label = opts.sectionTitle.trim() || `Section ${opts.sectionNum}`;
  return (
    `<section class="mb-3 overflow-hidden rounded-xl border ${opts.border} ${opts.bg} shadow-sm">` +
    `<header class="border-b border-slate-100/80 bg-white/60 px-3 py-2">` +
    `<p class="text-[9px] font-bold uppercase tracking-wider ${opts.labelClass}">Section ${opts.sectionNum}</p>` +
    `<h3 class="text-sm font-bold ${opts.titleClass}">${formatInlineMarkdown(label)}</h3>` +
    `</header>` +
    `<div class="px-3 py-2">${opts.bodyHtml}</div>` +
    `</section>`
  );
}

export function bodyTextFromLines(bodyLines: string[]): string {
  return bodyLines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

/** Template sections use `### 2. Title` or `## 1. Title` — not plain `1. list item` body lines. */
export function parseMarkdownSectionHeading(line: string): { num: number; title: string } | null {
  const md = line.trim().match(/^#{1,3}\s+(\d{1,2})\.\s+(.+)$/);
  if (!md) return null;
  return { num: Number(md[1]), title: md[2].trim() };
}

export type SectionHtmlEntry = { num: number; html: string };

export function sortSectionHtmlEntries(entries: SectionHtmlEntry[]): string[] {
  const byNum = new Map<number, string>();
  for (const entry of entries) {
    if (!byNum.has(entry.num)) byNum.set(entry.num, entry.html);
  }
  return [...byNum.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, html]) => html);
}
