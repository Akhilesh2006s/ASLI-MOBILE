import { renderMarkdown } from './render-teacher-markdown';
import { stripMarkdownSyntax } from './strip-markdown-syntax';
import { stripAiToolGenerationLabel } from './strip-ai-tool-generation-label';
import { getAiToolHeroEmoji } from './ai-tool-icons';
import { premiumToolHeroIconHtml } from './student-section-icons';
import { formatAiToolText } from './title-case';

type LightHeaderTheme = 'blue' | 'amber' | 'indigo' | 'emerald' | 'violet' | 'slate';

const LIGHT_HEADER_THEMES: Record<
  LightHeaderTheme,
  { border: string; bg: string; eyebrow: string }
> = {
  blue: {
    border: 'border-blue-200',
    bg: 'bg-gradient-to-br from-blue-50 via-white to-sky-50',
    eyebrow: 'text-blue-600',
  },
  amber: {
    border: 'border-amber-200',
    bg: 'bg-gradient-to-br from-amber-50 via-white to-orange-50',
    eyebrow: 'text-amber-700',
  },
  indigo: {
    border: 'border-indigo-200',
    bg: 'bg-gradient-to-br from-indigo-50 via-white to-slate-50',
    eyebrow: 'text-indigo-600',
  },
  slate: {
    border: 'border-slate-200',
    bg: 'bg-gradient-to-br from-slate-50 via-white to-indigo-50',
    eyebrow: 'text-indigo-600',
  },
  emerald: {
    border: 'border-emerald-200',
    bg: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
    eyebrow: 'text-emerald-700',
  },
  violet: {
    border: 'border-violet-200',
    bg: 'bg-gradient-to-br from-violet-50 via-white to-indigo-50',
    eyebrow: 'text-violet-600',
  },
};

/** Soft document header for AI tool output — light background, readable dark text. */
export function lightDocHeaderHtml(opts: {
  eyebrow: string;
  titleHtml: string;
  theme: LightHeaderTheme;
  titleTag?: 'h1' | 'h3';
  extraClass?: string;
}): string {
  const t = LIGHT_HEADER_THEMES[opts.theme] ?? LIGHT_HEADER_THEMES.indigo;
  const tag = opts.titleTag ?? 'h3';
  const titleSize = tag === 'h1' ? 'text-xl' : 'text-lg';
  const extra = opts.extraClass ? ` ${opts.extraClass}` : '';
  return (
    `<header class="rounded-2xl border ${t.border} ${t.bg} px-4 py-4 mb-4 shadow-sm${extra}">` +
    `<p class="text-[10px] font-semibold uppercase tracking-widest ${t.eyebrow} mb-1">${escapeHtml(formatAiToolText(opts.eyebrow))}</p>` +
    `<${tag} class="${titleSize} font-bold text-slate-800 mt-1">${opts.titleHtml}</${tag}>` +
    `</header>`
  );
}
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
  const raw = stripMarkdownSyntax(String(text || '').trim());
  if (!raw) {
    return '<p class="text-xs italic text-slate-400 rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-1">Not included.</p>';
  }
  const hasTable = raw.includes('|') && /^\s*\|/m.test(raw);
  if (hasTable) {
    return `<div class="prose prose-sm max-w-none text-slate-800">${renderMarkdown(raw)}</div>`;
  }
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every((l) => l.startsWith('• '))) {
    return `<ul class="list-none space-y-2 pl-0">${lines
      .map(
        (line) =>
          `<li class="flex gap-2 text-sm text-slate-800"><span class="mt-0.5 shrink-0 text-orange-600">•</span><span class="whitespace-pre-wrap leading-relaxed">${escapeHtml(line.replace(/^•\s+/, ''))}</span></li>`,
      )
      .join('')}</ul>`;
  }
  return `<p class="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">${escapeHtml(raw)}</p>`;
}

export { sectionNumberIconSvg, sectionIconSvg, premiumToolHeroIconHtml } from './student-section-icons';

function themeFromStripe(stripe: string) {
  const match = stripe.match(/border-([a-z]+)-(\d+)/);
  if (!match) {
    return {
      border: 'border-slate-200/80',
      bg: 'bg-slate-50/80',
      label: 'text-slate-500',
      title: 'text-slate-900',
    };
  }
  const color = match[1];
  return {
    border: `border-${color}-200/80`,
    bg: `bg-${color}-50/80`,
    label: `text-${color}-600`,
    title: `text-${color}-900`,
  };
}

