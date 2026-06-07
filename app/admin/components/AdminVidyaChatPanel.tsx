import { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVidyaChat } from '../../../src/hooks/useVidyaChat';
import type { AIChatContext } from '../../../src/types/vidya';

type Props = {
  adminId: string;
  adminName: string;
};

export default function AdminVidyaChatPanel({ adminId, adminName }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputPaddingBottom = Math.max(insets.bottom, 8);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 120 : 0;

  const chatContext = useMemo<AIChatContext>(
    () => ({
      studentName: adminName,
      currentSubject: 'Administration',
    }),
    [adminName]
  );

  const model = useVidyaChat({
    userId: adminId,
    role: 'admin',
    context: chatContext,
  });

  const starterPrompts = model.quickQuestions.slice(0, 4);

  const scrollToBottom = (animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [model.displayMessages, model.isPending]);

  if (model.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#fb923c" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={['#fb923c', '#f97316']} style={styles.headerIcon}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </LinearGradient>
          <Text style={styles.headerTitle}>Vidya AI</Text>
        </View>
        <Pressable
          style={[
            styles.clearBtn,
            (model.isPending || model.isClearingChat || model.displayMessages.length === 0) &&
              styles.clearBtnDisabled,
          ]}
          onPress={model.clearChat}
          disabled={model.isPending || model.isClearingChat || model.displayMessages.length === 0}
        >
          <Ionicons name="trash-outline" size={16} color="#ea580c" />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {model.displayMessages.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>
              Ask about students, teachers, exams, attendance, or school reports.
            </Text>
            <View style={styles.promptGrid}>
              {starterPrompts.map((question) => (
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
              {msg.role === 'assistant' ? (
                <View style={styles.avatarAssistant}>
                  <Ionicons name="sparkles" size={14} color="#ea580c" />
                </View>
              ) : null}
              {msg.role === 'user' ? (
                <LinearGradient colors={['#fb923c', '#f97316']} style={[styles.bubble, styles.bubbleUser]}>
                  <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
                    {model.formatMessage(msg.content)}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.bubbleAssistant]}>
                  <Text style={styles.bubbleText}>{model.formatMessage(msg.content)}</Text>
                </View>
              )}
              {msg.role === 'user' ? (
                <View style={styles.avatarUser}>
                  <Text style={styles.avatarUserText}>{model.userInitial}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
        {model.isPending ? (
          <View style={[styles.messageRow, styles.messageRowAssistant]}>
            <View style={styles.avatarAssistant}>
              <Ionicons name="sparkles" size={14} color="#ea580c" />
            </View>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
              <ActivityIndicator size="small" color="#fb923c" />
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
          onFocus={() => {
            setTimeout(() => scrollToBottom(true), 120);
          }}
        />
        <Pressable
          style={[styles.sendBtn, (!model.message.trim() || model.isPending) && styles.sendBtnDisabled]}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#64748b', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnDisabled: { opacity: 0.4 },
  messagesScroll: { flex: 1, minHeight: 0 },
  messagesContent: { paddingVertical: 16, paddingBottom: 8, flexGrow: 1 },
  emptyBlock: { paddingTop: 8 },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  promptGrid: { gap: 8 },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  promptText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20, color: '#1e293b' },
  bubbleTextUser: { color: '#fff' },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fb923c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUserText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  avatarAssistant: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fb923c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#d1d5db' },
});
