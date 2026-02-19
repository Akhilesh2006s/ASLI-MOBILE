import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface VideoItem {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  videoUrl?: string;
  fileUrl?: string;
  isYouTubeVideo?: boolean;
  subjectName?: string;
  views?: number;
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

export default function EduOTTView() {
  const [activeTab, setActiveTab] = useState<'videos' | 'live-sessions'>('videos');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (activeTab === 'videos') {
      // Fetch videos even if subjects is empty - let the API handle filtering
      fetchVideos();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'live-sessions') {
      fetchLiveSessions();
    }
  }, [activeTab]);

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
          const subjectName = content.subject?.name || content.subject || 'Unknown Subject';
          const rawDuration = content.duration || 0;
          // Duration might already be in seconds or minutes - handle both
          const durationInSeconds = rawDuration > 0 
            ? (rawDuration > 100 ? rawDuration : rawDuration * 60) // If > 100, assume seconds, else minutes
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
            subjectName: subjectName,
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

  const handleVideoClick = (video: VideoItem) => {
    setSelectedVideo(video);
    setIsVideoModalOpen(true);
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
    if (videoRef.current) {
      videoRef.current.pauseAsync();
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
      const matchesSubject = selectedSubject === 'all' || 
                            video.subjectName === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [videos, searchTerm, selectedSubject]);

  const filteredSessions = useMemo(() => {
    return liveSessions.filter(session => {
      const matchesSearch = !sessionSearchTerm || session.title.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
        (session.description || '').toLowerCase().includes(sessionSearchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [liveSessions, sessionSearchTerm, filterStatus]);

  const handlePlayVideo = useCallback(async (video: VideoItem) => {
    if (video.isYouTubeVideo && video.videoUrl) {
      try {
        await Linking.openURL(video.videoUrl);
      } catch (error) {
        console.error('Failed to open YouTube:', error);
      }
    } else {
      handleVideoClick(video);
    }
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);

  const renderVideoItem = useCallback(({ item: video }: { item: VideoItem }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => handlePlayVideo(video)}
      activeOpacity={0.7}
    >
      <View style={styles.videoThumbnail}>
        {video.isYouTubeVideo ? (
          <Ionicons name="logo-youtube" size={40} color="#ef4444" />
        ) : (
          <Ionicons name="play-circle" size={40} color="#3b82f6" />
        )}
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{video.title}</Text>
        {video.description && (
          <Text style={styles.videoDescription} numberOfLines={2}>
            {video.description}
          </Text>
        )}
        <View style={styles.videoMeta}>
          <View style={styles.videoMetaItem}>
            <Ionicons name="book" size={14} color="#6b7280" />
            <Text style={styles.videoMetaText}>{video.subjectName}</Text>
          </View>
          <View style={styles.videoMetaItem}>
            <Ionicons name="time" size={14} color="#6b7280" />
            <Text style={styles.videoMetaText}>{formatDuration(video.duration)}</Text>
          </View>
          {video.views > 0 && (
            <View style={styles.videoMetaItem}>
              <Ionicons name="eye" size={14} color="#6b7280" />
              <Text style={styles.videoMetaText}>{video.views} views</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  ), [handlePlayVideo, formatDuration]);

  const videoKeyExtractor = useCallback((item: VideoItem) => item._id, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="videocam" size={24} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>EduOTT</Text>
          <Text style={styles.headerSubtitle}>Educational videos and live sessions</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'videos' && styles.tabActive]}
          onPress={() => setActiveTab('videos')}
        >
          <Text style={[styles.tabText, activeTab === 'videos' && styles.tabTextActive]}>
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'live-sessions' && styles.tabActive]}
          onPress={() => setActiveTab('live-sessions')}
        >
          <Text style={[styles.tabText, activeTab === 'live-sessions' && styles.tabTextActive]}>
            Live Sessions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <View style={styles.content}>
          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search videos by title..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View style={styles.filterContainer}>
              <Ionicons name="filter" size={20} color="#6b7280" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedSubject === 'all' && styles.filterChipActive]}
                  onPress={() => setSelectedSubject('all')}
                >
                  <Text style={[styles.filterChipText, selectedSubject === 'all' && styles.filterChipTextActive]}>
                    All Subjects
                  </Text>
                </TouchableOpacity>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject._id || subject.name}
                    style={[styles.filterChip, selectedSubject === (subject._id || subject.name) && styles.filterChipActive]}
                    onPress={() => setSelectedSubject(subject._id || subject.name)}
                  >
                    <Text style={[styles.filterChipText, selectedSubject === (subject._id || subject.name) && styles.filterChipTextActive]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Results Count */}
          <Text style={styles.resultsCount}>
            Showing {filteredVideos.length} of {videos.length} videos
          </Text>

          {/* Videos List */}
          {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
          ) : filteredVideos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No Videos Available</Text>
              <Text style={styles.emptyStateText}>Check back later for new video content.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredVideos}
              keyExtractor={videoKeyExtractor}
              renderItem={renderVideoItem}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* Live Sessions Tab */}
      {activeTab === 'live-sessions' && <LiveSessionsView />}

      {/* Video Player Modal */}
      <Modal
        visible={isVideoModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseVideoModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedVideo?.title}</Text>
              <TouchableOpacity onPress={handleCloseVideoModal}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            {selectedVideo && !selectedVideo.isYouTubeVideo && selectedVideo.videoUrl && (
              <Video
                ref={videoRef}
                source={{ uri: selectedVideo.videoUrl }}
                style={styles.videoPlayer}
                useNativeControls
                resizeMode="contain"
              />
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
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  searchContainer: {
    marginBottom: 16,
    gap: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
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
  videosList: {
    flex: 1,
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  videoThumbnail: {
    width: 120,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
    gap: 8,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  videoDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  videoMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  videoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  sessionsList: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sessionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  videoPlayer: {
    width: '100%',
    height: '70%',
  },
});

