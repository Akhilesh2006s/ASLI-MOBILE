import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import {
  AiExamAnalysis,
  ExamAnalysisResult,
  buildPerformanceInsights,
  buildWeakAreas,
  compareAnswers,
  formatExamTime,
  generatePlanQueueItems,
  generatePlanTopics,
  getDisplayPercentage,
  getGradeLetter,
  getOptionText,
  getUserAnswerForQuestion,
  normalizeMongoId,
} from '../../../../src/lib/exam-analysis-helpers';

type TabProps = {
  result: ExamAnalysisResult;
  examTitle: string;
  studentName: string;
  aiAnalysis: AiExamAnalysis | null;
  aiLoading: boolean;
  aiError: string;
};

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={panelStyles.card}>
      <View style={panelStyles.cardHeader}>
        <Text style={panelStyles.cardIcon}>{icon}</Text>
        <Text style={panelStyles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function AiReportTabMobile({ result, examTitle, studentName, aiAnalysis, aiLoading, aiError }: TabProps) {
  const attemptedCount = (result.correctAnswers || 0) + (result.wrongAnswers || 0);
  const totalQuestionCount =
    Number(result.totalQuestions || 0) || attemptedCount + (result.unattempted || 0);
  const accuracyRate = attemptedCount > 0 ? (result.correctAnswers / attemptedCount) * 100 : 0;
  const completionRate = totalQuestionCount > 0 ? (attemptedCount / totalQuestionCount) * 100 : 0;
  const marksPercent =
    (result.totalMarks || 0) > 0 ? ((result.obtainedMarks || 0) / (result.totalMarks || 1)) * 100 : 0;
  const gradeLetter = getGradeLetter(getDisplayPercentage(result));

  const subjectRows = Object.entries(result.subjectWiseScore || {}).map(([subject, score]) => ({
    subject: subject.charAt(0).toUpperCase() + subject.slice(1),
    pct: score.total > 0 ? (score.correct / score.total) * 100 : 0,
    correct: score.correct,
    total: score.total,
  }));

  const planSteps = [
    ...(aiAnalysis?.actionPlan?.today || []),
    ...(aiAnalysis?.actionPlan?.thisWeek || []),
    ...(aiAnalysis?.actionPlan?.beforeNextExam || []),
  ].filter(Boolean).slice(0, 4);

  const summaryParagraphs = useMemo(() => {
    const name = studentName.split(' ')[0] || studentName;
    const lead = [
      `${name}, you scored ${result.obtainedMarks || 0} / ${result.totalMarks} marks on this attempt (${marksPercent.toFixed(1)}% of total marks).`,
      `${attemptedCount} of ${totalQuestionCount} questions attempted (${completionRate.toFixed(0)}% completion).`,
      `Accuracy on attempted questions was ${accuracyRate.toFixed(1)}%.`,
    ];
    if (aiAnalysis?.summary) {
      const parts = aiAnalysis.summary
        .split(/\n\n+/)
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter((s) => s.length > 20)
        .slice(0, 3);
      return [...lead, ...parts];
    }
    return lead;
  }, [aiAnalysis, studentName, result, marksPercent, attemptedCount, totalQuestionCount, completionRate, accuracyRate]);

  return (
    <ScrollView contentContainerStyle={panelStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#9333ea', '#a21caf', '#db2777']} style={panelStyles.hero}>
        <Text style={panelStyles.heroBadge}>{examTitle || result.examTitle || 'Exam'} · {totalQuestionCount} Questions</Text>
        <Text style={panelStyles.heroTitle}>Performance Analysis</Text>
        <Text style={panelStyles.heroSub}>{studentName}</Text>
      </LinearGradient>

      <View style={panelStyles.scoreCard}>
        <Text style={panelStyles.scoreBig}>{result.obtainedMarks || 0}</Text>
        <Text style={panelStyles.scoreDenom}>out of {result.totalMarks} marks</Text>
        <View style={panelStyles.statsRow3}>
          <View style={[panelStyles.statBox, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <Text style={[panelStyles.statVal, { color: '#059669' }]}>{result.correctAnswers || 0}</Text>
            <Text style={panelStyles.statLab}>Correct</Text>
          </View>
          <View style={[panelStyles.statBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={[panelStyles.statVal, { color: '#dc2626' }]}>{result.wrongAnswers || 0}</Text>
            <Text style={panelStyles.statLab}>Wrong</Text>
          </View>
          <View style={[panelStyles.statBox, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
            <Text style={[panelStyles.statVal, { color: '#64748b' }]}>{result.unattempted || 0}</Text>
            <Text style={panelStyles.statLab}>Skipped</Text>
          </View>
        </View>
        <View style={panelStyles.progressBlock}>
          <View style={panelStyles.progressRow}>
            <Text style={panelStyles.progressLabel}>Accuracy Rate</Text>
            <Text style={panelStyles.progressPct}>{accuracyRate.toFixed(1)}%</Text>
          </View>
          <View style={panelStyles.progressTrack}>
            <View style={[panelStyles.progressFill, { width: `${Math.min(100, accuracyRate)}%` }]} />
          </View>
        </View>
        <View style={panelStyles.progressBlock}>
          <View style={panelStyles.progressRow}>
            <Text style={panelStyles.progressLabel}>Completion Rate</Text>
            <Text style={panelStyles.progressPct}>{completionRate.toFixed(0)}%</Text>
          </View>
          <View style={panelStyles.progressTrack}>
            <View style={[panelStyles.progressFillPink, { width: `${Math.min(100, completionRate)}%` }]} />
          </View>
        </View>
        <View style={panelStyles.timeBox}>
          <Ionicons name="time-outline" size={18} color="#2563eb" />
          <Text style={panelStyles.timeLabel}>Time Taken</Text>
          <Text style={panelStyles.timeVal}>{formatExamTime(result.timeTaken)}</Text>
        </View>
        <View style={panelStyles.gradePill}>
          <Text style={panelStyles.gradePillText}>Grade {gradeLetter}</Text>
        </View>
      </View>

      {aiError ? <Text style={panelStyles.errorText}>{aiError}</Text> : null}
      {aiLoading && !aiAnalysis?.summary ? (
        <View style={panelStyles.loadingRow}>
          <ActivityIndicator color="#9333ea" />
          <Text style={panelStyles.loadingText}>Generating AI report…</Text>
        </View>
      ) : null}

      <Card title="AI Performance Snapshot" icon="▦">
        <View style={panelStyles.snapshotGrid}>
          {[
            { l: 'Attempted', v: String(attemptedCount), c: '#059669' },
            { l: 'Unattempted', v: String(result.unattempted || 0), c: '#2563eb' },
            { l: 'Wrong', v: String(result.wrongAnswers || 0), c: '#dc2626' },
            { l: 'Accuracy', v: `${accuracyRate.toFixed(0)}%`, c: '#9333ea' },
          ].map((cell) => (
            <View key={cell.l} style={panelStyles.snapshotCell}>
              <Text style={panelStyles.snapshotLab}>{cell.l}</Text>
              <Text style={[panelStyles.snapshotVal, { color: cell.c }]}>{cell.v}</Text>
            </View>
          ))}
        </View>
      </Card>

      {subjectRows.length > 0 && (
        <Card title="Subject Mastery" icon="◆">
          {subjectRows.map((row) => (
            <View key={row.subject} style={panelStyles.subjectRow}>
              <Text style={panelStyles.subjectName}>{row.subject}</Text>
              <View style={panelStyles.subjectBarTrack}>
                <View style={[panelStyles.subjectBarFill, { width: `${Math.max(8, row.pct)}%` }]} />
              </View>
              <Text style={panelStyles.subjectPct}>{row.correct}/{row.total}</Text>
            </View>
          ))}
        </Card>
      )}

      {(aiAnalysis?.focusAreas?.length || 0) > 0 && (
        <Card title="Concept Pressure Points" icon="◎">
          {(aiAnalysis?.focusAreas || []).slice(0, 3).map((f, i) => (
            <View key={i} style={panelStyles.conceptCard}>
              <Text style={panelStyles.conceptTag}>{f.subject}</Text>
              <Text style={panelStyles.conceptTitle}>{f.issue}</Text>
              <Text style={panelStyles.conceptMeta}>{f.whatToDo}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card title="Personalised Improvement Plan" icon="✦">
        {(planSteps.length > 0 ? planSteps : [
          'Recall drill on your weakest chapters.',
          'Slow down on answers under 30s.',
          'Redo each wrong question blind.',
          'Take a timed mixed set.',
        ]).map((step, i) => (
          <View key={i} style={panelStyles.planStep}>
            <View style={panelStyles.planNum}><Text style={panelStyles.planNumText}>{i + 1}</Text></View>
            <Text style={panelStyles.planStepText}>{step}</Text>
          </View>
        ))}
      </Card>

      <Card title="Vidya Performance Report" icon="✺">
        {summaryParagraphs.map((p, i) => (
          <Text key={i} style={panelStyles.reportPara}>{p}</Text>
        ))}
        <View style={panelStyles.motivationBox}>
          <Text style={panelStyles.motivationText}>
            {aiAnalysis?.motivation || 'Deep, consistent practice beats intensity spikes — small daily wins compound.'}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

type QuestionFilter = 'all' | 'correct' | 'wrong' | 'skipped';

export function QuestionsTabMobile({ result, aiAnalysis }: { result: ExamAnalysisResult; aiAnalysis: AiExamAnalysis | null }) {
  const [filter, setFilter] = useState<QuestionFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const questions = result.questions || [];

  const filteredIndices = useMemo(() => {
    return questions
      .map((q, index) => {
        const ua = getUserAnswerForQuestion(q, index, result.answers);
        const attempted = ua !== undefined && ua !== null && ua !== '';
        const correct = compareAnswers(q, ua, q.correctAnswer);
        if (filter === 'correct') return correct ? index : -1;
        if (filter === 'wrong') return attempted && !correct ? index : -1;
        if (filter === 'skipped') return !attempted ? index : -1;
        return index;
      })
      .filter((i) => i >= 0);
  }, [questions, result.answers, filter]);

  const counts = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    questions.forEach((q, i) => {
      const ua = getUserAnswerForQuestion(q, i, result.answers);
      const attempted = ua !== undefined && ua !== null && ua !== '';
      if (!attempted) skipped += 1;
      else if (compareAnswers(q, ua, q.correctAnswer)) correct += 1;
      else wrong += 1;
    });
    return { all: questions.length, correct, wrong, skipped };
  }, [questions, result.answers]);

  const selectedQuestion = selectedIndex != null ? questions[selectedIndex] : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={panelStyles.filterRow}>
        {([
          { id: 'all' as const, label: `All · ${counts.all}` },
          { id: 'correct' as const, label: `Correct · ${counts.correct}` },
          { id: 'wrong' as const, label: `Wrong · ${counts.wrong}` },
          { id: 'skipped' as const, label: `Skipped · ${counts.skipped}` },
        ]).map((pill) => (
          <TouchableOpacity
            key={pill.id}
            style={[panelStyles.filterPill, filter === pill.id && panelStyles.filterPillActive]}
            onPress={() => setFilter(pill.id)}
          >
            <Text style={[panelStyles.filterPillText, filter === pill.id && panelStyles.filterPillTextActive]}>
              {pill.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={panelStyles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredIndices.length === 0 ? (
          <Text style={panelStyles.emptyText}>No questions match this filter.</Text>
        ) : (
          filteredIndices.map((index) => {
            const question = questions[index];
            const ua = getUserAnswerForQuestion(question, index, result.answers);
            const attempted = ua !== undefined && ua !== null && ua !== '';
            const correct = compareAnswers(question, ua, question.correctAnswer);
            const qi = aiAnalysis?.questionInsights?.find((x) => x.index === index + 1 || x.index === index);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  panelStyles.questionCard,
                  correct ? panelStyles.qCorrect : attempted ? panelStyles.qWrong : panelStyles.qSkipped,
                ]}
                onPress={() => setSelectedIndex(index)}
              >
                <View style={panelStyles.qHeader}>
                  <Text style={panelStyles.qNum}>Q{index + 1}</Text>
                  <Ionicons
                    name={correct ? 'checkmark-circle' : attempted ? 'close-circle' : 'ellipse-outline'}
                    size={18}
                    color={correct ? '#10b981' : attempted ? '#ef4444' : '#9ca3af'}
                  />
                  <Text style={panelStyles.qSubject}>{String(question.subject || 'General')}</Text>
                </View>
                <Text style={panelStyles.qText} numberOfLines={3}>{getOptionText(question.questionText)}</Text>
                {qi?.fixStrategy || qi?.insight ? (
                  <Text style={panelStyles.qInsight} numberOfLines={2}>{qi.fixStrategy || qi.insight}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={selectedIndex != null} animationType="slide" onRequestClose={() => setSelectedIndex(null)}>
        <View style={panelStyles.modalWrap}>
          {selectedQuestion && selectedIndex != null && (
            <ScrollView contentContainerStyle={panelStyles.modalBody}>
              <View style={panelStyles.modalHeader}>
                <Text style={panelStyles.modalTitle}>Question {selectedIndex + 1}</Text>
                <TouchableOpacity onPress={() => setSelectedIndex(null)}>
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
              <Text style={panelStyles.modalQText}>{getOptionText(selectedQuestion.questionText)}</Text>
              {selectedQuestion.options?.map((opt: unknown, idx: number) => {
                const text = getOptionText(opt, selectedQuestion.subject);
                const ua = getUserAnswerForQuestion(selectedQuestion, selectedIndex, result.answers);
                const isSelected = Array.isArray(ua) ? ua.map(getOptionText).includes(text) : getOptionText(ua) === text;
                const correctAns = selectedQuestion.correctAnswer;
                const isCorrect = Array.isArray(correctAns)
                  ? correctAns.map((c) => getOptionText(c)).includes(text)
                  : getOptionText(correctAns) === text;
                return (
                  <View
                    key={idx}
                    style={[
                      panelStyles.optionRow,
                      isCorrect && panelStyles.optionCorrect,
                      isSelected && !isCorrect && panelStyles.optionWrong,
                    ]}
                  >
                    <Text style={panelStyles.optionText}>{text}</Text>
                  </View>
                );
              })}
              {selectedQuestion.explanation ? (
                <View style={panelStyles.explanationBox}>
                  <Text style={panelStyles.explanationTitle}>Explanation</Text>
                  <Text style={panelStyles.explanationText}>{getOptionText(selectedQuestion.explanation)}</Text>
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

export function AdvancedTabMobile({ examId }: { examId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/exam/${examId}/advanced-analytics`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.success) throw new Error(payload?.message || 'Failed to load advanced analytics');
        if (!cancelled) setData(payload.data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Advanced analytics unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [examId]);

  if (loading) {
    return (
      <View style={panelStyles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={panelStyles.loadingText}>Loading advanced intelligence…</Text>
      </View>
    );
  }

  const analytics = data || {};
  const recommendation = analytics.recommendation || {};

  return (
    <ScrollView contentContainerStyle={panelStyles.scrollContent} showsVerticalScrollIndicator={false}>
      {error ? <Text style={panelStyles.warnText}>{error}</Text> : null}
      <Card title="Advanced Performance Intelligence" icon="📊">
        <View style={panelStyles.badgeRow}>
          <View style={panelStyles.badgeBlue}><Text style={panelStyles.badgeBlueText}>Risk: {recommendation.riskLevel || 'N/A'}</Text></View>
          <View style={panelStyles.badgeGreen}><Text style={panelStyles.badgeGreenText}>Trend: {recommendation.confidenceTrend || 'Stable'}</Text></View>
        </View>
        {recommendation.strategy ? <Text style={panelStyles.bodyText}>{recommendation.strategy}</Text> : null}
      </Card>

      {(analytics.difficultyTimeIntelligence || []).map((row: any, i: number) => (
        <Card key={i} title={`${String(row.difficulty || 'Level')} · Time Intelligence`} icon="⏱">
          <Text style={panelStyles.bodyText}>Correct: {row.correctAnswered?.count || 0} · Wrong: {row.wrongAnswered?.count || 0}</Text>
          <Text style={panelStyles.metaText}>Ideal time: {row.idealTimeSec || 0}s</Text>
        </Card>
      ))}

      {(analytics.chapterWeakness || []).slice(0, 8).map((row: any, i: number) => (
        <View key={i} style={panelStyles.chapterRow}>
          <View style={{ flex: 1 }}>
            <Text style={panelStyles.chapterTitle}>{row.chapter}</Text>
            <Text style={panelStyles.metaText}>{row.subject} · {row.correct}/{row.correct + row.errors + row.notAnswered} correct</Text>
          </View>
          <Text style={[panelStyles.chapterPct, { color: row.accuracy < 60 ? '#ea580c' : row.accuracy < 80 ? '#2563eb' : '#16a34a' }]}>
            {Math.round(row.accuracy || 0)}%
          </Text>
        </View>
      ))}

      {(analytics.aiObservations || []).map((obs: string, i: number) => (
        <View key={i} style={panelStyles.obsBox}>
          <Text style={panelStyles.bodyText}>{obs}</Text>
        </View>
      ))}

      {analytics.timeEfficiency ? (
        <Card title="Time Efficiency" icon="⚡">
          <Text style={panelStyles.bodyText}>Efficiency score: {analytics.timeEfficiency.efficiencyScore || 0}</Text>
          <Text style={panelStyles.metaText}>Slowest: {analytics.timeEfficiency.slowestSubject || '—'} · Fastest: {analytics.timeEfficiency.fastestSubject || '—'}</Text>
        </Card>
      ) : null}

      {recommendation.actionPlan ? (
        <Card title="Recommended Action Plan" icon="✦">
          {(recommendation.actionPlan.thisWeek || []).map((step: string, i: number) => (
            <Text key={i} style={panelStyles.bulletText}>• {step}</Text>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

export function InsightsTabMobile({ result, aiAnalysis }: { result: ExamAnalysisResult; aiAnalysis: AiExamAnalysis | null }) {
  const insights = buildPerformanceInsights(result, aiAnalysis);
  const weakAreas = buildWeakAreas(result);
  const mistakeCareless = Math.max(1, Math.round((result.wrongAnswers || 0) * 0.35));

  return (
    <ScrollView contentContainerStyle={panelStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={panelStyles.sectionHeading}>Subject-wise performance</Text>
      <View style={panelStyles.subjectGrid}>
        {Object.entries(result.subjectWiseScore || {}).map(([subject, score]) => {
          const pct = score.total > 0 ? (score.correct / score.total) * 100 : 0;
          return (
            <View key={subject} style={panelStyles.insightSubjectCard}>
              <Text style={panelStyles.insightSubjectName}>{subject.charAt(0).toUpperCase() + subject.slice(1)}</Text>
              <Text style={panelStyles.insightSubjectPct}>{pct.toFixed(1)}%</Text>
              <Text style={panelStyles.metaText}>{score.correct}/{score.total} correct</Text>
            </View>
          );
        })}
      </View>

      <Card title="Performance Highlights" icon="✨">
        {insights.length > 0 ? insights.map((insight, i) => (
          <View key={i} style={[panelStyles.insightCard, { backgroundColor: insight.bg }]}>
            <Ionicons name={insight.icon as any} size={20} color={insight.color} />
            <View style={{ flex: 1 }}>
              <Text style={[panelStyles.insightTitle, { color: insight.color }]}>{insight.title}</Text>
              <Text style={panelStyles.bodyText}>{insight.description}</Text>
            </View>
          </View>
        )) : (
          <Text style={panelStyles.emptyText}>Complete more exams to unlock insights!</Text>
        )}
      </Card>

      <Card title="Areas for Improvement" icon="🎯">
        {weakAreas.length > 0 ? weakAreas.map((area, i) => (
          <View key={i} style={[panelStyles.weakCard, { backgroundColor: area.bg }]}>
            <View style={panelStyles.weakHeader}>
              <Text style={panelStyles.weakSubject}>{area.subject}</Text>
              <Text style={{ color: area.color, fontWeight: '800' }}>{area.percentage.toFixed(1)}%</Text>
            </View>
            <Text style={panelStyles.metaText}>{area.correct}/{area.total} questions correct</Text>
          </View>
        )) : (
          <Text style={panelStyles.emptyText}>Excellent! No weak areas identified.</Text>
        )}
      </Card>

      <Text style={panelStyles.sectionHeading}>Pattern Alerts</Text>
      {[
        { icon: '⚡', title: 'Careless errors', desc: `${mistakeCareless} this time — fast wrong answers climbing.`, fix: '10 min slow-mode drill daily' },
        { icon: '🧠', title: 'Weak chapter', desc: (aiAnalysis?.focusAreas?.[0]?.issue || 'Stuck below target accuracy.').slice(0, 80), fix: '8-min concept video + 10 Qs' },
        { icon: '📉', title: 'Confidence trend', desc: `Trend: ${String(aiAnalysis?.predictions?.trend || 'stable')}.`, fix: 'Start mocks with your anchor subject' },
      ].map((alert, i) => (
        <View key={i} style={panelStyles.alertCard}>
          <Text style={panelStyles.alertTitle}>{alert.icon} {alert.title}</Text>
          <Text style={panelStyles.bodyText}>{alert.desc}</Text>
          <Text style={panelStyles.alertFix}>→ Fix: {alert.fix}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function PlanTabMobile({ studentName, aiAnalysis }: { studentName: string; aiAnalysis: AiExamAnalysis | null }) {
  const [selectedDay, setSelectedDay] = useState(0);
  const planTopics = useMemo(() => generatePlanTopics(aiAnalysis), [aiAnalysis]);
  const activeTopic = planTopics[selectedDay] ?? planTopics[0];
  const planQueue = useMemo(() => generatePlanQueueItems(activeTopic?.title || 'Focus', selectedDay), [activeTopic?.title, selectedDay]);

  return (
    <ScrollView contentContainerStyle={panelStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#9333ea', '#ec4899']} style={panelStyles.planHero}>
        <Text style={panelStyles.planHeroTitle}>YOUR TOPIC PLAN</Text>
        <Text style={panelStyles.planHeroSub}>Personalised from your weak areas</Text>
        <Text style={panelStyles.planHeroMeta}>7 focus topics · 70 questions · 7 quizzes</Text>
      </LinearGradient>

      <View style={panelStyles.planWhyBox}>
        <View style={panelStyles.planAvatar}><Text style={panelStyles.planAvatarText}>V</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={panelStyles.planWhyTitle}>Why this plan, in one minute</Text>
          <Text style={panelStyles.bodyText}>
            {studentName}, this week targets your focus areas. {(aiAnalysis?.actionPlan?.thisWeek || [])[0] || 'Short daily drills on weak chapters.'}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={panelStyles.planDaysRow}>
        {planTopics.map((topic, i) => (
          <TouchableOpacity
            key={topic.topicNum}
            style={[panelStyles.planDayCard, selectedDay === i && panelStyles.planDayCardActive]}
            onPress={() => setSelectedDay(i)}
          >
            {selectedDay === i && <Text style={panelStyles.planActiveLabel}>ACTIVE</Text>}
            <Text style={panelStyles.planDayTitle} numberOfLines={2}>{topic.title}</Text>
            <Text style={panelStyles.metaText}>{topic.subtitle}</Text>
            <Text style={panelStyles.planDayDur}>{topic.duration}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Card title={activeTopic?.title || 'Focus topic'} icon="📌">
        <Text style={panelStyles.metaText}>{activeTopic?.subtitle} · {activeTopic?.duration}</Text>
        <Text style={panelStyles.queueHeading}>WARM-UP · {planQueue.warmup.length} EASY Qs</Text>
        {planQueue.warmup.map((item, i) => (
          <Text key={item.id} style={panelStyles.queueItem}>Q{i + 1} · {item.minutes}m — {item.title}</Text>
        ))}
        <Text style={panelStyles.queueHeading}>CORE · {planQueue.core.length} Qs</Text>
        {planQueue.core.map((item, i) => (
          <Text key={item.id} style={panelStyles.queueItem}>Q{i + 1} · {item.minutes}m — {item.title}</Text>
        ))}
        <Text style={panelStyles.queueHeading}>STRETCH · optional</Text>
        {planQueue.stretch.map((item, i) => (
          <Text key={item.id} style={panelStyles.queueItem}>+{i + 1} · {item.minutes}m — {item.title}</Text>
        ))}
      </Card>

      {(aiAnalysis?.actionPlan?.beforeNextExam || []).length > 0 && (
        <Card title="Before Next Exam" icon="🎯">
          {(aiAnalysis?.actionPlan?.beforeNextExam || []).map((step, i) => (
            <Text key={i} style={panelStyles.bulletText}>• {step}</Text>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const panelStyles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 32, gap: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  hero: { borderRadius: 18, padding: 20, gap: 6 },
  heroBadge: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  scoreCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  scoreBig: { fontSize: 42, fontWeight: '800', color: '#111827', textAlign: 'center' },
  scoreDenom: { textAlign: 'center', color: '#6b7280', fontSize: 14, marginBottom: 4 },
  statsRow3: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLab: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  progressBlock: { gap: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  progressPct: { fontSize: 13, fontWeight: '700', color: '#9333ea' },
  progressTrack: { height: 8, backgroundColor: '#eef0f4', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 6 },
  progressFillPink: { height: '100%', backgroundColor: '#ec4899', borderRadius: 6 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  timeLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e40af' },
  timeVal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  gradePill: { alignSelf: 'center', backgroundColor: '#f5f3ff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  gradePillText: { color: '#7c3aed', fontWeight: '800', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e9edf3', gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  errorText: { color: '#dc2626', backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, fontSize: 13 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  snapshotCell: { width: '47%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  snapshotLab: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  snapshotVal: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  subjectName: { width: 72, fontWeight: '700', color: '#1e293b', fontSize: 13 },
  subjectBarTrack: { flex: 1, height: 18, backgroundColor: '#f1f5f9', borderRadius: 8, overflow: 'hidden' },
  subjectBarFill: { height: '100%', backgroundColor: '#9333ea', borderRadius: 8 },
  subjectPct: { width: 44, textAlign: 'right', fontSize: 12, color: '#64748b' },
  conceptCard: { borderWidth: 1, borderColor: '#e2e8f0', borderTopWidth: 3, borderTopColor: '#7c3aed', borderRadius: 12, padding: 12, marginBottom: 8 },
  conceptTag: { fontSize: 10, fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' },
  conceptTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 4 },
  conceptMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  planStep: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  planNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#9333ea', alignItems: 'center', justifyContent: 'center' },
  planNumText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  planStepText: { flex: 1, fontSize: 13, color: '#475569', lineHeight: 18 },
  reportPara: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 8 },
  motivationBox: { backgroundColor: '#f5f3ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ddd6fe', marginTop: 8 },
  motivationText: { color: '#6d28d9', fontWeight: '600', fontSize: 13, lineHeight: 18 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  filterPillActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  filterPillText: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  filterPillTextActive: { color: '#fff' },
  questionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: '#f3f4f6' },
  qCorrect: { borderLeftColor: '#10b981' },
  qWrong: { borderLeftColor: '#ef4444' },
  qSkipped: { borderLeftColor: '#9ca3af' },
  qHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  qNum: { fontWeight: '800', color: '#111827' },
  qSubject: { fontSize: 12, color: '#6b7280', textTransform: 'capitalize' },
  qText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  qInsight: { fontSize: 12, color: '#7c3aed', marginTop: 6 },
  emptyText: { textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 14 },
  modalWrap: { flex: 1, backgroundColor: '#fff' },
  modalBody: { padding: 20, paddingTop: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalQText: { fontSize: 16, color: '#111827', lineHeight: 24, marginBottom: 16 },
  optionRow: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8 },
  optionCorrect: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  optionWrong: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  optionText: { fontSize: 14, color: '#111827' },
  explanationBox: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, marginTop: 12 },
  explanationTitle: { fontWeight: '800', color: '#111827', marginBottom: 6 },
  explanationText: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  warnText: { color: '#9a3412', backgroundColor: '#fff7ed', padding: 12, borderRadius: 10, fontSize: 13 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  badgeBlue: { backgroundColor: '#dbeafe', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeBlueText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  badgeGreen: { backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeGreenText: { color: '#15803d', fontWeight: '700', fontSize: 12 },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  metaText: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  chapterTitle: { fontWeight: '700', color: '#111827', fontSize: 14 },
  chapterPct: { fontSize: 16, fontWeight: '800' },
  obsBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  bulletText: { fontSize: 14, color: '#374151', marginBottom: 6, lineHeight: 20 },
  sectionHeading: { fontSize: 18, fontWeight: '800', color: '#111827' },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  insightSubjectCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  insightSubjectName: { fontWeight: '700', color: '#111827' },
  insightSubjectPct: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  insightCard: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, marginBottom: 8 },
  insightTitle: { fontWeight: '800', fontSize: 14, marginBottom: 2 },
  weakCard: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  weakHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  weakSubject: { fontWeight: '800', color: '#111827' },
  alertCard: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a', marginBottom: 10 },
  alertTitle: { fontWeight: '800', color: '#111827', fontSize: 14 },
  alertFix: { color: '#7c3aed', fontWeight: '600', fontSize: 13, marginTop: 6 },
  planHero: { borderRadius: 18, padding: 20 },
  planHeroTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  planHeroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  planHeroMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  planWhyBox: { flexDirection: 'row', gap: 12, backgroundColor: '#fff1f2', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#fecdd3' },
  planAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  planAvatarText: { color: '#fff', fontWeight: '800' },
  planWhyTitle: { fontWeight: '800', color: '#111827', marginBottom: 4 },
  planDaysRow: { gap: 10, paddingVertical: 4 },
  planDayCard: { width: 160, backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  planDayCardActive: { backgroundColor: '#fff', borderColor: '#7c3aed' },
  planActiveLabel: { fontSize: 10, fontWeight: '800', color: '#7c3aed', marginBottom: 4 },
  planDayTitle: { fontWeight: '800', color: '#111827', fontSize: 14 },
  planDayDur: { fontSize: 12, fontWeight: '700', color: '#4b5563', marginTop: 6 },
  queueHeading: { fontSize: 11, fontWeight: '800', color: '#6b7280', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  queueItem: { fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 18 },
});
