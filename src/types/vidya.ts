import type { Dispatch, SetStateAction } from 'react';

export interface VidyaCitation {
  id: string;
  title?: string;
  chapter?: string;
}

export interface VidyaMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'voice' | 'image';
  citations?: VidyaCitation[];
}

export type VidyaChatRole = 'teacher' | 'student' | 'admin' | 'super_admin';

export type TeachingTab = 'lesson' | 'quiz' | 'help';

export type VidyaSubjectSelectOption = {
  value: string;
  label: string;
  group: 'CBSE' | 'IIT' | 'Other';
};

export interface AIChatContext {
  studentName?: string;
  currentSubject?: string;
  subjectOptions?: string[];
  subjectSelectOptions?: VidyaSubjectSelectOption[];
  currentTopic?: string;
  recentTest?: string;
  teacherMode?: TeachingTab;
}

export interface UseVidyaChatOptions {
  userId: string;
  role: VidyaChatRole;
  context?: AIChatContext;
}

export interface UseVidyaChatResult {
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  isListening: boolean;
  isLoading: boolean;
  isPending: boolean;
  displayMessages: VidyaMessage[];
  quickQuestions: string[];
  inputPlaceholder: string;
  currentSubject: string;
  subjectOptions: string[];
  subjectSelectOptions?: VidyaSubjectSelectOption[];
  setSelectedSubject: (subject: string) => void;
  userInitial: string;
  handleSendMessage: () => void;
  sendSpecificMessage: (text: string) => void;
  pickAndAnalyzeImage: (contextOverride?: string) => Promise<void>;
  handleVoiceInput: () => void;
  onPromptClick: (question: string) => void;
  formatMessage: (text: string) => string;
  todayFocusAction?: string;
  todayFocusReason?: string;
  studyStreakMessage?: string;
  proactivePrompt?: string;
  clearChat?: () => void;
  isClearingChat?: boolean;
  isDatabaseBackedAssistant?: boolean;
  lastControlLatencyMs?: number | null;
}
