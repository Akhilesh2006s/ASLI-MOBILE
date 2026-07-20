import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';
import { GlassPanel } from '../../../src/components/ui';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';
import VidyaAIView from './VidyaAIView';

function usePressScale(to = 0.98) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = withSpring(to, { damping: 14, stiffness: 300 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 300 });
  };
  return { style, onPressIn, onPressOut };
}

export default function AITabView({ chatEnabled = true }: { chatEnabled?: boolean }) {
  const chatPress = usePressScale();

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)} style={styles.vidyaHeader}>
        <Text style={styles.vidyaTitle}>Vidya AI</Text>
        <Text style={styles.vidyaSubtitle}>
          {chatEnabled ? 'Your AI Study Buddy — Tools & Chat' : 'Your AI Study Tools'}
        </Text>
      </Animated.View>

      {chatEnabled ? (
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(30)}>
        <Pressable
          onPress={() => router.push('/ai-tutor')}
          onPressIn={chatPress.onPressIn}
          onPressOut={chatPress.onPressOut}
        >
          <Animated.View style={chatPress.style}>
            <GlassPanel style={styles.chatCard} radius={STUDENT_RADIUS.lg}>
              <View style={styles.chatCardRow}>
                <VidyaAvatar size={48} borderColor="#c7d2fe" />
                <View style={styles.chatTextWrap}>
                  <Text style={styles.chatTitle}>Vidya AI Chat</Text>
                  <Text style={styles.chatSub}>Ask Doubts · Instant Answers</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={STUDENT.primaryDark} />
              </View>
            </GlassPanel>
          </Animated.View>
        </Pressable>
      </Animated.View>
      ) : null}

      <VidyaAIView />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  vidyaHeader: {
    marginBottom: STUDENT_SPACING.lg,
  },
  vidyaTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 20,
    color: STUDENT.text,
  },
  vidyaSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: STUDENT.textMuted,
    lineHeight: 18,
  },
  // Box props stay on the panel; the row layout moves to chatCardRow because
  // GlassPanel wraps children in its own view.
  chatCard: {
    marginBottom: STUDENT_SPACING.lg,
    padding: STUDENT_SPACING.lg,
    borderRadius: STUDENT_RADIUS.lg,
    ...STUDENT.shadow.sm,
  },
  chatCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: STUDENT_SPACING.md,
  },
  chatTextWrap: { flex: 1, minWidth: 0 },
  chatTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
  },
  chatSub: {
    marginTop: 4,
    fontSize: 13,
    color: STUDENT.textMuted,
    lineHeight: 18,
  },
});
