import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
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

export default function ExamsView() {
  const [activeTab, setActiveTab] = useState<'available' | 'attempted' | 'ranking' | 'upcoming'>('available');
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [selectedExamForAnalysis, setSelectedExamForAnalysis] = useState<{ exam: Exam; result: any } | null>(null);

  useEffect(() => {
    fetchExams();
    fetchResults();
    fetchRankings();
  }, []);

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

  const getExamIdFromResult = (result: any): string | null => {
    if (!result || !result.examId) return null;
    if (typeof result.examId === 'object' && result.examId._id) {
      return result.examId._id.toString();
    }
    return result.examId.toString();
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) return { status: 'upcoming', color: '#fbbf24', bg: '#fef3c7' };
    if (now > endDate) return { status: 'ended', color: '#ef4444', bg: '#fee2e2' };
    return { status: 'active', color: '#10b981', bg: '#d1fae5' };
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
    const hasAttempted = results.some((result: any) => {
      const resultExamId = getExamIdFromResult(result);
      const examId = exam._id?.toString();
      return resultExamId === examId;
    });

    if (hasAttempted) {
      Alert.alert('Already Attempted', 'You have already attempted this exam. Please check the "Attempted Exams" tab to view your results.');
      return;
    }

    router.push(`/student-exams?examId=${exam._id}`);
  };

  const availableExams = exams.filter((exam: Exam) => {
    const hasAttempted = results.some((result: any) => {
      const resultExamId = getExamIdFromResult(result);
      const examId = exam._id?.toString();
      return resultExamId === examId;
    });
    return !hasAttempted;
  });

  const attemptedExams = exams.filter((exam: Exam) => {
    const hasAttempted = results.some((result: any) => {
      const resultExamId = getExamIdFromResult(result);
      const examId = exam._id?.toString();
      return resultExamId === examId;
    });
    return hasAttempted;
  });

  const upcomingExams = exams.filter((exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    return now < startDate;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="document-text" size={24} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Exams</Text>
          <Text style={styles.headerSubtitle}>Take practice exams and track your progress</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.tabActive]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[styles.tabText, activeTab === 'available' && styles.tabTextActive]}>
              Available
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'attempted' && styles.tabActive]}
            onPress={() => setActiveTab('attempted')}
          >
            <Text style={[styles.tabText, activeTab === 'attempted' && styles.tabTextActive]}>
              Attempted
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ranking' && styles.tabActive]}
            onPress={() => setActiveTab('ranking')}
          >
            <Text style={[styles.tabText, activeTab === 'ranking' && styles.tabTextActive]}>
              Rankings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Available Exams Tab */}
      {activeTab === 'available' && (
        <View style={styles.content}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
          ) : availableExams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Available Exams</Text>
              <Text style={styles.emptyStateText}>All exams have been attempted or no exams are available.</Text>
            </View>
          ) : (
            <ScrollView style={styles.examsList}>
              {availableExams.map((exam) => {
                const status = getExamStatus(exam);
                const typeColor = getExamTypeColor(exam.examType);
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
            </ScrollView>
          )}
        </View>
      )}

      {/* Attempted Exams Tab */}
      {activeTab === 'attempted' && (
        <View style={styles.content}>
          {attemptedExams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Attempted Exams</Text>
              <Text style={styles.emptyStateText}>You haven't attempted any exams yet.</Text>
            </View>
          ) : (
            <ScrollView style={styles.examsList}>
              {attemptedExams.map((exam) => {
                const result = results.find((r: any) => {
                  const resultExamId = getExamIdFromResult(r);
                  return resultExamId === exam._id?.toString();
                });
                const typeColor = getExamTypeColor(exam.examType);
                const percentage = result?.percentage || 0;
                const accuracy = result?.correctAnswers && result?.wrongAnswers 
                  ? ((result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100).toFixed(1)
                  : '0';
                const completion = result?.totalQuestions
                  ? (((result.correctAnswers || 0) + (result.wrongAnswers || 0)) / result.totalQuestions * 100).toFixed(1)
                  : '0';
                const grade = percentage >= 70 ? 'Excellent' : percentage >= 50 ? 'Good' : 'Needs Improvement';
                const gradeColor = percentage >= 70 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';
                const gradeBg = percentage >= 70 ? '#d1fae5' : percentage >= 50 ? '#fef3c7' : '#fee2e2';
                
                return (
                  <View key={exam._id} style={styles.examCard}>
                    <View style={styles.examHeader}>
                      <View style={[styles.examTypeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.examTypeText, { color: typeColor.text }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
                      {result && (
                        <View style={styles.resultBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                          <Text style={styles.resultText}>Completed</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.examTitle}>{exam.title}</Text>
                    
                    {result && (
                      <>
                        {/* Overall Score Card */}
                        <View style={styles.scoreCard}>
                          <View style={styles.scoreCircleContainer}>
                            <View style={styles.scoreCircle}>
                              <Text style={styles.scorePercentage}>{percentage.toFixed(1)}%</Text>
                              <View style={[styles.gradeBadge, { backgroundColor: gradeBg }]}>
                                <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.scoreDetails}>
                            <View style={styles.scoreDetailItem}>
                              <Text style={styles.scoreDetailLabel}>Marks</Text>
                              <Text style={styles.scoreDetailValue}>
                                {result.obtainedMarks || 0}/{result.totalMarks || exam.totalMarks}
                              </Text>
                            </View>
                            <View style={styles.scoreDetailItem}>
                              <Text style={styles.scoreDetailLabel}>Accuracy</Text>
                              <Text style={styles.scoreDetailValue}>{accuracy}%</Text>
                            </View>
                          </View>
                        </View>

                        {/* Performance Breakdown */}
                        <View style={styles.performanceCard}>
                          <Text style={styles.sectionTitle}>Performance Breakdown</Text>
                          <View style={styles.performanceRow}>
                            <View style={styles.performanceItem}>
                              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                              <Text style={styles.performanceLabel}>Correct</Text>
                              <Text style={[styles.performanceValue, { color: '#10b981' }]}>
                                {result.correctAnswers || 0}
                              </Text>
                            </View>
                            <View style={styles.performanceItem}>
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                              <Text style={styles.performanceLabel}>Wrong</Text>
                              <Text style={[styles.performanceValue, { color: '#ef4444' }]}>
                                {result.wrongAnswers || 0}
                              </Text>
                            </View>
                            <View style={styles.performanceItem}>
                              <Ionicons name="alert-circle" size={20} color="#6b7280" />
                              <Text style={styles.performanceLabel}>Unattempted</Text>
                              <Text style={[styles.performanceValue, { color: '#6b7280' }]}>
                                {result.unattempted || 0}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.timeRow}>
                            <Ionicons name="time" size={16} color="#3b82f6" />
                            <Text style={styles.timeLabel}>Time Taken:</Text>
                            <Text style={styles.timeValue}>
                              {result.timeTaken 
                                ? `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s`
                                : 'N/A'}
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bars */}
                        <View style={styles.progressCard}>
                          <View style={styles.progressItem}>
                            <View style={styles.progressHeader}>
                              <Text style={styles.progressLabel}>Accuracy</Text>
                              <Text style={styles.progressPercentage}>{accuracy}%</Text>
                            </View>
                            <View style={styles.progressBar}>
                              <View style={[styles.progressFill, { width: `${accuracy}%`, backgroundColor: '#10b981' }]} />
                            </View>
                          </View>
                          <View style={styles.progressItem}>
                            <View style={styles.progressHeader}>
                              <Text style={styles.progressLabel}>Completion</Text>
                              <Text style={styles.progressPercentage}>{completion}%</Text>
                            </View>
                            <View style={styles.progressBar}>
                              <View style={[styles.progressFill, { width: `${completion}%`, backgroundColor: '#3b82f6' }]} />
                            </View>
                          </View>
                        </View>

                        {/* Subject-wise Performance */}
                        {result.subjectWiseScore && (
                          <View style={styles.subjectsCard}>
                            <Text style={styles.sectionTitle}>Subject-wise Performance</Text>
                            <View style={styles.subjectsGrid}>
                              {Object.entries(result.subjectWiseScore).map(([subject, score]: [string, any]) => {
                                const subjectPercentage = score.total > 0 ? (score.correct / score.total) * 100 : 0;
                                const subjectColors: Record<string, { bg: string; text: string }> = {
                                  maths: { bg: '#dbeafe', text: '#2563eb' },
                                  physics: { bg: '#d1fae5', text: '#10b981' },
                                  chemistry: { bg: '#f3e8ff', text: '#9333ea' }
                                };
                                const colors = subjectColors[subject] || { bg: '#f3f4f6', text: '#6b7280' };
                                
                                return (
                                  <View key={subject} style={[styles.subjectCard, { backgroundColor: colors.bg }]}>
                                    <Text style={[styles.subjectName, { color: colors.text }]}>
                                      {subject.charAt(0).toUpperCase() + subject.slice(1)}
                                    </Text>
                                    <Text style={styles.subjectPercentage}>{subjectPercentage.toFixed(1)}%</Text>
                                    <Text style={styles.subjectStats}>
                                      {score.correct}/{score.total} correct
                                    </Text>
                                    <Text style={styles.subjectMarks}>{score.marks} marks</Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        )}
                      </>
                    )}
                    
                    <TouchableOpacity
                      style={[styles.startButton, styles.viewButton]}
                      onPress={async () => {
                        // Fetch full exam with questions for detailed analysis
                        try {
                          const token = await SecureStore.getItemAsync('authToken');
                          const response = await fetch(`${API_BASE_URL}/api/student/exams/${exam._id}`, {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            const examWithQuestions = data.data || exam;
                            setSelectedExamForAnalysis({ exam: examWithQuestions, result });
                            setShowDetailedAnalysis(true);
                          } else {
                            // Use exam without questions if fetch fails
                            setSelectedExamForAnalysis({ exam, result });
                            setShowDetailedAnalysis(true);
                          }
                        } catch (error) {
                          console.error('Failed to fetch exam details:', error);
                          setSelectedExamForAnalysis({ exam, result });
                          setShowDetailedAnalysis(true);
                        }
                      }}
                    >
                      <Ionicons name="eye" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.startButtonText}>View Detailed Analysis</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
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
            <ScrollView style={styles.rankingsList}>
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
            </ScrollView>
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
            <ScrollView style={styles.examsList}>
              {upcomingExams.map((exam) => {
                const typeColor = getExamTypeColor(exam.examType);
                return (
                  <View key={exam._id} style={styles.examCard}>
                    <View style={styles.examHeader}>
                      <View style={[styles.examTypeBadge, { backgroundColor: typeColor.bg }]}>
                        <Text style={[styles.examTypeText, { color: typeColor.text }]}>
                          {exam.examType.toUpperCase()}
                        </Text>
                      </View>
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
            </ScrollView>
          )}
        </View>
      )}

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
  headerIcon: {
    width: 40,
    height: 40,
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
    marginBottom: 20,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
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
    flex: 1,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flex: 1,
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
  scoreCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircleContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: '#e5e7eb',
  },
  scorePercentage: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  gradeBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreDetails: {
    flex: 1,
    gap: 12,
  },
  scoreDetailItem: {
    gap: 4,
  },
  scoreDetailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  scoreDetailValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  performanceItem: {
    alignItems: 'center',
    gap: 8,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  timeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    gap: 16,
  },
  progressItem: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  subjectsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  subjectCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
  },
  subjectPercentage: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subjectStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  subjectMarks: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
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

