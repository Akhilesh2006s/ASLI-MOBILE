import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface ClassStats {
  totalStudents: number;
  activeStudents: number;
  totalAssignments: number;
  completedAssignments: number;
  averageScore: number;
  attendanceRate: number;
  recentActivity: Array<{
    _id: string;
    type: string;
    title: string;
    studentName: string;
    timestamp: string;
  }>;
}

interface Student {
  _id: string;
  fullName: string;
  email: string;
  lastActive?: string;
  progress?: number;
  assignmentsCompleted?: number;
  totalAssignments?: number;
}

export default function ClassDashboardView() {
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('all');

  useEffect(() => {
    fetchClassData();
    fetchStudents();
  }, [selectedClass]);

  const fetchClassData = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/class-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch class data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading class data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.overallCard}
          >
            <Text style={styles.overallLabel}>Class Overview</Text>
            <Text style={styles.overallValue}>{stats.totalStudents} Students</Text>
            <View style={styles.overallMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="people" size={16} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.metaText}>{stats.activeStudents} Active</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle" size={16} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.metaText}>{stats.attendanceRate}% Attendance</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="clipboard" size={24} color="#3b82f6" />
              <Text style={styles.statValue}>{stats.totalAssignments}</Text>
              <Text style={styles.statLabel}>Assignments</Text>
              <Text style={styles.statSubtext}>
                {stats.completedAssignments} completed
              </Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trophy" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{stats.averageScore}%</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
              <Text style={styles.statSubtext}>Class average</Text>
            </View>
          </View>
        </View>
      )}

      {/* Students List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Students ({students.length})</Text>
        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No students assigned</Text>
          </View>
        ) : (
          students.map((student) => {
            const progress = student.progress || 0;
            const assignmentsProgress = student.totalAssignments
              ? Math.round((student.assignmentsCompleted || 0) / student.totalAssignments * 100)
              : 0;

            return (
              <View key={student._id} style={styles.studentCard}>
                <View style={styles.studentHeader}>
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentAvatarText}>
                      {student.fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.fullName}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                  </View>
                  <View style={styles.progressBadge}>
                    <Text style={styles.progressBadgeText}>{progress}%</Text>
                  </View>
                </View>
                <View style={styles.studentProgress}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <View style={styles.studentMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                      <Text style={styles.metaText}>
                        {student.assignmentsCompleted || 0}/{student.totalAssignments || 0} assignments
                      </Text>
                    </View>
                    {student.lastActive && (
                      <Text style={styles.lastActiveText}>
                        Last active: {new Date(student.lastActive).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Recent Activity */}
      {stats && stats.recentActivity && stats.recentActivity.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {stats.recentActivity.map((activity) => (
            <View key={activity._id} style={styles.activityCard}>
              <View style={styles.activityIcon}>
                <Ionicons
                  name={activity.type === 'assignment' ? 'clipboard' : 'document-text'}
                  size={20}
                  color="#3b82f6"
                />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityStudent}>{activity.studentName}</Text>
              </View>
              <Text style={styles.activityTime}>
                {new Date(activity.timestamp).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    padding: 16,
  },
  overallCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  overallLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  overallValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  overallMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  studentProgress: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  studentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastActiveText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  activityStudent: {
    fontSize: 12,
    color: '#6b7280',
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
});


