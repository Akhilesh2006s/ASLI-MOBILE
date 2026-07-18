import api from './api';

const getDashboardStats = async () => {
  const response = await api.get('/api/admin/dashboard/stats');
  return response?.data;
};

const getStudentAnalytics = async () => {
  const response = await api.get('/api/admin/students/analytics');
  return response?.data;
};

const getAnalytics = async () => {
  const response = await api.get('/api/admin/analytics');
  return response?.data;
};

const getTeachers = async () => {
  const response = await api.get('/api/admin/teachers');
  return response?.data;
};

const getSubjects = async () => {
  const response = await api.get('/api/admin/subjects');
  return response?.data;
};

const getVideos = async () => {
  const response = await api.get('/api/admin/videos');
  return response?.data;
};

const createVideo = async (body) => {
  const response = await api.post('/api/admin/videos', body);
  return response?.data;
};

const deleteVideo = async (id) => {
  const response = await api.delete(`/api/admin/videos/${id}`);
  return response?.data;
};

const getQuizzes = async () => {
  const response = await api.get('/api/admin/quizzes');
  return response?.data;
};

const createQuiz = async (body) => {
  const response = await api.post('/api/admin/quizzes', body);
  return response?.data;
};

const getAssessments = async () => {
  const response = await api.get('/api/admin/assessments');
  return response?.data;
};

const createAssessment = async (body) => {
  const response = await api.post('/api/admin/assessments', body);
  return response?.data;
};

const deleteAssessment = async (id) => {
  const response = await api.delete(`/api/admin/assessments/${id}`);
  return response?.data;
};

const getSchoolSettings = async () => {
  const response = await api.get('/api/admin/school-settings');
  return response?.data;
};

const updateSchoolSettings = async (body) => {
  const response = await api.put('/api/admin/school-settings', body);
  return response?.data;
};

const downloadReport = async (type, format = 'csv') => {
  if (format === 'csv') {
    return api.get('/api/admin/reports', {
      params: { type, format },
      responseType: 'text',
    });
  }
  const response = await api.get('/api/admin/reports', {
    params: { type, format },
  });
  return response;
};

export default {
  getDashboardStats,
  getStudentAnalytics,
  getAnalytics,
  getTeachers,
  getSubjects,
  getVideos,
  createVideo,
  deleteVideo,
  getQuizzes,
  createQuiz,
  getAssessments,
  createAssessment,
  deleteAssessment,
  getSchoolSettings,
  updateSchoolSettings,
  downloadReport,
};
