import { formatInlineMarkdown, renderMarkdown } from './render-teacher-markdown';
import { lightDocHeaderHtml } from './ai-tool-html-primitives';

const SECTION_STYLES: Record<number, { border: string; bg: string; title: string }> = {
  1: { border: 'border-indigo-300', bg: 'bg-indigo-50/80', title: 'text-indigo-900' },
  2: { border: 'border-amber-200', bg: 'bg-amber-50/60', title: 'text-amber-900' },
  3: { border: 'border-violet-200', bg: 'bg-violet-50/60', title: 'text-violet-900' },
  4: { border: 'border-cyan-200', bg: 'bg-cyan-50/60', title: 'text-cyan-900' },
  5: { border: 'border-slate-200', bg: 'bg-slate-50/80', title: 'text-slate-900' },
  6: { border: 'border-indigo-400', bg: 'bg-white', title: 'text-indigo-900' },
  7: { border: 'border-emerald-200', bg: 'bg-emerald-50/60', title: 'text-emerald-900' },
  8: { border: 'border-sky-200', bg: 'bg-sky-50/60', title: 'text-sky-900' },
  9: { border: 'border-amber-300', bg: 'bg-amber-50/50', title: 'text-amber-900' },
  10: { border: 'border-orange-200', bg: 'bg-orange-50/60', title: 'text-orange-900' },
  11: { border: 'border-teal-200', bg: 'bg-teal-50/60', title: 'text-teal-900' },
  12: { border: 'border-lime-200', bg: 'bg-lime-50/60', title: 'text-lime-900' },
  13: { border: 'border-slate-300', bg: 'bg-slate-50/80', title: 'text-slate-900' },
};

function sectionStyle(num: number) {
  return SECTION_STYLES[num] || SECTION_STYLES[1];
}

function formatBodyLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed === '__UL_OPEN__' || trimmed === '__UL_CLOSE__') return '';
  if (/^>\s*/.test(trimmed)) {
    return `<p class="text-xs italic text-indigo-700/90 mb-2">${formatInlineMarkdown(trimmed.replace(/^>\s*/, ''))}</p>`;
  }
  if (/^\*\*Q\d+/i.test(trimmed)) {
    return `<div class="rounded-lg border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 px-3 py-2 mb-2"><p class="text-sm font-semibold text-slate-900 leading-snug">${formatInlineMarkdown(trimmed)}</p></div>`;
  }
  if (/^###\s+Section\s*[A-E]/i.test(trimmed)) {
    return `<h4 class="text-sm font-bold text-indigo-800 mt-3 mb-2 pb-1 border-b border-indigo-100">${formatInlineMarkdown(trimmed.replace(/^###\s+/, ''))}</h4>`;
  }
  if (/^###\s+/.test(trimmed)) {
    return `<h4 class="text-sm font-bold text-indigo-800 mt-2 mb-1">${formatInlineMarkdown(trimmed.replace(/^###\s+/, ''))}</h4>`;
  }
  if (/^\d+\.\s+/.test(trimmed)) {
    return `<p class="text-sm text-slate-800 mb-1 pl-1"><span class="font-semibold text-indigo-700">${trimmed.match(/^\d+/)?.[0]}.</span> ${formatInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</p>`;
  }
  return `<p class="text-sm text-slate-800 leading-relaxed mb-2">${formatInlineMarkdown(trimmed)}</p>`;
}

function bodyLinesToHtml(lines: string[]): string {
  const chunk = lines.join('\n').trim();
  if (!chunk) return '';
  if (chunk.includes('|') && /^\s*\|/m.test(chunk)) {
    return renderMarkdown(chunk);
  }
  const out: string[] = [];
  let listBuf: string[] = [];
  const flushList = () => {
    if (!listBuf.length) return;
    out.push(
      `<ul class="list-disc pl-5 space-y-1 mb-2">${listBuf
        .map(
          (li) =>
            `<li class="text-sm text-slate-800">${formatInlineMarkdown(li)}</li>`,
        )
        .join('')}</ul>`,
    );
    listBuf = [];
  };
  for (const raw of lines) {
    const t = raw.trim();
    if (/^[-*]\s+/.test(t)) {
      listBuf.push(t.replace(/^[-*]\s+/, ''));
      continue;
    }
    flushList();
    const html = formatBodyLine(raw);
    if (html) out.push(html);
  }
  flushList();
  return out.join('');
}

