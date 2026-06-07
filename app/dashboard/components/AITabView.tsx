import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../../src/theme/student';
import VidyaAIView from './VidyaAIView';

export default function AITabView() {
  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
        <Pressable style={styles.chatCta} onPress={() => router.push('/ai-tutor')}>
          <LinearGradient
            colors={[...STUDENT.heroGradient]}
            style={styles.chatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.chatIconWrap}>
              <Ionicons name="chatbubbles" size={26} color="#fff" />
            </View>
            <View style={styles.chatTextWrap}>
              <Text style={styles.chatTitle}>Vidya AI Chat</Text>
              <Text style={styles.chatSub}>Ask doubts · LaTeX math · Instant answers</Text>
            </View>
            <View style={styles.chatArrow}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
      <VidyaAIView />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  chatCta: {
    borderRadius: STUDENT_RADIUS.xl,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 18,
    ...STUDENT.shadow.md,
  },
  chatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  chatIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chatTextWrap: { flex: 1 },
  chatTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  chatSub: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 4, lineHeight: 17 },
  chatArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
