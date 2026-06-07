import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO, glassCard } from '../../../src/theme/teacher';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import EduOTTVideoCard from '../../../src/components/eduott/EduOTTVideoCard';
import { resolveContentDurationSeconds } from '../../../src/utils/eduottVideoUtils';
import { extractPlainSubjectName, getSubjectClassLabel } from '../../../src/lib/subject-names';

type EduOTTSubTab = 'videos' | 'live-sessions';

interface EduVideo {
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
  classNumber?: string;
  thumbnailUrl?: string;
}

export default function EduOTTView() {
  const [activeSubTab, setActiveSubTab] = useState<EduOTTSubTab>('videos');
  const [selectedClass, setSelectedClass] = useState('all');
  const [videos, setVideos] = useState<EduVideo[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
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
      const res = await teacherService.subjects();
      setTeacherSubjects(asArray(res.data));
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const res = await teacherService.asliPrepContent({ type: 'Video' });
      const videosArray = asArray<any>(res.data);

      const mappedVideos = videosArray.map((content: any) => {
        const videoFileUrl = content.fileUrls && content.fileUrls.length > 0
          ? content.fileUrls[0]
          : (content.fileUrl || content.videoUrl || '');

        const isYouTube = !!content.youtubeUrl || (videoFileUrl && (
          videoFileUrl.includes('youtube.com') ||
          videoFileUrl.includes('youtu.be')
        ));

        const subjectName = content.subject?.name || content.subject || 'Unknown Subject';
        const classNumber =
          content.classNumber != null && String(content.classNumber).trim() !== ''
            ? String(content.classNumber).trim()
            : content.subject?.classNumber != null
              ? String(content.subject.classNumber).trim()
              : undefined;

        return {
          _id: content._id || content.id,
          title: content.title || 'Untitled Video',
          description: content.description || '',
          duration: resolveContentDurationSeconds({
            duration: content.duration,
            durationSeconds: content.durationSeconds,
          }),
          views: content.views || 0,
          createdAt: content.createdAt || new Date().toISOString(),
          videoUrl: videoFileUrl,
          youtubeUrl: content.youtubeUrl || (isYouTube ? videoFileUrl : ''),
          isYouTubeVideo: isYouTube,
          fileUrl: videoFileUrl,
          subjectName,
          classNumber,
          thumbnailUrl: content.thumbnailUrl,
        };
      });

      setVideos(mappedVideos);
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
      const res = await teacherService.liveSessions();
      setLiveSessions(asArray(res.data));
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


  const handlePlayVideo = (video: EduVideo) => {
    openContentPreview(router, {
      _id: video._id,
      title: video.title,
      type: 'Video',
      fileUrl: video.videoUrl || video.fileUrl,
      youtubeUrl: video.youtubeUrl,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return TEACHER.danger;
      case 'scheduled': return TEACHER.primary;
      case 'ended': return TEACHER.textMuted;
      case 'cancelled': return TEACHER.warning;
      default: return TEACHER.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="play" size={32} color={TEACHER.primaryLight} />
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
          <Ionicons name="play" size={16} color={activeSubTab === 'videos' ? TEACHER.primaryLight : TEACHER.textMuted} />
          <Text style={[styles.subTabText, activeSubTab === 'videos' && styles.subTabTextActive]}>
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'live-sessions' && styles.subTabActive]}
          onPress={() => setActiveSubTab('live-sessions')}
        >
          <Ionicons name="radio" size={16} color={activeSubTab === 'live-sessions' ? TEACHER.primaryLight : TEACHER.textMuted} />
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
            <Ionicons name="search" size={20} color={TEACHER.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search videos by title..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={TEACHER.textMuted}
            />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={TEACHER.primary} />
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
              {filteredVideos.map((video, index) => (
                <Animated.View key={video._id} entering={FadeInDown.duration(350).delay(Math.min(index * 60, 480))}>
                  <EduOTTVideoCard
                    variant="teacher"
                    title={video.title}
                    durationSeconds={video.duration}
                    subjectLabel={extractPlainSubjectName(video.subjectName || '').trim() || undefined}
                    classLabel={
                      getSubjectClassLabel({
                        name: video.subjectName,
                        classNumber: video.classNumber,
                      }) || undefined
                    }
                    thumbnailUrl={video.thumbnailUrl}
                    youtubeUrl={video.youtubeUrl}
                    fileUrl={video.fileUrl}
                    videoUrl={video.videoUrl}
                    onPress={() => handlePlayVideo(video)}
                  />
                </Animated.View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Live Sessions Tab */}
      {activeSubTab === 'live-sessions' && (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={TEACHER.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search live sessions..."
              value={sessionSearchTerm}
              onChangeText={setSessionSearchTerm}
              placeholderTextColor={TEACHER.textMuted}
            />
          </View>

          {isLoadingSessions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={TEACHER.primary} />
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
                        <Ionicons name="person" size={16} color={TEACHER.textMuted} />
                        <Text style={styles.detailText}>
                          {session.streamer.fullName || session.streamer.email}
                        </Text>
                      </View>
                    )}
                    {session.viewerCount !== undefined && (
                      <View style={styles.detailRow}>
                        <Ionicons name="eye" size={16} color={TEACHER.textMuted} />
                        <Text style={styles.detailText}>{session.viewerCount} viewers</Text>
                      </View>
                    )}
                  </View>
                  {(session.status === 'live' || session.status === 'Live') &&
                  (session.hlsUrl || session.playbackUrl || session.streamUrl) ? (
                    <TouchableOpacity
                      style={styles.watchLiveBtn}
                      onPress={() => {
                        const url = session.hlsUrl || session.playbackUrl || session.streamUrl;
                        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open stream.'));
                      }}
                    >
                      <Ionicons name="radio" size={16} color={TEACHER.textOnPrimary} />
                      <Text style={styles.watchLiveText}>Watch Live</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TEACHER.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    backgroundColor: TEACHER.surface, borderBottomWidth: 1, borderBottomColor: TEACHER.surfaceBorder, gap: 12,
  },
  headerIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: TEACHER.surfaceElevated,
    borderWidth: 1, borderColor: TEACHER.surfaceBorder, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...TEACHER_TYPO.section, color: TEACHER.primaryLight },
  headerSubtitle: { fontSize: 14, color: TEACHER.textMuted },
  subTabsContainer: {
    flexDirection: 'row', backgroundColor: TEACHER.surface, padding: 8, margin: 20, marginBottom: 0,
    borderRadius: TEACHER_RADIUS.lg, gap: 8, borderWidth: 1, borderColor: TEACHER.surfaceBorder,
  },
  subTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: TEACHER_RADIUS.sm, backgroundColor: TEACHER.surfaceElevated, gap: 8,
  },
  subTabActive: { backgroundColor: TEACHER.navActiveBg, borderWidth: 1, borderColor: TEACHER.primary },
  subTabText: { fontSize: 14, fontWeight: '600', color: TEACHER.textMuted },
  subTabTextActive: { color: TEACHER.primaryLight },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: TEACHER.surface,
    margin: 20, marginBottom: 0, paddingHorizontal: 16, borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1, borderColor: TEACHER.surfaceBorder,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 48, fontSize: 16, color: TEACHER.text },
  list: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 120, gap: 16 },
  sessionCard: { ...glassCard, borderRadius: TEACHER_RADIUS.lg, padding: 16 },
  sessionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sessionTitle: { fontSize: 18, fontWeight: '700', color: TEACHER.text, flex: 1 },
  sessionStatusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  sessionStatusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sessionDescription: { fontSize: 14, color: TEACHER.textMuted, marginBottom: 12 },
  watchLiveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: TEACHER.danger, padding: 12, borderRadius: TEACHER_RADIUS.md, marginTop: 8,
  },
  watchLiveText: { color: TEACHER.textOnPrimary, fontWeight: '700', fontSize: 14 },
  sessionDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: TEACHER.textMuted },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: TEACHER.text, marginTop: 16 },
  modalContainer: { flex: 1, backgroundColor: TEACHER.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 50, backgroundColor: TEACHER.surface,
    borderBottomWidth: 1, borderBottomColor: TEACHER.surfaceBorder,
  },
  modalTitle: { ...TEACHER_TYPO.section, fontSize: 20, color: TEACHER.text, flex: 1 },
  videoPlayerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoPlayer: { width: '100%', height: '100%' },
  youtubeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 40 },
  youtubeMessage: { fontSize: 16, color: TEACHER.text, textAlign: 'center', marginBottom: 24 },
  openYoutubeButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: TEACHER.danger,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: TEACHER_RADIUS.sm, gap: 8,
  },
  openYoutubeText: { fontSize: 16, fontWeight: '600', color: TEACHER.textOnPrimary },
  modalDescription: { maxHeight: 200, backgroundColor: TEACHER.surface, padding: 20, borderTopWidth: 1, borderTopColor: TEACHER.surfaceBorder },
  descriptionTitle: { fontSize: 18, fontWeight: '700', color: TEACHER.text, marginBottom: 12 },
  descriptionText: { fontSize: 14, color: TEACHER.textMuted, lineHeight: 20 },
});






