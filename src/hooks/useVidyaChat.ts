import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { mergeSubjectOptions, formatVidyaMessage } from '../lib/vidya-subjects';
import vidyaService from '../services/api/vidyaService';
import type {
  AIChatContext,
  UseVidyaChatOptions,
  UseVidyaChatResult,
  VidyaMessage,
} from '../types/vidya';

const CONTROL_ASSISTANT_QUICK_QUESTIONS_ADMIN = [
  'School dashboard overview',
  'How many students and teachers are active?',
  'How many OMR batches do we have?',
  'How is Class 7 performing?',
  'Tell me about a student by name',
  'How many homework submissions are there?',
  'Show published videos and assessments count',
  'Login attendance summary for today',
];

const CONTROL_ASSISTANT_QUICK_QUESTIONS_SUPER = [
  'Platform overview — schools, students, teachers',
  'How many OMR batches and exam results this month?',
  'Details about a school by name',
  'How many trial members are there?',
  'How is a student or teacher doing by name?',
  'How many published videos and assessments?',
  'Login sessions today across the platform',
  'How many risk reports exist?',
];

const QUICK_QUESTIONS_BY_ROLE: Record<'student' | 'teacher' | 'admin' | 'super_admin', string[]> = {
  student: [
    'Teach me magnetic field',
    'What should I do today?',
    'What is my homework today?',
    'What are my upcoming exams?',
    'How many subjects do I have?',
    'How many videos in maths?',
    'What is my recent OMR exam result?',
    'What quizzes do I have?',
    'What is on my calendar?',
  ],
  teacher: [
    'Help me explain a topic to my class',
    'What should I do today?',
    'List my classes and students',
    'Who logged in today?',
    'Show homework pending review',
    'What are upcoming exams?',
    'OMR batches for my school',
    'Tell me about a student by name',
    'How is Class 7 performing?',
  ],
  admin: CONTROL_ASSISTANT_QUICK_QUESTIONS_ADMIN,
  super_admin: CONTROL_ASSISTANT_QUICK_QUESTIONS_SUPER,
};

const INPUT_PLACEHOLDER_BY_ROLE: Record<'student' | 'teacher' | 'admin' | 'super_admin', string> = {
  student: 'Ask a topic doubt, a follow-up, or about your exams and progress…',
  teacher: 'Ask for teaching help or about your classes, students and exams…',
  admin: 'Ask live school data: students, OMR, exams, homework, classes…',
  super_admin: 'Ask live platform data: schools, OMR, exams, trials, AI…',
};

const CONTROL_INPUT_PLACEHOLDER =
  'Ask live app metrics — students, teachers, OMR, exams, homework, videos, risk…';

const EMPTY_SESSION_MESSAGES: VidyaMessage[] = [];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function conversationPayload(messages: VidyaMessage[]) {
  const rows = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role,
      content: String(m.content || ''),
      ...(Array.isArray(m.citations) && m.citations.length ? { citations: m.citations } : {}),
    }));
  if (rows.reduce((sum, m) => sum + m.content.length, 0) <= 120000) return rows;
  const limit = Math.max(1, Math.floor(120000 / Math.max(1, rows.length)));
  return rows.map((m) => ({
    ...m,
    content:
      m.content.length > limit
        ? `${m.content.slice(0, Math.floor(limit * 0.7))}\n[Earlier message shortened]\n${m.content.slice(-Math.max(1, Math.floor(limit * 0.3)))}`
        : m.content,
  }));
}

function inferImageMime(asset: { mimeType?: string | null; name?: string | null; uri?: string }): string | null {
  const mime = String(asset.mimeType || '').toLowerCase();
  if (ALLOWED_IMAGE_MIMES.has(mime)) return mime === 'image/jpg' ? 'image/jpeg' : mime;
  const name = `${asset.name || ''} ${asset.uri || ''}`.toLowerCase();
  if (/\.jpe?g(\?|$)/.test(name)) return 'image/jpeg';
  if (/\.png(\?|$)/.test(name)) return 'image/png';
  if (/\.webp(\?|$)/.test(name)) return 'image/webp';
  return null;
}