export function sectionCardHtml(opts: {
  sectionNum: string;
  title: string;
  stripe: string;
  iconWrap: string;
  iconSvg: string;
  borderColor?: string;
  bg?: string;
  labelClass?: string;
  titleClass?: string;
  body: string;
}): string {
  const derived = themeFromStripe(opts.stripe);
  const border = opts.borderColor || derived.border;
  const bg = opts.bg || derived.bg;
  const labelClass = opts.labelClass || derived.label;
  const titleClass = opts.titleClass || derived.title;
  return `
<section class="mb-3 overflow-hidden rounded-xl border ${border} ${bg} shadow-sm ai-tool-section-card">
  <header class="flex items-center gap-2.5 border-b border-slate-100/80 bg-white/60 px-3 py-2.5 border-l-[5px] ${opts.stripe}">
    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${opts.iconWrap}">
      ${opts.iconSvg}
    </div>
    <div class="min-w-0">
      <p class="text-[10px] font-bold uppercase tracking-wider ${labelClass}">${escapeHtml(formatAiToolText(opts.sectionNum))}</p>
      <h4 class="text-sm font-bold ${titleClass} leading-tight">${escapeHtml(formatAiToolText(opts.title))}</h4>
    </div>
  </header>
  <div class="px-3 py-2 text-sm leading-relaxed text-slate-700">${opts.body}</div>
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
          <span class="shrink-0 text-violet-500 mt-0.5">✓</span>
          <span>${escapeHtml(line)}</span>
        </li>`
    )
    .join('')}</ul>`;
}

export function numberedStepsHtml(items: string[], color = 'bg-emerald-100 text-emerald-800'): string {
  if (!items.length) return richTextHtml('');
  return `<ol class="space-y-2.5 list-none pl-0 m-0">${items
    .map(
      (step, i) =>
        `<li class="flex gap-3 text-sm leading-relaxed text-stone-700">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color} text-xs font-semibold">${i + 1}</span>
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
  theme: 'indigo' | 'orange' | 'violet' | 'blue' | 'amber' | 'emerald';
  badge?: string;
  progressPct?: number;
  toolType?: string;
  iconEmoji?: string;
  premium?: boolean;
}): string {
  const themes = {
    indigo: {
      border: 'border-indigo-200/90',
      shadow: 'shadow-indigo-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.06),transparent_55%)',
      icon: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
      eyebrow: 'text-indigo-600',
      badge: 'border-indigo-200 text-indigo-700',
      barBg: 'bg-indigo-100',
      barFill: 'from-indigo-200 to-violet-200',
    },
    orange: {
      border: 'border-orange-200',
      shadow: 'shadow-orange-100/60',
      gradient: 'radial-gradient(circle_at_100%_0%,rgba(251,146,60,0.08),transparent_50%)',
      icon: 'bg-orange-100 text-orange-700 border border-orange-200',
      eyebrow: 'text-orange-600',
      badge: 'border-orange-200 text-orange-700',
      barBg: 'bg-orange-100',
      barFill: 'from-orange-200 to-amber-200',
    },
    violet: {
      border: 'border-violet-200',
      shadow: 'shadow-violet-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.06),transparent_55%)',
      icon: 'bg-violet-100 text-violet-700 border border-violet-200',
      eyebrow: 'text-violet-600',
      badge: 'border-violet-200 text-violet-700',
      barBg: 'bg-violet-100',
      barFill: 'from-violet-200 to-purple-200',
    },
    blue: {
      border: 'border-blue-200',
      shadow: 'shadow-blue-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(59,130,246,0.06),transparent_55%)',
      icon: 'bg-blue-100 text-blue-700 border border-blue-200',
      eyebrow: 'text-blue-600',
      badge: 'border-blue-200 text-blue-700',
      barBg: 'bg-blue-100',
      barFill: 'from-blue-200 to-sky-200',
    },
    amber: {
      border: 'border-amber-200',
      shadow: 'shadow-amber-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(245,158,11,0.06),transparent_55%)',
      icon: 'bg-amber-100 text-amber-700 border border-amber-200',
      eyebrow: 'text-amber-600',
      badge: 'border-amber-200 text-amber-700',
      barBg: 'bg-amber-100',
      barFill: 'from-amber-200 to-orange-200',
    },
    emerald: {
      border: 'border-emerald-200',
      shadow: 'shadow-emerald-100/50',
      gradient: 'radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.08),transparent_55%)',
      icon: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      eyebrow: 'text-emerald-600',
      badge: 'border-emerald-200 text-emerald-700',
      barBg: 'bg-emerald-100',
      barFill: 'from-emerald-200 to-teal-200',
    },
  };
  const t =
    themes[opts.theme as keyof typeof themes] ?? themes.indigo ?? themes.orange;
  const displayTitle = formatAiToolText(stripAiToolGenerationLabel(opts.title, opts.eyebrow));
  const iconChar =
    opts.iconEmoji ?? (opts.toolType ? getAiToolHeroEmoji(opts.toolType) : '✨');
  const iconHtml = opts.premium && opts.toolType
    ? premiumToolHeroIconHtml(opts.toolType, t.icon)
    : `<div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${t.icon} text-2xl">${iconChar}</div>`;
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
<div class="relative overflow-hidden rounded-2xl border ${t.border} bg-white shadow-lg ${t.shadow} mb-3 ai-tool-hero-card">
  <div class="absolute inset-0" style="background:${t.gradient}"></div>
  <div class="relative flex flex-col gap-4 p-5">
    <div class="flex items-start gap-4">
      ${iconHtml}
      <div class="min-w-0 flex-1">
        ${opts.badge ? `<span class="inline-flex items-center rounded-md border ${t.badge} text-[10px] font-semibold px-2 py-0.5 mb-2">${escapeHtml(formatAiToolText(opts.badge))}</span>` : ''}
        <p class="text-[10px] font-bold uppercase tracking-wider ${t.eyebrow} mb-1">${escapeHtml(formatAiToolText(opts.eyebrow))}</p>
        <h4 class="text-xl font-bold text-stone-900 leading-snug tracking-tight">${escapeHtml(displayTitle)}</h4>
        ${progress}
      </div>
    </div>
  </div>
</div>`;
}
