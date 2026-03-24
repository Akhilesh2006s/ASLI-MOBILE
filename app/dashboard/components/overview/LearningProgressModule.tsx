import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SubjectProgress {
  id: string;
  name: string;
  progress: number;
}

interface LearningProgressModuleProps {
  overallProgress: number;
  subjectProgress: SubjectProgress[];
  onPressViewPath: () => void;
}

function LearningProgressModuleComponent({
  overallProgress,
  subjectProgress,
  onPressViewPath,
}: LearningProgressModuleProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Learning Progress</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Asli Learn</Text>
        </View>
      </View>

      <View style={styles.progressOverview}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressPercentage}>{overallProgress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={['#fb923c', '#3b82f6', '#14b8a6']}
            style={[styles.progressFill, { width: `${overallProgress}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      </View>

      <View style={styles.subjectProgressList}>
        {subjectProgress.length > 0 ? (
          subjectProgress.map((subject) => (
            <View key={subject.id} style={styles.subjectProgressItem}>
              <View style={styles.subjectInfo}>
                <View style={styles.subjectIcon}>
                  <Text style={styles.subjectIconText}>{subject.name.substring(0, 2)}</Text>
                </View>
                <View style={styles.subjectDetails}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectTopic}>{subject.name} - Recent Exams</Text>
                </View>
              </View>
              <View style={styles.subjectProgressRight}>
                <Text style={styles.subjectProgressPercent}>{subject.progress}%</Text>
                <View style={styles.subjectProgressBar}>
                  <View style={[styles.subjectProgressFill, { width: `${subject.progress}%` }]} />
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noProgressText}>Complete exams to see your subject-wise progress</Text>
        )}
      </View>

      <TouchableOpacity style={styles.viewButton} onPress={onPressViewPath}>
        <Text style={styles.viewButtonText}>View Complete Learning Path</Text>
      </TouchableOpacity>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#fb923c',
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
    marginBottom: 12,
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
    color: '#111827',
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3b82f6',
  },
  progressBar: {
    height: 8,
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
  subjectProgressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  subjectIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectIconText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  subjectDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  subjectTopic: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  subjectProgressRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  subjectProgressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  subjectProgressBar: {
    width: 56,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 999,
  },
  noProgressText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 14,
    fontSize: 12,
  },
  viewButton: {
    backgroundColor: '#fb923c',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default memo(LearningProgressModuleComponent);
