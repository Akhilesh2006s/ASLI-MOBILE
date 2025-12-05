import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

interface Question {
  _id: string;
  questionText: string;
  questionImage?: string;
  questionType: 'mcq' | 'multiple' | 'integer';
  options?: string[];
  correctAnswer: string | string[];
  marks: number;
  negativeMarks: number;
  explanation?: string;
  subject: 'maths' | 'physics' | 'chemistry';
}

interface ExamResult {
  examId: string;
  examTitle?: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unattempted: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  timeTaken: number;
  subjectWiseScore: {
    maths: { correct: number; total: number; marks: number };
    physics: { correct: number; total: number; marks: number };
    chemistry: { correct: number; total: number; marks: number };
  };
  answers?: Record<string, any>;
  questions?: Question[];
}

interface DetailedAnalysisViewProps {
  result: ExamResult;
  examTitle: string;
  onBack: () => void;
}

export default function DetailedAnalysisView({ result, examTitle, onBack }: DetailedAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'questions'>('overview');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A+', color: '#10b981', bg: '#d1fae5' };
    if (percentage >= 80) return { grade: 'A', color: '#10b981', bg: '#d1fae5' };
    if (percentage >= 70) return { grade: 'B+', color: '#3b82f6', bg: '#dbeafe' };
    if (percentage >= 60) return { grade: 'B', color: '#3b82f6', bg: '#dbeafe' };
    if (percentage >= 50) return { grade: 'C+', color: '#f59e0b', bg: '#fef3c7' };
    if (percentage >= 40) return { grade: 'C', color: '#f59e0b', bg: '#fef3c7' };
    return { grade: 'D', color: '#ef4444', bg: '#fee2e2' };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${secs}s`;
  };

  const grade = getGrade(result.percentage);
  const accuracy = result.correctAnswers + result.wrongAnswers > 0
    ? ((result.correctAnswers / (result.correctAnswers + result.wrongAnswers)) * 100).toFixed(1)
    : '0';

  const checkAnswer = (question: Question, userAnswer: any): boolean => {
    if (!userAnswer && userAnswer !== 0) return false;
    
    if (question.questionType === 'multiple') {
      const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
      const user = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      return correct.length === user.length && correct.every(ans => user.includes(ans));
    }
    
    const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer[0] : question.correctAnswer;
    return String(userAnswer).toLowerCase().trim() === String(correct).toLowerCase().trim();
  };

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setIsQuestionModalOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="analytics" size={32} color="#fff" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Detailed Analysis</Text>
            <Text style={styles.headerSubtitle}>{examTitle}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subjects' && styles.tabActive]}
          onPress={() => setActiveTab('subjects')}
        >
          <Text style={[styles.tabText, activeTab === 'subjects' && styles.tabTextActive]}>
            Subjects
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'questions' && styles.tabActive]}
          onPress={() => setActiveTab('questions')}
        >
          <Text style={[styles.tabText, activeTab === 'questions' && styles.tabTextActive]}>
            Questions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={styles.overviewContent}>
            {/* Overall Score */}
            <View style={styles.scoreCard}>
              <View style={styles.scoreCircleContainer}>
                <View style={[styles.scoreCircle, { borderColor: grade.color }]}>
                  <Text style={styles.scorePercentage}>{result.percentage.toFixed(1)}%</Text>
                  <View style={[styles.gradeBadge, { backgroundColor: grade.bg }]}>
                    <Text style={[styles.gradeText, { color: grade.color }]}>{grade.grade}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.scoreDetails}>
                <View style={styles.scoreDetailItem}>
                  <Text style={styles.scoreDetailLabel}>Marks</Text>
                  <Text style={styles.scoreDetailValue}>
                    {result.obtainedMarks}/{result.totalMarks}
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
              <View style={styles.performanceGrid}>
                <View style={[styles.performanceItem, { backgroundColor: '#d1fae5' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <Text style={styles.performanceValue}>{result.correctAnswers}</Text>
                  <Text style={styles.performanceLabel}>Correct</Text>
                </View>
                <View style={[styles.performanceItem, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                  <Text style={styles.performanceValue}>{result.wrongAnswers}</Text>
                  <Text style={styles.performanceLabel}>Wrong</Text>
                </View>
                <View style={[styles.performanceItem, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="alert-circle" size={24} color="#6b7280" />
                  <Text style={styles.performanceValue}>{result.unattempted}</Text>
                  <Text style={styles.performanceLabel}>Unattempted</Text>
                </View>
              </View>
            </View>

            {/* Time Analysis */}
            <View style={styles.timeCard}>
              <Text style={styles.sectionTitle}>Time Analysis</Text>
              <View style={styles.timeRow}>
                <Ionicons name="time" size={20} color="#3b82f6" />
                <Text style={styles.timeLabel}>Time Taken:</Text>
                <Text style={styles.timeValue}>{formatTime(result.timeTaken)}</Text>
              </View>
              <View style={styles.timeRow}>
                <Ionicons name="calculator" size={20} color="#9333ea" />
                <Text style={styles.timeLabel}>Avg. per Question:</Text>
                <Text style={styles.timeValue}>
                  {formatTime(Math.floor(result.timeTaken / result.totalQuestions))}
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
                  <Text style={styles.progressPercentage}>
                    {(((result.correctAnswers + result.wrongAnswers) / result.totalQuestions) * 100).toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { 
                    width: `${((result.correctAnswers + result.wrongAnswers) / result.totalQuestions) * 100}%`, 
                    backgroundColor: '#3b82f6' 
                  }]} />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <View style={styles.subjectsContent}>
            <View style={styles.subjectsGrid}>
              {Object.entries(result.subjectWiseScore).map(([subject, score]: [string, any]) => {
                const subjectPercentage = score.total > 0 ? (score.correct / score.total) * 100 : 0;
                const subjectColors: Record<string, { bg: string; text: string; icon: string }> = {
                  maths: { bg: '#dbeafe', text: '#2563eb', icon: 'calculator' },
                  physics: { bg: '#d1fae5', text: '#10b981', icon: 'flash' },
                  chemistry: { bg: '#f3e8ff', text: '#9333ea', icon: 'flask' }
                };
                const colors = subjectColors[subject] || { bg: '#f3f4f6', text: '#6b7280', icon: 'book' };
                
                return (
                  <View key={subject} style={[styles.subjectCard, { backgroundColor: colors.bg }]}>
                    <View style={[styles.subjectIcon, { backgroundColor: colors.text + '20' }]}>
                      <Ionicons name={colors.icon as any} size={32} color={colors.text} />
                    </View>
                    <Text style={[styles.subjectName, { color: colors.text }]}>
                      {subject.charAt(0).toUpperCase() + subject.slice(1)}
                    </Text>
                    <Text style={styles.subjectPercentage}>{subjectPercentage.toFixed(1)}%</Text>
                    <Text style={styles.subjectStats}>
                      {score.correct}/{score.total} correct
                    </Text>
                    <Text style={styles.subjectMarks}>{score.marks} marks</Text>
                    <View style={styles.subjectProgressBar}>
                      <View style={[styles.subjectProgressFill, { 
                        width: `${subjectPercentage}%`, 
                        backgroundColor: colors.text 
                      }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && result.questions && (
          <View style={styles.questionsContent}>
            {result.questions.map((question, index) => {
              const userAnswer = result.answers?.[question._id];
              const isCorrect = checkAnswer(question, userAnswer);
              const isAttempted = userAnswer !== undefined && userAnswer !== null && userAnswer !== '';
              
              return (
                <TouchableOpacity
                  key={question._id || index}
                  style={[styles.questionCard, 
                    isCorrect ? styles.questionCardCorrect : 
                    isAttempted ? styles.questionCardWrong : 
                    styles.questionCardUnattempted
                  ]}
                  onPress={() => handleQuestionClick(question)}
                >
                  <View style={styles.questionHeader}>
                    <View style={[styles.questionNumber, 
                      isCorrect ? { backgroundColor: '#10b981' } : 
                      isAttempted ? { backgroundColor: '#ef4444' } : 
                      { backgroundColor: '#6b7280' }
                    ]}>
                      <Text style={styles.questionNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.questionInfo}>
                      <Text style={styles.questionSubject}>
                        {question.subject.charAt(0).toUpperCase() + question.subject.slice(1)}
                      </Text>
                      <Text style={styles.questionMarks}>{question.marks} marks</Text>
                    </View>
                    <Ionicons
                      name={isCorrect ? 'checkmark-circle' : isAttempted ? 'close-circle' : 'ellipse-outline'}
                      size={24}
                      color={isCorrect ? '#10b981' : isAttempted ? '#ef4444' : '#6b7280'}
                    />
                  </View>
                  <Text style={styles.questionText} numberOfLines={2}>
                    {question.questionText}
                  </Text>
                  {isAttempted && (
                    <View style={styles.answerInfo}>
                      <Text style={styles.answerLabel}>Your Answer:</Text>
                      <Text style={styles.answerValue}>
                        {Array.isArray(userAnswer) ? userAnswer.join(', ') : String(userAnswer)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Question Detail Modal */}
      <Modal
        visible={isQuestionModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsQuestionModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedQuestion && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Question Details</Text>
                  <TouchableOpacity onPress={() => setIsQuestionModalOpen(false)}>
                    <Ionicons name="close" size={24} color="#111827" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  <Text style={styles.modalQuestionText}>{selectedQuestion.questionText}</Text>
                  {selectedQuestion.options && (
                    <View style={styles.optionsContainer}>
                      {selectedQuestion.options.map((option, idx) => {
                        const userAnswer = result.answers?.[selectedQuestion._id];
                        const isSelected = Array.isArray(userAnswer) 
                          ? userAnswer.includes(option)
                          : userAnswer === option;
                        const isCorrect = Array.isArray(selectedQuestion.correctAnswer)
                          ? selectedQuestion.correctAnswer.includes(option)
                          : selectedQuestion.correctAnswer === option;
                        
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.optionItem,
                              isCorrect && styles.optionCorrect,
                              isSelected && !isCorrect && styles.optionWrong
                            ]}
                          >
                            <Text style={styles.optionText}>{option}</Text>
                            {isCorrect && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
                            {isSelected && !isCorrect && <Ionicons name="close-circle" size={20} color="#ef4444" />}
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {selectedQuestion.explanation && (
                    <View style={styles.explanationContainer}>
                      <Text style={styles.explanationTitle}>Explanation</Text>
                      <Text style={styles.explanationText}>{selectedQuestion.explanation}</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    margin: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  overviewContent: {
    gap: 16,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreCircleContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
  },
  scorePercentage: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  gradeBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreDetails: {
    flex: 1,
    gap: 16,
  },
  scoreDetailItem: {
    gap: 4,
  },
  scoreDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  scoreDetailValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceItem: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  timeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
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
  subjectsContent: {
    gap: 16,
  },
  subjectsGrid: {
    gap: 16,
  },
  subjectCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  subjectIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '700',
  },
  subjectPercentage: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  subjectStats: {
    fontSize: 14,
    color: '#6b7280',
  },
  subjectMarks: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  subjectProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  questionsContent: {
    gap: 12,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  questionCardCorrect: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  questionCardWrong: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  questionCardUnattempted: {
    borderLeftWidth: 4,
    borderLeftColor: '#6b7280',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  questionInfo: {
    flex: 1,
    gap: 4,
  },
  questionSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  questionMarks: {
    fontSize: 12,
    color: '#6b7280',
  },
  questionText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  answerInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 4,
  },
  answerLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  answerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalQuestionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionCorrect: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  optionWrong: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  explanationContainer: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginTop: 16,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
});

