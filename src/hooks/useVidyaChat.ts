import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const QUICK_QUESTIONS_BY_ROLE = {
  student: [
    'Explain this topic simply',
    'Help me solve this problem',
    'Give me a quiz',
    'Summarize this chapter',
  ],
  teacher: [
    'Give me 10 MCQs on [current topic]',
    'Create a 5-question worksheet for my class',
    'Write a lesson plan for today',
    'Which students in my class need extra attention?',
    "Summarize this week's curriculum points",
  ],
};

const INPUT_PLACEHOLDER_BY_ROLE = {
  student: 'Type your question or upload a problem...',
  teacher: 'Ask about teaching, lessons, or doubts...',
};

export function useVidyaChat({ userId, role, context }: UseVidyaChatOptions): UseVidyaChatResult {
  const isStudentMentorMode = role === 'student';
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [localMessages, setLocalMessages] = useState<VidyaMessage[]>([]);
  const [todayFocusAction, setTodayFocusAction] = useState('');
  const [todayFocusReason, setTodayFocusReason] = useState('');
  const [studyStreakMessage, setStudyStreakMessage] = useState('');
  const [proactivePrompt, setProactivePrompt] = useState('');

  const localMessagesRef = useRef<VidyaMessage[]>([]);
  const contextRef = useRef(context);
  contextRef.current = context;

  useEffect(() => {
    localMessagesRef.current = localMessages;
  }, [localMessages]);

  const mergedSubjectOptions = useMemo(
    () => mergeSubjectOptions(context?.subjectOptions, context?.currentSubject),
    [
      context?.currentSubject,
      Array.isArray(context?.subjectOptions) ? context!.subjectOptions!.join('\u0001') : '',
    ]
  );

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
    refetchInterval: 2000,
    enabled: Boolean(userId) && !isStudentMentorMode,
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
  const sessionMessages: VidyaMessage[] = (currentSession?.messages as VidyaMessage[]) || [];

  useEffect(() => {
    if (isStudentMentorMode) return;
    if (
      sessionMessages.length > 0 &&
      (localMessages.length === 0 || sessionMessages.length > localMessages.length)
    ) {
      setLocalMessages(
        sessionMessages.map((m) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }))
      );
    }
  }, [isStudentMentorMode, sessionMessages, localMessages.length]);

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
      teacherMode: extra?.teacherMode ?? contextRef.current?.teacherMode,
      subjectOptions: contextRef.current?.subjectOptions,
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

      setLocalMessages((prev) => [...prev, userMessage]);

      if (isStudentMentorMode) {
        const result = await vidyaService.studentChat({
          message: data.message,
          studentId: userId,
        });
        if (result.message) {
          const aiMessage: VidyaMessage = {
            role: 'assistant',
            content: result.message,
            timestamp: new Date(),
          };
          setLocalMessages((prev) => [...prev, aiMessage]);
        }
        return result;
      }

      const result = await vidyaService.aiChat({
        userId,
        message: data.message,
        context: buildRequestContext(data.context),
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
        const aiMessage: VidyaMessage = {
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
        };
        setLocalMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.content === result.message) {
            return prev;
          }
          return [...prev, aiMessage];
        });
      }

      return result;
    },
    onSuccess: () => {
      if (isStudentMentorMode) {
        queryClient.invalidateQueries({ queryKey: ['vidya-student-focus', userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'chat-sessions'] });
        setTimeout(() => refetch(), 1000);
      }
      setMessage('');
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to send message.';
      Alert.alert('Error', msg);
      setLocalMessages((prev) => prev.slice(0, -1));
    },
  });

  const analyzeImageMutation = useMutation({
    mutationFn: (data: { image: string; context?: string }) => vidyaService.analyzeImage(data),
    onSuccess: (data) => {
      sendMessageMutation.mutate({
        message: `Please analyze this image: ${data.analysis}`,
        context: buildRequestContext(),
      });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    },
  });

  const sendSpecificMessage = useCallback(
    (text: string) => {
      if (!text.trim() || sendMessageMutation.isPending) return;
      sendMessageMutation.mutate({
        message: text.trim(),
        context: buildRequestContext(),
      });
    },
    [buildRequestContext, sendMessageMutation]
  );

  const handleSendMessage = useCallback(
    () => sendSpecificMessage(message),
    [message, sendSpecificMessage]
  );

  const onPromptClick = useCallback(
    (question: string) => {
      setMessage(question);
      setTimeout(() => sendSpecificMessage(question), 100);
    },
    [sendSpecificMessage]
  );

  const pickAndAnalyzeImage = useCallback(async () => {
    if (analyzeImageMutation.isPending || sendMessageMutation.isPending) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      analyzeImageMutation.mutate({
        image: base64,
        context: `Subject: ${selectedSubjectRef.current || contextRef.current?.currentSubject || 'General Study'}. Please analyze this educational image and help me understand the concepts.`,
      });
    } catch {
      Alert.alert('Error', 'Could not open image. Please try again.');
    }
  }, [analyzeImageMutation, sendMessageMutation.isPending]);

  const handleVoiceInput = useCallback(() => {
    setIsListening(true);
    Alert.alert(
      'Voice input',
      'Voice input is not supported on mobile yet. Type your question or use image upload.',
      [{ text: 'OK', onPress: () => setIsListening(false) }]
    );
  }, []);

  const displayMessages = useMemo(() => {
    if (isStudentMentorMode) return localMessages;
    return localMessages.length > 0 ? localMessages : sessionMessages;
  }, [isStudentMentorMode, localMessages, sessionMessages]);

  const isLoading =
    !isStudentMentorMode && sessionsLoading && localMessages.length === 0 && displayMessages.length === 0;

  return {
    message,
    setMessage,
    isListening,
    isLoading,
    isPending: sendMessageMutation.isPending || analyzeImageMutation.isPending,
    displayMessages,
    quickQuestions: QUICK_QUESTIONS_BY_ROLE[role],
    inputPlaceholder: INPUT_PLACEHOLDER_BY_ROLE[role],
    currentSubject: selectedSubject,
    subjectOptions: mergedSubjectOptions,
    setSelectedSubject,
    userInitial: context?.studentName?.charAt(0)?.toUpperCase() || 'A',
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
  };
}
