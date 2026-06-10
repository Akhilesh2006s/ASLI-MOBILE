import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';
import {
  bodyTextFromLines,
  parseMarkdownDocTitle,
  themedNumberedSectionCardHtml,
  themedSection1TitleCardHtml,
} from './themed-markdown-sections';

const SECTION_STYLES: Record<number, { border: string; bg: string; title: string }> = {
  1: { border: 'border-violet-300', bg: 'bg-violet-50/80', title: 'text-violet-900' },
  2: { border: 'border-blue-200', bg: 'bg-blue-50/60', title: 'text-blue-900' },
  3: { border: 'border-indigo-200', bg: 'bg-indigo-50/60', title: 'text-indigo-900' },
  4: { border: 'border-emerald-200', bg: 'bg-emerald-50/60', title: 'text-emerald-900' },
  5: { border: 'border-amber-200', bg: 'bg-amber-50/60', title: 'text-amber-900' },
  6: { border: 'border-cyan-200', bg: 'bg-cyan-50/60', title: 'text-cyan-900' },
  7: { border: 'border-orange-200', bg: 'bg-orange-50/60', title: 'text-orange-900' },
  8: { border: 'border-fuchsia-200', bg: 'bg-fuchsia-50/60', title: 'text-fuchsia-900' },
  9: { border: 'border-violet-300', bg: 'bg-violet-50/70', title: 'text-violet-900' },
};

function sectionStyle(num: number) {
  return SECTION_STYLES[num] || SECTION_STYLES[1];
}

function bodyLinesToHtml(lines: string[]): string {
  const chunk = lines.join('\n').trim();
  if (!chunk) return '';
  if (chunk.includes('|') && /^\s*\|/m.test(chunk)) {
    return renderMarkdown(chunk);
  }
  return lines
    .map((line) => {
      const t = line.trim();
      if (!t) return '';
      if (/^\d+\.\s+/.test(t)) {
        return `<p class="text-sm text-slate-800 mb-1 pl-1"><span class="font-semibold text-violet-700">${t.match(/^\d+/)?.[0]}.</span> ${formatInlineMarkdown(t.replace(/^\d+\.\s+/, ''))}</p>`;
      }
      return `<p class="text-sm text-slate-800 leading-relaxed mb-2">${formatInlineMarkdown(t)}</p>`;
    })
    .join('');
}

/** Violet-themed HTML for Concept Breakdown markdown sections. */
export function renderConceptBreakdownMarkdown(text: string): string {
  if (!text?.trim()) return '';

  let processed = text;
  try {
    if (text.trim().startsWith('{') && text.includes('"formatted"')) {
      const parsed = JSON.parse(text) as { formatted?: string };
      if (parsed.formatted) processed = parsed.formatted;
    }
  } catch {
    /* use raw */
  }

  const lines = processed.split('\n');
  const parts: string[] = [];
  let docTitle = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];
  let renderedSection1 = false;

  const flushSection = () => {
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    if (currentSection === 1) {
      const titleText = bodyTextFromLines(bodyLines) || docTitle;
      if (titleText) {
        parts.push(
          themedSection1TitleCardHtml({
            title: titleText,
            badge: 'Concept Title',
            border: 'border-violet-300',
            bg: 'bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40',
            labelClass: 'text-violet-700',
            badgeClass: 'bg-violet-100 text-violet-900',
          }),
        );
        renderedSection1 = true;
      }
      bodyLines = [];
      currentSection = 0;
      currentTitle = '';
      return;
    }
    const style = sectionStyle(currentSection);
    parts.push(
      themedNumberedSectionCardHtml({
        sectionNum: currentSection,
        sectionTitle: currentTitle,
        bodyHtml: bodyLinesToHtml(bodyLines),
        border: style.border,
        bg: style.bg,
        titleClass: style.title,
        labelClass: 'text-violet-600',
      }),
    );
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || /^---+$/.test(trimmed)) continue;
    if (/^>\s/.test(trimmed)) continue;

    const docLineTitle = parseMarkdownDocTitle(trimmed);
    if (docLineTitle) {
      docTitle = docLineTitle;
      continue;
    }

    const mainSec = trimmed.match(/^#{1,3}\s+(\d{1,2})\.\s*(.+)$/);
    if (mainSec) {
      flushSection();
      currentSection = Number(mainSec[1]);
      currentTitle = mainSec[2].trim();
      continue;
    }

    if (currentSection > 0) bodyLines.push(raw);
  }

  flushSection();

  if (!renderedSection1 && docTitle) {
    parts.unshift(
      themedSection1TitleCardHtml({
        title: docTitle,
        badge: 'Concept Title',
        border: 'border-violet-300',
        bg: 'bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40',
        labelClass: 'text-violet-700',
        badgeClass: 'bg-violet-100 text-violet-900',
      }),
    );
  }

  const docHeader = docTitle
    ? `<header class="mb-4 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 px-4 py-4 text-white shadow-lg">` +
      `<p class="text-[10px] font-semibold uppercase tracking-widest text-violet-100">Concept Breakdown Explainer</p>` +
      `<h1 class="text-xl font-bold mt-1">${formatInlineMarkdown(docTitle)}</h1>` +
      `</header>`
    : '';

  if (!parts.length) {
    return `<div class="prose prose-sm max-w-none text-slate-800">${renderMarkdown(processed)}</div>`;
  }

  return (
    `<div class="concept-breakdown-markdown space-y-1 rounded-2xl border border-violet-200/80 p-3 sm:p-4" style="background-color:#f5f3ff;background-image:radial-gradient(circle,rgba(139,92,246,0.08) 1px,transparent 1px);background-size:20px 20px">` +
    docHeader +
    parts.join('') +
    `</div>`
  );
}
