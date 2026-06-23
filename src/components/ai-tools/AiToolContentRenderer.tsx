import { useMemo } from 'react';
import ActivityProjectViewer from './ActivityProjectViewer';
import FlashcardViewer from './FlashcardViewer';
import SmartStudyGuideViewer from './SmartStudyGuideViewer';
import AiToolWebView from './AiToolWebView';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import { activitiesPayloadIsComplete } from '../../lib/parse-activity-markdown';
import {
  contentHasNumberedTemplateSections,
  resolveRichDisplayContent,
  coalesceAiToolRawContent,
} from '../../lib/ai-tool-display-content';
import {
  flashcardsHaveVisibleBody,
  resolveFlashcardsFromPayload,
} from '../../lib/parse-flashcards';
import { resolveAiToolDisplayType } from '../../lib/ai-tool-generate';

type Props = {
  toolType: string;
  content: string;
  rawContent?: unknown;
  accent?: string;
  variant?: 'student' | 'teacher';
};

function activitiesFromRaw(rawContent: unknown) {
  if (!rawContent || typeof rawContent !== 'object') return undefined;
  const rc = rawContent as Record<string, unknown>;
  if (Array.isArray(rc.activities)) return rc.activities;
  return undefined;
}

export function getAiToolResultTitle(toolType: string, variant: 'student' | 'teacher' = 'student'): string {
  const displayType = resolveAiToolDisplayType(toolType, variant);
  const titles: Record<string, string> = {
    'smart-study-guide-generator': 'Your smart study guide',
    'concept-breakdown-explainer': 'Your concept breakdown',
    'smart-qa-practice-generator': 'Your practice Q&A',
    'chapter-summary-creator': 'Your chapter summary',
    'key-points-formula-extractor': 'Your key points sheet',
    'quick-assignment-builder': 'Your assignment',
    'my-study-decks': 'Your study deck',
    'mock-test-builder': 'Your mock test',
    'project-idea-lab': 'Your project idea lab',
    'reading-practice-room': 'Your reading studio',
    'study-schedule-maker': 'Your study schedule',
    'activity-project-generator': 'Your activities & projects',
    'worksheet-mcq-generator': 'Your worksheet',
    'concept-mastery-helper': 'Your concept mastery guide',
    'lesson-planner': 'Your lesson plan',
    'exam-question-paper-generator': 'Your exam paper',
    'daily-class-plan-maker': 'Your daily class plan',
    'homework-creator': 'Your homework',
    'story-passage-creator': 'Your story & passage',
    'short-notes-summaries-maker': 'Your short notes',
    'flashcard-generator': 'Your flashcard deck',
  };
  return titles[displayType] || 'Generated content';
}

export default function AiToolContentRenderer({
  toolType,
  content,
  rawContent,
  variant = 'student',
}: Props) {
  const displayToolType = useMemo(
    () => resolveAiToolDisplayType(toolType, variant),
    [toolType, variant],
  );

  const cleaned = useMemo(() => stripStructuredAiToolMetadata(content), [content]);
  const mergedRaw = useMemo(
    () => coalesceAiToolRawContent(cleaned, rawContent),
    [cleaned, rawContent]
  );
  const displayMarkdown = useMemo(
    () => resolveRichDisplayContent(cleaned, mergedRaw),
    [cleaned, mergedRaw]
  );
  const hasFullTemplateMarkdown = useMemo(
    () => contentHasNumberedTemplateSections(displayMarkdown),
    [displayMarkdown]
  );
  const hasApiMarkdownSections = useMemo(
    () => displayMarkdown.trim().length > 0 && /^\s*(?:#{1,4}\s*)?\d{1,2}\.\s+\S/m.test(displayMarkdown),
    [displayMarkdown],
  );

  const isStudentStudyDecks = variant === 'student' && displayToolType === 'my-study-decks';
  const isTeacherFlashcards = variant === 'teacher' && displayToolType === 'flashcard-generator';

  const useNativeActivity = useMemo(() => {
    if (displayToolType !== 'activity-project-generator' && displayToolType !== 'project-idea-lab') {
      return false;
    }
    if (hasFullTemplateMarkdown || hasApiMarkdownSections) return false;
    if (displayToolType === 'activity-project-generator' && variant === 'teacher') return false;
    const mode = displayToolType === 'project-idea-lab' ? 'student' : variant;
    return activitiesPayloadIsComplete(activitiesFromRaw(mergedRaw), cleaned, mode);
  }, [displayToolType, cleaned, mergedRaw, hasFullTemplateMarkdown, hasApiMarkdownSections, variant]);

  const useNativeFlashcard = useMemo(() => {
    if (!isStudentStudyDecks && !isTeacherFlashcards) return false;
    // Full Super Admin markdown → WebView (12-section student deck or 5-block teacher deck).
    if (hasFullTemplateMarkdown || hasApiMarkdownSections) return false;
    const { cards } = resolveFlashcardsFromPayload(cleaned, mergedRaw);
    return flashcardsHaveVisibleBody(cards);
  }, [
    isStudentStudyDecks,
    isTeacherFlashcards,
    cleaned,
    mergedRaw,
    hasFullTemplateMarkdown,
    hasApiMarkdownSections,
  ]);

  if (displayToolType === 'smart-qa-practice-generator') {
    return (
      <AiToolWebView
        toolType={displayToolType}
        content={cleaned}
        rawContent={mergedRaw}
        variant={variant}
      />
    );
  }

  if (variant === 'student' && displayToolType === 'smart-study-guide-generator') {
    return (
      <SmartStudyGuideViewer
        content={cleaned}
        rawContent={mergedRaw}
        toolType={displayToolType}
      />
    );
  }

  if (useNativeActivity) {
    return (
      <ActivityProjectViewer
        content={cleaned}
        rawContent={mergedRaw}
        variant={displayToolType === 'project-idea-lab' ? 'student' : variant}
        toolType={displayToolType}
      />
    );
  }

  if (useNativeFlashcard) {
    return (
      <FlashcardViewer
        content={cleaned}
        rawContent={mergedRaw}
        variant={isTeacherFlashcards ? 'teacher' : 'student'}
        toolType={displayToolType}
      />
    );
  }

  return (
    <AiToolWebView
      toolType={displayToolType}
      content={cleaned}
      rawContent={mergedRaw}
      variant={variant}
    />
  );
}
