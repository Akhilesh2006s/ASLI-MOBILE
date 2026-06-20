import { renderMarkdown } from './render-teacher-markdown';
import {
  contentHasNumberedTemplateSections,
  countNumberedTemplateSections,
  resolveRichDisplayContent,
  coalesceAiToolRawContent,
} from './ai-tool-display-content';
import { stripStructuredAiToolMetadata } from './strip-ai-tool-metadata';
import { escapeHtml } from './ai-tool-html-primitives';
import { AI_TOOL_OUTPUT_STYLES } from './ai-tool-output-styles';
import { renderNumberedTemplateAsCards } from './render-numbered-template-cards';
import { tryRenderStructuredAiToolHtml, renderSmartPracticeQaOutputHtml } from './render-structured-ai-tool-html';
import { wrapAiToolOutputSectionGrid } from './themed-markdown-sections';

export {
  contentHasNumberedTemplateSections,
  extractDisplayContent,
  resolveRichDisplayContent,
} from './ai-tool-display-content';
import { renderSmartStudyGuideMarkdown } from './render-smart-study-guide-markdown';
import { renderConceptBreakdownMarkdown } from './render-concept-breakdown-markdown';
import { renderPracticeQaMarkdown } from './render-practice-qa-markdown';
import { renderChapterSummaryMarkdown } from './render-chapter-summary-markdown';
import { renderKeyPointsMarkdown } from './render-key-points-markdown';
import { renderQuickAssignmentMarkdown } from './render-quick-assignment-markdown';
import { renderMockTestMarkdown } from './render-mock-test-markdown';
import { resolvePracticeQaFromPayload } from './parse-practice-qa';
import { resolveConceptBreakdownFromPayload } from './parse-concept-breakdown';
import { resolveChapterSummaryFromPayload } from './parse-chapter-summary';
import { resolveKeyPointsFromPayload } from './parse-key-points';
import { resolveQuickAssignmentFromPayload } from './parse-quick-assignment';
import { resolveMockTestFromPayload } from './parse-mock-test';

type ToolShell = {
  label: string;
  wrapperClass: string;
  wrapperStyle?: string;
  badges?: string[];
};

const TOOL_SHELLS: Record<string, ToolShell> = {
  'short-notes-summaries-maker': {
    label: 'Short Notes & Summaries',
    wrapperClass: 'rounded-2xl border border-cyan-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#ecfeff40,#fff,#f0f9ff66)',
    badges: ['Revision-ready format', 'Teacher focus view'],
  },
  'concept-mastery-helper': {
    label: 'Concept Mastery Helper',
    wrapperClass: 'rounded-2xl border border-fuchsia-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#fdf4ff66,#fff,#faf5ff)',
  },
  'lesson-planner': {
    label: 'Lesson Planner',
    wrapperClass: 'rounded-2xl border border-amber-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#fffbeb,#fff,#fef3c766)',
  },
  'daily-class-plan-maker': {
    label: 'Daily Class Plan',
    wrapperClass: 'rounded-2xl border border-indigo-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#eef2ff,#fff,#f5f3ff)',
  },
  'activity-project-generator': {
    label: 'Activity & Project Generator',
    wrapperClass: 'rounded-2xl border border-indigo-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#eef2ff,#fff,#f5f3ff)',
  },
  'worksheet-mcq-generator': {
    label: 'Worksheet & MCQ Generator',
    wrapperClass: 'rounded-2xl border border-emerald-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#ecfdf5,#fff,#f0fdf4)',
  },
  'project-idea-lab': {
    label: 'Project Idea Lab',
    wrapperClass: 'rounded-2xl border border-yellow-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#fefce8,#fff,#fffbeb)',
  },
  'homework-creator': {
    label: 'Homework Creator',
    wrapperClass: 'rounded-2xl border border-orange-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#fff7ed,#fff,#ffedd5)',
  },
  'exam-question-paper-generator': {
    label: 'Exam Question Paper',
    wrapperClass: 'rounded-2xl border border-slate-300/90 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#f8fafc,#fff,#f1f5f9)',
  },
  'story-passage-creator': {
    label: 'Story & Passage Creator',
    wrapperClass: 'rounded-2xl border border-blue-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#eff6ff,#fff,#f0f9ff)',
  },
  'reading-practice-room': {
    label: 'Reading Practice Room',
    wrapperClass: 'rounded-2xl border border-blue-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#eff6ff,#fff,#f0f9ff)',
  },
  'flashcard-generator': {
    label: 'My Study Decks',
    wrapperClass: 'rounded-2xl border border-pink-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#fdf2f8,#fff,#fce7f3)',
  },
  'my-study-decks': {
    label: 'My Study Decks',
    wrapperClass: 'rounded-2xl border border-pink-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#fdf2f8,#fff,#fce7f3)',
  },
  'study-schedule-maker': {
    label: 'Study Schedule Maker',
    wrapperClass: 'rounded-2xl border border-violet-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#f5f3ff,#fff,#ede9fe)',
  },
};

