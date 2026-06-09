import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';

const SECTION_STYLES: Record<number, { border: string; bg: string; title: string }> = {
  1: { border: 'border-emerald-300', bg: 'bg-emerald-50/80', title: 'text-emerald-900' },
  2: { border: 'border-teal-200', bg: 'bg-teal-50/60', title: 'text-teal-900' },
  3: { border: 'border-green-200', bg: 'bg-green-50/60', title: 'text-green-900' },
  4: { border: 'border-emerald-200', bg: 'bg-emerald-50/50', title: 'text-emerald-900' },
  5: { border: 'border-cyan-200', bg: 'bg-cyan-50/50', title: 'text-cyan-900' },
  6: { border: 'border-sky-200', bg: 'bg-sky-50/50', title: 'text-sky-900' },
  7: { border: 'border-blue-200', bg: 'bg-blue-50/50', title: 'text-blue-900' },
  8: { border: 'border-indigo-200', bg: 'bg-indigo-50/50', title: 'text-indigo-900' },
  9: { border: 'border-orange-200', bg: 'bg-orange-50/50', title: 'text-orange-900' },
  10: { border: 'border-fuchsia-200', bg: 'bg-fuchsia-50/50', title: 'text-fuchsia-900' },
  11: { border: 'border-emerald-400', bg: 'bg-emerald-50/70', title: 'text-emerald-950' },
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
      if (/^\*\*Q\d+\.\*\*/i.test(t) || /^Q\d+\./i.test(t)) {
        return `<p class="text-sm font-medium text-slate-900 mb-2">${formatInlineMarkdown(t)}</p>`;
      }
      if (/^[A-D][\).]\s+/i.test(t)) {
        return `<p class="text-sm text-slate-700 mb-1 pl-4">${formatInlineMarkdown(t)}</p>`;
      }
      if (/^\d+\.\s+/.test(t)) {
        return `<p class="text-sm text-slate-800 mb-1 pl-1">${formatInlineMarkdown(t)}</p>`;
      }
      return `<p class="text-sm text-slate-800 leading-relaxed mb-2">${formatInlineMarkdown(t)}</p>`;
    })
    .join('');
}

/** Emerald-themed HTML for Smart Q&A Practice markdown sections. */
export function renderPracticeQaMarkdown(text: string): string {
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
    const title = currentTitle || `Section ${currentSection}`;
    parts.push(
      `<section class="rounded-xl border ${style.border} ${style.bg} p-4 mb-3 shadow-sm">` +
        `<h4 class="text-sm font-bold ${style.title} mb-2">${formatInlineMarkdown(title)}</h4>` +
        `<div class="practice-qa-md-body">${bodyLinesToHtml(bodyLines)}</div>` +
        `</section>`,
    );
    bodyLines = [];
  };

  for (const raw of lines) {
    const t = raw.trim();
    const h1 = t.match(/^#\s+(.+)$/);
    if (h1 && !/^##/.test(t)) {
      docHeader = h1[1].trim();
      continue;
    }
    const num = t.match(/^(?:#{1,3}\s*)?(\d{1,2})\.\s+(.+)$/);
    if (num) {
      flushSection();
      currentSection = Number(num[1]);
      currentTitle = num[2].trim();
      continue;
    }
    if (currentSection > 0) bodyLines.push(raw);
    else if (t) bodyLines.push(raw);
  }
  flushSection();

  const headerHtml = docHeader
    ? `<header class="rounded-2xl bg-gradient-to-r from-emerald-700 via-green-600 to-teal-600 px-5 py-4 mb-4 text-white shadow-lg">` +
      `<p class="text-xs font-semibold uppercase tracking-widest text-emerald-100 mb-1">Smart Q&amp;A Practice</p>` +
      `<h3 class="text-lg font-bold">${formatInlineMarkdown(docHeader)}</h3>` +
      `</header>`
    : '';

  return (
    `<div class="practice-qa-markdown space-y-1 rounded-3xl border border-emerald-200/80 p-3 sm:p-4" ` +
    `style="background-color:#ecfdf5;background-image:radial-gradient(circle,rgba(16,185,129,0.08) 1px,transparent 1px);background-size:22px 22px">` +
    headerHtml +
    parts.join('') +
    `</div>`
  );
}
