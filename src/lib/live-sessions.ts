import api from '../services/api/api';

export type LiveSession = {
  _id: string;
  title: string;
  subject?: { _id: string; name: string } | string;
  streamUrl?: string;
  status?: 'scheduled' | 'live' | 'ended';
  scheduledAt?: string;
};

export async function fetchLiveSessions(): Promise<LiveSession[]> {
  const response = await api.get('/api/super-admin/streams');
  const data = response?.data;
  return data?.data || data?.streams || [];
}

export async function streamAction(id: string, action: 'start' | 'end'): Promise<void> {
  await api.post(`/api/streams/${id}/${action}`);
}
