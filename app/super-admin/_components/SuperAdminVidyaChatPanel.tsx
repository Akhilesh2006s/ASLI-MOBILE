import { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVidyaChat } from '../../../src/hooks/useVidyaChat';
import type { AIChatContext } from '../../../src/types/vidya';

type Props = {
  userId?: string;
};

export default function SuperAdminVidyaChatPanel({ userId = 'super-admin' }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputPaddingBottom = Math.max(insets.bottom, 8);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 80 : 0;

  const chatContext = useMemo<AIChatContext>(
    () => ({
      studentName: 'Super Admin',
      currentSubject: 'System Control',
    }),
    []
  );

  const model = useVidyaChat({
    userId,
    role: 'super_admin',
    context: chatContext,
  });

  const scrollToBottom = (animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [model.displayMessages, model.isPending]);

  if (model.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading Vidya AI…</Text>
      </View>
    );
  }

  const canClear =
    !model.isPending && !model.isClearingChat && model.displayMessages.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.headerTitle}>Vidya AI</Text>
          </View>
          <Pressable
            style={[styles.clearBtn, !canClear && styles.clearBtnDisabled]}
            onPress={model.clearChat}
            disabled={!canClear}
          >
            <Text style={styles.clearBtnText}>
              {model.isClearingChat ? 'Clearing…' : 'Clear'}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.chatCard}>
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {model.displayMessages.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>Ask about platform metrics</Text>
              <Text style={styles.emptyText}>
                Students, teachers, exams, attendance, and AI usage — answered from live data.
              </Text>
              <View style={styles.promptGrid}>
                {model.quickQuestions.map((question) => (
                  <Pressable
                    key={question}
                    style={styles.promptCard}
                    onPress={() => model.onPromptClick(question)}
                  >
                    <Text style={styles.promptText}>{question}</Text>
                  </Pressable>
                ))}
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
                <View
                  style={[
                    styles.avatar,
                    msg.role === 'user' ? styles.avatarUser : styles.avatarAssistant,
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarText,
                      msg.role === 'assistant' && styles.avatarTextAssistant,
                    ]}
                  >
                    {msg.role === 'user' ? model.userInitial : 'AI'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                    ]}
                  >
                    {model.formatMessage(msg.content)}
                  </Text>
                </View>
              </View>
            ))
          )}
          {model.isPending ? (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={[styles.avatar, styles.avatarAssistant]}>
                <Text style={styles.avatarTextAssistant}>AI</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color="#f97316" />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: inputPaddingBottom }]}>
          <TextInput
            style={styles.input}
            value={model.message}
            onChangeText={model.setMessage}
            placeholder={model.inputPlaceholder}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={2000}
            editable={!model.isPending}
            onFocus={() => setTimeout(() => scrollToBottom(true), 120)}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!model.message.trim() || model.isPending) && styles.sendBtnDisabled,
            ]}
            onPress={model.handleSendMessage}
            disabled={!model.message.trim() || model.isPending}
          >
            {model.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 280 },
  loadingText: { fontSize: 14, color: '#64748b' },
  header: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  clearBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  clearBtnDisabled: { opacity: 0.4 },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  chatCard: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  messagesScroll: { flex: 1, minHeight: 0 },
  messagesContent: { padding: 14, paddingBottom: 8, flexGrow: 1 },
  emptyBlock: { paddingTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 18 },
  promptGrid: { gap: 8 },
  promptCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  promptText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  messageRowUser: { flexDirection: 'row-reverse' },
  messageRowAssistant: {},
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: { backgroundColor: '#334155' },
  avatarAssistant: { backgroundColor: '#ffedd5' },
  avatarText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  avatarTextAssistant: { color: '#c2410c', fontSize: 11, fontWeight: '700' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#334155', borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: '#1e293b' },
  thinkingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