/** Teacher Vidya tools — prefer structured or tinted section cards over plain markdown. */
const TEACHER_STRUCTURED_TOOLS = new Set([
  'activity-project-generator',
  'worksheet-mcq-generator',
  'concept-mastery-helper',
  'lesson-planner',
  'exam-question-paper-generator',
  'daily-class-plan-maker',
  'homework-creator',
  'story-passage-creator',
  'short-notes-summaries-maker',
  'flashcard-generator',
]);

const TOOL_RENDERERS: Record<string, (text: string) => string> = {
  'smart-study-guide-generator': renderSmartStudyGuideMarkdown,
  'concept-breakdown-explainer': renderConceptBreakdownMarkdown,
  'smart-qa-practice-generator': renderPracticeQaMarkdown,
  'chapter-summary-creator': renderChapterSummaryMarkdown,
  'key-points-formula-extractor': renderKeyPointsMarkdown,
  'quick-assignment-builder': renderQuickAssignmentMarkdown,
  'mock-test-builder': renderMockTestMarkdown,
  'exam-question-paper-generator': renderMockTestMarkdown,
};

function wrapWithShell(toolType: string, innerHtml: string): string {
  const shell = TOOL_SHELLS[toolType];
  if (!shell) {
    return `<div class="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/30 p-3 shadow-inner">${innerHtml}</div>`;
  }

  const badges = (shell.badges || [])
    .map(
      (b) =>
        `<span class="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-800 mr-2 mb-2">${b}</span>`
    )
    .join('');

  return `<div class="${shell.wrapperClass}" style="${shell.wrapperStyle || ''}">${badges}${innerHtml}</div>`;
}

function renderAiToolFallbackBody(content: string, rawContent?: unknown): string {
  const stripped = stripStructuredAiToolMetadata(String(content || '')).trim();
  if (stripped && !stripped.startsWith('{')) {
    return renderMarkdown(stripped);
  }

  const display = resolveRichDisplayContent(content, rawContent);
  if (display.trim()) {
    return renderMarkdown(display);
  }

  if (stripped.startsWith('{')) {
    try {
      const parsed = JSON.parse(stripped) as { formatted?: string; markdown?: string };
      const formatted = String(parsed.formatted || parsed.markdown || '').trim();
      if (formatted) return renderMarkdown(formatted);
    } catch {
      /* fall through */
    }
  }

  if (rawContent != null) {
    const rawText =
      typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent, null, 2);
    if (rawText.trim()) {
      return `<pre class="ai-tool-fallback-pre">${escapeHtml(rawText.slice(0, 80000))}</pre>`;
    }
  }

  if (stripped) {
    return `<pre class="ai-tool-fallback-pre">${escapeHtml(stripped.slice(0, 80000))}</pre>`;
  }

  return '<p class="ai-tool-empty-message">Generated content could not be displayed. Please try generating again.</p>';
}

