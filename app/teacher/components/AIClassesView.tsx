import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

interface Class {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  room: string;
  studentCount: number;
  students?: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
  }>;
}

interface Subject {
  _id: string;
  id: string;
  name: string;
  description?: string;
  totalContent?: number;
  videos?: any[];
  assessments?: any[];
  asliPrepContent?: any[];
}

interface AIClassesViewProps {
  stats: {
    totalStudents: number;
    totalClasses: number;
    totalVideos: number;
    averagePerformance: number;
  };
}

export default function AIClassesView({ stats }: AIClassesViewProps) {
  const [assignedClasses, setAssignedClasses] = useState<Class[]>([]);
  const [subjectsWithContent, setSubjectsWithContent] = useState<Subject[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  const fetchClasses = async () => {
    try {
      setIsLoadingClasses(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/classes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const classesData = data.data || data || [];
        const mappedClasses = (Array.isArray(classesData) ? classesData : []).map((cls: any) => ({
          id: cls._id || cls.id,
          name: cls.name || `${cls.classNumber}${cls.section ? ` - ${cls.section}` : ''}`,
          subject: cls.subject || 'N/A',
          schedule: cls.schedule || 'N/A',
          room: cls.room || 'N/A',
          studentCount: cls.students?.length || cls.studentCount || 0,
          students: cls.students || []
        }));
        setAssignedClasses(mappedClasses);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      setIsLoadingSubjects(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const subjectsData = data.data || data.subjects || data || [];
        
        // Fetch content for each subject
        const subjectsWithContentResults = await Promise.allSettled(
          (Array.isArray(subjectsData) ? subjectsData : []).map(async (subject: any) => {
            try {
              const subjectId = subject._id || subject.id;
              const contentResponse = await fetch(
                `${API_BASE_URL}/api/admin/asli-prep-content?subject=${encodeURIComponent(subjectId)}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  }
                }
              );
              
              let asliPrepContent = [];
              if (contentResponse.ok) {
                const contentData = await contentResponse.json();
                asliPrepContent = contentData.success ? (contentData.data || []) : (contentData || []);
                if (!Array.isArray(asliPrepContent)) asliPrepContent = [];
              }

              return {
                _id: subject._id || subject.id,
                id: subject._id || subject.id,
                name: subject.name || 'Unknown Subject',
                description: subject.description || '',
                totalContent: asliPrepContent.length,
                videos: asliPrepContent.filter((c: any) => c.type === 'Video'),
                assessments: asliPrepContent.filter((c: any) => c.type === 'Assessment'),
                asliPrepContent
              };
            } catch (error) {
              console.error(`Error fetching content for subject ${subject._id}:`, error);
              return {
                _id: subject._id || subject.id,
                id: subject._id || subject.id,
                name: subject.name || 'Unknown Subject',
                description: subject.description || '',
                totalContent: 0,
                videos: [],
                assessments: [],
                asliPrepContent: []
              };
            }
          })
        );

        const successfulSubjects = subjectsWithContentResults
          .filter(result => result.status === 'fulfilled')
          .map(result => (result as PromiseFulfilledResult<Subject>).value);

        setSubjectsWithContent(successfulSubjects);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const toggleClassExpansion = (classId: string) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* My Classes Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="people" size={24} color="#fff" />
          </View>
          <Text style={styles.sectionTitle}>My Classes</Text>
        </View>

        {isLoadingClasses ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : assignedClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No Classes Assigned</Text>
            <Text style={styles.emptySubtext}>
              You haven't been assigned to any classes yet. Contact your administrator.
            </Text>
          </View>
        ) : (
          <View style={styles.classesGrid}>
            {assignedClasses.map((classItem) => (
              <View key={classItem.id} style={styles.classCard}>
                <View style={styles.classCardHeader}>
                  <Text style={styles.classCardName}>{classItem.name}</Text>
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                </View>
                <View style={styles.classCardDetails}>
                  <View style={styles.classDetailRow}>
                    <Text style={styles.classDetailLabel}>Students:</Text>
                    <Text style={styles.classDetailValue}>{classItem.studentCount}</Text>
                  </View>
                  <View style={styles.classDetailRow}>
                    <Text style={styles.classDetailLabel}>Subject:</Text>
                    <Text style={styles.classDetailValue}>{classItem.subject}</Text>
                  </View>
                  <View style={styles.classDetailRow}>
                    <Text style={styles.classDetailLabel}>Schedule:</Text>
                    <Text style={styles.classDetailValue}>{classItem.schedule}</Text>
                  </View>
                  <View style={styles.classDetailRow}>
                    <Text style={styles.classDetailLabel}>Room:</Text>
                    <Text style={styles.classDetailValue}>{classItem.room}</Text>
                  </View>
                </View>

                {expandedClasses.has(classItem.id) && classItem.students && classItem.students.length > 0 && (
                  <View style={styles.studentsList}>
                    <Text style={styles.studentsListTitle}>Students:</Text>
                    {classItem.students.map((student) => (
                      <View key={student.id} style={styles.studentItem}>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{student.name}</Text>
                          <Text style={styles.studentEmail}>{student.email}</Text>
                        </View>
                        <View style={[styles.studentStatusBadge, student.status === 'active' ? styles.studentStatusActive : styles.studentStatusInactive]}>
                          <Text style={styles.studentStatusText}>{student.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => toggleClassExpansion(classItem.id)}
                >
                  <Ionicons
                    name={expandedClasses.has(classItem.id) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#10b981"
                  />
                  <Text style={styles.expandButtonText}>
                    {expandedClasses.has(classItem.id) ? 'Hide Students' : 'View Students'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Learning Paths Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#8b5cf6' }]}>
            <Ionicons name="book" size={24} color="#fff" />
          </View>
          <Text style={[styles.sectionTitle, { color: '#8b5cf6' }]}>Learning Paths</Text>
        </View>

        {isLoadingSubjects ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : subjectsWithContent.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No Subjects Available</Text>
            <Text style={styles.emptySubtext}>No subjects have been assigned to you yet.</Text>
          </View>
        ) : (
          <View style={styles.subjectsGrid}>
            {subjectsWithContent.map((subject) => {
              const getSubjectIcon = (subjectName: string) => {
                const name = subjectName.toLowerCase();
                if (name.includes('math')) return 'calculator';
                if (name.includes('science') || name.includes('physics') || name.includes('chemistry')) return 'flash';
                if (name.includes('english')) return 'book';
                return 'book';
              };

              return (
                <View key={subject.id} style={styles.subjectCard}>
                  <View style={styles.subjectCardHeader}>
                    <View style={styles.subjectCardIcon}>
                      <Ionicons name={getSubjectIcon(subject.name) as any} size={24} color="#fff" />
                    </View>
                    <View style={styles.subjectCardBadge}>
                      <Text style={styles.subjectCardBadgeText}>
                        {subject.totalContent || 0} items
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.subjectCardName}>{subject.name}</Text>
                  {subject.description && (
                    <Text style={styles.subjectCardDescription}>{subject.description}</Text>
                  )}

                  <View style={styles.subjectStats}>
                    <View style={styles.subjectStatItem}>
                      <Ionicons name="play" size={16} color="#3b82f6" />
                      <Text style={styles.subjectStatValue}>{subject.videos?.length || 0}</Text>
                      <Text style={styles.subjectStatLabel}>Videos</Text>
                    </View>
                    <View style={styles.subjectStatItem}>
                      <Ionicons name="document-text" size={16} color="#10b981" />
                      <Text style={styles.subjectStatValue}>{subject.assessments?.length || 0}</Text>
                      <Text style={styles.subjectStatLabel}>Quizzes</Text>
                    </View>
                    <View style={styles.subjectStatItem}>
                      <Ionicons name="bar-chart" size={16} color="#f59e0b" />
                      <Text style={styles.subjectStatValue}>{subject.asliPrepContent?.length || 0}</Text>
                      <Text style={styles.subjectStatLabel}>Content</Text>
                    </View>
                  </View>

                  {subject.videos && subject.videos.length > 0 && (
                    <View style={styles.recentVideos}>
                      <Text style={styles.recentVideosTitle}>Recent Videos:</Text>
                      {subject.videos.slice(0, 2).map((video: any, idx: number) => (
                        <View key={video._id || idx} style={styles.recentVideoItem}>
                          <Text style={styles.recentVideoTitle} numberOfLines={1}>
                            {video.title || 'Untitled Video'}
                          </Text>
                          {video.duration && (
                            <Text style={styles.recentVideoDuration}>
                              Duration: {video.duration} min
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.viewContentButton}
                    onPress={() => router.push(`/teacher/subject/${subject.id}`)}
                  >
                    <Text style={styles.viewContentButtonText}>View Content</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#10b981',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  classesGrid: {
    gap: 16,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  classCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  classCardName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  classCardDetails: {
    gap: 12,
    marginBottom: 16,
  },
  classDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  classDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  studentsList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  studentsListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  studentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentStatusActive: {
    backgroundColor: '#d1fae5',
  },
  studentStatusInactive: {
    backgroundColor: '#fee2e2',
  },
  studentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    gap: 8,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  subjectsGrid: {
    gap: 16,
  },
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectCardBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subjectCardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  subjectCardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subjectCardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  subjectStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  subjectStatItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  subjectStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  subjectStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  recentVideos: {
    marginBottom: 16,
  },
  recentVideosTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  recentVideoItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  recentVideoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  recentVideoDuration: {
    fontSize: 11,
    color: '#6b7280',
  },
  viewContentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  viewContentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