export function useVidyaChat({ userId, role, context }: UseVidyaChatOptions): UseVidyaChatResult {
  const isDatabaseBackedAssistant = role === 'admin' || role === 'super_admin';
  const isStudentMentorMode = role === 'student';
  const isTeacherMentorMode = role === 'teacher';
  const queryClient = useQueryClient();

  const [message, setMessageState] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const [localMessages, setLocalMessages] = useState<VidyaMessage[]>([]);
  const [todayFocusAction, setTodayFocusAction] = useState('');
  const [todayFocusReason, setTodayFocusReason] = useState('');
  const [studyStreakMessage, setStudyStreakMessage] = useState('');
  const [proactivePrompt, setProactivePrompt] = useState('');
  const [lastControlLatencyMs, setLastControlLatencyMs] = useState<number | null>(null);

  const localMessagesRef = useRef<VidyaMessage[]>([]);
  const messageRef = useRef('');
  const contextRef = useRef(context);
  const sendingRef = useRef(false);
  const historyHydratedRef = useRef(false);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  contextRef.current = context;

  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      if (sendFlushTimerRef.current) clearTimeout(sendFlushTimerRef.current);
    };
  }, []);

  useEffect(() => {
    localMessagesRef.current = localMessages;
  }, [localMessages]);

  const setMessage = useCallback((value: SetStateAction<string>) => {
    setMessageState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      messageRef.current = next;
      return next;
    });
  }, []);

  const mergedSubjectOptions = useMemo(
    () => mergeSubjectOptions(context?.subjectOptions, context?.currentSubject),
    [
      context?.currentSubject,
      Array.isArray(context?.subjectOptions) ? context!.subjectOptions!.join('\u0001') : '',
    ]
  );

  const subjectSelectOptions = useMemo(() => {
    const rows = Array.isArray(context?.subjectSelectOptions) ? context.subjectSelectOptions : [];
    if (rows.length === 0) return undefined;
    const allowed = new Set(mergedSubjectOptions.map((s) => s.toLowerCase()));
    return rows.filter((row) => allowed.has(String(row.value || '').toLowerCase()));
  }, [context?.subjectSelectOptions, mergedSubjectOptions]);

  const [selectedSubject, setSelectedSubject] = useState(
    () => mergedSubjectOptions[0] || 'General Study'
  );
  const selectedSubjectRef = useRef(selectedSubject);
  selectedSubjectRef.current = selectedSubject;

  useEffect(() => {
    const fallback = mergedSubjectOptions[0] || 'General Study';
    setSelectedSubject((prev) =>
      mergedSubjectOptions.some((s) => s === prev) ? prev : fallback
    );
  }, [mergedSubjectOptions]);

  const { data: sessions, isLoading: sessionsLoading, refetch } = useQuery({
    queryKey: ['/api/users', userId, 'chat-sessions'],
    queryFn: () => vidyaService.getChatSessions(userId),
    refetchInterval: false,
    staleTime: 30_000,
    enabled: Boolean(userId) && !isDatabaseBackedAssistant,
  });

  const { data: controlHistory, isLoading: controlHistoryLoading } = useQuery({
    queryKey: ['vidya-control-history', userId],
    queryFn: () => vidyaService.getControlHistory(50),
    enabled: Boolean(userId) && isDatabaseBackedAssistant,
  });

  useEffect(() => {
    if (role !== 'student' || !userId) return;
    let mounted = true;
    vidyaService
      .getStudentFocusCard()
      .then((data) => {
        if (!mounted || !data?.success) return;
        setTodayFocusAction(data.focusCard?.action || data.todayFocus?.action || '');
        setTodayFocusReason(data.focusCard?.reason || '');
        const streakCount = Number(data.studyStreak?.count || 0);
        setStudyStreakMessage(
          streakCount > 0 ? `🔥 ${streakCount}-day streak!` : data.studyStreak?.message || ''
        );
        setProactivePrompt(data.proactivePrompt?.promptText || '');
        if (data.autoGreeting && localMessagesRef.current.length === 0) {
          setLocalMessages([
            {
              role: 'assistant',
              content: String(data.autoGreeting),
              timestamp: new Date(),
            },
          ]);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [role, userId]);

  const currentSession = sessions?.[0];
  const sessionMessages: VidyaMessage[] = currentSession?.messages
    ? (currentSession.messages as VidyaMessage[])
    : EMPTY_SESSION_MESSAGES;

  useEffect(() => {
    if (isDatabaseBackedAssistant) return;
    if (sessions === undefined || historyHydratedRef.current) return;
    historyHydratedRef.current = true;
    if (sessionMessages.length > 0 && !localMessagesRef.current.some((m) => m.role === 'user')) {
      setLocalMessages(
        sessionMessages.map((m) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }))
      );
    }
  }, [isDatabaseBackedAssistant, sessions, sessionMessages]);

  useEffect(() => {
    if (!isDatabaseBackedAssistant) return;
    if (controlHistory === undefined) return;
    if (!controlHistory?.success) return;
    const items = controlHistory.items || [];
    if (items.length === 0) {
      setLocalMessages([]);
      return;
    }
    setLocalMessages((prev) => {
      if (prev.length > 0) return prev;
      const mapped: VidyaMessage[] = [];
      for (const item of items) {
        const ts = item.createdAt ? new Date(item.createdAt) : new Date();
        mapped.push({ role: 'user', content: item.prompt, timestamp: ts });
        mapped.push({ role: 'assistant', content: item.responseText, timestamp: ts });
      }
      return mapped;
    });
  }, [isDatabaseBackedAssistant, controlHistory]);

  const buildRequestContext = useCallback(
    (extra?: AIChatContext): AIChatContext => ({
      ...contextRef.current,
      ...extra,
      studentName: contextRef.current?.studentName || extra?.studentName || 'Student',
      currentSubject:
        extra?.currentSubject ??
        selectedSubjectRef.current ??
        contextRef.current?.currentSubject,
      currentTopic: extra?.currentTopic ?? contextRef.current?.currentTopic,
    }),
    []
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; context?: AIChatContext }) => {
      const userMessage: VidyaMessage = {
        role: 'user',
        content: data.message,
        timestamp: new Date(),
      };

      const historyPayload = conversationPayload(localMessagesRef.current);
      setLocalMessages((prev) => [...prev, userMessage]);

      if (isDatabaseBackedAssistant) {
        const result = await vidyaService.controlQuery({
          message: data.message,
          history: historyPayload,
        });

        if (result.message) {
          setLastControlLatencyMs(
            typeof result.latencyMs === 'number' ? result.latencyMs : null
          );
          setLocalMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: result.message,
              timestamp: new Date(),
            },
          ]);
        }
        return result;
      }

      if (isStudentMentorMode) {
        const result = await vidyaService.studentChat({
          message: data.message,
          studentId: userId,
          history: historyPayload,
        });
        const replyText = String(
          result?.message ||
            result?.reply ||
            result?.data?.message ||
            result?.data?.reply ||
            ''
        ).trim();
        if (replyText) {
          setLocalMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: replyText,
              timestamp: new Date(),
              ...(Array.isArray(result.citations) && result.citations.length
                ? { citations: result.citations }
                : {}),
            },
          ]);
        } else {
          setLocalMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content:
                'I could not generate a reply just now. Please try asking again in a moment.',
              timestamp: new Date(),
            },
          ]);
        }
        return result;
      }

      if (isTeacherMentorMode) {
        const result = await vidyaService.teacherChat({
          message: data.message,
          history: historyPayload,
          context: {
            currentSubject: selectedSubjectRef.current,
            currentTopic: data.context?.currentTopic ?? contextRef.current?.currentTopic ?? '',
          },
        });
        if (result.message) {
          setLocalMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: result.message,
              timestamp: new Date(),
              ...(Array.isArray(result.citations) && result.citations.length
                ? { citations: result.citations }
                : {}),
            },
          ]);
        }
        return result;
      }

      const result = await vidyaService.aiChat({
        userId,
        message: data.message,
        context: buildRequestContext(data.context) as Record<string, unknown>,
      });

      if (result.session?.messages) {
        setLocalMessages(
          result.session.messages.map((m: VidyaMessage) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }))
        );
      } else if (result.message) {
        setLocalMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.content === result.message) {
            return prev;
          }
          return [
            ...prev,
            {
              role: 'assistant',
              content: result.message,
              timestamp: new Date(),
            },
          ];
        });
      }

      return result;
    },
    onSuccess: () => {
      if (isDatabaseBackedAssistant) {
        queryClient.invalidateQueries({ queryKey: ['vidya-control-history', userId] });
      } else if (isStudentMentorMode) {
        queryClient.invalidateQueries({ queryKey: ['vidya-student-focus', userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'chat-sessions'] });
        if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = setTimeout(() => {
          refetchTimerRef.current = null;
          refetch();
        }, 1000);
      }
    },
    onError: (error: unknown, variables) => {
      const msg = error instanceof Error ? error.message : 'Failed to send message.';
      Alert.alert('Error', msg);
      setLocalMessages((prev) => prev.slice(0, -1));
      setMessage((prev) => prev || variables.message);
    },
    onSettled: () => {
      sendingRef.current = false;
    },
  });

  const analyzeImageMutation = useMutation({
    mutationFn: (data: {
      image: string;
      mimeType: string;
      context?: string;
      history: ReturnType<typeof conversationPayload>;
    }) => vidyaService.analyzeImage(data),
    onSuccess: (data, variables) => {
      setLocalMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: `[Uploaded image] ${variables.context || 'Explain this image'}`,
          timestamp: new Date(),
        },
        {
          role: 'assistant',
          content: String(
            data.analysis ||
              data.message ||
              'No readable answer was returned. Please retry with a clearer photo.'
          ),
          timestamp: new Date(),
        },
      ]);
    },
    onError: (error: unknown, variables) => {
      setMessage((prev) => prev || variables.context || '');
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to analyze image. Please try again.'
      );
    },
    onSettled: () => {
      sendingRef.current = false;
    },
  });

  const sendSpecificMessage = useCallback(
    (text: string) => {
      if (!userId || !text.trim()) return;
      if (sendingRef.current || analyzeImageMutation.isPending) return;
      const trimmed = text.trim();
      if (isDatabaseBackedAssistant && role === 'admin') {
        const asksExamAnswers =
          /\b(answer\s*key|exam\s+answers?|solved?\s+paper|marking\s+scheme|give\s+me\s+the\s+answers?)\b/i.test(
            trimmed
          );
        if (asksExamAnswers) {
          setLocalMessages((prev) => [
            ...prev,
            { role: 'user', content: trimmed, timestamp: new Date() },
            {
              role: 'assistant',
              content:
                'I can report exam **counts and schedules** for your school, but I can’t provide answer keys or solve exam papers. Try: “How many exams are scheduled this week?”',
              timestamp: new Date(),
            },
          ]);
          setMessage('');
          return;
        }
      }
      if (sendMessageMutation.isPending) {
        setMessage(trimmed);
        return;
      }
      sendingRef.current = true;
      setMessage('');
      sendMessageMutation.mutate({
        message: trimmed,
        context: {
          ...contextRef.current,
          currentSubject: selectedSubjectRef.current || contextRef.current?.currentSubject || 'General Study',
        },
      });
    },
    [analyzeImageMutation.isPending, isDatabaseBackedAssistant, role, sendMessageMutation, userId]
  );

  /**
   * Android IME often keeps the last character in composition until blur.
   * Sending immediately drops it (e.g. "hi" → "h", "how are u" → "how are").
   * Defer a tick so the final onChangeText can land in messageRef first.
   */
  const handleSendMessage = useCallback(() => {
    if (sendFlushTimerRef.current) clearTimeout(sendFlushTimerRef.current);
    sendFlushTimerRef.current = setTimeout(() => {
      sendFlushTimerRef.current = null;
      sendSpecificMessage(messageRef.current);
    }, 80);
  }, [sendSpecificMessage]);

  const onPromptClick = useCallback(
    (question: string) => {
      sendSpecificMessage(question);
    },
    [sendSpecificMessage]
  );

  const pickAndAnalyzeImage = useCallback(
    async (contextOverride?: string) => {
      if (sendingRef.current || analyzeImageMutation.isPending || sendMessageMutation.isPending) return;
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'image/*',
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        const asset = result.assets[0];
        const mimeType = inferImageMime(asset);
        if (!mimeType) {
          Alert.alert('Choose a supported photo', 'Use a JPEG, PNG or WebP image smaller than 5 MB.');
          return;
        }
        if (typeof asset.size === 'number' && asset.size > MAX_IMAGE_BYTES) {
          Alert.alert('Choose a supported photo', 'Use a JPEG, PNG or WebP image smaller than 5 MB.');
          return;
        }
        sendingRef.current = true;
        const question =
          String(contextOverride || messageRef.current).trim() ||
          `Explain this educational image. Subject: ${selectedSubjectRef.current || 'General Study'}.`;
        setMessage('');
        setPreparingImage(true);
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          analyzeImageMutation.mutate({
            image: base64,
            mimeType,
            context: question,
            history: conversationPayload(localMessagesRef.current),
          });
        } catch (error) {
          sendingRef.current = false;
          setMessage((prev) => prev || question);
          Alert.alert(
            'Photo could not be read',
            error instanceof Error ? error.message : 'Please select the photo again.'
          );
        } finally {
          setPreparingImage(false);
        }
      } catch {
        sendingRef.current = false;
        Alert.alert('Error', 'Could not open image. Please try again.');
      }
    },
    [analyzeImageMutation, sendMessageMutation.isPending]
  );

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!isDatabaseBackedAssistant) return { success: true };
      return vidyaService.clearControlHistory();
    },
    onSuccess: () => {
      setLocalMessages([]);
      setMessage('');
      if (isDatabaseBackedAssistant) {
        queryClient.invalidateQueries({ queryKey: ['vidya-control-history', userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'chat-sessions'] });
      }
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to clear chat history.';
      Alert.alert('Error', msg);
    },
  });

  const handleVoiceInput = useCallback(() => {
    setIsListening(true);
    Alert.alert(
      'Voice input',
      'Voice input is not supported on mobile yet. Type your question or use image upload.',
      [{ text: 'OK', onPress: () => setIsListening(false) }]
    );
  }, []);

  const displayMessages = useMemo(() => {
    if (isDatabaseBackedAssistant) return localMessages;
    return localMessages.length > 0 ? localMessages : sessionMessages;
  }, [isDatabaseBackedAssistant, localMessages, sessionMessages]);

  const quickQuestions = isDatabaseBackedAssistant
    ? role === 'super_admin'
      ? CONTROL_ASSISTANT_QUICK_QUESTIONS_SUPER
      : CONTROL_ASSISTANT_QUICK_QUESTIONS_ADMIN
    : QUICK_QUESTIONS_BY_ROLE[role];

  const inputPlaceholder = isDatabaseBackedAssistant
    ? CONTROL_INPUT_PLACEHOLDER
    : INPUT_PLACEHOLDER_BY_ROLE[role];

  const isLoading = !userId
    ? true
    : isDatabaseBackedAssistant
      ? controlHistoryLoading && localMessages.length === 0
      : sessionsLoading && localMessages.length === 0;

  return {
    message,
    setMessage,
    isListening,
    isLoading,
    isPending: preparingImage || sendMessageMutation.isPending || analyzeImageMutation.isPending,
    displayMessages,
    quickQuestions,
    inputPlaceholder,
    currentSubject: selectedSubject,
    subjectOptions: mergedSubjectOptions,
    subjectSelectOptions,
    setSelectedSubject,
    userInitial:
      role === 'super_admin'
        ? 'SA'
        : context?.studentName?.charAt(0)?.toUpperCase() || 'A',
    handleSendMessage,
    sendSpecificMessage,
    pickAndAnalyzeImage,
    handleVoiceInput,
    onPromptClick,
    formatMessage: formatVidyaMessage,
    todayFocusAction,
    todayFocusReason,
    studyStreakMessage,
    proactivePrompt,
    clearChat: () => {
      if (clearChatMutation.isPending) return;
      clearChatMutation.mutate();
    },
    isClearingChat: clearChatMutation.isPending,
    isDatabaseBackedAssistant,
    lastControlLatencyMs,
  };
}