function bodyHasVisibleOutput(html: string): boolean {
  const text = String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0;
}

/** Themed markdown renderers fall back to plain prose when section headings are not detected. */
function themedHtmlHasSectionCards(html: string): boolean {
  const s = String(html || '').trim();
  if (!s) return false;
  if (/^<div class="prose prose-sm max-w-none/i.test(s)) return false;
  return (
    s.includes('-markdown') ||
    (s.includes('rounded-xl') && /Section\s+\d+/i.test(s)) ||
    s.includes('hero-title-card')
  );
}

function resolveStudentNumberedOutput(
  toolType: string,
  display: string,
  themedMarkdown?: (text: string) => string
): string {
  const cards = renderNumberedTemplateAsCards(toolType, display);
  if (themedMarkdown) {
    const themed = themedMarkdown(display);
    if (themedHtmlHasSectionCards(themed)) return themed;
    if (bodyHasVisibleOutput(cards)) return cards;
    return themed;
  }
  if (bodyHasVisibleOutput(cards)) return cards;
  return renderMarkdown(display);
}

export function getToolOutputPanelBorder(toolType: string): string | undefined {
  const borders: Record<string, string> = {
    'smart-study-guide-generator': '#c7d2fe',
    'concept-breakdown-explainer': '#ddd6fe',
    'short-notes-summaries-maker': '#a5f3fc',
    'concept-mastery-helper': '#f0abfc',
    'lesson-planner': '#fcd34d',
    'daily-class-plan-maker': '#c7d2fe',
    'activity-project-generator': '#c7d2fe',
    'project-idea-lab': '#fde047',
    'worksheet-mcq-generator': '#6ee7b7',
    'homework-creator': '#fdba74',
    'exam-question-paper-generator': '#cbd5e1',
    'mock-test-builder': '#c7d2fe',
    'story-passage-creator': '#93c5fd',
    'reading-practice-room': '#93c5fd',
    'flashcard-generator': '#f9a8d4',
    'my-study-decks': '#f9a8d4',
    'study-schedule-maker': '#c4b5fd',
    'chapter-summary-creator': '#93c5fd',
    'key-points-formula-extractor': '#5eead4',
    'quick-assignment-builder': '#fdba74',
    'smart-qa-practice-generator': '#fdba74',
  };
  return borders[toolType];
}

function shouldUseStructuredStudentOutput(
  toolType: string,
  display: string,
  rawContent?: unknown,
): boolean {
  switch (toolType) {
    case 'smart-qa-practice-generator': {
      const { practice, markdownFallback } = resolvePracticeQaFromPayload(display, rawContent);
      return Boolean(practice && !markdownFallback);
    }
    case 'concept-breakdown-explainer': {
      const { concepts, markdownFallback } = resolveConceptBreakdownFromPayload(display, rawContent);
      return concepts.length > 0 && !markdownFallback;
    }
    case 'chapter-summary-creator': {
      const { summary, markdownFallback } = resolveChapterSummaryFromPayload(display, rawContent);
      return Boolean(summary && !markdownFallback);
    }
    case 'key-points-formula-extractor': {
      const { keyPoints, markdownFallback } = resolveKeyPointsFromPayload(display, rawContent);
      return Boolean(keyPoints && !markdownFallback);
    }
    case 'quick-assignment-builder': {
      const { assignment, markdownFallback } = resolveQuickAssignmentFromPayload(display, rawContent);
      return Boolean(assignment && !markdownFallback);
    }
    case 'mock-test-builder': {
      const resolved = resolveMockTestFromPayload(display, rawContent);
      return Boolean(resolved.paper && !resolved.markdownFallback);
    }
    default:
      return false;
  }
}

function wrapAiToolHtmlDocument(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>${AI_TOOL_OUTPUT_STYLES}</style>
</head>
<body>${body}</body>
</html>`;
}

function renderAiToolOutputHtmlInner(
  toolType: string,
  content: string,
  rawContent: unknown,
  variant: 'student' | 'teacher',
): string {
  const mergedRaw = coalesceAiToolRawContent(content, rawContent);

  const display = resolveRichDisplayContent(content, mergedRaw);

  // Match web PracticeQaViewer: always merge content + rawData for Practice Q&A (sections A–G live in rawData).
  if (variant === 'student' && toolType === 'smart-qa-practice-generator') {
    const practiceHtml = renderSmartPracticeQaOutputHtml(content, mergedRaw);
    if (practiceHtml?.trim()) {
      const inner = wrapAiToolOutputSectionGrid(practiceHtml);
      const body = TOOL_SHELLS[toolType] ? wrapWithShell(toolType, inner) : inner;
      return wrapAiToolHtmlDocument(body);
    }
  }

  const structured = tryRenderStructuredAiToolHtml(toolType, content, mergedRaw, variant);
  const themedMarkdown = TOOL_RENDERERS[toolType];
  const numberedTemplate = contentHasNumberedTemplateSections(display);

  const structuredFullTools = new Set([
    'worksheet-mcq-generator',
    'concept-mastery-helper',
    'homework-creator',
    'story-passage-creator',
    'reading-practice-room',
    'activity-project-generator',
    'project-idea-lab',
    'lesson-planner',
    'daily-class-plan-maker',
    'exam-question-paper-generator',
    'flashcard-generator',
    'short-notes-summaries-maker',
  ]);

  const teacherHasSections = countNumberedTemplateSections(display) >= 1;
  const studentHasSections = countNumberedTemplateSections(display) >= 1;

  let inner: string;
  if (variant === 'teacher') {
    if (structured && TEACHER_STRUCTURED_TOOLS.has(toolType)) {
      inner = structured;
    } else if (numberedTemplate || teacherHasSections) {
      inner = renderNumberedTemplateAsCards(toolType, display);
    } else if (themedMarkdown) {
      inner = themedMarkdown(display);
    } else if (structured) {
      inner = structured;
    } else {
      inner = renderMarkdown(display);
    }
  } else if (structured && structuredFullTools.has(toolType)) {
    inner = structured;
  } else if (structured && shouldUseStructuredStudentOutput(toolType, display, mergedRaw)) {
    // Hybrid tools (e.g. Practice Q&A sections A–G) store questions in rawContent, not numbered markdown.
    inner = structured;
  } else if (themedMarkdown) {
    // Prefer full themed markdown (all numbered sections) over partial structured HTML parsers.
    inner = resolveStudentNumberedOutput(toolType, display, themedMarkdown);
    if (!bodyHasVisibleOutput(inner) && structured) {
      inner = structured;
    }
  } else if (numberedTemplate || studentHasSections) {
    inner = resolveStudentNumberedOutput(toolType, display, themedMarkdown);
  } else if (structured) {
    inner = structured;
  } else {
    inner = renderMarkdown(display);
  }

  if (!bodyHasVisibleOutput(inner)) {
    inner = renderAiToolFallbackBody(content, mergedRaw);
  }

  inner = wrapAiToolOutputSectionGrid(inner);

  const body = TOOL_SHELLS[toolType] ? wrapWithShell(toolType, inner) : inner;

  return wrapAiToolHtmlDocument(body);
}

export function renderAiToolOutputHtml(
  toolType: string,
  content: string,
  rawContent?: unknown,
  variant: 'student' | 'teacher' = 'student',
): string {
  try {
    return renderAiToolOutputHtmlInner(toolType, content, rawContent, variant);
  } catch {
    const mergedRaw = coalesceAiToolRawContent(content, rawContent);
    const display = resolveRichDisplayContent(content, mergedRaw);
    const fallbackInner = renderAiToolFallbackBody(content, mergedRaw) || renderMarkdown(display);
    const body = TOOL_SHELLS[toolType]
      ? wrapWithShell(toolType, fallbackInner)
      : fallbackInner;
    return wrapAiToolHtmlDocument(body);
  }
}
