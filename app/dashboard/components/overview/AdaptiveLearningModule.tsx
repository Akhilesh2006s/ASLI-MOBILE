import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SubjectProgress {
  id: string;
  name: string;
  progress: number;
}

interface AdaptiveLearningModuleProps {
  subjectProgress: SubjectProgress[];
}

function AdaptiveLearningModuleComponent({ subjectProgress }: AdaptiveLearningModuleProps) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Adaptive Learning</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI Powered</Text>
        </View>
      </View>
      {subjectProgress.length === 0 ? (
        <Text style={styles.noProgressText}>Adaptive recommendations appear after your first exam attempts.</Text>
      ) : (
        <View style={styles.adaptiveList}>
          {subjectProgress.slice(0, 3).map((subject) => (
            <View key={`adaptive-${subject.id}`} style={styles.adaptiveCard}>
              <View style={styles.adaptiveTop}>
                <Text style={styles.adaptiveSubject}>{subject.name}</Text>
                <Text style={styles.adaptiveProgress}>{subject.progress}%</Text>
              </View>
              <Text style={styles.adaptiveLabel}>Recommended Videos</Text>
              <Text style={styles.adaptiveItem}>- Continue weak-topic revision for {subject.name}</Text>
              <Text style={styles.adaptiveLabel}>Recommended Notes</Text>
              <Text style={styles.adaptiveItem}>- Practice notes and formula sheet for {subject.name}</Text>
            </View>
          ))}
        </View>
      )}
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
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  noProgressText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 12,
    fontSize: 12,
  },
  adaptiveList: {
    gap: 8,
  },
  adaptiveCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fafafa',
  },
  adaptiveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  adaptiveSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  adaptiveProgress: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '700',
  },
  adaptiveLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#4b5563',
  },
  adaptiveItem: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
});

export default memo(AdaptiveLearningModuleComponent);
