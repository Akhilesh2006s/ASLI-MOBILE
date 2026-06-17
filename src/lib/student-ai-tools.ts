/** Student Vidya AI tools — aligned with asli-frontend/src/pages/ai-tutor.tsx */

export type StudentAiTool = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
};

export const READING_PRACTICE_TOOL_ID = 'reading-practice-room';

export const STUDENT_AI_TOOLS: StudentAiTool[] = [
  {
    id: 'ai-chat',
    name: 'AI Chat Assistant',
    description: 'Get Instant Help With Your Questions And Doubts',
    icon: 'chatbubble-outline',
    color: '#3b82f6',
  },
  {
    id: 'smart-study-guide-generator',
    name: 'Smart Study Guide Generator',
    description: 'Create Personalized Study Guides Tailored To Your Needs',
    icon: 'bookmark-outline',
    color: '#fb923c',
  },
  {
    id: 'concept-breakdown-explainer',
    name: 'Concept Breakdown Explainer',
    description: 'Break Down Complex Concepts Into Simple Explanations',
    icon: 'bulb-outline',
    color: '#3b82f6',
  },
  {
    id: 'smart-qa-practice-generator',
    name: 'Smart Q&A Practice Generator',
    description: 'Generate Practice Questions With Detailed Answers',
    icon: 'help-circle-outline',
    color: '#fb923c',
  },
  {
    id: 'chapter-summary-creator',
    name: 'Chapter Summary Creator',
    description: 'Create Concise Summaries Of Chapters And Topics',
    icon: 'document-text-outline',
    color: '#3b82f6',
  },
  {
    id: 'key-points-formula-extractor',
    name: 'Key Points Extractor',
    description: 'Extract Key Points From Any Topic',
    icon: 'key-outline',
    color: '#14b8a6',
  },
  {
    id: 'quick-assignment-builder',
    name: 'Quick Assignment Builder',
    description: 'Build Structured Assignments Quickly And Efficiently',
    icon: 'clipboard-outline',
    color: '#fb923c',
  },
  {
    id: 'my-study-decks',
    name: 'My Study Decks',
    description: 'Create Personalized Flashcards For Revision',
    icon: 'albums-outline',
    color: '#ec4899',
  },
  {
    id: 'mock-test-builder',
    name: 'Mock Test Builder',
    description: 'Generate Mock Tests With Exam-Style Questions',
    icon: 'checkmark-circle-outline',
    color: '#6366f1',
  },
  {
    id: 'project-idea-lab',
    name: 'Project Idea Lab',
    description: 'Discover Activity And Project Ideas By Topic',
    icon: 'grid-outline',
    color: '#eab308',
  },
  {
    id: 'reading-practice-room',
    name: 'Reading Practice Room',
    description: 'Practice Stories And Passages (English & Hindi Only)',
    icon: 'document-outline',
    color: '#3b82f6',
  },
  {
    id: 'study-schedule-maker',
    name: 'Study Schedule Maker',
    description: 'Build A Focused Lesson And Study Schedule',
    icon: 'calendar-outline',
    color: '#8b5cf6',
  },
];

const STORY_LANGUAGE_TOOL_IDS = new Set([
  'story-passage-creator',
  READING_PRACTICE_TOOL_ID,
]);

export function isStoryLanguageTool(toolType: string): boolean {
  return STORY_LANGUAGE_TOOL_IDS.has(String(toolType || '').trim());
}

export function filterSubjectsForAiTool(toolType: string, subjects: string[]): string[] {
  if (isStoryLanguageTool(toolType)) {
    return subjects.filter(isStoryPassageLanguageSubject);
  }
  return subjects;
}

export function isStoryPassageLanguageSubject(subject: string | undefined | null): boolean {
  const s = String(subject || '').trim();
  if (!s) return false;
  if (/(hindi|हिंदी|हिन्दी)/i.test(s)) return true;
  if (/english/i.test(s)) return true;
  return false;
}

export function hasStoryPassageLanguageSubject(subjects: string[]): boolean {
  return subjects.some(isStoryPassageLanguageSubject);
}

export function filterVisibleStudentTools(subjectNames: string[]): StudentAiTool[] {
  return STUDENT_AI_TOOLS.filter((tool) => {
    // Chat has a dedicated card on the Vidya tab — not listed under Available Tools.
    if (tool.id === 'ai-chat') return false;
    if (tool.id !== READING_PRACTICE_TOOL_ID) return true;
    if (subjectNames.length === 0) return true;
    return hasStoryPassageLanguageSubject(subjectNames);
  });
}

/** Map route/legacy ids to backend toolType (same as web student/tools). */
export function resolveStudentAiApiToolType(toolType: string): string {
  switch (toolType) {
    case 'activity-project-generator':
      return 'project-idea-lab';
    case 'lesson-planner':
      return 'study-schedule-maker';
    case 'story-passage-creator':
      return 'reading-practice-room';
    case 'flashcard-generator':
      return 'my-study-decks';
    case 'exam-question-paper-generator':
      return 'mock-test-builder';
    case 'ai-chat-assistant':
      return 'ai-chat';
    default:
      return toolType;
  }
}

export function resolveStudentToolConfigKey(toolType: string): string {
  if (toolType === 'project-idea-lab' || toolType === 'activity-project-generator') {
    return 'project-idea-lab';
  }
  if (toolType === 'study-schedule-maker' || toolType === 'lesson-planner') {
    return 'study-schedule-maker';
  }
  if (toolType === 'reading-practice-room' || toolType === 'story-passage-creator') {
    return 'reading-practice-room';
  }
  if (toolType === 'my-study-decks' || toolType === 'flashcard-generator') {
    return 'my-study-decks';
  }
  if (toolType === 'mock-test-builder' || toolType === 'exam-question-paper-generator') {
    return 'mock-test-builder';
  }
  return toolType;
}
