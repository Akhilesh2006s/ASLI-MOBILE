import api from '../services/api/api';

export type SchoolSummary = {
  id: string;
  name: string;
  email: string;
};

export interface AdminRecord {
  id?: string;
  _id?: string;
  name?: string;
  schoolName?: string;
  email?: string;
  status?: string;
  board?: string;
  state?: string;
  stats?: {
    students?: number;
    teachers?: number;
    videos?: number;
    assessments?: number;
    exams?: number;
  };
}

export interface DashboardStats {
  totalContent?: number;
  courses?: number;
  assessments?: number;
  exams?: number;
}

export interface ExamDifficultyItem {
  examId: string;
  examTitle: string;
  difficulty: string;
  difficultyScore: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  questionCount: number;
}

export interface PerformanceDistributionBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface PerformanceDistribution {
  excellent: PerformanceDistributionBucket;
  good: PerformanceDistributionBucket;
  average: PerformanceDistributionBucket;
  belowAverage: PerformanceDistributionBucket;
  poor: PerformanceDistributionBucket;
  veryPoor: PerformanceDistributionBucket;
}

export interface PerformanceTrend {
  month: string;
  totalExams: number;
  totalScore: number;
  averageScore: number;
  examCount: number;
}

export interface SubjectAnalysis {
  subject: string;
  totalExams: number;
  totalScore: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  examCount: number;
}

export interface TopScorer {
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  totalExams?: number;
  averageScore?: number;
  highestScore?: number;
}

export interface AdminAnalytics {
  adminId: string;
  adminName: string;
  adminEmail: string;
  examDifficulty: {
    exams: ExamDifficultyItem[];
    overallDifficulty: number;
    hardestExam?: ExamDifficultyItem;
    easiestExam?: ExamDifficultyItem;
  };
  topScorers: TopScorer[];
  performanceDistribution: PerformanceDistribution;
  performanceTrends: PerformanceTrend[];
  subjectAnalysis: SubjectAnalysis[];
  totalStudents: number;
  totalExams: number;
  averageScore: number;
}

export interface GlobalAnalytics {
  totalAdmins: number;
  overallAverageScore: number;
  totalExams: number;
  totalExamResults: number;
  topPerformers: Array<{
    studentId?: string;
    studentName?: string;
    studentEmail?: string;
    totalExams?: number;
    averageScore?: number;
    highestScore?: number;
    adminName?: string;
    adminEmail?: string;
    name?: string;
    email?: string;
  }>;
  subjectWiseAnalysis: SubjectAnalysis[];
  trendsAnalysis?: {
    improving: number;
    declining: number;
    stable: number;
  };
}

export interface AIInsight {
  type: string;
  title: string;
  description: string;
  confidence: number;
  impact: string;
  category: string;
}

export interface DetailedAnalytics {
  adminAnalytics: AdminAnalytics[];
  globalAnalytics: GlobalAnalytics;
  aiInsights?: AIInsight[];
}

export const BOARD_OPTIONS = [
  { value: 'all', label: 'All Boards' },
  { value: 'CBSE', label: 'CBSE' },
  { value: 'SSC', label: 'SSC' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'IB', label: 'IB' },
  { value: 'Others', label: 'Others' },
];

