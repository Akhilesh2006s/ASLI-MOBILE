import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';

const SECTION_STYLES: Record<number, { border: string; bg: string; title: string }> = {
  1: { border: 'border-indigo-300', bg: 'bg-indigo-50/80', title: 'text-indigo-900' },
  2: { border: 'border-blue-200', bg: 'bg-blue-50/60', title: 'text-blue-900' },
  3: { border: 'border-violet-200', bg: 'bg-violet-50/60', title: 'text-violet-900' },
  4: { border: 'border-cyan-200', bg: 'bg-cyan-50/60', title: 'text-cyan-900' },
  5: { border: 'border-indigo-300', bg: 'bg-white', title: 'text-indigo-900' },
  6: { border: 'border-amber-200', bg: 'bg-amber-50/60', title: 'text-amber-900' },
  7: { border: 'border-teal-200', bg: 'bg-teal-50/60', title: 'text-teal-900' },
  8: { border: 'border-lime-200', bg: 'bg-lime-50/60', title: 'text-lime-900' },
  9: { border: 'border-orange-200', bg: 'bg-orange-50/60', title: 'text-orange-900' },
  10: { border: 'border-indigo-300', bg: 'bg-white', title: 'text-indigo-900' },
  11: { border: 'border-fuchsia-200', bg: 'bg-fuchsia-50/60', title: 'text-fuchsia-900' },
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
      if (/^\d+\.\s+\[(objective|subjective|mcq)\]/i.test(t)) {
        return `<div class="mb-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-sm font-medium text-slate-900">${formatInlineMarkdown(t)}</div>`;
      }
      if (/^[A-D]\)\s+/i.test(t)) {
        return `<p class="ml-4 text-sm text-slate-700 mb-1">${formatInlineMarkdown(t)}</p>`;
      }
      return `<p class="text-sm text-slate-800 leading-relaxed mb-2">${formatInlineMarkdown(t)}</p>`;
    })
    .join('');
}

/** Indigo-themed HTML for Smart Study Guide markdown (## / ### numbered sections). */
export function renderSmartStudyGuideMarkdown(text: string): string {
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
  let docHeader = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];

  const flushSection = () => {
    if (currentSection <= 0 && !bodyLines.length) return;
    const style = sectionStyle(currentSection || 1);
    const label = currentTitle || `Section ${currentSection}`;
    parts.push(
      `<section class="mb-3 overflow-hidden rounded-xl border ${style.border} ${style.bg} shadow-sm">` +
        `<header class="border-b border-indigo-100/80 bg-white/60 px-3 py-2">` +
        `<p class="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Section ${currentSection || '—'}</p>` +
        `<h3 class="text-sm font-bold ${style.title}">${formatInlineMarkdown(label)}</h3>` +
        `</header>` +
        `<div class="px-3 py-2">${bodyLinesToHtml(bodyLines)}</div>` +
        `</section>`,
    );
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || /^---+$/.test(trimmed)) continue;

    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1 && !trimmed.startsWith('##')) {
      docHeader =
        `<header class="mb-4 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-700 via-violet-600 to-cyan-600 px-4 py-4 text-white shadow-lg">` +
        `<p class="text-[10px] font-semibold uppercase tracking-widest text-indigo-100">Smart Study Guide</p>` +
        `<h1 class="text-xl font-bold mt-1">${formatInlineMarkdown(h1[1].trim())}</h1>` +
        `</header>`;
      continue;
    }

    const mainSec = trimmed.match(/^#{1,3}\s+(\d{1,2})\.\s*(.+)$/);
    if (mainSec) {
      flushSection();
      currentSection = Number(mainSec[1]);
      currentTitle = mainSec[2].trim();
      continue;
    }

    bodyLines.push(raw);
  }

  flushSection();

  if (!parts.length) {
    return `<div class="prose prose-sm max-w-none text-slate-800">${renderMarkdown(processed)}</div>`;
  }

  return (
    `<div class="smart-study-guide-markdown space-y-1 rounded-2xl border border-indigo-200/80 p-3 sm:p-4" style="background-color:#eef2ff;background-image:radial-gradient(circle,rgba(99,102,241,0.08) 1px,transparent 1px);background-size:20px 20px">` +
    docHeader +
    parts.join('') +
    `</div>`
  );
}

