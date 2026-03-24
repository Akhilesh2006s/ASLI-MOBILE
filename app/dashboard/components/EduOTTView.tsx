import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import Header from './eduott/Header';
import TabSwitcher, { EduOTTTab } from './eduott/TabSwitcher';
import SearchBar from './eduott/SearchBar';
import FilterChips from './eduott/FilterChips';
import VideoCard from './eduott/VideoCard';

interface VideoItem {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  videoUrl?: string;
  fileUrl?: string;
  isYouTubeVideo?: boolean;
  subjectId?: string;
  subjectName?: string;
  views?: number;
  watchProgress?: number;
}

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamUrl?: string;
  scheduledTime?: string;
  subject?: { _id: string; name: string };
  viewerCount?: number;
}

interface EduOTTViewProps {
  username?: string;
}

export default function EduOTTView({ username = 'Student' }: EduOTTViewProps) {
  const [activeTab, setActiveTab] = useState<EduOTTTab>('videos');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(10);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSubjects();
    fetchVideos();
    fetchLiveSessions();
  }, []);

  useEffect(() => setVisibleCount(10), [searchTerm, selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/student/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const subjectsList = data.subjects || data.data || [];
        setSubjects(subjectsList);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content?type=Video`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const videosList = data.data || data || [];
        
        console.log('📹 Fetched videos:', videosList.length);
        
        const videosWithSubjects = videosList.map((content: any) => {
          const subjectId = content.subject?._id || content.subject?.id || (typeof content.subject === 'string' ? content.subject : '');
          const subjectName = content.subject?.name || (typeof content.subject === 'string' ? content.subject : 'Unknown Subject');
          const rawDuration = content.duration || 0;
          const durationInSeconds = rawDuration > 0 
            ? (rawDuration > 100 ? rawDuration : rawDuration * 60)
            : 0;
          
          let videoFileUrl = content.fileUrl || content.videoUrl;
          if (videoFileUrl && !videoFileUrl.startsWith('http') && !videoFileUrl.startsWith('//')) {
            if (videoFileUrl.startsWith('/')) {
              videoFileUrl = `${API_BASE_URL}${videoFileUrl}`;
            } else {
              videoFileUrl = `${API_BASE_URL}/${videoFileUrl}`;
            }
          }
          
          return {
            _id: content._id,
            title: content.title || 'Untitled Video',
            description: content.description || '',
            videoUrl: videoFileUrl,
            fileUrl: videoFileUrl,
            duration: durationInSeconds,
            views: content.views || 0,
            subjectId: subjectId ? String(subjectId) : '',
            subjectName: subjectName,
            watchProgress: Number(content.watchProgress || content.progress || 0),
            isYouTubeVideo: videoFileUrl && (
              videoFileUrl.includes('youtube.com') || 
              videoFileUrl.includes('youtu.be')
            )
          };
        });
        
        setVideos(videosWithSubjects);
      } else {
        console.error('Failed to fetch videos:', response.status, response.statusText);
        setVideos([]);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        setLoadingSessions(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/student/streams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const sessionsList = data.data || data || [];
        setLiveSessions(sessionsList);
      }
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
      setLiveSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'scheduled':
        return { bg: '#dbeafe', text: '#2563eb' };
      case 'ended':
        return { bg: '#f3f4f6', text: '#6b7280' };
      case 'cancelled':
        return { bg: '#fed7aa', text: '#ea580c' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const matchesSearch = !searchTerm || video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (video.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const normalizedSelected = String(selectedSubject || '').toLowerCase();
      const normalizedName = String(video.subjectName || '').toLowerCase();
      const normalizedId = String(video.subjectId || '').toLowerCase();
      const matchesSubject =
        selectedSubject === 'all' ||
        normalizedId === normalizedSelected ||
        normalizedName === normalizedSelected;
      return matchesSearch && matchesSubject;
    });
  }, [videos, searchTerm, selectedSubject]);

  const visibleVideos = useMemo(
    () => filteredVideos.slice(0, visibleCount),
    [filteredVideos, visibleCount]
  );

  const handlePlayVideo = useCallback(async (video: VideoItem) => {
    if (video.videoUrl) {
      try {
        await Linking.openURL(video.videoUrl);
      } catch (error) {
        console.error('Failed to open video URL:', error);
      }
    }
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const handleJoinLive = useCallback(async (session: LiveSession) => {
    if (!session.streamUrl) return;
    try {
      await Linking.openURL(session.streamUrl);
    } catch (error) {
      console.error('Failed to open stream URL:', error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSubjects(), fetchVideos(), fetchLiveSessions()]);
    setRefreshing(false);
  }, []);

  const toggleBookmark = useCallback((videoId: string) => {
    setBookmarkedIds(prev => ({ ...prev, [videoId]: !prev[videoId] }));
  }, []);

  const onEndReached = useCallback(() => {
    if (visibleCount < filteredVideos.length) {
      setVisibleCount(prev => prev + 10);
    }
  }, [visibleCount, filteredVideos.length]);

  const renderVideoItem = useCallback(({ item: video }: { item: VideoItem }) => (
    <VideoCard
      title={video.title}
      description={video.description}
      subjectName={video.subjectName}
      durationText={formatDuration(video.duration)}
      views={Number(video.views || 0)}
      watchProgress={(video as any).watchProgress}
      isBookmarked={Boolean(bookmarkedIds[video._id])}
      isYouTubeVideo={video.isYouTubeVideo}
      onPress={() => handlePlayVideo(video)}
      onToggleBookmark={() => toggleBookmark(video._id)}
    />
  ), [bookmarkedIds, formatDuration, handlePlayVideo, toggleBookmark]);

  const renderSessionItem = useCallback(({ item }: { item: LiveSession }) => {
    const statusColor = getStatusColor(item.status);
    return (
      <TouchableOpacity style={styles.sessionCard} activeOpacity={0.9} onPress={() => handleJoinLive(item)}>
        <View style={styles.sessionTopRow}>
          <Text style={styles.sessionTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.sessionStatus, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.sessionStatusText, { color: statusColor.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.sessionDescription} numberOfLines={2}>
          {item.description || 'Live class session'}
        </Text>
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionMetaText}>{item.subject?.name || 'General'}</Text>
          <Text style={styles.sessionMetaText}>•</Text>
          <Text style={styles.sessionMetaText}>{item.viewerCount || 0} watching</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleJoinLive]);

  const videoKeyExtractor = useCallback((item: VideoItem) => item._id, []);

  const listHeader = (
    <>
      <Header username={username} />

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}>
            <Ionicons name="videocam" size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>EduOTT</Text>
            <Text style={styles.summarySubtitle}>Videos & Live Classes</Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <TouchableOpacity style={styles.statChip} activeOpacity={0.85} onPress={() => setActiveTab('videos')}>
            <Text style={styles.statChipText}>🎥 {videos.length} Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statChip} activeOpacity={0.85} onPress={() => setActiveTab('live-sessions')}>
            <Text style={styles.statChipText}>🔴 {liveSessions.filter(x => x.status === 'live').length} Live</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
    </>
  );

  const renderSkeletons = () => (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={styles.skeletonCard}>
          <View style={styles.skeletonThumb} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.skeletonLineLg} />
            <View style={styles.skeletonLineSm} />
            <View style={styles.skeletonLineXs} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderVideoContent = () => {
    if (loading) return renderSkeletons();
    if (filteredVideos.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="videocam-outline" size={52} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No videos found</Text>
          <Text style={styles.emptyText}>Try another keyword or subject filter.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={visibleVideos}
        keyExtractor={videoKeyExtractor}
        renderItem={renderVideoItem}
        ListHeaderComponent={
          <>
            {listHeader}
            <SearchBar value={searchTerm} onChangeText={setSearchTerm} />
            <FilterChips selectedSubject={selectedSubject} subjects={subjects} onSelect={setSelectedSubject} />
            <Text style={styles.resultsCount}>Showing {visibleVideos.length} of {filteredVideos.length}</Text>
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        contentContainerStyle={styles.listContainer}
        maxToRenderPerBatch={8}
        initialNumToRender={8}
        windowSize={9}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderLiveContent = () => {
    if (loadingSessions) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      );
    }

    return (
      <FlatList
        data={liveSessions}
        keyExtractor={(item) => item._id}
        renderItem={renderSessionItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="radio-outline" size={52} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No live sessions right now</Text>
            <Text style={styles.emptyText}>Upcoming classes will appear here.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {activeTab === 'videos' ? renderVideoContent() : renderLiveContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContainer: {
    paddingBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
  },
  loader: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    marginTop: 30,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginRight: 8,
  },
  sessionStatus: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sessionDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  skeletonWrap: {
    marginTop: 12,
    gap: 10,
  },
  skeletonCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  skeletonThumb: {
    width: 110,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  skeletonLineLg: {
    height: 14,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    width: '90%',
  },
  skeletonLineSm: {
    height: 12,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    width: '60%',
  },
  skeletonLineXs: {
    height: 10,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    width: '50%',
    marginTop: 2,
  },
});

