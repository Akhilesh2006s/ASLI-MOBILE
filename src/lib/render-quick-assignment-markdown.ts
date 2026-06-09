import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';

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
  const parts: string[] = [];
  let docHeader = '';
  let currentSection = 0;
  let currentTitle = '';
  let bodyLines: string[] = [];

  const flushSection = () => {
    if (currentSection <= 0 && !bodyLines.length) return;
    let displayNum = currentSection;
    if (displayNum === 11) displayNum = 10;
    if (displayNum === 13) displayNum = 11;
    const style = sectionStyle(displayNum || 1);
    parts.push(
      `<section class="rounded-xl border ${style.border} ${style.bg} p-3 mb-2 shadow-sm">` +
        `<p class="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-0.5">Section ${displayNum}</p>` +
        `<h4 class="text-sm font-bold ${style.title} mb-2">${formatInlineMarkdown(currentTitle)}</h4>` +
        `<div>${bodyLinesToHtml(bodyLines)}</div>` +
        `</section>`,
    );
    bodyLines = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !line.startsWith('##')) {
      docHeader = h1[1];
      continue;
    }
    const section = line.match(/^(?:#{1,3}\s*)?(\d{1,2})\.\s*(.+)$/);
    if (section) {
      flushSection();
      let num = Number(section[1]);
      if (num === 11) num = 10;
      if (num === 13) num = 11;
      currentSection = num;
      currentTitle = section[2];
      continue;
    }
    if (currentSection > 0) bodyLines.push(raw);
  }
  flushSection();

  const headerHtml = docHeader
    ? `<div class="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-700 via-red-600 to-orange-600 p-4 mb-3 text-white shadow-lg">` +
      `<p class="text-[10px] font-semibold uppercase tracking-widest text-rose-100">Quick Assignment Builder</p>` +
      `<h3 class="text-lg font-bold">${formatInlineMarkdown(docHeader)}</h3></div>`
    : '';

  return (
    `<div class="quick-assignment-markdown space-y-1 rounded-2xl border border-rose-200/80 p-3 sm:p-4" style="background-color:#fff1f2;background-image:radial-gradient(circle,rgba(244,63,94,0.08) 1px,transparent 1px);background-size:20px 20px">` +
      headerHtml +
      parts.join('') +
      `</div>`
  );
}
