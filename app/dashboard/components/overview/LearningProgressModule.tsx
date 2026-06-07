import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SubjectProgress {
  id: string;
  name: string;
  progress: number;
  currentTopic?: string;
}

function getSubjectIcon(name: string): { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string } {
  const n = (name || '').toLowerCase();
  if (n.includes('math')) return { icon: 'calculator-outline', bg: '#fff7ed', color: '#ea580c' };
  if (n.includes('physics')) return { icon: 'planet-outline', bg: '#eff6ff', color: '#2563eb' };
  if (n.includes('chem')) return { icon: 'flask-outline', bg: '#f0fdfa', color: '#0d9488' };
  if (n.includes('bio') || n.includes('science')) return { icon: 'leaf-outline', bg: '#ecfdf5', color: '#16a34a' };
  if (n.includes('english')) return { icon: 'book-outline', bg: '#eef2ff', color: '#4f46e5' };
  if (n.includes('social')) return { icon: 'globe-outline', bg: '#fffbeb', color: '#b45309' };
  return { icon: 'book-outline', bg: '#f8fafc', color: '#475569' };
}

interface LearningProgressModuleProps {
  overallProgress: number;
  subjectProgress: SubjectProgress[];
  dark?: boolean;
}

function LearningProgressModuleComponent({
  overallProgress,
  subjectProgress,
  dark,
}: LearningProgressModuleProps) {
  const section = dark ? styles.sectionCardDark : styles.sectionCard;

  return (
    <View style={section}>
      <View style={styles.sectionHeader}>
        <Text style={dark ? styles.sectionTitleDark : styles.sectionTitleGradient}>
          Your Learning Progress
        </Text>
        <LinearGradient colors={['#fb923c', '#14b8a6']} style={styles.badge}>
          <Text style={styles.badgeText}>Asli Learn</Text>
        </LinearGradient>
      </View>

      <View style={styles.progressOverview}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressPercentage}>{overallProgress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={['#fb923c', '#3b82f6', '#14b8a6']}
            style={[styles.progressFill, { width: `${Math.min(100, overallProgress)}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      </View>

      <View style={styles.subjectProgressList}>
        {subjectProgress.length > 0 ? (
          subjectProgress.map((subject) => {
            const iconMeta = getSubjectIcon(subject.name);
            return (
              <View key={subject.id} style={styles.subjectCard}>
                <View style={styles.subjectRow}>
                  <View style={[styles.subjectIcon, { backgroundColor: iconMeta.bg }]}>
                    <Ionicons name={iconMeta.icon} size={18} color={iconMeta.color} />
                  </View>
                  <View style={styles.subjectDetails}>
                    <Text style={styles.subjectName}>{subject.name}</Text>
                    <Text style={styles.subjectTopic} numberOfLines={1}>
                      {subject.currentTopic || `${subject.name} - Recent Exams`}
                    </Text>
                  </View>
                  <Text style={styles.subjectProgressPercent}>{subject.progress}%</Text>
                </View>
                <View style={styles.subjectProgressBar}>
                  <LinearGradient
                    colors={['#fb923c', '#3b82f6', '#14b8a6']}
                    style={[styles.subjectProgressFill, { width: `${Math.min(100, subject.progress)}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.noProgressText}>Complete exams to see your subject-wise progress</Text>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionCardDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
  },
  sectionTitleDark: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  sectionTitleGradient: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ea580c',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  progressOverview: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  subjectProgressList: {
    gap: 10,
    marginBottom: 12,
  },
  subjectCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fff7ed',
    backgroundColor: '#fff',
    padding: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectDetails: {
    flex: 1,
    minWidth: 0,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
  },
  subjectTopic: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  subjectProgressPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subjectProgressBar: {
    marginTop: 8,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  noProgressText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 14,
    fontSize: 12,
  },
});

export default memo(LearningProgressModuleComponent);
