import { renderMarkdown } from './render-teacher-markdown';

export function emptySectionPlaceholderHtml(
  message = 'Not included in this generation.'
): string {
  return `<p class="text-sm italic text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">${escapeHtml(message)}</p>`;
}

export function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function richTextHtml(text: string): string {
  const raw = String(text || '').trim();
  if (!raw) {
    return '<p class="text-xs italic text-slate-400 rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-1">Not included.</p>';
  }
  const hasMarkdown =
    raw.includes('|') ||
    /^\s*#{1,6}\s/m.test(raw) ||
    /\*\*[^*]+\*\*/.test(raw) ||
    /^\s*[-*•]\s/m.test(raw);
  if (hasMarkdown) {
    return `<div class="prose prose-sm max-w-none text-slate-800">${renderMarkdown(raw)}</div>`;
  }
  return `<p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">${escapeHtml(raw)}</p>`;
}

/** Section badge icon — shows the section number instead of a generic § symbol. */
export function sectionNumberIconSvg(num: number): string {
  const label = num > 0 ? String(num) : '•';
  return `<span class="text-sm font-bold tabular-nums leading-none">${escapeHtml(label)}</span>`;
}

export function sectionCardHtml(opts: {
  sectionNum: string;
  title: string;
  stripe: string;
  iconWrap: string;
  iconSvg: string;
  borderColor?: string;
  body: string;
}): string {
  const border = opts.borderColor || 'border-stone-200/90';
  return `
<section class="h-fit w-full rounded-2xl bg-white border ${border} shadow-sm shadow-stone-200/40 overflow-hidden mb-3">
  <div class="flex items-center gap-2.5 px-3 py-2.5 border-l-[5px] ${opts.stripe}">
    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${opts.iconWrap}">
      ${opts.iconSvg}
    </div>
    <div class="min-w-0">
      <p class="text-[10px] font-bold uppercase tracking-wider text-stone-400">${escapeHtml(opts.sectionNum)}</p>
      <h4 class="text-sm font-bold text-stone-900 leading-tight">${escapeHtml(opts.title)}</h4>
    </div>
  </div>
  <div class="px-3 pb-3 pt-1 text-sm leading-relaxed text-stone-700">${opts.body}</div>
</section>`;
}

export function bulletListHtml(items: string[], accent = 'text-stone-500'): string {
  if (!items.length) return richTextHtml('');
  return `<ul class="space-y-1.5">${items
    .map(
      (line) =>
        `<li class="flex gap-2 text-sm text-slate-800"><span class="mt-0.5 shrink-0 ${accent}">•</span><span class="whitespace-pre-wrap leading-relaxed">${escapeHtml(line)}</span></li>`
    )
    .join('')}</ul>`;
}

export function checkListHtml(items: string[]): string {
  if (!items.length) return richTextHtml('');
  return `<ul class="space-y-2">${items
    .map(
      (line) =>
        `<li class="flex gap-2 rounded-lg bg-violet-50/80 px-3 py-2 text-sm text-slate-800">
          <span class="shrink-0 text-violet-600 mt-0.5">✓</span>
          <span>${escapeHtml(line)}</span>
        </li>`
    )
    .join('')}</ul>`;
}

export function numberedStepsHtml(items: string[], color = 'bg-emerald-600'): string {
  if (!items.length) return richTextHtml('');
  return `<ol class="space-y-2.5 list-none pl-0 m-0">${items
    .map(
      (step, i) =>
        `<li class="flex gap-3 text-sm leading-relaxed text-stone-700">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color} text-xs font-semibold text-white">${i + 1}</span>
          <span class="pt-1 min-w-0 flex-1">${escapeHtml(step)}</span>
        </li>`
    )
    .join('')}</ol>`;
}

export function numberedMaterialsHtml(items: string[]): string {
  if (!items.length) return richTextHtml('');
  return `<ul class="space-y-2">${items
    .map(
      (m, i) =>
        `<li class="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-200/80 text-[11px] font-bold text-amber-900">${i + 1}</span>
          ${escapeHtml(m)}
        </li>`
    )
    .join('')}</ul>`;
}

export function termGridHtml(
  items: { term?: string; name?: string; definition?: string; explanation?: string }[]
): string {
  if (!items.length) return richTextHtml('');
  return `<div class="grid gap-1.5">${items
    .map((t) => {
      const title = t.term || t.name || '';
      const body = t.definition || t.explanation || '';
      return `<div class="rounded-lg border border-amber-100 bg-amber-50/50 px-2.5 py-1.5">
        <p class="text-sm font-semibold text-amber-900">${escapeHtml(title)}</p>
        ${body ? `<p class="mt-0.5 text-sm text-slate-700">${escapeHtml(body)}</p>` : ''}
      </div>`;
    })
    .join('')}</div>`;
}

