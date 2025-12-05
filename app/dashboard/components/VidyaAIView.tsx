import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const STUDENT_TOOLS = [
  {
    id: 'smart-study-guide-generator',
    title: 'Smart Study Guide Generator',
    description: 'Create personalized study guides tailored to your needs.',
    icon: 'bookmark' as keyof typeof Ionicons.glyphMap,
    color: '#fb923c',
  },
  {
    id: 'concept-breakdown-explainer',
    title: 'Concept Breakdown Explainer',
    description: 'Break down complex concepts into simple explanations.',
    icon: 'bulb' as keyof typeof Ionicons.glyphMap,
    color: '#3b82f6',
  },
  {
    id: 'personalized-revision-planner',
    title: 'Personalized Revision Planner',
    description: 'Get a customized revision schedule based on your goals.',
    icon: 'calendar' as keyof typeof Ionicons.glyphMap,
    color: '#14b8a6',
  },
  {
    id: 'smart-qa-practice-generator',
    title: 'Smart Q&A Practice Generator',
    description: 'Generate practice questions with detailed answers.',
    icon: 'help-circle' as keyof typeof Ionicons.glyphMap,
    color: '#fb923c',
  },
  {
    id: 'chapter-summary-creator',
    title: 'Chapter Summary Creator',
    description: 'Create concise summaries of chapters and topics.',
    icon: 'document-text' as keyof typeof Ionicons.glyphMap,
    color: '#3b82f6',
  },
  {
    id: 'key-points-formula-extractor',
    title: 'Key Points & Formula Extractor',
    description: 'Extract key points and formulas from any topic.',
    icon: 'key' as keyof typeof Ionicons.glyphMap,
    color: '#14b8a6',
  },
  {
    id: 'quick-assignment-builder',
    title: 'Quick Assignment Builder',
    description: 'Build structured assignments quickly and efficiently.',
    icon: 'clipboard' as keyof typeof Ionicons.glyphMap,
    color: '#fb923c',
  },
  {
    id: 'exam-readiness-checker',
    title: 'Exam Readiness Checker',
    description: 'Assess your readiness for upcoming exams.',
    icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
    color: '#3b82f6',
  },
  {
    id: 'project-layout-designer',
    title: 'Project Layout Designer',
    description: 'Design structured layouts for your projects.',
    icon: 'grid' as keyof typeof Ionicons.glyphMap,
    color: '#14b8a6',
  },
  {
    id: 'goal-motivation-planner',
    title: 'Goal & Motivation Planner',
    description: 'Set goals and create motivation plans for success.',
    icon: 'target' as keyof typeof Ionicons.glyphMap,
    color: '#fb923c',
  },
];

export default function VidyaAIView() {
  const [activeTab, setActiveTab] = useState<'student-tools' | 'chat'>('student-tools');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <Ionicons name="sparkles" size={32} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Vidya AI</Text>
          <Text style={styles.headerSubtitle}>AI-powered study tools</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'student-tools' && styles.tabActive]}
          onPress={() => setActiveTab('student-tools')}
        >
          <Text style={[styles.tabText, activeTab === 'student-tools' && styles.tabTextActive]}>
            Student Tools
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
            Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Student Tools Tab */}
      {activeTab === 'student-tools' && (
        <ScrollView style={styles.content}>
          {/* Stats Overview */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#fb923c' }]}>
              <Text style={styles.statValue}>10</Text>
              <Text style={styles.statLabel}>Tools</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.statValue}>24/7</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#14b8a6' }]}>
              <Text style={styles.statValue}>AI</Text>
              <Text style={styles.statLabel}>Powered</Text>
            </View>
          </View>

          {/* Tools List */}
          <View style={styles.toolsList}>
            {STUDENT_TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={styles.toolCard}
                onPress={() => router.push(`/student/tools/${tool.id}` as any)}
              >
                <View style={[styles.toolIconContainer, { backgroundColor: `${tool.color}20` }]}>
                  <Ionicons name={tool.icon} size={20} color={tool.color} />
                </View>
                <View style={styles.toolContent}>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <View style={styles.chatContainer}>
          <View style={styles.chatEmptyState}>
            <Ionicons name="chatbubbles" size={64} color="#d1d5db" />
            <Text style={styles.chatEmptyTitle}>AI Chat</Text>
            <Text style={styles.chatEmptyText}>Start a conversation with Vidya AI</Text>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push('/ai-tutor')}
            >
              <Text style={styles.chatButtonText}>Open AI Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  toolsList: {
    gap: 12,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  toolIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolContent: {
    flex: 1,
    gap: 4,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  toolDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatEmptyState: {
    alignItems: 'center',
    padding: 40,
  },
  chatEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  chatEmptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  chatButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

