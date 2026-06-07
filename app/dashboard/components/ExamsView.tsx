import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import {
  examMatchesStudentAssignedClass,
  getExamClassLabelsForStudent,
  normalizeClassNumber,
} from '../../../src/lib/exam-classes';
import { dedupeStudentExamResults } from '../../../src/lib/dedupe-exam-results';
import DetailedAnalysisView from './DetailedAnalysisView';

interface Exam {
  _id: string;
  title: string;
  description: string;
  examType: 'weekend' | 'mains' | 'advanced' | 'practice';
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxAttempts?: number;
  assignedClasses?: string[] | string;
  classNumber?: string;
  subjects?: string[];
  subject?: string;
  questions?: any[];
}

interface ExamResult {
  examId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeTaken: number;
}

type ExamsViewProps = {
  dark?: boolean;
  initialTab?: 'available' | 'attempted' | 'ranking' | 'upcoming';
};

const ATTEMPTED_CARD_SCHEMES = [
  { gradient: ['#fdba74', '#fb923c'] as const, typeBadgeBg: 'rgba(249,115,22,0.25)', typeBadgeText: '#fff7ed' },
  { gradient: ['#7dd3fc', '#38bdf8'] as const, typeBadgeBg: 'rgba(14,165,233,0.25)', typeBadgeText: '#f0f9ff' },
  { gradient: ['#2dd4bf', '#14b8a6'] as const, typeBadgeBg: 'rgba(20,184,166,0.25)', typeBadgeText: '#f0fdfa' },
];

