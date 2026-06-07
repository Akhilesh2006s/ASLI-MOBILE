import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { TEACHER_AI_TOOLS, TEACHER_AI_TOOLS_SUBTITLE } from '../../../src/lib/teacher-ai-tools';

import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';



export default function VidyaAIView() {

  return (

    <View style={styles.container}>

      <View style={styles.header}>

        <View style={styles.headerIcon}>

          <Ionicons name="sparkles" size={32} color={TEACHER.primaryLight} />

        </View>

        <View style={styles.headerText}>

          <Text style={styles.headerTitle}>Vidya AI</Text>

          <Text style={styles.headerSubtitle}>AI-powered teaching assistant</Text>

        </View>

      </View>



      <TouchableOpacity

        style={styles.chatCard}

        activeOpacity={0.85}

        onPress={() => router.push('/teacher/vidya-chat' as any)}

      >

        <View style={styles.chatCardIcon}>

          <Ionicons name="chatbubbles" size={26} color={TEACHER.primaryLight} />

        </View>

        <View style={styles.chatCardBody}>

          <Text style={styles.chatCardTitle}>Vidya AI Chat</Text>

          <Text style={styles.chatCardDesc}>

            Ask about lessons, quizzes, classroom help, and teaching ideas

          </Text>

        </View>

        <Ionicons name="chevron-forward" size={20} color={TEACHER.primaryLight} />

      </TouchableOpacity>



      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

        <View style={styles.section}>

          <Text style={styles.sectionTitle}>Available Tools</Text>

          <Text style={styles.sectionSubtitle}>{TEACHER_AI_TOOLS_SUBTITLE}</Text>



          <View style={styles.toolsGrid}>

            {TEACHER_AI_TOOLS.map((tool) => (

              <TouchableOpacity

                key={tool.id}

                style={styles.toolCard}

                onPress={() => router.push(tool.route as any)}

                activeOpacity={0.7}

              >

                <View style={[styles.toolIcon, { backgroundColor: `${tool.color}18` }]}>

                  <Ionicons

                    name={tool.icon as keyof typeof Ionicons.glyphMap}

                    size={24}

                    color={tool.color}

                  />

                </View>

                <View style={styles.toolBody}>

                  <Text style={styles.toolTitle}>{tool.title}</Text>

                  <Text style={styles.toolDescription}>{tool.description}</Text>

                </View>

              </TouchableOpacity>

            ))}

          </View>

        </View>

      </ScrollView>

    </View>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: TEACHER.bg,

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    padding: TEACHER_SPACING.xl,

    backgroundColor: TEACHER.surface,

    borderBottomWidth: 1,

    borderBottomColor: TEACHER.surfaceBorder,

    gap: 12,

  },

  headerIcon: {

    width: 48,

    height: 48,

    borderRadius: 12,

    backgroundColor: TEACHER.navActiveBg,

    justifyContent: 'center',

    alignItems: 'center',

  },

  headerText: {

    flex: 1,

  },

  headerTitle: {

    fontSize: 24,

    fontWeight: '800',

    color: TEACHER.primaryLight,

  },

  headerSubtitle: {

    fontSize: 14,

    color: TEACHER.textMuted,

  },

  chatCard: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: TEACHER_SPACING.md,

    marginHorizontal: TEACHER_SPACING.lg,

    marginTop: TEACHER_SPACING.lg,

    padding: TEACHER_SPACING.lg,

    borderRadius: TEACHER_RADIUS.lg,

    backgroundColor: TEACHER.navActiveBg,

    borderWidth: 1,

    borderColor: TEACHER.primary,

  },

  chatCardIcon: {

    width: 48,

    height: 48,

    borderRadius: 12,

    backgroundColor: TEACHER.surface,

    alignItems: 'center',

    justifyContent: 'center',

  },

  chatCardBody: {

    flex: 1,

  },

  chatCardTitle: {

    fontSize: 17,

    fontWeight: '800',

    color: TEACHER.text,

  },

  chatCardDesc: {

    marginTop: 4,

    fontSize: 13,

    color: TEACHER.textMuted,

    lineHeight: 18,

  },

  content: {

    flex: 1,

  },

  contentContainer: {

    padding: TEACHER_SPACING.lg,

    paddingBottom: 120,

  },

  section: {

    marginBottom: TEACHER_SPACING.xxl,

  },

  sectionTitle: {

    fontSize: 22,

    fontWeight: '800',

    color: TEACHER.text,

    marginBottom: 8,

  },

  sectionSubtitle: {

    fontSize: 14,

    color: TEACHER.textMuted,

    marginBottom: 20,

    lineHeight: 20,

  },

  toolsGrid: {

    gap: TEACHER_SPACING.md,

  },

  toolCard: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: TEACHER_SPACING.md,

    backgroundColor: TEACHER.surface,

    borderRadius: TEACHER_RADIUS.lg,

    padding: TEACHER_SPACING.lg,

    borderWidth: 1,

    borderColor: TEACHER.surfaceBorder,

  },

  toolIcon: {

    width: 48,

    height: 48,

    borderRadius: 12,

    justifyContent: 'center',

    alignItems: 'center',

    flexShrink: 0,

  },

  toolBody: {

    flex: 1,

    minWidth: 0,

  },

  toolTitle: {

    fontSize: 16,

    fontWeight: '700',

    color: TEACHER.text,

    marginBottom: 4,

  },

  toolDescription: {

    fontSize: 13,

    color: TEACHER.textMuted,

    lineHeight: 18,

  },

});


