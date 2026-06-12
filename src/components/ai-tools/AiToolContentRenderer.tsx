import { useMemo } from 'react';
import SmartStudyGuideViewer from './SmartStudyGuideViewer';
import ActivityProjectViewer from './ActivityProjectViewer';
import FlashcardViewer from './FlashcardViewer';
import AiToolWebView from './AiToolWebView';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveStudyGuideFromPayload,
  studyGuideViewerPayloadFromRecord,
  studyGuideHasVisibleBody,
} from '../../lib/parse-smart-study-guide';
import {
  activitiesPayloadIsComplete,
  resolveActivitiesFromPayload,
} from '../../lib/parse-activity-markdown';
import {
  contentHasNumberedTemplateSections,
  resolveRichDisplayContent,
} from '../../lib/ai-tool-display-content';
import {
  flashcardsHaveVisibleBody,
  resolveFlashcardsFromPayload,
} from '../../lib/parse-flashcards';

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

export function getAiToolResultTitle(toolType: string): string {
  const titles: Record<string, string> = {
    'smart-study-guide-generator': 'Your smart study guide',
    'concept-breakdown-explainer': 'Your concept breakdown',
    'smart-qa-practice-generator': 'Your practice Q&A',
    'chapter-summary-creator': 'Your chapter summary',
    'key-points-formula-extractor': 'Your key points sheet',
    'quick-assignment-builder': 'Your assignment',
    'my-study-decks': 'Your study deck',
    'flashcard-generator': 'Your study deck',
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
  };
  return titles[toolType] || 'Generated content';
}

export default function AiToolContentRenderer({
  toolType,
  content,
  rawContent,
  variant = 'student',
}: Props) {
  const cleaned = useMemo(() => stripStructuredAiToolMetadata(content), [content]);
  const displayMarkdown = useMemo(
    () => resolveRichDisplayContent(cleaned, rawContent),
    [cleaned, rawContent]
  );
  const hasFullTemplateMarkdown = useMemo(
    () => contentHasNumberedTemplateSections(displayMarkdown),
    [displayMarkdown]
  );

  const useNativeStudyGuide = useMemo(() => {
    if (toolType !== 'smart-study-guide-generator') return false;
    const payload =
      rawContent != null
        ? { content: cleaned, rawContent }
        : studyGuideViewerPayloadFromRecord({ generatedContent: cleaned });
    const { guide, markdownFallback } = resolveStudyGuideFromPayload(
      payload.content,
      payload.rawContent
    );
    // Native viewer shows Section 1 title card + all parsed sections (merged from markdown + rawData).
    return !markdownFallback && studyGuideHasVisibleBody(guide);
  }, [toolType, cleaned, rawContent]);

  const useNativeActivity = useMemo(() => {
    if (toolType !== 'activity-project-generator' && toolType !== 'project-idea-lab') return false;
    if (hasFullTemplateMarkdown) return false;
    const mode = toolType === 'project-idea-lab' ? 'student' : variant;
    return activitiesPayloadIsComplete(activitiesFromRaw(rawContent), cleaned, mode);
  }, [toolType, cleaned, rawContent, hasFullTemplateMarkdown, variant]);

  const useNativeFlashcard = useMemo(() => {
    if (toolType !== 'my-study-decks' && toolType !== 'flashcard-generator') return false;
    const { cards } = resolveFlashcardsFromPayload(cleaned, rawContent);
    return flashcardsHaveVisibleBody(cards);
  }, [toolType, cleaned, rawContent]);

  if (useNativeStudyGuide) {
    return <SmartStudyGuideViewer content={cleaned} rawContent={rawContent} />;
  }

  if (useNativeActivity) {
    return (
      <ActivityProjectViewer
        content={cleaned}
        rawContent={rawContent}
        variant={toolType === 'project-idea-lab' ? 'student' : variant}
      />
    );
  }

  if (useNativeFlashcard) {
    return (
      <FlashcardViewer
        content={cleaned}
        rawContent={rawContent}
        variant={toolType === 'flashcard-generator' ? 'teacher' : 'student'}
      />
    );
  }

  return (
    <AiToolWebView
      toolType={toolType}
      content={cleaned}
      rawContent={rawContent}
      variant={variant}
    />
  );
}
