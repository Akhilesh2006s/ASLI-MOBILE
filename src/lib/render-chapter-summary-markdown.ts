import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';
import {
  bodyTextFromLines,
  parseMarkdownDocTitle,
  parseMarkdownSectionHeading,
  sortSectionHtmlEntries,
  type SectionHtmlEntry,
  themedNumberedSectionCardHtml,
  themedSection1TitleCardHtml,
} from './themed-markdown-sections';

const SECTION_STYLES: Record<number, { border: string; bg: string; title: string }> = {
  1: { border: 'border-blue-300', bg: 'bg-blue-50/80', title: 'text-blue-900' },
  2: { border: 'border-sky-200', bg: 'bg-sky-50/60', title: 'text-sky-900' },
  3: { border: 'border-indigo-200', bg: 'bg-indigo-50/60', title: 'text-indigo-900' },
  4: { border: 'border-violet-200', bg: 'bg-violet-50/60', title: 'text-violet-900' },
  5: { border: 'border-purple-200', bg: 'bg-purple-50/60', title: 'text-purple-900' },
  6: { border: 'border-fuchsia-200', bg: 'bg-fuchsia-50/60', title: 'text-fuchsia-900' },
  7: { border: 'border-cyan-200', bg: 'bg-cyan-50/60', title: 'text-cyan-900' },
  8: { border: 'border-emerald-200', bg: 'bg-emerald-50/60', title: 'text-emerald-900' },
  9: { border: 'border-amber-200', bg: 'bg-amber-50/60', title: 'text-amber-900' },
  10: { border: 'border-blue-400', bg: 'bg-blue-50/70', title: 'text-blue-950' },
};

function sectionStyle(num: number) {
  return SECTION_STYLES[num] || SECTION_STYLES[1];
}

function bodyLinesToHtml(lines: string[]): string {
  const chunk = lines.join('\n').trim();
  if (!chunk) return '';
  if (chunk.includes('|') && /^\s*\|/m.test(chunk)) return renderMarkdown(chunk);
  return lines
    .map((line) => {
      const t = line.trim();
      if (!t) return '';
      if (/^\d+\.\s+/.test(t)) {
        return `<p class="text-sm text-slate-800 mb-1">${formatInlineMarkdown(t)}</p>`;
      }
      return `<p class="text-sm text-slate-800 leading-relaxed mb-2">${formatInlineMarkdown(t)}</p>`;
    })
    .join('');
}

export function renderChapterSummaryMarkdown(text: string): string {
  if (!text?.trim()) return '';

  const lines = text.split('\n');
  const sectionEntries: SectionHtmlEntry[] = [];
  let docTitle = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];

  const flushSection = () => {
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    if (currentSection === 1) {
      const titleText = bodyTextFromLines(bodyLines) || docTitle;
      if (titleText) {
        sectionEntries.push({
          num: 1,
          html: themedSection1TitleCardHtml({
            title: titleText,
            badge: 'Chapter Summary Title',
            border: 'border-blue-300',
            bg: 'bg-gradient-to-br from-blue-50/90 via-white to-sky-50/40',
            labelClass: 'text-blue-700',
            badgeClass: 'bg-blue-100 text-blue-900',
          }),
        });
      }
      bodyLines = [];
      currentSection = 0;
      currentTitle = '';
      return;
    }
    const style = sectionStyle(currentSection);
    sectionEntries.push({
      num: currentSection,
      html: themedNumberedSectionCardHtml({
        sectionNum: currentSection,
        sectionTitle: currentTitle,
        bodyHtml: bodyLinesToHtml(bodyLines),
        border: style.border,
        bg: style.bg,
        titleClass: style.title,
        labelClass: 'text-blue-600',
      }),
    });
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || /^---+$/.test(t)) continue;

    const docLineTitle = parseMarkdownDocTitle(t);
    if (docLineTitle) {
      docTitle = docLineTitle;
      continue;
    }

    const heading = parseMarkdownSectionHeading(t);
    if (heading) {
      flushSection();
      currentSection = heading.num;
      currentTitle = heading.title;
      continue;
    }
    if (currentSection > 0) bodyLines.push(raw);
  }
  flushSection();

  if (!sectionEntries.some((e) => e.num === 1) && docTitle) {
    sectionEntries.push({
      num: 1,
      html: themedSection1TitleCardHtml({
        title: docTitle,
        badge: 'Chapter Summary Title',
        border: 'border-blue-300',
        bg: 'bg-gradient-to-br from-blue-50/90 via-white to-sky-50/40',
        labelClass: 'text-blue-700',
        badgeClass: 'bg-blue-100 text-blue-900',
      }),
    });
  }

  const parts = sortSectionHtmlEntries(sectionEntries);

  const headerHtml = docTitle
    ? `<header class="rounded-2xl bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-600 px-5 py-4 mb-4 text-white shadow-lg">` +
      `<p class="text-xs font-semibold uppercase tracking-widest text-blue-100 mb-1">Chapter Summary Creator</p>` +
      `<h3 class="text-lg font-bold">${formatInlineMarkdown(docTitle)}</h3></header>`
    : '';

  return (
    `<div class="chapter-summary-markdown space-y-1 rounded-3xl border border-blue-200/80 p-3 sm:p-4" ` +
    `style="background-color:#eff6ff;background-image:radial-gradient(circle,rgba(59,130,246,0.08) 1px,transparent 1px);background-size:22px 22px">` +
    headerHtml +
    parts.join('') +
    `</div>`
  );
}
