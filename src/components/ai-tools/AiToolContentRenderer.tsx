import { useMemo } from 'react';
import SmartStudyGuideViewer from './SmartStudyGuideViewer';
import ActivityProjectViewer from './ActivityProjectViewer';
import AiToolWebView from './AiToolWebView';
import { stripStructuredAiToolMetadata } from '../../lib/strip-ai-tool-metadata';
import {
  resolveStudyGuideFromPayload,
  studyGuideViewerPayloadFromRecord,
  studyGuideHasVisibleBody,
} from '../../lib/parse-smart-study-guide';
import { resolveActivitiesFromPayload } from '../../lib/parse-activity-markdown';

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
    return !markdownFallback && studyGuideHasVisibleBody(guide);
  }, [toolType, cleaned, rawContent]);

  const useNativeActivity = useMemo(() => {
    if (toolType !== 'activity-project-generator' && toolType !== 'project-idea-lab') return false;
    const activities = resolveActivitiesFromPayload(activitiesFromRaw(rawContent), cleaned);
    return activities.length > 0;
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

  return (
    <AiToolWebView
      toolType={toolType}
      content={cleaned}
      rawContent={rawContent}
      variant={variant}
    />
  );
}
