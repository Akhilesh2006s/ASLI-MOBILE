import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVidyaChat } from '../../hooks/useVidyaChat';
import type { AIChatContext } from '../../types/vidya';
import SubjectPickerModal from './SubjectPickerModal';
import VidyaAvatar from './VidyaAvatar';

const STUDENT_QUICK_COLORS = [
  { border: '#fbcfe8', bg: '#fdf2f8', text: '#9d174d' },
  { border: '#c7d2fe', bg: '#eef2ff', text: '#3730a3' },
  { border: '#99f6e4', bg: '#f0fdfa', text: '#115e59' },
  { border: '#fde68a', bg: '#fffbeb', text: '#92400e' },
];

type StudentVidyaChatPanelProps = {
  userId: string;
  context?: AIChatContext;
  embedded?: boolean;
};

export default function StudentVidyaChatPanel({
  userId,
  context,
  embedded = false,
}: StudentVidyaChatPanelProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const model = useVidyaChat({ userId, role: 'student', context });

  const inputPaddingBottom = Math.max(insets.bottom, 8);

  const scrollToBottom = (animated = true) => {
    scrollViewRef.current?.scrollToEnd({ animated });
  };

  const hasNotifications = Boolean(
    model.todayFocusAction || model.studyStreakMessage || model.proactivePrompt
  );
  const showSubjectPicker = model.subjectOptions.length > 1;

  useEffect(() => {
    scrollToBottom(true);
  }, [model.displayMessages, model.isPending]);

  if (model.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, embedded && styles.rootEmbedded]}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.mainScroll}
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.header}>
            <VidyaAvatar size={36} borderColor="#c7d2fe" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Your AI Study Buddy</Text>
              <Text style={styles.headerSub}>Ask anything, learn faster</Text>
            </View>
            {showSubjectPicker ? (
              <Pressable
                style={styles.subjectChip}
                onPress={() => setSubjectPickerOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Subject: ${model.currentSubject}`}
                accessibilityHint="Opens the subject picker"
                accessibilityState={{ expanded: subjectPickerOpen }}
              >
                <Text style={styles.subjectChipText} numberOfLines={1}>
                  {model.currentSubject}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="#4338ca"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Pressable>
            ) : null}
          </View>

          {hasNotifications ? (
            <View style={styles.notifications}>
              {model.todayFocusAction ? (
                <View style={styles.focusCard}>
                  <Text style={styles.focusLabel}>Today Focus</Text>
                  <Text style={styles.focusAction}>{model.todayFocusAction}</Text>
                  {model.todayFocusReason ? (
                    <Text style={styles.focusReason}>{model.todayFocusReason}</Text>
                  ) : null}
                </View>
              ) : null}
              {model.studyStreakMessage ? (
                <View style={styles.streakCard}>
                  <Text style={styles.streakText}>{model.studyStreakMessage}</Text>
                </View>
              ) : null}
              {model.proactivePrompt ? (
                <Pressable
                  style={styles.proactiveCard}
                  onPress={() => model.onPromptClick(model.proactivePrompt!)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask Vidya: ${model.proactivePrompt}`}
                >
                  <Text style={styles.proactiveText}>{model.proactivePrompt}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.messagesBlock}>
            {model.displayMessages.length === 0 ? (
              <View style={styles.starterBlock}>
                <Text style={styles.starterTitle}>What do you want to learn today?</Text>
                <Text style={styles.starterSub}>Tap a prompt to get started.</Text>
                <View style={styles.starterGrid}>
                  {model.quickQuestions.map((question, index) => {
                    const colors = STUDENT_QUICK_COLORS[index % STUDENT_QUICK_COLORS.length];
                    return (
                      <Pressable
                        key={question}
                        style={[
                          styles.starterCard,
                          { borderColor: colors.border, backgroundColor: colors.bg },
                        ]}
                        onPress={() => model.onPromptClick(question)}
                        accessibilityRole="button"
                        accessibilityLabel={`Ask Vidya: ${question}`}
                      >
                        <Text style={[styles.starterCardText, { color: colors.text }]}>{question}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              model.displayMessages.map((msg, idx) => (
                <View
                  key={`${msg.role}-${idx}`}
                  style={[
                    styles.messageRow,
                    msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {msg.role === 'assistant' ? (
                    <VidyaAvatar size={28} borderColor="#c7d2fe" borderWidth={1} />
                  ) : null}
                  <View
                    style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
                  >
                    <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                      {model.formatMessage(msg.content)}
                    </Text>
                  </View>
                  {msg.role === 'user' ? (
                    <View style={styles.userAvatar}>
                      <Text style={styles.userInitial}>{model.userInitial}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}

            {model.isPending ? (
              <View style={[styles.messageRow, styles.messageRowAssistant]}>
                <VidyaAvatar size={28} borderColor="#c7d2fe" borderWidth={1} />
                <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
                  <ActivityIndicator size="small" color="#6366f1" />
                  <Text style={styles.thinkingText}>Thinking...</Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: inputPaddingBottom }]}>
          <View style={styles.inputWrap}>
            <Pressable
              style={styles.iconBtn}
              onPress={model.pickAndAnalyzeImage}
              disabled={model.isPending}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Attach an image"
              accessibilityState={{ disabled: model.isPending }}
            >
              <Ionicons name="image-outline" size={20} color="#64748b" />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={model.handleVoiceInput}
              disabled={model.isPending || model.isListening}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={model.isListening ? 'Listening, voice input active' : 'Start voice input'}
              accessibilityState={{ disabled: model.isPending || model.isListening }}
            >
              <Ionicons
                name="mic-outline"
                size={20}
                color={model.isListening ? '#ef4444' : '#64748b'}
              />
            </Pressable>
            <TextInput
              style={styles.input}
              value={model.message}
              onChangeText={model.setMessage}
              accessibilityLabel="Message Vidya"
              placeholder={model.inputPlaceholder}
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={2000}
              editable={!model.isPending}
              onFocus={() => setTimeout(() => scrollToBottom(true), 120)}
              onSubmitEditing={model.handleSendMessage}
            />
            <Pressable
              style={[styles.sendButton, (!model.message.trim() || model.isPending) && styles.sendButtonDisabled]}
              onPress={model.handleSendMessage}
              disabled={model.isPending || !model.message.trim()}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{
                disabled: model.isPending || !model.message.trim(),
                busy: model.isPending,
              }}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      <SubjectPickerModal
        visible={subjectPickerOpen}
        subjects={model.subjectOptions}
        selected={model.currentSubject}
        onSelect={model.setSelectedSubject}
        onClose={() => setSubjectPickerOpen(false)}
        accentColor="#6366f1"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'rgba(248,250,252,0.45)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    overflow: 'hidden',
  },
  rootEmbedded: {
    borderRadius: 0,
    borderWidth: 0,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ff',
    backgroundColor: 'rgba(238,242,255,0.45)',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  subjectChipText: { fontSize: 11, fontWeight: '700', color: '#4338ca', flexShrink: 1 },
  notifications: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7ff',
  },
  focusCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: 'rgba(255,251,235,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  focusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  focusAction: { fontSize: 12, fontWeight: '700', color: '#78350f', marginTop: 2 },
  focusReason: { fontSize: 11, color: '#92400e', marginTop: 2 },
  streakCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6ee7b7',
    backgroundColor: 'rgba(236,253,245,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  streakText: { fontSize: 11, fontWeight: '600', color: '#047857' },
  proactiveCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: 'rgba(238,242,255,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  proactiveText: { fontSize: 11, color: '#3730a3', lineHeight: 16 },
  mainScroll: { flex: 1, minHeight: 0 },
  mainScrollContent: { flexGrow: 1 },
  messagesBlock: { padding: 12 },
  messages: { flex: 1, minHeight: 0 },
  messagesContent: { padding: 12 },
  starterBlock: { paddingVertical: 8 },
  starterTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  starterSub: { marginTop: 4, fontSize: 12, color: '#64748b', textAlign: 'center' },
  starterGrid: { marginTop: 12, gap: 8 },
  starterCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  starterCardText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(238,242,255,0.45)',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: { fontSize: 11, fontWeight: '700', color: '#fff' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  bubbleUser: {
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: '#1e293b' },
  bubbleTextUser: { color: '#fff' },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 13, color: '#64748b' },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: 'rgba(255,255,255,0.48)',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'rgba(248,250,252,0.45)',
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 96,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.45 },
});
