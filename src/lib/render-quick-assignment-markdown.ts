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
  1: { border: 'border-rose-300', bg: 'bg-rose-50/80', title: 'text-rose-950' },
  2: { border: 'border-red-200', bg: 'bg-red-50/60', title: 'text-red-900' },
  3: { border: 'border-orange-200', bg: 'bg-orange-50/60', title: 'text-orange-900' },
  4: { border: 'border-amber-200', bg: 'bg-amber-50/60', title: 'text-amber-900' },
  5: { border: 'border-yellow-200', bg: 'bg-yellow-50/60', title: 'text-yellow-900' },
  6: { border: 'border-lime-200', bg: 'bg-lime-50/60', title: 'text-lime-900' },
  7: { border: 'border-emerald-200', bg: 'bg-emerald-50/60', title: 'text-emerald-900' },
  8: { border: 'border-teal-200', bg: 'bg-teal-50/60', title: 'text-teal-900' },
  9: { border: 'border-cyan-200', bg: 'bg-cyan-50/60', title: 'text-cyan-900' },
  10: { border: 'border-violet-200', bg: 'bg-violet-50/60', title: 'text-violet-900' },
  11: { border: 'border-rose-400', bg: 'bg-rose-50/70', title: 'text-rose-950' },
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
      return `<p class="text-sm text-slate-800 leading-relaxed mb-1">${formatInlineMarkdown(t)}</p>`;
    })
    .join('');
}

export function renderQuickAssignmentMarkdown(text: string): string {
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
    let displayNum = currentSection;
    if (displayNum === 11) displayNum = 10;
    if (displayNum === 13) displayNum = 11;

    if (displayNum === 1) {
      const titleText = bodyTextFromLines(bodyLines) || docTitle;
      if (titleText) {
        sectionEntries.push({
          num: 1,
          html: themedSection1TitleCardHtml({
            title: titleText,
            badge: 'Assignment Title',
            border: 'border-rose-300',
            bg: 'bg-gradient-to-br from-rose-50/90 via-white to-orange-50/40',
            labelClass: 'text-rose-700',
            badgeClass: 'bg-rose-100 text-rose-900',
          }),
        });
      }
      bodyLines = [];
      currentSection = 0;
      currentTitle = '';
      return;
    }

    const style = sectionStyle(displayNum);
    sectionEntries.push({
      num: displayNum,
      html: themedNumberedSectionCardHtml({
        sectionNum: displayNum,
        sectionTitle: currentTitle,
        bodyHtml: bodyLinesToHtml(bodyLines),
        border: style.border,
        bg: style.bg,
        titleClass: style.title,
        labelClass: 'text-rose-600',
      }),
    });
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || /^---+$/.test(line)) continue;

    const docLineTitle = parseMarkdownDocTitle(line);
    if (docLineTitle) {
      docTitle = docLineTitle;
      continue;
    }

    const heading = parseMarkdownSectionHeading(line);
    if (heading) {
      flushSection();
      let num = heading.num;
      if (num === 11) num = 10;
      if (num === 13) num = 11;
      currentSection = num;
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
        badge: 'Assignment Title',
        border: 'border-rose-300',
        bg: 'bg-gradient-to-br from-rose-50/90 via-white to-orange-50/40',
        labelClass: 'text-rose-700',
        badgeClass: 'bg-rose-100 text-rose-900',
      }),
    });
  }

  const parts = sortSectionHtmlEntries(sectionEntries);

  const headerHtml = docTitle
    ? `<div class="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-700 via-red-600 to-orange-600 p-4 mb-3 text-white shadow-lg">` +
      `<p class="text-[10px] font-semibold uppercase tracking-widest text-rose-100">Quick Assignment Builder</p>` +
      `<h3 class="text-lg font-bold">${formatInlineMarkdown(docTitle)}</h3></div>`
    : '';

  return (
    `<div class="quick-assignment-markdown space-y-1 rounded-2xl border border-rose-200/80 p-3 sm:p-4" style="background-color:#fff1f2;background-image:radial-gradient(circle,rgba(244,63,94,0.08) 1px,transparent 1px);background-size:20px 20px">` +
      headerHtml +
      parts.join('') +
      `</div>`
  );
}
