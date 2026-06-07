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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useVidyaChat } from '../../../src/hooks/useVidyaChat';
import type { AIChatContext } from '../../../src/types/vidya';
import { useAdminTheme } from '../_ui/useAdminTheme';
import AdminScalePressable from '../_ui/AdminScalePressable';

type Props = {
  adminId: string;
  adminName: string;
};

export default function AdminVidyaChatPanel({ adminId, adminName }: Props) {
  const { colors, radius, spacing } = useAdminTheme();
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
      <View style={[styles.loadingWrap, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={[styles.header, { borderBottomColor: colors.surfaceBorder, paddingHorizontal: spacing.md }]}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={[...colors.fabGradient]} style={[styles.headerIcon, { borderRadius: radius.sm }]}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Vidya AI</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Admin assistant</Text>
          </View>
        </View>
        <AdminScalePressable
          style={[
            styles.clearBtn,
            {
              backgroundColor: colors.dangerMuted,
              borderRadius: radius.sm,
              opacity: model.isPending || model.isClearingChat || model.displayMessages.length === 0 ? 0.4 : 1,
            },
          ]}
          onPress={model.clearChat}
          disabled={model.isPending || model.isClearingChat || model.displayMessages.length === 0}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </AdminScalePressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={[styles.messagesContent, { paddingHorizontal: spacing.md }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {model.displayMessages.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(400)} style={styles.emptyBlock}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Ask about students, teachers, exams, attendance, or school reports.
            </Text>
            <View style={styles.promptGrid}>
              {starterPrompts.map((question, idx) => (
                <AdminScalePressable
                  key={question}
                  style={[
                    styles.promptCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={() => model.onPromptClick(question)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                  <Text style={[styles.promptText, { color: colors.textSecondary }]}>{question}</Text>
                </AdminScalePressable>
              ))}
            </View>
          </Animated.View>
        ) : (
          model.displayMessages.map((msg, idx) => (
            <Animated.View
              key={`${msg.role}-${idx}`}
              entering={FadeInUp.delay(idx * 30).duration(300)}
              style={[
                styles.messageRow,
                msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {msg.role === 'assistant' ? (
                <View style={[styles.avatarAssistant, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
              ) : null}
              {msg.role === 'user' ? (
                <LinearGradient colors={[...colors.fabGradient]} style={[styles.bubble, styles.bubbleUser, { borderRadius: radius.lg }]}>
                  <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
                    {model.formatMessage(msg.content)}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleAssistant,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radius.lg,
                    },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: colors.text }]}>
                    {model.formatMessage(msg.content)}
                  </Text>
                </View>
              )}
              {msg.role === 'user' ? (
                <LinearGradient colors={[...colors.fabGradient]} style={[styles.avatarUser, { borderRadius: radius.full }]}>
                  <Text style={styles.avatarUserText}>{model.userInitial}</Text>
                </LinearGradient>
              ) : null}
            </Animated.View>
          ))
        )}
        {model.isPending ? (
          <View style={[styles.messageRow, styles.messageRowAssistant]}>
            <View style={[styles.avatarAssistant, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
            </View>
            <View
              style={[
                styles.bubble,
                styles.bubbleAssistant,
                styles.thinkingBubble,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.lg },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: inputPaddingBottom,
            paddingHorizontal: spacing.md,
            borderTopColor: colors.surfaceBorder,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
              color: colors.text,
              borderRadius: radius.md,
            },
          ]}
          value={model.message}
          onChangeText={model.setMessage}
          placeholder={model.inputPlaceholder}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          editable={!model.isPending}
          onFocus={() => {
            setTimeout(() => scrollToBottom(true), 120);
          }}
        />
        <AdminScalePressable
          style={[
            styles.sendBtn,
            {
              borderRadius: radius.md,
              backgroundColor: !model.message.trim() || model.isPending ? colors.textMuted : colors.primary,
            },
          ]}
          onPress={model.handleSendMessage}
          disabled={!model.message.trim() || model.isPending}
        >
          {model.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </AdminScalePressable>
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
  loadingText: { fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 1 },
  clearBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesScroll: { flex: 1, minHeight: 0 },
  messagesContent: { paddingVertical: 16, paddingBottom: 8, flexGrow: 1 },
  emptyBlock: { paddingTop: 8 },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  promptGrid: { gap: 8 },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    padding: 12,
  },
  promptText: { flex: 1, fontSize: 13, lineHeight: 18 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  avatarUser: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUserText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  avatarAssistant: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
