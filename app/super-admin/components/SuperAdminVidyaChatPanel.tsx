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
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useVidyaChat } from '../../../src/hooks/useVidyaChat';
import type { AIChatContext } from '../../../src/types/vidya';

type Props = {
  userId?: string;
  onRegisterSend?: (send: (message: string) => void) => void;
};

export default function SuperAdminVidyaChatPanel({ userId = 'super-admin', onRegisterSend }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputPaddingBottom = Math.max(insets.bottom, 8);
  const keyboardVerticalOffset = Platform.OS === 'ios' ? insets.top + 120 : 0;

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

  useEffect(() => {
    onRegisterSend?.(model.sendSpecificMessage);
  }, [model.sendSpecificMessage, onRegisterSend]);

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
        <Text style={styles.loadingText}>Loading control assistant…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.panelHeader}>
        <View style={styles.panelHeaderRow}>
          <View style={styles.panelHeaderLeft}>
            <View style={styles.panelHeaderIcon}>
              <Ionicons name="sparkles" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelHeaderTitle}>AI System Control Panel</Text>
              <Text style={styles.panelHeaderSub}>
                Database-backed control assistant with live MongoDB aggregates.
              </Text>
            </View>
          </View>
          <View style={styles.controlBadge}>
            <Text style={styles.controlBadgeText}>Control Mode: Active</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.consoleCard}>
        <View style={styles.consoleToolbar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.consoleTitle}>Control Console</Text>
            <Text style={styles.consoleSub}>
              Ask platform metrics; numbers are computed server-side.
            </Text>
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
            <Text style={styles.clearBtnText}>
              {model.isClearingChat ? 'Clearing…' : 'Clear Chat'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {model.displayMessages.length === 0 ? (
            <Animated.View entering={FadeInUp.duration(400)} style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>System Control Assistant Ready</Text>
              <Text style={styles.emptyText}>
                Run diagnostics, audits, and platform-wide AI checks.
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
            </Animated.View>
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
                <Text style={styles.avatarText}>AI</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color="#f97316" />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: inputPaddingBottom }]}>
          <Pressable
            style={styles.iconBtn}
            onPress={model.pickAndAnalyzeImage}
            disabled={model.isPending}
          >
            <Ionicons name="image-outline" size={20} color="#64748b" />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={model.handleVoiceInput}
            disabled={model.isPending || model.isListening}
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
  panelHeader: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  panelHeaderRow: { gap: 10 },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  panelHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  panelHeaderSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 16 },
  controlBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  controlBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  consoleCard: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  consoleToolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  consoleTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  consoleSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  clearBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  clearBtnDisabled: { opacity: 0.4 },
  clearBtnText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  messagesScroll: { flex: 1, minHeight: 0 },
  messagesContent: { padding: 14, paddingBottom: 8, flexGrow: 1 },
  emptyBlock: { paddingTop: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, marginBottom: 16 },
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
  avatarTextAssistant: { color: '#c2410c' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: '#334155', borderBottomRightRadius: 4 },
  bubbleAssistant: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: '#1e293b' },
  thinkingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 40,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
