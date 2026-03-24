import api from './api';

const getDashboardStats = async () => {
  const response = await api.get('/api/admin/dashboard/stats');
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

export default {
  getDashboardStats,
  getAnalytics,
  getTeachers,
};
