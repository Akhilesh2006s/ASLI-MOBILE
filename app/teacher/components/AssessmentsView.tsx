import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';

interface Assessment {
  _id: string;
  title: string;
  description?: string;
  subject?: string | { _id: string; name: string };
  type: 'quiz' | 'exam' | 'assignment' | 'project';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  totalMarks: number;
  passingMarks: number;
  questions?: number;
  isActive: boolean;
  createdAt: string;
}

export default function TeacherAssessmentsView() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    description: '',
    subject: '',
    type: 'quiz' as 'quiz' | 'exam' | 'assignment' | 'project',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: 60,
    totalMarks: 100,
    passingMarks: 50,
    questions: 20
  });

  useEffect(() => {
    fetchAssessments();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await teacherService.subjects();
      setSubjects(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchAssessments = async () => {
    try {
      setIsLoading(true);
      const res = await teacherService.assessments();
      setAssessments(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssessment = async () => {
    if (!newAssessment.title || !newAssessment.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      await teacherService.createAssessment(newAssessment);
      Alert.alert('Success', 'Assessment created successfully');
      setIsCreateModalOpen(false);
      setNewAssessment({
        title: '',
        description: '',
        subject: '',
        type: 'quiz',
        difficulty: 'medium',
        duration: 60,
        totalMarks: 100,
        passingMarks: 50,
        questions: 20,
      });
      await teacherService.invalidateCache('assessments');
      fetchAssessments();
    } catch (error) {
      console.error('Failed to create assessment:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId = typeof assessment.subject === 'object' ? assessment.subject?._id : assessment.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEACHER.primary} />
        <Text style={styles.loadingText}>Loading assessments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={TEACHER.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search assessments..."
            placeholderTextColor={TEACHER.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterSubject === 'all' && styles.filterChipActive]}
            onPress={() => setFilterSubject('all')}
          >
            <Text style={[styles.filterChipText, filterSubject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id || subject.id}
              style={[styles.filterChip, filterSubject === (subject._id || subject.id) && styles.filterChipActive]}
              onPress={() => setFilterSubject(subject._id || subject.id)}
            >
              <Text style={[styles.filterChipText, filterSubject === (subject._id || subject.id) && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsCreateModalOpen(true)}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.addButtonGrad}>
          <Ionicons name="add" size={24} color={TEACHER.textOnPrimary} />
          <Text style={styles.addButtonText}>Create Assessment</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Assessments List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {filteredAssessments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={TEACHER.textMuted} />
            <Text style={styles.emptyText}>No assessments found</Text>
            <Text style={styles.emptySubtext}>Create your first assessment to get started</Text>
          </View>
        ) : (
          filteredAssessments.map((assessment, index) => {
            const subjectName = typeof assessment.subject === 'object' 
              ? assessment.subject?.name 
              : assessment.subject || 'General';

            return (
              <Animated.View key={assessment._id} entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))} style={styles.assessmentCard}>
                <View style={styles.assessmentHeader}>
                  <View style={styles.assessmentIcon}>
                    <Ionicons name="clipboard" size={24} color={TEACHER.primaryLight} />
                  </View>
                  <View style={styles.assessmentInfo}>
                    <Text style={styles.assessmentTitle} numberOfLines={2}>{assessment.title}</Text>
                    <Text style={styles.assessmentSubject}>{subjectName}</Text>
                  </View>
                </View>

                {assessment.description && (
                  <Text style={styles.assessmentDescription} numberOfLines={2}>
                    {assessment.description}
                  </Text>
                )}

                <View style={styles.assessmentMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={16} color={TEACHER.primaryLight} />
                    <Text style={styles.metaText}>{assessment.duration} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="trophy" size={16} color={TEACHER.warning} />
                    <Text style={styles.metaText}>{assessment.totalMarks} marks</Text>
                  </View>
                  {assessment.questions && (
                    <View style={styles.metaItem}>
                      <Ionicons name="help-circle" size={16} color={TEACHER.primaryLight} />
                      <Text style={styles.metaText}>
                        {Array.isArray(assessment.questions) ? assessment.questions.length : assessment.questions} questions
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons
                    name={assessment.isActive ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={assessment.isActive ? TEACHER.success : TEACHER.danger}
                  />
                  <Text style={[styles.statusText, { color: assessment.isActive ? TEACHER.success : TEACHER.danger }]}>
                    {assessment.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* Create Modal - Same as Admin AssessmentsView */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Assessment</Text>
            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
              <Ionicons name="close" size={24} color={TEACHER.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Assessment title"
                value={newAssessment.title}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, title: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Assessment description"
                value={newAssessment.description}
                onChangeText={(text) => setNewAssessment({ ...newAssessment, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {subjects.map(subject => (
                  <TouchableOpacity
                    key={subject._id || subject.id}
                    style={[
                      styles.subjectChip,
                      newAssessment.subject === (subject._id || subject.id) && styles.subjectChipActive
                    ]}
                    onPress={() => setNewAssessment({ ...newAssessment, subject: subject._id || subject.id })}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      newAssessment.subject === (subject._id || subject.id) && styles.subjectChipTextActive
                    ]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['quiz', 'exam', 'assignment', 'project'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      newAssessment.type === type && styles.typeChipActive
                    ]}
                    onPress={() => setNewAssessment({ ...newAssessment, type: type as any })}
                  >
                    <Text style={[
                      styles.typeChipText,
                      newAssessment.type === type && styles.typeChipTextActive
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="60"
                  keyboardType="numeric"
                  value={newAssessment.duration.toString()}
                  onChangeText={(text) => setNewAssessment({ ...newAssessment, duration: parseInt(text) || 60 })}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Total Marks</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100"
                  keyboardType="numeric"
                  value={newAssessment.totalMarks.toString()}
                  onChangeText={(text) => setNewAssessment({ ...newAssessment, totalMarks: parseInt(text) || 100 })}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.createButton} onPress={handleCreateAssessment} activeOpacity={0.85}>
              <LinearGradient colors={[TEACHER.primary, TEACHER.primaryDark]} style={styles.createButtonGrad}>
                <Text style={styles.createButtonText}>Create Assessment</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TEACHER.bg,
    paddingHorizontal: TEACHER_SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TEACHER.bg,
  },
  loadingText: {
    marginTop: 12,
    ...TEACHER_TYPO.body,
    color: TEACHER.textMuted,
  },
  filtersContainer: {
    ...glassCard,
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEACHER.surfaceElevated,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    paddingHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.md,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...TEACHER_TYPO.body,
    color: TEACHER.text,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  filterChipTextActive: {
    color: TEACHER.textOnPrimary,
  },
  addButton: {
    borderRadius: TEACHER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: TEACHER_SPACING.md,
  },
  addButtonGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addButtonText: {
    color: TEACHER.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    ...TEACHER_TYPO.section,
    fontSize: 20,
    color: TEACHER.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: TEACHER.textMuted,
    textAlign: 'center',
  },
  assessmentCard: {
    ...glassCard,
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.md,
  },
  assessmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  assessmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: TEACHER.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentTitle: {
    ...TEACHER_TYPO.body,
    fontWeight: '700',
    color: TEACHER.text,
    marginBottom: 4,
  },
  assessmentSubject: {
    fontSize: 14,
    color: TEACHER.textMuted,
  },
  assessmentDescription: {
    fontSize: 14,
    color: TEACHER.textMuted,
    marginBottom: 12,
  },
  assessmentMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: TEACHER.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: TEACHER.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  modalTitle: {
    ...TEACHER_TYPO.section,
    fontSize: 20,
    color: TEACHER.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderRadius: TEACHER_RADIUS.sm,
    padding: 12,
    fontSize: 16,
    color: TEACHER.text,
    backgroundColor: TEACHER.surfaceElevated,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    marginRight: 8,
  },
  subjectChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  subjectChipTextActive: {
    color: TEACHER.textOnPrimary,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: TEACHER.primary,
    borderColor: TEACHER.primary,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEACHER.textSecondary,
  },
  typeChipTextActive: {
    color: TEACHER.textOnPrimary,
  },
  createButton: {
    borderRadius: TEACHER_RADIUS.sm,
    overflow: 'hidden',
    marginTop: 8,
  },
  createButtonGrad: {
    padding: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: TEACHER.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});