/** Rose-themed HTML for Mock Test formatted markdown (## 1. … ## 12. sections). */
export function renderMockTestMarkdown(text: string): string {
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
    if (currentSection <= 0) {
      bodyLines = [];
      return;
    }
    const style = sectionStyle(currentSection || 1);
    const label = currentTitle || `Section ${currentSection}`;
    const bodyHtml = bodyLinesToHtml(bodyLines);
    parts.push(
      `<section class="mb-3 overflow-hidden rounded-xl border ${style.border} ${style.bg} shadow-sm">` +
        `<header class="border-b border-indigo-100/80 bg-white/60 px-3 py-2">` +
        `<p class="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Section ${currentSection || '—'}</p>` +
        `<h3 class="text-sm font-bold ${style.title}">${formatInlineMarkdown(label)}</h3>` +
        `</header>` +
        `<div class="px-3 py-2">${bodyHtml}</div>` +
        `</section>`,
    );
    bodyLines = [];
    currentSection = 0;
    currentTitle = '';
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (/^---+$/.test(trimmed)) continue;
    if (/^>\s*\*\*Mock Test Builder\*\*/i.test(trimmed)) {
      parts.push(
        `<p class="text-xs text-indigo-700/90 mb-3 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2">${formatInlineMarkdown(trimmed.replace(/^>\s*/, ''))}</p>`,
      );
      continue;
    }

    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1 && !trimmed.startsWith('##')) {
      docHeader = lightDocHeaderHtml({
        eyebrow: 'Mock Test Builder',
        titleHtml: formatInlineMarkdown(h1[1].trim()),
        theme: 'indigo',
        titleTag: 'h1',
      });
      continue;
    }

    const mainSec = trimmed.match(/^##\s+(\d{1,2})\.\s*(.+)$/);
    if (mainSec) {
      flushSection();
      currentSection = Number(mainSec[1]);
      currentTitle = mainSec[2].trim();
      continue;
    }

    const legacySec = trimmed.match(/^###\s+(\d{1,2})\.\s*(.+)$/);
    if (legacySec) {
      flushSection();
      currentSection = Number(legacySec[1]);
      currentTitle = legacySec[2].trim();
      continue;
    }

    if (currentSection > 0) bodyLines.push(raw);
  }

  flushSection();

  if (!parts.length) {
    return `<div class="prose prose-sm max-w-none text-slate-800">${lines.map((l) => formatBodyLine(l)).join('')}</div>`;
  }

  return (
    `<div class="mock-test-markdown space-y-1 rounded-2xl border border-indigo-200/80 p-3 sm:p-4" style="background-color:#eef2ff;background-image:radial-gradient(circle,rgba(99,102,241,0.08) 1px,transparent 1px);background-size:20px 20px">` +
    docHeader +
    parts.join('') +
    `</div>`
  );
}

export function looksLikeMockTestContent(text: string): boolean {
  const sample = String(text || '').slice(0, 12000);
  if (!sample.trim()) return false;
  if (
    /paper\s*title\s*and\s*general\s*instructions/i.test(sample) ||
    /blueprint\s*\/\s*design\s*grid/i.test(sample) ||
    /rubric\s*for\s*open[-\s]?ended/i.test(sample)
  ) {
    return false;
  }
  const hasTemplate =
    /question\s*paper/i.test(sample) &&
    (/answer\s*key/i.test(sample) || /step-by-step\s*solutions/i.test(sample));
  const hasNumberedSections = /(?:^|\n)\s*#{1,3}\s*\d{1,2}\.\s+/m.test(sample);
  const hasMockLabel = /mock\s*test/i.test(sample);
  return hasTemplate && (hasNumberedSections || hasMockLabel);
}
