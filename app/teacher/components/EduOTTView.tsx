import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

type EduOTTSubTab = 'videos' | 'live-sessions';

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  views: number;
  createdAt: string;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  fileUrl?: string;
  subjectName?: string;
}

export default function EduOTTView() {
  const [activeSubTab, setActiveSubTab] = useState<EduOTTSubTab>('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    fetchTeacherSubjects();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'videos') {
      fetchVideos();
    } else if (activeSubTab === 'live-sessions') {
      fetchLiveSessions();
    }
  }, [activeSubTab, selectedSubject]);

  const fetchTeacherSubjects = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const subjectsData = data.data || data.subjects || data || [];
        setTeacherSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/asli-prep-content?type=Video`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const videosList = data.success ? (data.data || []) : (data.data || data || []);
        const videosArray = Array.isArray(videosList) ? videosList : [];

        const mappedVideos = videosArray.map((content: any) => {
          const videoFileUrl = content.fileUrls && content.fileUrls.length > 0
            ? content.fileUrls[0]
            : (content.fileUrl || content.videoUrl || '');
          
          const isYouTube = !!content.youtubeUrl || (videoFileUrl && (
            videoFileUrl.includes('youtube.com') ||
            videoFileUrl.includes('youtu.be')
          ));

          const durationInMinutes = content.duration && content.duration > 0
            ? Number(content.duration)
            : 0;

          return {
            _id: content._id || content.id,
            title: content.title || 'Untitled Video',
            description: content.description || '',
            duration: durationInMinutes * 60, // Convert to seconds
            views: content.views || 0,
            createdAt: content.createdAt || new Date().toISOString(),
            videoUrl: videoFileUrl,
            youtubeUrl: content.youtubeUrl || (isYouTube ? videoFileUrl : ''),
            isYouTubeVideo: isYouTube,
            fileUrl: videoFileUrl,
            subjectName: content.subject?.name || content.subject || 'Unknown Subject'
          };
        });

        setVideos(mappedVideos);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/teacher/live-sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const sessionsList = data.data || data || [];
        setLiveSessions(Array.isArray(sessionsList) ? sessionsList : []);
      }
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
      setLiveSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || video.subjectName === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const filteredSessions = liveSessions.filter(session => {
    const matchesSearch = session.title?.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
      session.description?.toLowerCase().includes(sessionSearchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayVideo = async (video: Video) => {
    if (video.isYouTubeVideo && video.youtubeUrl) {
      let videoId = '';
      if (video.youtubeUrl.includes('youtu.be/')) {
        videoId = video.youtubeUrl.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (video.youtubeUrl.includes('youtube.com/watch?v=')) {
        videoId = video.youtubeUrl.split('v=')[1]?.split('&')[0] || '';
      }
      
      if (videoId) {
        const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const canOpen = await Linking.canOpenURL(youtubeUrl);
        if (canOpen) {
          await Linking.openURL(youtubeUrl);
        } else {
          Alert.alert('Error', 'Cannot open YouTube. Please install YouTube app.');
        }
      }
    } else if (video.videoUrl || video.fileUrl) {
      setSelectedVideo(video);
      setIsVideoModalVisible(true);
    } else {
      Alert.alert('Error', 'Video URL not available');
    }
  };

  const getVideoUrl = (video: Video) => {
    if (video.videoUrl) {
      return video.videoUrl.startsWith('http')
        ? video.videoUrl
        : `${API_BASE_URL}${video.videoUrl}`;
    }
    if (video.fileUrl) {
      return video.fileUrl.startsWith('http')
        ? video.fileUrl
        : `${API_BASE_URL}${video.fileUrl}`;
    }
    return '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return '#ef4444';
      case 'scheduled': return '#3b82f6';
      case 'ended': return '#6b7280';
      case 'cancelled': return '#f97316';
      default: return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="play" size={32} color="#8b5cf6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>EduOTT</Text>
          <Text style={styles.headerSubtitle}>Educational videos and live sessions</Text>
        </View>
      </View>

      {/* Sub-Tabs */}
      <View style={styles.subTabsContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'videos' && styles.subTabActive]}
          onPress={() => setActiveSubTab('videos')}
        >
          <Ionicons name="play" size={16} color={activeSubTab === 'videos' ? '#8b5cf6' : '#6b7280'} />
          <Text style={[styles.subTabText, activeSubTab === 'videos' && styles.subTabTextActive]}>
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'live-sessions' && styles.subTabActive]}
          onPress={() => setActiveSubTab('live-sessions')}
        >
          <Ionicons name="radio" size={16} color={activeSubTab === 'live-sessions' ? '#8b5cf6' : '#6b7280'} />
          <Text style={[styles.subTabText, activeSubTab === 'live-sessions' && styles.subTabTextActive]}>
            Live Sessions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Videos Tab */}
      {activeSubTab === 'videos' && (
        <>
          {/* Search and Filter */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search videos by title..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
          ) : filteredVideos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="play-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {searchTerm ? 'No videos match your search' : 'No videos found'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {filteredVideos.map((video) => (
                <TouchableOpacity
                  key={video._id}
                  style={styles.videoCard}
                  onPress={() => handlePlayVideo(video)}
                  activeOpacity={0.7}
                >
                  <View style={styles.videoCardHeader}>
                    <View style={styles.videoIcon}>
                      <Ionicons name="play-circle" size={32} color="#8b5cf6" />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle}>{video.title}</Text>
                      {video.subjectName && (
                        <Text style={styles.videoSubject}>{video.subjectName}</Text>
                      )}
                    </View>
                  </View>
                  {video.description && (
                    <Text style={styles.videoDescription} numberOfLines={2}>
                      {video.description}
                    </Text>
                  )}
                  <View style={styles.videoStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="time" size={16} color="#6b7280" />
                      <Text style={styles.statText}>{formatDuration(video.duration)}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="eye" size={16} color="#6b7280" />
                      <Text style={styles.statText}>{video.views} views</Text>
                    </View>
                    {video.isYouTubeVideo && (
                      <View style={styles.statItem}>
                        <Ionicons name="logo-youtube" size={16} color="#ef4444" />
                        <Text style={styles.statText}>YouTube</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Live Sessions Tab */}
      {activeSubTab === 'live-sessions' && (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search live sessions..."
              value={sessionSearchTerm}
              onChangeText={setSessionSearchTerm}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {isLoadingSessions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
          ) : filteredSessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="radio-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No live sessions found</Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {filteredSessions.map((session) => (
                <View key={session._id} style={styles.sessionCard}>
                  <View style={styles.sessionCardHeader}>
                    <Text style={styles.sessionTitle}>{session.title || 'Untitled Session'}</Text>
                    <View style={[styles.sessionStatusBadge, { backgroundColor: getStatusColor(session.status) + '20' }]}>
                      <Text style={[styles.sessionStatusText, { color: getStatusColor(session.status) }]}>
                        {session.status}
                      </Text>
                    </View>
                  </View>
                  {session.description && (
                    <Text style={styles.sessionDescription}>{session.description}</Text>
                  )}
                  <View style={styles.sessionDetails}>
                    {session.streamer && (
                      <View style={styles.detailRow}>
                        <Ionicons name="person" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>
                          {session.streamer.fullName || session.streamer.email}
                        </Text>
                      </View>
                    )}
                    {session.viewerCount !== undefined && (
                      <View style={styles.detailRow}>
                        <Ionicons name="eye" size={16} color="#6b7280" />
                        <Text style={styles.detailText}>{session.viewerCount} viewers</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Video Player Modal */}
      <Modal
        visible={isVideoModalVisible}
        animationType="slide"
        onRequestClose={() => setIsVideoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedVideo?.title || 'Video Player'}
            </Text>
            <TouchableOpacity onPress={() => setIsVideoModalVisible(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
          </View>

          {selectedVideo && !selectedVideo.isYouTubeVideo && (
            <View style={styles.videoPlayerContainer}>
              <Video
                ref={videoRef}
                style={styles.videoPlayer}
                source={{ uri: getVideoUrl(selectedVideo) }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
                isLooping={false}
              />
            </View>
          )}

          {selectedVideo && selectedVideo.isYouTubeVideo && (
            <View style={styles.youtubeContainer}>
              <Text style={styles.youtubeMessage}>
                This is a YouTube video. Opening in YouTube app...
              </Text>
              <TouchableOpacity
                style={styles.openYoutubeButton}
                onPress={() => handlePlayVideo(selectedVideo)}
              >
                <Ionicons name="logo-youtube" size={24} color="#fff" />
                <Text style={styles.openYoutubeText}>Open in YouTube</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedVideo && selectedVideo.description && (
            <ScrollView style={styles.modalDescription}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{selectedVideo.description}</Text>
            </ScrollView>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    margin: 20,
    marginBottom: 0,
    borderRadius: 12,
    gap: 8,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  subTabActive: {
    backgroundColor: '#f3e8ff',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  subTabTextActive: {
    color: '#8b5cf6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 0,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  videoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoIcon: {
    marginRight: 12,
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  videoSubject: {
    fontSize: 12,
    color: '#6b7280',
  },
  videoDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  videoStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  sessionStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sessionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  sessionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
  },
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  youtubeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 40,
  },
  youtubeMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  openYoutubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  openYoutubeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalDescription: {
    maxHeight: 200,
    backgroundColor: '#fff',
    padding: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