export function conceptGridHtml(items: { name: string; explanation?: string }[]): string {
  if (!items.length) return richTextHtml('');
  return `<div class="grid gap-1.5">${items
    .map(
      (c) =>
        `<div class="rounded-lg border border-violet-100 bg-violet-50/30 px-3 py-2">
          <p class="text-sm font-semibold text-violet-900">${escapeHtml(c.name)}</p>
          ${c.explanation ? `<p class="mt-1 text-sm leading-relaxed text-slate-700">${escapeHtml(c.explanation)}</p>` : ''}
        </div>`
    )
    .join('')}</div>`;
}

export function heroTitleCardHtml(opts: {
  eyebrow: string;
  title: string;
  theme: 'indigo' | 'orange' | 'violet' | 'blue' | 'amber';
  badge?: string;
  progressPct?: number;
}): string {
  const themes = {
    indigo: {
      border: 'border-indigo-200/90',
      shadow: 'shadow-indigo-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.1),transparent_55%)',
      icon: 'from-indigo-600 to-violet-600 shadow-indigo-300/40',
      eyebrow: 'text-indigo-600',
      badge: 'border-indigo-200 text-indigo-700',
      barBg: 'bg-indigo-100',
      barFill: 'from-indigo-500 to-violet-500',
    },
    orange: {
      border: 'border-orange-200',
      shadow: 'shadow-orange-100/60',
      gradient: 'radial-gradient(circle_at_100%_0%,rgba(251,146,60,0.12),transparent_50%)',
      icon: 'from-orange-500 to-amber-500 shadow-orange-300/40',
      eyebrow: 'text-orange-600',
      badge: 'border-orange-200 text-orange-700',
      barBg: 'bg-orange-100',
      barFill: 'from-orange-500 to-amber-500',
    },
    violet: {
      border: 'border-violet-200',
      shadow: 'shadow-violet-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.1),transparent_55%)',
      icon: 'from-violet-600 to-purple-600 shadow-violet-300/40',
      eyebrow: 'text-violet-600',
      badge: 'border-violet-200 text-violet-700',
      barBg: 'bg-violet-100',
      barFill: 'from-violet-500 to-purple-500',
    },
    blue: {
      border: 'border-blue-200',
      shadow: 'shadow-blue-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.1),transparent_55%)',
      icon: 'from-blue-600 to-sky-600 shadow-blue-300/40',
      eyebrow: 'text-blue-600',
      badge: 'border-blue-200 text-blue-700',
      barBg: 'bg-blue-100',
      barFill: 'from-blue-500 to-sky-500',
    },
    amber: {
      border: 'border-amber-200',
      shadow: 'shadow-amber-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(245,158,11,0.1),transparent_55%)',
      icon: 'from-amber-500 to-orange-500 shadow-amber-300/40',
      eyebrow: 'text-amber-600',
      badge: 'border-amber-200 text-amber-700',
      barBg: 'bg-amber-100',
      barFill: 'from-amber-500 to-orange-500',
    },
  };
  const t = themes[opts.theme];
  const progress =
    opts.progressPct != null
      ? `<div class="mt-4">
          <div class="flex items-center justify-between text-[11px] font-medium text-stone-500 mb-1">
            <span>Content completeness</span>
            <span>${opts.progressPct}%</span>
          </div>
          <div class="h-2 rounded-full ${t.barBg} overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r ${t.barFill}" style="width:${opts.progressPct}%"></div>
          </div>
        </div>`
      : '';

  return `
<div class="relative overflow-hidden rounded-2xl border ${t.border} bg-white shadow-lg ${t.shadow} mb-3">
  <div class="absolute inset-0" style="background:${t.gradient}"></div>
  <div class="relative flex flex-col gap-4 p-5">
    <div class="flex items-start gap-4">
      <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.icon} text-white shadow-lg text-2xl">⚗</div>
      <div class="min-w-0 flex-1">
        ${opts.badge ? `<span class="inline-flex items-center rounded-md border ${t.badge} text-[10px] font-semibold px-2 py-0.5 mb-2">${escapeHtml(opts.badge)}</span>` : ''}
        <p class="text-[10px] font-bold uppercase tracking-wider ${t.eyebrow} mb-1">${escapeHtml(opts.eyebrow)}</p>
        <h4 class="text-xl font-bold text-stone-900 leading-snug tracking-tight">${escapeHtml(opts.title)}</h4>
        ${progress}
      </div>
    </div>
  </div>
</div>`;
}
