import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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
export { getAiToolResultTitle } from '../../lib/ai-tool-result-title';

type Props = {
  toolType: string;
  content: string;
  rawContent?: unknown;
  accent?: string;
  variant?: 'student' | 'teacher';
  /** Phone result layout: child owns vertical scroll instead of parent page ScrollView. */
  fill?: boolean;
};

function wrapNativeFill(node: ReactNode, fill: boolean) {
  if (!fill) return node;
  return (
    <ScrollView
      style={styles.fillScroll}
      contentContainerStyle={styles.fillScrollContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      {node}
    </ScrollView>
  );
}

function activitiesFromRaw(rawContent: unknown) {
  if (!rawContent || typeof rawContent !== 'object') return undefined;
  const rc = rawContent as Record<string, unknown>;
  if (Array.isArray(rc.activities)) return rc.activities;
  return undefined;
}

export default function AiToolContentRenderer({
  toolType,
  content,
  rawContent,
  variant = 'student',
  fill = false,
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
        fill={fill}
      />
    );
  }

  if (variant === 'student' && displayToolType === 'smart-study-guide-generator') {
    return (
      <SmartStudyGuideViewer
        content={cleaned}
        rawContent={mergedRaw}
        toolType={displayToolType}
        fill={fill}
      />
    );
  }

  if (useNativeActivity) {
    return wrapNativeFill(
      <ActivityProjectViewer
        content={cleaned}
        rawContent={mergedRaw}
        variant={displayToolType === 'project-idea-lab' ? 'student' : variant}
        toolType={displayToolType}
      />,
      fill,
    );
  }

  if (useNativeFlashcard) {
    return wrapNativeFill(
      <FlashcardViewer
        content={cleaned}
        rawContent={mergedRaw}
        variant={isTeacherFlashcards ? 'teacher' : 'student'}
        toolType={displayToolType}
      />,
      fill,
    );
  }

  return (
    <AiToolWebView
      toolType={displayToolType}
      content={cleaned}
      rawContent={mergedRaw}
      variant={variant}
      fill={fill}
    />
  );
}

const styles = StyleSheet.create({
  fillScroll: { flex: 1, minHeight: 0 },
  fillScrollContent: { paddingBottom: 12 },
});
