import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getDashboardPath } from '../src/hooks/useBackNavigation';

const { width } = Dimensions.get('window');

const slides = [
  {
    title: 'Tutor for Students,\nAssistant for Teachers',
    description: [
      'Teacher assigns homework on schedule',
      'AI guides students to complete homework and learn'
    ],
    card: {
      badge: 'Physics Homework',
      questionLabel: 'Q:',
      options: ['A:', ' ', ' ', ' '],
      showPointer: false,
      showHint: false,
    },
  },
  {
    title: 'Tutor for Students,\nAssistant for Teachers',
    description: [
      'Teacher assigns homework on schedule',
      'AI guides students to complete homework and learn'
    ],
    card: { badge: 'Physics Homework', questionLabel: 'Q:', options: ['A:', '•', '•', '•'], showPointer: true, showHint: false },
  },
  {
    title: 'Tutor for Students,\nAssistant for Teachers',
    description: [
      'Teacher assigns homework on schedule',
      'AI guides students to complete homework and learn'
    ],
    card: { badge: 'Physics Homework', questionLabel: 'Q:', options: ['A:', '○', '●', '○'], showPointer: true, showHint: false },
  },
  {
    title: 'Tutor for Students,\nAssistant for Teachers',
    description: [
      'Teacher assigns homework on schedule',
      'AI guides students to complete homework and learn'
    ],
    card: { badge: 'Physics Homework', questionLabel: 'Q:', options: ['A:', '✗', '○', '○'], showPointer: false, showHint: false },
  },
  {
    title: 'Tutor for Students,\nAssistant for Teachers',
    description: [
      'Teacher assigns homework on schedule',
      'AI guides students to complete homework and learn'
    ],
    card: { badge: 'Physics Homework', questionLabel: 'Q:', options: ['A:', '✗', '○', '○'], showPointer: false, showHint: true },
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const seen = await SecureStore.getItemAsync('hasSeenOnboarding');
      if (seen === 'true') {
        setHasSeenOnboarding(true);
        // Redirect to dashboard if already seen
        const dashboardPath = await getDashboardPath();
        if (dashboardPath) {
          router.replace(dashboardPath);
        } else {
          router.replace('/auth/login');
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleGetStarted = async () => {
    try {
      await SecureStore.setItemAsync('hasSeenOnboarding', 'true');
      const dashboardPath = await getDashboardPath();
      if (dashboardPath) {
        router.replace(dashboardPath);
      } else {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      router.replace('/auth/login');
    }
  };

  const slide = slides[index];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.phoneFrame}>
        {/* Status bar mock */}
        <View style={styles.statusBar}>
          <Text style={styles.statusBarText}>9:43</Text>
          <View style={styles.statusBarRight}>
            <Text style={styles.statusBarText}>4G</Text>
            <Text style={styles.statusBarText}>84%</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentInner}>
            <Text style={styles.title}>{slide.title}</Text>

            {/* Dots */}
            <View style={styles.dotsContainer}>
              {slides.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === index && styles.dotActive
                  ]}
                />
              ))}
            </View>

            {/* Info bubbles */}
            <View style={styles.bubblesContainer}>
              {slide.description.map((text, i) => (
                <View key={i} style={styles.bubble}>
                  <View style={styles.bubbleNumber}>
                    <Text style={styles.bubbleNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.bubbleText}>{text}</Text>
                </View>
              ))}
            </View>

            {/* Homework card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>#{slide.card.badge}</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardQuestionLabel}>{slide.card.questionLabel}</Text>
                <View style={styles.cardQuestionBox}>
                  <Text style={styles.cardQuestionPlaceholder}>
                    Physics question with graph
                  </Text>
                </View>
                <View style={styles.cardOptions}>
                  {slide.card.options.map((option, i) => {
                    const isSelected = option === '●';
                    const isWrong = option === '✗';
                    return (
                      <View
                        key={i}
                        style={[
                          styles.cardOption,
                          isSelected && styles.cardOptionSelected,
                          isWrong && styles.cardOptionWrong
                        ]}
                      >
                        <Text style={styles.cardOptionLabel}>
                          {['A', 'B', 'C', 'D'][i]}
                        </Text>
                        <View style={styles.cardOptionBar} />
                        {isSelected && <View style={styles.cardOptionIndicator} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Floating hint */}
            {slide.card.showHint && (
              <View style={styles.hintContainer}>
                <View style={styles.hintBubble}>
                  <Text style={styles.hintText}>
                    Try this formula by keeping velocity constant!
                  </Text>
                </View>
                <View style={styles.hintIcon}>
                  <Ionicons name="help-circle" size={16} color="#fff" />
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom swipe indicator */}
        <View style={styles.swipeIndicator}>
          <View style={styles.swipeBar} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneFrame: {
    width: Math.min(width - 40, 360),
    height: '90%',
    maxHeight: 720,
    borderRadius: 28,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  statusBar: {
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  statusBarText: {
    fontSize: 10,
    color: '#6b7280',
  },
  statusBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: '#2a2438',
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  dotActive: {
    width: 32,
    backgroundColor: '#6c63ff',
  },
  bubblesContainer: {
    gap: 8,
    marginBottom: 16,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f2ff',
    borderWidth: 1,
    borderColor: '#e8e4ff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  bubbleNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleNumberText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  bubbleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#2a2438',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 16,
  },
  cardHeader: {
    padding: 12,
    paddingBottom: 0,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },
  cardQuestionLabel: {
    fontSize: 12,
    color: '#8a8a9e',
    marginBottom: 8,
  },
  cardQuestionBox: {
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardQuestionPlaceholder: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardOptions: {
    gap: 8,
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  cardOptionSelected: {
    borderColor: '#6c63ff',
    backgroundColor: '#f3f2ff',
  },
  cardOptionWrong: {
    borderColor: '#ef4444',
  },
  cardOptionLabel: {
    marginRight: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  cardOptionBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  cardOptionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6c63ff',
    marginLeft: 8,
  },
  hintContainer: {
    position: 'absolute',
    right: 40,
    bottom: 80,
    alignItems: 'flex-end',
  },
  hintBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 11,
    color: '#374151',
  },
  hintIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c63ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  swipeBar: {
    width: 96,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
  },
});