export const STATE_OPTIONS = [
  { value: 'all', label: 'All States' },
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh (AP)' },
  { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh (AR)' },
  { value: 'Assam', label: 'Assam (AS)' },
  { value: 'Bihar', label: 'Bihar (BR)' },
  { value: 'Chhattisgarh', label: 'Chhattisgarh (CG)' },
  { value: 'Goa', label: 'Goa (GA)' },
  { value: 'Gujarat', label: 'Gujarat (GJ)' },
  { value: 'Haryana', label: 'Haryana (HR)' },
  { value: 'Himachal Pradesh', label: 'Himachal Pradesh (HP)' },
  { value: 'Jharkhand', label: 'Jharkhand (JH)' },
  { value: 'Karnataka', label: 'Karnataka (KA)' },
  { value: 'Kerala', label: 'Kerala (KL)' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh (MP)' },
  { value: 'Maharashtra', label: 'Maharashtra (MH)' },
  { value: 'Manipur', label: 'Manipur (MN)' },
  { value: 'Meghalaya', label: 'Meghalaya (ML)' },
  { value: 'Mizoram', label: 'Mizoram (MZ)' },
  { value: 'Nagaland', label: 'Nagaland (NL)' },
  { value: 'Odisha', label: 'Odisha (OD)' },
  { value: 'Punjab', label: 'Punjab (PB)' },
  { value: 'Rajasthan', label: 'Rajasthan (RJ)' },
  { value: 'Sikkim', label: 'Sikkim (SK)' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu (TN)' },
  { value: 'Telangana', label: 'Telangana (TS)' },
  { value: 'Tripura', label: 'Tripura (TR)' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh (UP)' },
  { value: 'Uttarakhand', label: 'Uttarakhand (UK)' },
  { value: 'West Bengal', label: 'West Bengal (WB)' },
  { value: 'Andaman and Nicobar Islands', label: 'Andaman and Nicobar Islands (AN)' },
  { value: 'Chandigarh', label: 'Chandigarh (CH)' },
  { value: 'Dadra and Nagar Haveli and Daman and Diu', label: 'Dadra and Nagar Haveli and Daman and Diu (DN)' },
  { value: 'Delhi', label: 'Delhi (DL)' },
  { value: 'Jammu and Kashmir', label: 'Jammu and Kashmir (JK)' },
  { value: 'Ladakh', label: 'Ladakh (LA)' },
  { value: 'Lakshadweep', label: 'Lakshadweep (LD)' },
  { value: 'Puducherry', label: 'Puducherry (PY)' },
];

export function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

export function getDifficultyBadgeStyle(difficulty: string): { bg: string; text: string } {
  switch (difficulty) {
    case 'Very Hard':
      return { bg: '#fee2e2', text: '#991b1b' };
    case 'Hard':
      return { bg: '#ffedd5', text: '#9a3412' };
    case 'Medium':
      return { bg: '#fef9c3', text: '#854d0e' };
    case 'Easy':
      return { bg: '#dcfce7', text: '#166534' };
    case 'Very Easy':
      return { bg: '#dbeafe', text: '#1e40af' };
    default:
      return { bg: '#f3f4f6', text: '#374151' };
  }
}

export function getPerformanceBarColor(range: string): string {
  switch (range) {
    case '90-100%':
      return '#10b981';
    case '80-89%':
      return '#3b82f6';
    case '70-79%':
      return '#eab308';
    case '60-69%':
      return '#f97316';
    case '50-59%':
      return '#ef4444';
    case '0-49%':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}

export function computeTotalContent(
  admins: AdminRecord[],
  dashboardStats: DashboardStats | null
): number {
  const fromAdmins =
    admins.reduce(
      (sum, admin) =>
        sum + (admin.stats?.videos || 0) + (admin.stats?.assessments || 0) + (admin.stats?.exams || 0),
      0
    ) || 0;
  const fromStats =
    (dashboardStats?.totalContent || dashboardStats?.courses || 0) +
    (dashboardStats?.assessments || 0) +
    (dashboardStats?.exams || 0);
  return fromStats || fromAdmins;
}

export function getFilteredDetailedAnalytics(
  analytics: DetailedAnalytics | null,
  admins: AdminRecord[],
  filterBoard: string,
  filterState: string,
  singleAdminId: string | null
): DetailedAnalytics | null {
  if (!analytics) return null;

  let filteredAdminAnalytics = [...analytics.adminAnalytics];

  if (singleAdminId) {
    filteredAdminAnalytics = filteredAdminAnalytics.filter(
      (a) => String(a.adminId) === String(singleAdminId)
    );
  }

  if (filterBoard !== 'all') {
    filteredAdminAnalytics = filteredAdminAnalytics.filter((admin) => {
      const adminData = admins.find((a) => String(a.id || a._id) === String(admin.adminId));
      return adminData?.board === filterBoard;
    });
  }

  if (filterState !== 'all') {
    filteredAdminAnalytics = filteredAdminAnalytics.filter((admin) => {
      const adminData = admins.find((a) => String(a.id || a._id) === String(admin.adminId));
      return adminData?.state === filterState;
    });
  }

  const filteredGlobalAnalytics: GlobalAnalytics = {
    ...analytics.globalAnalytics,
    totalAdmins: filteredAdminAnalytics.length,
    overallAverageScore:
      filteredAdminAnalytics.length > 0
        ? filteredAdminAnalytics.reduce((sum, admin) => sum + (admin.averageScore || 0), 0) /
          filteredAdminAnalytics.length
        : 0,
    totalExams: filteredAdminAnalytics.reduce((sum, admin) => sum + (admin.totalExams || 0), 0),
    totalExamResults: filteredAdminAnalytics.reduce(
      (sum, admin) => sum + (admin.totalStudents || 0),
      0
    ),
    topPerformers: (analytics.globalAnalytics.topPerformers || []).filter(() => {
      return filteredAdminAnalytics.length > 0;
    }),
    subjectWiseAnalysis: analytics.globalAnalytics.subjectWiseAnalysis || [],
  };

  return {
    ...analytics,
    adminAnalytics: filteredAdminAnalytics,
    globalAnalytics: filteredGlobalAnalytics,
  };
}

export async function fetchPlatformAdmins(): Promise<AdminRecord[]> {
  const response = await api.get('/api/super-admin/admins');
  const data = response?.data;
  const adminsList = Array.isArray(data) ? data : data?.data || [];
  return Array.isArray(adminsList) ? adminsList : [];
}

export async function fetchDashboardStats(): Promise<DashboardStats | null> {
  try {
    const response = await api.get('/api/super-admin/dashboard/stats');
    return response?.data?.data || response?.data || null;
  } catch {
    return null;
  }
}

export async function fetchDetailedAnalytics(): Promise<DetailedAnalytics | null> {
  const response = await api.get('/api/ai/detailed-analytics');
  const data = response?.data;
  return (data?.data || data) ?? null;
}
