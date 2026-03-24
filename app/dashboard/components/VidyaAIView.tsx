import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const WEBSITE_TOOLS = [
  { id: 'ai-chat-assistant', title: 'AI Chat Assistant', description: 'Get instant help with your questions and doubts.', icon: 'chatbubble-outline' as keyof typeof Ionicons.glyphMap, color: '#3b82f6' },
  { id: 'smart-study-guide-generator', title: 'Smart Study Guide Generator', description: 'Create personalized study guides tailored to your needs.', icon: 'bookmark-outline' as keyof typeof Ionicons.glyphMap, color: '#fb923c' },
  { id: 'concept-breakdown-explainer', title: 'Concept Breakdown Explainer', description: 'Break down complex concepts into simple explanations.', icon: 'bulb-outline' as keyof typeof Ionicons.glyphMap, color: '#3b82f6' },
  { id: 'smart-qa-practice-generator', title: 'Smart Q&A Practice Generator', description: 'Generate practice questions with detailed answers.', icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap, color: '#fb923c' },
  { id: 'chapter-summary-creator', title: 'Chapter Summary Creator', description: 'Create concise summaries of chapters and topics.', icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap, color: '#3b82f6' },
  { id: 'key-points-formula-extractor', title: 'Key Points Extractor', description: 'Extract key points from any topic.', icon: 'key-outline' as keyof typeof Ionicons.glyphMap, color: '#14b8a6' },
  { id: 'quick-assignment-builder', title: 'Quick Assignment Builder', description: 'Build structured assignments quickly and efficiently.', icon: 'clipboard-outline' as keyof typeof Ionicons.glyphMap, color: '#fb923c' },
  { id: 'flashcard-generator', title: 'Flashcard Generator', description: 'Create flashcards for effective memorization.', icon: 'albums-outline' as keyof typeof Ionicons.glyphMap, color: '#ec4899' },
  { id: 'exam-question-paper-generator', title: 'Exam Question Paper Generator', description: 'Generate exam question papers.', icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap, color: '#ef4444' },
  { id: 'activity-project-generator', title: 'Activity & Project Generator', description: 'Generate activities and projects.', icon: 'grid-outline' as keyof typeof Ionicons.glyphMap, color: '#eab308' },
  { id: 'story-passage-creator', title: 'Story & Passage Creator', description: 'Create stories and passages.', icon: 'document-outline' as keyof typeof Ionicons.glyphMap, color: '#3b82f6' },
  { id: 'lesson-planner', title: 'Lesson Planner', description: 'Plan your lessons effectively.', icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap, color: '#8b5cf6' },
];

export default function VidyaAIView() {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const isTablet = width >= 768;
  const cardWidth = isTablet ? '31.5%' : '48%';

  const openTool = (toolId: string) => {
    if (toolId === 'ai-chat-assistant') {
      router.push('/ai-tutor');
      return;
    }
    router.push(`/student/tools/${toolId}` as any);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.headerTitle, compact && { fontSize: 22 }]}>Vidya AI</Text>
      <Text style={styles.headerSubtitle}>Select a tool to get started with AI-powered learning</Text>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolsGrid}>
          {WEBSITE_TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={[styles.toolCard, { width: cardWidth }, compact && { minHeight: 140, padding: 12 }]}
              onPress={() => openTool(tool.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.toolIconContainer, { backgroundColor: `${tool.color}22` }]}>
                <Ionicons name={tool.icon} size={20} color={tool.color} />
              </View>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  headerSubtitle: { marginTop: 2, marginBottom: 12, fontSize: 13, color: '#6b7280' },
  content: { flex: 1 },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 10,
  },
  toolCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 150,
  },
  toolIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
});

