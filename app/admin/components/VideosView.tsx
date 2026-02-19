import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface Video {
  _id: string;
  title: string;
  description?: string;
  subject?: string | { _id: string; name: string };
  duration: number;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  thumbnailUrl?: string;
  difficulty?: string;
  language?: string;
  isActive: boolean;
  views?: number;
  createdAt: string;
}

export default function VideosView() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    subject: '',
    subjectId: '',
    duration: 30,
    videoUrl: '',
    youtubeUrl: '',
    isYouTubeVideo: false,
    difficulty: 'medium',
    language: 'English'
  });

  useEffect(() => {
    fetchVideos();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVideos(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVideo = async () => {
    if (!newVideo.title || !newVideo.subject) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/admin/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newVideo,
          subjectId: newVideo.subject
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Video created successfully');
        setIsCreateModalOpen(false);
        setNewVideo({
          title: '',
          description: '',
          subject: '',
          subjectId: '',
          duration: 30,
          videoUrl: '',
          youtubeUrl: '',
          isYouTubeVideo: false,
          difficulty: 'medium',
          language: 'English'
        });
        fetchVideos();
      } else {
        Alert.alert('Error', 'Failed to create video');
      }
    } catch (error) {
      console.error('Failed to create video:', error);
      Alert.alert('Error', 'An error occurred');
    }
  };

  const handleDeleteVideo = async (id: string) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('authToken');
              const response = await fetch(`${API_BASE_URL}/api/admin/videos/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                fetchVideos();
              }
            } catch (error) {
              console.error('Failed to delete video:', error);
            }
          }
        }
      ]
    );
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectId = typeof video.subject === 'object' ? video.subject?._id : video.subject;
    const matchesSubject = filterSubject === 'all' || subjectId === filterSubject;
    return matchesSearch && matchesSubject;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos..."
            placeholderTextColor="#9ca3af"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterSubject === 'all' && styles.filterChipActive]}
            onPress={() => setFilterSubject('all')}
          >
            <Text style={[styles.filterChipText, filterSubject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id || subject.id}
              style={[styles.filterChip, filterSubject === (subject._id || subject.id) && styles.filterChipActive]}
              onPress={() => setFilterSubject(subject._id || subject.id)}
            >
              <Text style={[styles.filterChipText, filterSubject === (subject._id || subject.id) && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsCreateModalOpen(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Create Video</Text>
      </TouchableOpacity>

      {/* Videos List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredVideos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No videos found</Text>
            <Text style={styles.emptySubtext}>Create your first video to get started</Text>
          </View>
        ) : (
          filteredVideos.map((video) => {
            const subjectName = typeof video.subject === 'object' 
              ? video.subject?.name 
              : video.subject || 'General';

            return (
              <View key={video._id} style={styles.videoCard}>
                <View style={styles.videoHeader}>
                  <View style={styles.videoIcon}>
                    <Ionicons name="videocam" size={24} color="#ef4444" />
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                    <Text style={styles.videoSubject}>{subjectName}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteVideo(video._id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {video.description && (
                  <Text style={styles.videoDescription} numberOfLines={2}>
                    {video.description}
                  </Text>
                )}

                <View style={styles.videoMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time" size={16} color="#3b82f6" />
                    <Text style={styles.metaText}>{video.duration} min</Text>
                  </View>
                  {video.views !== undefined && (
                    <View style={styles.metaItem}>
                      <Ionicons name="eye" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>{video.views} views</Text>
                    </View>
                  )}
                  {video.isYouTubeVideo && (
                    <View style={styles.youtubeBadge}>
                      <Ionicons name="logo-youtube" size={16} color="#ef4444" />
                      <Text style={styles.youtubeText}>YouTube</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons
                    name={video.isActive ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={video.isActive ? '#10b981' : '#ef4444'}
                  />
                  <Text style={[styles.statusText, { color: video.isActive ? '#10b981' : '#ef4444' }]}>
                    {video.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={isCreateModalOpen}
        animationType="slide"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Video</Text>
            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Video title"
                value={newVideo.title}
                onChangeText={(text) => setNewVideo({ ...newVideo, title: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Video description"
                value={newVideo.description}
                onChangeText={(text) => setNewVideo({ ...newVideo, description: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {subjects.map(subject => (
                  <TouchableOpacity
                    key={subject._id || subject.id}
                    style={[
                      styles.subjectChip,
                      newVideo.subject === (subject._id || subject.id) && styles.subjectChipActive
                    ]}
                    onPress={() => setNewVideo({ ...newVideo, subject: subject._id || subject.id })}
                  >
                    <Text style={[
                      styles.subjectChipText,
                      newVideo.subject === (subject._id || subject.id) && styles.subjectChipTextActive
                    ]}>
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Video Type</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleButton, !newVideo.isYouTubeVideo && styles.toggleButtonActive]}
                  onPress={() => setNewVideo({ ...newVideo, isYouTubeVideo: false })}
                >
                  <Text style={[styles.toggleText, !newVideo.isYouTubeVideo && styles.toggleTextActive]}>
                    Direct URL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, newVideo.isYouTubeVideo && styles.toggleButtonActive]}
                  onPress={() => setNewVideo({ ...newVideo, isYouTubeVideo: true })}
                >
                  <Text style={[styles.toggleText, newVideo.isYouTubeVideo && styles.toggleTextActive]}>
                    YouTube
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {newVideo.isYouTubeVideo ? (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>YouTube URL *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://youtube.com/watch?v=..."
                  value={newVideo.youtubeUrl}
                  onChangeText={(text) => setNewVideo({ ...newVideo, youtubeUrl: text })}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Video URL *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  value={newVideo.videoUrl}
                  onChangeText={(text) => setNewVideo({ ...newVideo, videoUrl: text })}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Duration (min)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  keyboardType="numeric"
                  value={newVideo.duration.toString()}
                  onChangeText={(text) => setNewVideo({ ...newVideo, duration: parseInt(text) || 30 })}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Difficulty</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {['easy', 'medium', 'hard'].map(diff => (
                    <TouchableOpacity
                      key={diff}
                      style={[
                        styles.difficultyChip,
                        newVideo.difficulty === diff && styles.difficultyChipActive
                      ]}
                      onPress={() => setNewVideo({ ...newVideo, difficulty: diff })}
                    >
                      <Text style={[
                        styles.difficultyChipText,
                        newVideo.difficulty === diff && styles.difficultyChipTextActive
                      ]}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateVideo}
            >
              <Text style={styles.createButtonText}>Create Video</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    minHeight: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterScroll: {
    marginBottom: 8,
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
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  videoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  videoSubject: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionButton: {
    padding: 4,
  },
  videoDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  youtubeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  youtubeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  subjectChipActive: {
    backgroundColor: '#3b82f6',
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  subjectChipTextActive: {
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: '#fff',
  },
  difficultyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  difficultyChipActive: {
    backgroundColor: '#3b82f6',
  },
  difficultyChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  difficultyChipTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

