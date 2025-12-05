import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';
import VidyaAIViewChat from './VidyaAIViewChat';

type VidyaAISubTab = 'teacher-tools' | 'chat';

export default function VidyaAIView() {
  const [activeSubTab, setActiveSubTab] = useState<VidyaAISubTab>('teacher-tools');
  const [teacherId, setTeacherId] = useState<string>('');

  useEffect(() => {
    fetchTeacherId();
  }, []);

  const fetchTeacherId = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user?._id || data.user?.id) {
          setTeacherId(data.user._id || data.user.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch teacher ID:', error);
    }
  };

  const teacherTools = [
    {
      id: 'activity-project-generator',
      title: 'Activity & Project Generator',
      description: 'Create engaging activities and projects tailored to your curriculum.',
      icon: 'sparkles' as keyof typeof Ionicons.glyphMap,
      color: '#f97316',
      route: '/teacher/tools/activity-project-generator'
    },
    {
      id: 'worksheet-mcq-generator',
      title: 'Worksheet & MCQ Generator',
      description: 'Design custom worksheets and MCQs with various question types.',
      icon: 'document-text' as keyof typeof Ionicons.glyphMap,
      color: '#8b5cf6',
      route: '/teacher/tools/worksheet-mcq-generator'
    },
    {
      id: 'concept-mastery-helper',
      title: 'Concept Mastery Helper',
      description: 'Break down complex concepts into digestible lessons.',
      icon: 'bulb' as keyof typeof Ionicons.glyphMap,
      color: '#14b8a6',
      route: '/teacher/tools/concept-mastery-helper'
    },
    {
      id: 'lesson-planner',
      title: 'Lesson Planner',
      description: 'Plan structured lessons with objectives and activities.',
      icon: 'calendar' as keyof typeof Ionicons.glyphMap,
      color: '#f97316',
      route: '/teacher/tools/lesson-planner'
    },
    {
      id: 'exam-question-paper-generator',
      title: 'Exam Question Paper Generator',
      description: 'Create comprehensive exam papers with varying difficulty.',
      icon: 'help-circle' as keyof typeof Ionicons.glyphMap,
      color: '#8b5cf6',
      route: '/teacher/tools/exam-question-paper-generator'
    },
    {
      id: 'daily-class-plan-maker',
      title: 'Daily Class Plan Maker',
      description: 'Organize your daily teaching schedule efficiently.',
      icon: 'checkmark-square' as keyof typeof Ionicons.glyphMap,
      color: '#14b8a6',
      route: '/teacher/tools/daily-class-plan-maker'
    },
    {
      id: 'homework-creator',
      title: 'Homework Creator',
      description: 'Generate meaningful homework assignments.',
      icon: 'rocket' as keyof typeof Ionicons.glyphMap,
      color: '#f97316',
      route: '/teacher/tools/homework-creator'
    },
    {
      id: 'rubrics-evaluation-generator',
      title: 'Rubrics & Evaluation Generator',
      description: 'Create clear assessment criteria and rubrics.',
      icon: 'scale' as keyof typeof Ionicons.glyphMap,
      color: '#8b5cf6',
      route: '/teacher/tools/rubrics-evaluation-generator'
    },
    {
      id: 'learning-outcomes-generator',
      title: 'Learning Outcomes Generator',
      description: 'Define measurable learning outcomes for your courses.',
      icon: 'target' as keyof typeof Ionicons.glyphMap,
      color: '#14b8a6',
      route: '/teacher/tools/learning-outcomes-generator'
    },
    {
      id: 'story-passage-creator',
      title: 'Story & Passage Creator',
      description: 'Generate engaging stories and reading passages.',
      icon: 'book' as keyof typeof Ionicons.glyphMap,
      color: '#f97316',
      route: '/teacher/tools/story-passage-creator'
    },
    {
      id: 'short-notes-summaries-maker',
      title: 'Short Notes & Summaries Maker',
      description: 'Condense complex topics into concise notes.',
      icon: 'layers' as keyof typeof Ionicons.glyphMap,
      color: '#14b8a6',
      route: '/teacher/tools/short-notes-summaries-maker'
    },
    {
      id: 'flashcard-generator',
      title: 'Flashcard Generator',
      description: 'Build study flashcards for quick revision.',
      icon: 'card' as keyof typeof Ionicons.glyphMap,
      color: '#f97316',
      route: '/teacher/tools/flashcard-generator'
    },
    {
      id: 'report-card-generator',
      title: 'Report Card Generator',
      description: 'Generate comprehensive student progress reports with feedback.',
      icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
      color: '#8b5cf6',
      route: '/teacher/tools/report-card-generator'
    },
    {
      id: 'student-skill-tracker',
      title: 'Student Skill Tracker',
      description: 'Monitor and track student skill development.',
      icon: 'trending-up' as keyof typeof Ionicons.glyphMap,
      color: '#14b8a6',
      route: '/teacher/tools/student-skill-tracker'
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={32} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Vidya AI</Text>
          <Text style={styles.headerSubtitle}>AI-powered teaching assistant</Text>
        </View>
      </View>

      {/* Sub-Tabs */}
      <View style={styles.subTabsContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'teacher-tools' && styles.subTabActive]}
          onPress={() => setActiveSubTab('teacher-tools')}
        >
          <Ionicons name="construct" size={16} color={activeSubTab === 'teacher-tools' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.subTabText, activeSubTab === 'teacher-tools' && styles.subTabTextActive]}>
            Teacher Tools
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'chat' && styles.subTabActive]}
          onPress={() => setActiveSubTab('chat')}
        >
          <Ionicons name="chatbubble" size={16} color={activeSubTab === 'chat' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.subTabText, activeSubTab === 'chat' && styles.subTabTextActive]}>
            Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Teacher Tools Tab */}
      {activeSubTab === 'teacher-tools' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['#f97316', '#ea580c']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="sparkles" size={32} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardValue}>14</Text>
                    <Text style={styles.statCardLabel}>Total Tools</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#0ea5e9', '#0284c7']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="trending-up" size={32} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardValue}>50%</Text>
                    <Text style={styles.statCardLabel}>Time Saved</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={['#14b8a6', '#0d9488']}
                style={styles.statCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <Ionicons name="document-text" size={32} color="#fff" />
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardValue}>1000+</Text>
                    <Text style={styles.statCardLabel}>Resources</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Available Tools */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Tools</Text>
            <Text style={styles.sectionSubtitle}>
              Select a tool to get started with AI-assisted teaching resources
            </Text>

            <View style={styles.toolsGrid}>
              {teacherTools.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  style={styles.toolCard}
                  onPress={() => router.push(tool.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toolIcon, { backgroundColor: tool.color + '20' }]}>
                    <Ionicons name={tool.icon} size={24} color={tool.color} />
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Chat Tab */}
      {activeSubTab === 'chat' && (
        <VidyaAIViewChat teacherId={teacherId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  headerIcon: {
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
    color: '#3b82f6',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    gap: 8,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  subTabActive: {
    backgroundColor: '#dbeafe',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  subTabTextActive: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  statCardGradient: {
    padding: 16,
    minHeight: 100,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statCardText: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  toolsGrid: {
    gap: 16,
  },
  toolCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  toolDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