export default function ExamsView({ initialTab = 'available' }: ExamsViewProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [activeTab, setActiveTab] = useState<'available' | 'attempted' | 'ranking' | 'upcoming'>(initialTab);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [examSubjectFilter, setExamSubjectFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [selectedExamForAnalysis, setSelectedExamForAnalysis] = useState<{ exam: Exam; result: any } | null>(null);

  const studentClassNumber = normalizeClassNumber(user?.classNumber);

  useEffect(() => {
    fetchUser();
    fetchExams();
    fetchResults();
    fetchRankings();
  }, []);

  const fetchUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user || data);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const examsList = Array.isArray(data) ? data : (data.data || data.exams || []);
        setExams(examsList);
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/exam-results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const fetchRankings = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/rankings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRankings(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
    }
  };

  const getExamIdFromResult = useCallback((result: any): string | null => {
    if (!result || !result.examId) return null;
    if (typeof result.examId === 'object' && result.examId._id) {
      return result.examId._id.toString();
    }
    return result.examId.toString();
  }, []);

  const getMaxAttemptsForExam = (exam: Exam): number =>
    Math.max(1, Number(exam.maxAttempts) || 1);

  const getExamSubjects = (exam: Exam): string[] => {
    const qSubjects = Array.isArray(exam.questions)
      ? exam.questions
          .map((q) => String(q?.subject || '').trim().toLowerCase())
          .filter(Boolean)
      : [];
    const merged = [
      ...qSubjects,
      ...(Array.isArray(exam.subjects) ? exam.subjects : []),
      exam.subject,
    ]
      .map((s) => String(s || '').trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(merged));
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return { status: 'upcoming', color: '#fbbf24', bg: '#fef3c7' };
    if (now > endDate) return { status: 'ended', color: '#ef4444', bg: '#fee2e2' };
    return { status: 'active', color: '#10b981', bg: '#d1fae5' };
  };

  const classFilteredExams = useMemo(
    () => exams.filter((e) => examMatchesStudentAssignedClass(e, user?.classNumber)),
    [exams, user?.classNumber]
  );

  const availableSubjectOptions = useMemo(() => {
    const set = new Set<string>();
    classFilteredExams.forEach((exam) => {
      getExamSubjects(exam).forEach((s) => set.add(s));
    });
    return Array.from(set.values()).sort();
  }, [classFilteredExams]);

  const subjectFilteredExams = useMemo(
    () =>
      classFilteredExams.filter((exam) => {
        if (examSubjectFilter === 'all') return true;
        return getExamSubjects(exam).includes(String(examSubjectFilter).toLowerCase());
      }),
    [classFilteredExams, examSubjectFilter]
  );

  const dedupedExamResults = useMemo(
    () => dedupeStudentExamResults(results, getExamIdFromResult),
    [results, getExamIdFromResult]
  );

  const attemptCountByExamId = useMemo(() => {
    const m = new Map<string, number>();
    for (const result of dedupedExamResults) {
      const id = getExamIdFromResult(result);
      if (!id) continue;
      const k = String(id);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [dedupedExamResults, getExamIdFromResult]);

  const availableActiveExams = useMemo(
    () =>
      subjectFilteredExams.filter((exam) => {
        const examId = String(exam._id || '');
        if (!examId) return false;
        const used = attemptCountByExamId.get(examId) || 0;
        if (used >= getMaxAttemptsForExam(exam)) return false;
        const hydratedQuestionCount = Array.isArray(exam.questions) ? exam.questions.length : 0;
        if (hydratedQuestionCount <= 0) return false;
        const now = new Date();
        const startDate = new Date(exam.startDate);
        const endDate = new Date(exam.endDate);
        const isActiveByDate = now >= startDate && now <= endDate;
        return exam.isActive !== false && isActiveByDate;
      }),
    [subjectFilteredExams, attemptCountByExamId]
  );

  const attemptedResultRows = useMemo(() => {
    const filtered = dedupedExamResults.filter((result) => {
      const examIdStr = getExamIdFromResult(result);
      if (!examIdStr) return false;
      if (examSubjectFilter === 'all') return true;
      const catalogExam = exams.find((e) => String(e._id) === String(examIdStr));
      if (!catalogExam) return true;
      if (!examMatchesStudentAssignedClass(catalogExam, user?.classNumber)) return false;
      return getExamSubjects(catalogExam).includes(String(examSubjectFilter).toLowerCase());
    });

    const latestByExam = new Map<string, any>();
    for (const result of filtered) {
      const examIdStr = getExamIdFromResult(result);
      if (!examIdStr) continue;
      const key = String(examIdStr);
      const existing = latestByExam.get(key);
      if (!existing) {
        latestByExam.set(key, result);
        continue;
      }
      const attNew = Number(result.attemptNumber) >= 1 ? Number(result.attemptNumber) : 1;
      const attOld = Number(existing.attemptNumber) >= 1 ? Number(existing.attemptNumber) : 1;
      const dateNew = new Date(result.completedAt || 0).getTime();
      const dateOld = new Date(existing.completedAt || 0).getTime();
      if (attNew > attOld || (attNew === attOld && dateNew > dateOld)) {
        latestByExam.set(key, result);
      }
    }

    return Array.from(latestByExam.values()).sort(
      (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );
  }, [dedupedExamResults, exams, examSubjectFilter, getExamIdFromResult, user?.classNumber]);

  const upcomingExams = useMemo(
    () => subjectFilteredExams.filter((exam) => getExamStatus(exam).status === 'upcoming'),
    [subjectFilteredExams]
  );

  const findExamForResult = (examIdStr: string, result: any): Exam => {
    const catalogExam = exams.find((e) => String(e._id) === String(examIdStr));
    if (catalogExam) return catalogExam;
    return {
      _id: examIdStr,
      title: result.examTitle || result.examId?.title || 'Exam',
      description: '',
      examType: 'practice',
      duration: 0,
      totalQuestions: result.totalQuestions || 0,
      totalMarks: result.totalMarks || 0,
      startDate: '',
      endDate: '',
      isActive: false,
    };
  };

  const getDisplayPercentage = (row: any): number => {
    if (!row) return 0;
    const correct = Number(row.correctAnswers || 0);
    const wrong = Number(row.wrongAnswers || 0);
    const unattempted = Number(row.unattempted || 0);
    const total = Number(row.totalQuestions || 0) || correct + wrong + unattempted;
    return total > 0 ? (correct / total) * 100 : 0;
  };

  const getExamTypeColor = (type: string) => {
    switch (type) {
      case 'mains':
      case 'advanced':
        return { bg: '#dbeafe', text: '#2563eb' };
      case 'weekend':
        return { bg: '#d1fae5', text: '#10b981' };
      case 'practice':
        return { bg: '#fed7aa', text: '#ea580c' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const handleStartExam = (exam: Exam) => {
    const maxA = getMaxAttemptsForExam(exam);
    const used = attemptCountByExamId.get(String(exam._id)) || 0;
    if (used >= maxA) {
      Alert.alert(
        'No Attempts Left',
        `You have used all ${maxA} attempt(s) for this exam. Open "Attempted Exams" to review your results.`
      );
      return;
    }

    router.push(`/exam/${exam._id}`);
  };

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.header, compact && { marginBottom: 14 }]}>
        <Text style={[styles.headerTitle, compact && { fontSize: 26 }]}>Exams</Text>
        <Text style={styles.headerSubtitle}>Take practice exams and track your progress</Text>
        <View style={styles.filtersRow}>
          {studentClassNumber ? (
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Class</Text>
              <View style={styles.classBadge}>
                <Text style={styles.classBadgeText}>Class {studentClassNumber}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectChips}>
              <TouchableOpacity
                style={[styles.subjectChip, examSubjectFilter === 'all' && styles.subjectChipActive]}
                onPress={() => setExamSubjectFilter('all')}
              >
                <Text style={[styles.subjectChipText, examSubjectFilter === 'all' && styles.subjectChipTextActive]}>
                  All subjects
                </Text>
              </TouchableOpacity>
              {availableSubjectOptions.map((subject) => (
                <TouchableOpacity
                  key={subject}
                  style={[styles.subjectChip, examSubjectFilter === subject && styles.subjectChipActive]}
                  onPress={() => setExamSubjectFilter(subject)}
                >
                  <Text style={[styles.subjectChipText, examSubjectFilter === subject && styles.subjectChipTextActive]}>
                    {subject.charAt(0).toUpperCase() + subject.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      <View style={[styles.tabsContainer, compact && { marginBottom: 14 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {([
            { id: 'available' as const, label: 'Available Exams' },
            { id: 'attempted' as const, label: 'Attempted Exams' },
            { id: 'ranking' as const, label: 'My Rankings' },
            { id: 'upcoming' as const, label: 'Upcoming' },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Available Exams Tab */}
      {activeTab === 'available' && (
        <View style={styles.content}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
          ) : availableActiveExams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Available Exams</Text>
              <Text style={styles.emptyStateText}>
                No active exams are available right now. Check Upcoming for scheduled exams.
              </Text>
            </View>
          ) : (
            <View style={styles.examsList}>
              {availableActiveExams.map((exam) => {
                const status = getExamStatus(exam);
                const typeColor = getExamTypeColor(exam.examType);
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                return (
                  <TouchableOpacity
                    key={exam._id}
                    style={styles.examCard}
                    onPress={() => handleStartExam(exam)}
                  >
                    <View style={styles.examHeader}>
                      <View style={[styles.examTypeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.examTypeText, { color: typeColor.text }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
                      {classLabels.map((cl) => (
                        <View key={cl} style={styles.classPill}>
                          <Text style={styles.classPillText}>Class {cl}</Text>
                        </View>
                      ))}
                      <View style={[styles.examStatusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.examStatusText, { color: status.color }]}>
                          {status.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    {exam.description && (
                      <Text style={styles.examDescription} numberOfLines={2}>
                        {exam.description}
                      </Text>
                    )}
                    <View style={styles.examStats}>
                      <View style={styles.examStat}>
                        <Ionicons name="time" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>{exam.duration} min</Text>
                      </View>
                      <View style={styles.examStat}>
                        <Ionicons name="help-circle" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>{exam.totalQuestions} questions</Text>
                      </View>
                      <View style={styles.examStat}>
                        <Ionicons name="trophy" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>{exam.totalMarks} marks</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => handleStartExam(exam)}
                    >
                      <Text style={styles.startButtonText}>Start Exam</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Attempted Exams Tab */}
      {activeTab === 'attempted' && (
        <View style={styles.content}>
          {attemptedResultRows.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Attempted Exams</Text>
              <Text style={styles.emptyStateText}>You haven't attempted any exams yet.</Text>
            </View>
          ) : (
            <View style={[styles.examsList, styles.attemptedListContent]}>
              {attemptedResultRows.map((result, index) => {
                const examIdStr = getExamIdFromResult(result);
                if (!examIdStr) return null;
                const exam = findExamForResult(examIdStr, result);
                const scheme = ATTEMPTED_CARD_SCHEMES[index % ATTEMPTED_CARD_SCHEMES.length];
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                const displayPercentage = getDisplayPercentage(result);
                const grade =
                  displayPercentage >= 70 ? 'Excellent' : displayPercentage >= 50 ? 'Good' : 'Needs Improvement';
                const gradeBg =
                  displayPercentage >= 70 ? '#16a34a' : displayPercentage >= 50 ? '#ca8a04' : '#dc2626';
                const totalMarksDisplay = result.totalMarks || exam.totalMarks;

                return (
                  <LinearGradient
                    key={examIdStr}
                    colors={scheme.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.attemptedCard}
                  >
                    <Text style={styles.attemptedCardTitle}>{exam.title}</Text>
                    {exam.description ? (
                      <Text style={styles.attemptedCardDesc} numberOfLines={2}>
                        {exam.description}
                      </Text>
                    ) : null}
                    <View style={styles.attemptedBadgeRow}>
                      <View style={[styles.attemptedTypeBadge, { backgroundColor: scheme.typeBadgeBg }]}>
                        <Text style={[styles.attemptedTypeBadgeText, { color: scheme.typeBadgeText }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
                      {classLabels.map((cl) => (
                        <View key={cl} style={styles.attemptedClassBadge}>
                          <Text style={styles.attemptedClassBadgeText}>Class {cl}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.attemptedScoreBox}>
                      <Text style={styles.attemptedScoreMain}>
                        {result.obtainedMarks || 0}
                        <Text style={styles.attemptedScoreDenom}>/{totalMarksDisplay}</Text>
                      </Text>
                      <Text style={styles.attemptedScoreLabelDark}>marks</Text>
                    </View>

                    <View style={styles.attemptedStatsList}>
                      <View style={styles.attemptedStatsRow}>
                        <Text style={styles.attemptedStatsLabel}>Correct Answers</Text>
                        <Text style={styles.attemptedStatsValue}>{result.correctAnswers || 0}</Text>
                      </View>
                      <View style={styles.attemptedStatsRow}>
                        <Text style={styles.attemptedStatsLabel}>Wrong Answers</Text>
                        <Text style={styles.attemptedStatsValue}>{result.wrongAnswers || 0}</Text>
                      </View>
                      <View style={styles.attemptedStatsRow}>
                        <Text style={styles.attemptedStatsLabel}>Unattempted</Text>
                        <Text style={styles.attemptedStatsValue}>{result.unattempted || 0}</Text>
                      </View>
                      <View style={styles.attemptedStatsRow}>
                        <Text style={styles.attemptedStatsLabel}>Time Taken</Text>
                        <Text style={styles.attemptedStatsValue}>
                          {result.timeTaken
                            ? `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`
                            : 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.attemptedGradeBadge, { backgroundColor: gradeBg }]}>
                      <Text style={styles.attemptedGradeText}>{grade}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.attemptedDetailsButton}
                      onPress={async () => {
                        try {
                          const token = await SecureStore.getItemAsync('authToken');
                          const reviewQs =
                            result._id != null && String(result._id).trim() !== ''
                              ? `?resultId=${encodeURIComponent(String(result._id))}`
                              : '';
                          const reviewResponse = await fetch(
                            `${API_BASE_URL}/api/student/exam-results/${exam._id}/review${reviewQs}`,
                            {
                              headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                            }
                          );

                          if (reviewResponse.ok) {
                            const reviewJson = await reviewResponse.json();
                            const reviewResult = reviewJson?.data?.result || result;
                            const reviewedQuestions = reviewJson?.data?.questions || [];
                            setSelectedExamForAnalysis({
                              exam: {
                                ...exam,
                                questions: reviewedQuestions,
                                totalQuestions:
                                  reviewJson?.data?.exam?.totalQuestions || exam.totalQuestions,
                                totalMarks: reviewJson?.data?.exam?.totalMarks || exam.totalMarks,
                              },
                              result: reviewResult,
                            });
                            setShowDetailedAnalysis(true);
                            return;
                          }

                          const response = await fetch(`${API_BASE_URL}/api/student/exams/${exam._id}`, {
                            headers: {
                              Authorization: `Bearer ${token}`,
                              'Content-Type': 'application/json',
                            },
                          });

                          if (response.ok) {
                            const data = await response.json();
                            setSelectedExamForAnalysis({ exam: data.data || exam, result });
                          } else {
                            setSelectedExamForAnalysis({ exam, result });
                          }
                          setShowDetailedAnalysis(true);
                        } catch (error) {
                          console.error('Failed to fetch exam details:', error);
                          setSelectedExamForAnalysis({ exam, result });
                          setShowDetailedAnalysis(true);
                        }
                      }}
                    >
                      <Ionicons name="eye-outline" size={18} color="#111827" />
                      <Text style={styles.attemptedDetailsButtonText}>View Details</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Rankings Tab */}
      {activeTab === 'ranking' && (
        <View style={styles.content}>
          {rankings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Rankings Yet</Text>
              <Text style={styles.emptyStateText}>Complete exams to see your rankings.</Text>
            </View>
          ) : (
            <View style={styles.rankingsList}>
              {/* Overall Performance Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Ionicons name="bar-chart" size={24} color="#9333ea" />
                  <Text style={styles.summaryTitle}>Overall Performance Summary</Text>
                </View>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Average Percentile</Text>
                    <Text style={styles.summaryValue}>
                      {Math.round(rankings.reduce((sum: number, r: any) => sum + (r.percentile || 0), 0) / rankings.length)}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Exams Completed</Text>
                    <Text style={styles.summaryValue}>{rankings.length}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Average Score</Text>
                    <Text style={styles.summaryValue}>
                      {(rankings.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / rankings.length).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Individual Rankings */}
              {rankings.map((ranking: any, index: number) => {
                const percentile = ranking.percentile || 0;
                const percentileBadge = percentile >= 90 
                  ? { bg: '#fef3c7', text: '#d97706', label: 'Top 10%' }
                  : percentile >= 75
                  ? { bg: '#d1fae5', text: '#059669', label: 'Top 25%' }
                  : percentile >= 50
                  ? { bg: '#dbeafe', text: '#2563eb', label: 'Top 50%' }
                  : { bg: '#f3f4f6', text: '#6b7280', label: 'Below 50%' };
                
                return (
                  <View key={ranking._id || index} style={styles.rankingCard}>
                    <View style={styles.rankingHeader}>
                      <View style={styles.rankingPosition}>
                        <Text style={styles.rankingPositionText}>#{ranking.rank || index + 1}</Text>
                      </View>
                      <View style={styles.rankingInfo}>
                        <Text style={styles.rankingTitle}>
                          {ranking.examId?.title || ranking.examTitle || 'Exam'}
                        </Text>
                        <Text style={styles.rankingSubtitle}>
                          Score: {ranking.percentage?.toFixed(1) || 0}% | Marks: {ranking.obtainedMarks || 0}/{ranking.totalMarks || 0}
                        </Text>
                      </View>
                      <View style={styles.rankingTrophy}>
                        {ranking.rank <= 3 && (
                          <Ionicons 
                            name="trophy" 
                            size={24} 
                            color={ranking.rank === 1 ? '#fbbf24' : ranking.rank === 2 ? '#94a3b8' : '#cd7f32'} 
                          />
                        )}
                      </View>
                    </View>
                    <View style={styles.rankingStats}>
                      <View style={[styles.rankingStatCard, { backgroundColor: '#dbeafe' }]}>
                        <Ionicons name="trophy" size={16} color="#2563eb" />
                        <Text style={styles.rankingStatLabel}>Rank</Text>
                        <Text style={[styles.rankingStatValue, { color: '#2563eb' }]}>
                          #{ranking.rank || index + 1}
                        </Text>
                        <Text style={styles.rankingStatSubtext}>out of {ranking.totalStudents || 'N/A'}</Text>
                      </View>
                      <View style={[styles.rankingStatCard, { backgroundColor: percentileBadge.bg }]}>
                        <Ionicons name="trending-up" size={16} color={percentileBadge.text} />
                        <Text style={styles.rankingStatLabel}>Percentile</Text>
                        <Text style={[styles.rankingStatValue, { color: percentileBadge.text }]}>
                          {percentile}
                        </Text>
                        <View style={[styles.percentileBadge, { backgroundColor: percentileBadge.bg }]}>
                          <Text style={[styles.percentileBadgeText, { color: percentileBadge.text }]}>
                            {percentileBadge.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {ranking.completedAt && (
                      <View style={styles.rankingFooter}>
                        <Ionicons name="calendar" size={14} color="#6b7280" />
                        <Text style={styles.rankingFooterText}>
                          Completed: {new Date(ranking.completedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Upcoming Exams Tab */}
      {activeTab === 'upcoming' && (
        <View style={styles.content}>
          {upcomingExams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Upcoming Exams</Text>
              <Text style={styles.emptyStateText}>No upcoming exams scheduled at the moment.</Text>
            </View>
          ) : (
            <View style={styles.examsList}>
              {upcomingExams.map((exam) => {
                const typeColor = getExamTypeColor(exam.examType);
                const classLabels = getExamClassLabelsForStudent(exam, user?.classNumber);
                return (
                  <View key={exam._id} style={styles.examCard}>
                    <View style={styles.examHeader}>
                      <View style={[styles.examTypeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.examTypeText, { color: typeColor.text }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
                      {classLabels.map((cl) => (
                        <View key={cl} style={styles.classPill}>
                          <Text style={styles.classPillText}>Class {cl}</Text>
                        </View>
                      ))}
                      <View style={[styles.examStatusBadge, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.examStatusText, { color: '#fbbf24' }]}>
                          UPCOMING
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    {exam.description && (
                      <Text style={styles.examDescription} numberOfLines={2}>
                        {exam.description}
                      </Text>
                    )}
                    <View style={styles.examStats}>
                      <View style={styles.examStat}>
                        <Ionicons name="calendar" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>
                          Starts: {new Date(exam.startDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.examStat}>
                        <Ionicons name="time" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>{exam.duration} min</Text>
                      </View>
                      <View style={styles.examStat}>
                        <Ionicons name="help-circle" size={16} color="#6b7280" />
                        <Text style={styles.examStatText}>{exam.totalQuestions} questions</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>

      {/* Detailed Analysis Modal */}
      {showDetailedAnalysis && selectedExamForAnalysis && (
        <Modal
          visible={showDetailedAnalysis}
          animationType="slide"
          onRequestClose={() => setShowDetailedAnalysis(false)}
        >
          <DetailedAnalysisView
            result={{
              ...selectedExamForAnalysis.result,
              questions: selectedExamForAnalysis.exam.questions || []
            }}
            examTitle={selectedExamForAnalysis.exam.title}
            onBack={() => setShowDetailedAnalysis(false)}
          />
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
    flexGrow: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ea580c',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4b5563',
  },
  filtersRow: {
    marginTop: 14,
    gap: 12,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  classBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  classBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730a3',
  },
  subjectChips: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  subjectChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subjectChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  subjectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  subjectChipTextActive: {
    color: '#c2410c',
  },
  tabsContainer: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 1,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '800',
  },
  classPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    paddingTop: 4,
  },
  attemptedListContent: {
    paddingBottom: 24,
    gap: 16,
  },
  attemptedCard: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  attemptedCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  attemptedCardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 18,
  },
  attemptedBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attemptedTypeBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attemptedTypeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  attemptedClassBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  attemptedClassBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  examsList: {
    gap: 0,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  examHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  examTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  examTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  examStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  examStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  examTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  examDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  examStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  examStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examStatText: {
    fontSize: 14,
    color: '#6b7280',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewButton: {
    backgroundColor: '#10b981',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  resultStats: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  resultStat: {
    flex: 1,
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  rankingsList: {
    gap: 12,
  },
  rankingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankingPosition: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankingPositionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  rankingInfo: {
    flex: 1,
    gap: 4,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  rankingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  rankingTrophy: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attemptedScoreBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  attemptedScoreMain: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
  },
  attemptedScoreDenom: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
  },
  attemptedScoreLabelDark: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginTop: 2,
  },
  attemptedStatsList: {
    gap: 8,
  },
  attemptedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  attemptedStatsLabel: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  attemptedStatsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  attemptedGradeBadge: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  attemptedGradeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  attemptedDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 2,
  },
  attemptedDetailsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: '#f3e8ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9333ea',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#9333ea',
  },
  rankingStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rankingStatCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  rankingStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  rankingStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  rankingStatSubtext: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  percentileBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentileBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rankingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  rankingFooterText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

