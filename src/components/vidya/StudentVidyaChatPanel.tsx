import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Keyboard,
  Platform,
  ActivityIndicator,
  Dimensions,
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

type ComposerProps = {
  placeholder: string;
  isPending: boolean;
  isListening: boolean;
  bottomInset: number;
  onSend: (text: string) => void;
  onPickImage: () => void;
  onVoice: () => void;
  onFocusInput?: () => void;
  onHeightChange?: (height: number) => void;
};

/** Local draft state so typing does not re-render the message list. */
const ChatComposer = memo(function ChatComposer({
  placeholder,
  isPending,
  isListening,
  bottomInset,
  onSend,
  onPickImage,
  onVoice,
  onFocusInput,
  onHeightChange,
}: ComposerProps) {
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');
  const inputRef = useRef<TextInput>(null);
  const canSend = Boolean(draft.trim()) && !isPending;

  const setDraftTracked = useCallback((value: string) => {
    draftRef.current = value;
    setDraft(value);
  }, []);

  const submit = useCallback(() => {
    if (isPending) return;
    // Blur so Android IME commits the composing character before we read draft.
    inputRef.current?.blur();
    setTimeout(() => {
      const text = String(draftRef.current || '').trim();
      if (!text) return;
      onSend(text);
      draftRef.current = '';
      setDraft('');
    }, 50);
  }, [isPending, onSend]);

  return (
    <View
      style={[styles.inputBar, { paddingBottom: bottomInset }]}
      onLayout={(e) => onHeightChange?.(Math.ceil(e.nativeEvent.layout.height))}
    >
      <View style={styles.inputWrap}>
        <Pressable
          style={styles.iconBtn}
          onPress={onPickImage}
          disabled={isPending}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Attach an image"
          accessibilityState={{ disabled: isPending }}
        >
          <Ionicons name="image-outline" size={20} color="#64748b" />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={onVoice}
          disabled={isPending || isListening}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={isListening ? 'Listening, voice input active' : 'Start voice input'}
          accessibilityState={{ disabled: isPending || isListening }}
        >
          <Ionicons
            name="mic-outline"
            size={20}
            color={isListening ? '#ef4444' : '#64748b'}
          />
        </Pressable>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={draft}
          onChangeText={setDraftTracked}
          accessibilityLabel="Message Vidya"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={2000}
          editable={!isPending}
          cursorColor="#0284C7"
          selectionColor="rgba(2, 132, 199, 0.28)"
          textAlignVertical="center"
          onFocus={onFocusInput}
          onSubmitEditing={submit}
          blurOnSubmit={false}
        />
        <Pressable
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={submit}
          disabled={!canSend}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend, busy: isPending }}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
});

/**
 * Android often uses adjustResize (window already shrinks). Adding the full
 * keyboard height on top doubles the lift. Only apply the leftover gap.
 */
function leftoverKeyboardLift(keyboardH: number, baselineWindowH: number): number {
  const winNow = Dimensions.get('window').height;
  const alreadyShrunk = Math.max(0, baselineWindowH - winNow);
  return Math.max(0, Math.round(keyboardH - alreadyShrunk));
}

