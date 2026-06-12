import {
  emptySectionPlaceholderHtml,
  heroTitleCardHtml,
  sectionCardHtml,
  sectionNumberIconSvg,
} from './ai-tool-html-primitives';
import { parseNumberedTemplateSections } from './ai-tool-display-content';
import { sectionTitlesMatch } from './themed-markdown-sections';
import { renderMarkdown } from './render-teacher-markdown';

type ThemeName = 'indigo' | 'orange' | 'violet' | 'blue' | 'amber';

const TOOL_META: Record<string, { eyebrow: string; theme: ThemeName }> = {
  'lesson-planner': { eyebrow: 'Lesson Planner', theme: 'amber' },
  'study-schedule-maker': { eyebrow: 'Study Schedule', theme: 'violet' },
  'daily-class-plan-maker': { eyebrow: 'Daily Class Plan', theme: 'indigo' },
  'homework-creator': { eyebrow: 'Homework Creator', theme: 'orange' },
  'story-passage-creator': { eyebrow: 'Story & Passage', theme: 'blue' },
  'reading-practice-room': { eyebrow: 'Reading Practice', theme: 'blue' },
  'short-notes-summaries-maker': { eyebrow: 'Short Notes', theme: 'blue' },
  'flashcard-generator': { eyebrow: 'Study Decks', theme: 'violet' },
  'my-study-decks': { eyebrow: 'Study Decks', theme: 'violet' },
  'exam-question-paper-generator': { eyebrow: 'Exam Paper', theme: 'blue' },
  'mock-test-builder': { eyebrow: 'Mock Test', theme: 'violet' },
  'activity-project-generator': { eyebrow: 'Activities & Projects', theme: 'indigo' },
  'project-idea-lab': { eyebrow: 'Project Idea Lab', theme: 'amber' },
};

/** Homework Creator: section 1 is the doc title; sections 2–10 are always shown on web. */
const HOMEWORK_CANONICAL_SECTIONS: Array<{ num: number; title: string }> = [
  { num: 2, title: 'Clear Student Instructions' },
  { num: 3, title: 'Practice Questions' },
  { num: 4, title: 'Application-based Tasks' },
  { num: 5, title: 'One Creative / Thinking Question' },
  { num: 6, title: 'One Real-life Observation Task' },
  { num: 7, title: 'Challenge Question' },
  { num: 8, title: 'Support Hint for Struggling Learners' },
  { num: 9, title: 'Answer Hints / Key Points' },
  { num: 10, title: 'Parent Note' },
];

function fillCanonicalSections(
  toolType: string,
  sections: Array<{ num: number; title: string; body: string }>,
): Array<{ num: number; title: string; body: string }> {
  if (toolType !== 'homework-creator') return sections;
  const byNum = new Map(sections.map((s) => [s.num, s]));
  return HOMEWORK_CANONICAL_SECTIONS.map(({ num, title }) => {
    const found = byNum.get(num);
    return {
      num,
      title: found?.title.replace(/^\d+\.\s*/, '') || title,
      body: found?.body || '',
    };
  });
}

const STRIPE_CYCLE = [
  { stripe: 'border-indigo-500', iconWrap: 'bg-indigo-100 text-indigo-800', border: 'border-indigo-200/80' },
  { stripe: 'border-violet-500', iconWrap: 'bg-violet-100 text-violet-800', border: 'border-violet-200/80' },
  { stripe: 'border-emerald-500', iconWrap: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200/80' },
  { stripe: 'border-sky-500', iconWrap: 'bg-sky-100 text-sky-800', border: 'border-sky-200/80' },
  { stripe: 'border-amber-500', iconWrap: 'bg-amber-100 text-amber-900', border: 'border-amber-200/80' },
  { stripe: 'border-teal-500', iconWrap: 'bg-teal-100 text-teal-800', border: 'border-teal-200/80' },
];

function sectionBodyHtml(body: string): string {
  if (!body.trim()) return emptySectionPlaceholderHtml();
  return `<div class="prose prose-sm max-w-none text-slate-800">${renderMarkdown(body)}</div>`;
}

/** Card-based layout for Super Admin numbered templates (teacher tools + fallbacks). */
export function renderNumberedTemplateAsCards(toolType: string, text: string): string {
  if (!text?.trim()) return '';

  const meta = TOOL_META[toolType] || { eyebrow: 'Generated Content', theme: 'indigo' as ThemeName };
  const { title, sections } = parseNumberedTemplateSections(text);

  const heroTitle =
    title || sections.find((s) => s.num === 1)?.title.replace(/^\d+\.\s*/, '') || meta.eyebrow;

  let html = heroTitleCardHtml({
    eyebrow: meta.eyebrow,
    title: heroTitle,
    theme: meta.theme,
  });

  const sorted = fillCanonicalSections(
    toolType,
    [...sections].filter((s) => s.num > 0).sort((a, b) => a.num - b.num),
  );
  const visibleSections = sorted.filter((sec) => {
    if (sec.num !== 1) return true;
    // Hero card already represents Section 1 (title). Skip empty duplicate Section 1 cards.
    if (!sec.body.trim()) return false;
    if (title && sectionTitlesMatch(title, sec.title)) return false;
    if (sectionTitlesMatch(heroTitle, sec.title)) return false;
    return true;
  });

  (visibleSections.length ? visibleSections : sorted).forEach((sec, index) => {
    const style = STRIPE_CYCLE[index % STRIPE_CYCLE.length];
    html += sectionCardHtml({
      sectionNum: `Section ${sec.num}`,
      title: sec.title.replace(/^\d+\.\s*/, ''),
      stripe: style.stripe,
      iconWrap: style.iconWrap,
      iconSvg: sectionNumberIconSvg(sec.num),
      borderColor: style.border,
      body: sectionBodyHtml(sec.body),
    });
  });

  return html;
}
