import { renderMarkdown } from './render-teacher-markdown';
import { tryRenderStructuredAiToolHtml } from './render-structured-ai-tool-html';
import { renderSmartStudyGuideMarkdown } from './render-smart-study-guide-markdown';
import { renderConceptBreakdownMarkdown } from './render-concept-breakdown-markdown';
import { renderPracticeQaMarkdown } from './render-practice-qa-markdown';
import { renderChapterSummaryMarkdown } from './render-chapter-summary-markdown';
import { renderKeyPointsMarkdown } from './render-key-points-markdown';
import { renderQuickAssignmentMarkdown } from './render-quick-assignment-markdown';
import { renderMockTestMarkdown } from './render-mock-test-markdown';

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
  'project-idea-lab': {
    label: 'Project Idea Lab',
    wrapperClass: 'rounded-2xl border border-yellow-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#fefce8,#fff,#fffbeb)',
  },
  'worksheet-mcq-generator': {
    label: 'Worksheet & MCQ Generator',
    wrapperClass: 'rounded-2xl border border-emerald-200/80 p-3',
    wrapperStyle: 'background:linear-gradient(to bottom,#ecfdf5,#fff,#f0fdf4)',
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

function extractDisplayContent(content: string): string {
  const raw = String(content || '').trim();
  if (!raw.startsWith('{')) return raw;
  try {
    const parsed = JSON.parse(raw) as { formatted?: string; markdown?: string };
    return parsed.formatted || parsed.markdown || raw;
  } catch {
    return raw;
  }
}

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
    'mock-test-builder': '#fca5a5',
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

export function renderAiToolOutputHtml(
  toolType: string,
  content: string,
  rawContent?: unknown,
  variant: 'student' | 'teacher' = 'student'
): string {
  const display = extractDisplayContent(content);
  const structured = tryRenderStructuredAiToolHtml(toolType, display, rawContent, variant);
  const inner = structured || (TOOL_RENDERERS[toolType] || renderMarkdown)(display);
  const body = structured ? inner : wrapWithShell(toolType, inner);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body { margin: 0; padding: 0; background: transparent; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; }
    pre { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>${body}</body>
</html>`;
}