export default function StudentVidyaChatPanel({
  userId,
  context,
  embedded = false,
}: StudentVidyaChatPanelProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const baselineWindowHRef = useRef(Dimensions.get('window').height);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [composerHeight, setComposerHeight] = useState(64);

  const model = useVidyaChat({ userId, role: 'student', context });

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const captureBaseline = useCallback(() => {
    baselineWindowHRef.current = Dimensions.get('window').height;
  }, []);

  const hasNotifications = Boolean(
    model.todayFocusAction || model.studyStreakMessage || model.proactivePrompt
  );
  const showSubjectPicker = model.subjectOptions.length > 1;

  useEffect(() => {
    scrollToBottom(true);
  }, [model.displayMessages.length, model.isPending, scrollToBottom]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: { endCoordinates?: { height?: number } }) => {
      const kb = Math.ceil(e?.endCoordinates?.height ?? 0);
      setKeyboardOpen(true);

      const applyLift = () => {
        // iOS: use full keyboard height (KAV not used; absolute dock).
        // Android: subtract whatever adjustResize already took.
        const lift =
          Platform.OS === 'ios' ? kb : leftoverKeyboardLift(kb, baselineWindowHRef.current);
        setKeyboardLift(lift);
      };

      applyLift();
      setTimeout(applyLift, 32);
      setTimeout(applyLift, 100);
      setTimeout(applyLift, 220);
      setTimeout(() => scrollToBottom(true), 140);
    };

    const onHide = () => {
      setKeyboardOpen(false);
      setKeyboardLift(0);
      captureBaseline();
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [captureBaseline, scrollToBottom]);

  const handleSend = useCallback(
    (text: string) => {
      model.sendSpecificMessage(text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model.sendSpecificMessage]
  );

  const composerBottomPad = keyboardOpen ? 8 : Math.max(insets.bottom, 8);
  const composerBottom = keyboardLift;

  if (model.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  return (
    <View
      style={[styles.root, embedded && styles.rootEmbedded]}
      onLayout={() => {
        if (!keyboardOpen) captureBaseline();
      }}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.mainScroll}
        contentContainerStyle={[
          styles.mainScrollContent,
          { paddingBottom: composerHeight + composerBottom + 12 },
        ]}
        showsVerticalScrollIndicator
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!embedded ? (
          <View style={styles.header}>
            <VidyaAvatar size={36} borderColor="#bae6fd" />
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
              >
                <Text style={styles.subjectChipText} numberOfLines={1}>
                  {model.currentSubject}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#0369A1" />
              </Pressable>
            ) : null}
          </View>
        ) : showSubjectPicker ? (
          <View style={styles.embeddedSubjectRow}>
            <Pressable
              style={styles.subjectChip}
              onPress={() => setSubjectPickerOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Subject: ${model.currentSubject}`}
            >
              <Text style={styles.subjectChipText} numberOfLines={1}>
                {model.currentSubject}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#0369A1" />
            </Pressable>
          </View>
        ) : null}

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
                  <VidyaAvatar size={28} borderColor="#bae6fd" borderWidth={1} />
                ) : null}
                <View
                  style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}
                >
                  <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                    {model.formatMessage(msg.content)}
                    {'\u200A'}
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
              <VidyaAvatar size={28} borderColor="#bae6fd" borderWidth={1} />
              <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.thinkingText}>Thinking...</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.composerDock, { bottom: composerBottom }]}>
        <ChatComposer
          placeholder={model.inputPlaceholder}
          isPending={model.isPending}
          isListening={model.isListening}
          bottomInset={composerBottomPad}
          onSend={handleSend}
          onPickImage={model.pickAndAnalyzeImage}
          onVoice={model.handleVoiceInput}
          onHeightChange={setComposerHeight}
          onFocusInput={() => {
            captureBaseline();
            setTimeout(() => scrollToBottom(true), 120);
          }}
        />
      </View>

      <SubjectPickerModal
        visible={subjectPickerOpen}
        subjects={model.subjectOptions}
        selected={model.currentSubject}
        onSelect={model.setSelectedSubject}
        onClose={() => setSubjectPickerOpen(false)}
        accentColor="#0284C7"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  rootEmbedded: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#F0F9FF',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
    backgroundColor: '#E0F2FE',
  },
  embeddedSubjectRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0C4A6E' },
  headerSub: { fontSize: 11, color: '#0369A1', marginTop: 1 },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 140,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  subjectChipText: { fontSize: 11, fontWeight: '700', color: '#0369A1', flexShrink: 1 },
  notifications: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  focusCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
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
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  streakText: { fontSize: 11, fontWeight: '600', color: '#047857' },
  proactiveCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7DD3FC',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  proactiveText: { fontSize: 11, color: '#0C4A6E', lineHeight: 16 },
  mainScroll: { flex: 1, minHeight: 0 },
  mainScrollContent: { flexGrow: 1 },
  messagesBlock: { padding: 12 },
  starterBlock: { paddingVertical: 8 },
  starterTitle: { fontSize: 15, fontWeight: '700', color: '#0C4A6E', textAlign: 'center' },
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
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: { fontSize: 11, fontWeight: '700', color: '#fff' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  bubbleUser: {
    backgroundColor: '#0284C7',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 22, color: '#1e293b', ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}) },
  bubbleTextUser: { color: '#fff' },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 13, color: '#64748b' },
  composerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
    backgroundColor: '#FFFFFF',
  },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
    backgroundColor: '#FFFFFF',
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
    minHeight: 40,
    maxHeight: 110,
    fontSize: 16,
    lineHeight: 22,
    color: '#0f172a',
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 4,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.45 },
});
