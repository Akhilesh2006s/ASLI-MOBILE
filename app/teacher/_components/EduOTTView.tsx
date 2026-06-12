import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  useWindowDimensions,
  type ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, glassCard } from '../../../src/theme/teacher';
import teacherService, { asArray } from '../../../src/services/api/teacherService';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import EduOTTVideoCard from '../../../src/components/eduott/EduOTTVideoCard';
import { resolveContentDurationSeconds } from '../../../src/utils/eduottVideoUtils';
import { extractPlainSubjectName, getSubjectClassLabel } from '../../../src/lib/subject-names';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import { dedupeLibraryContents } from '../../../src/lib/dedupe-library-content';
import { getVideoDisplayTitle } from '../../../src/lib/video-chapter-schedule';

type EduOTTSubTab = 'videos' | 'live-sessions';

const EDUOTT_GRID_MAX_WIDTH = 1080;

function useEduOTTGridLayout(itemCount: number) {
  const { width: screenWidth } = useWindowDimensions();
  const maxColumns = screenWidth >= 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  const numColumns = itemCount > 0 ? Math.min(maxColumns, itemCount) : maxColumns;
  const isGrid = numColumns > 1;
  const columnGap = TEACHER_SPACING.md;
  const listContentWidth = Math.min(screenWidth, EDUOTT_GRID_MAX_WIDTH) - TEACHER_SPACING.lg * 2;
  const gridCardWidth = isGrid
    ? (listContentWidth - columnGap * (numColumns - 1)) / numColumns
    : listContentWidth;

  return { numColumns, isGrid, gridCardWidth };
}

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
  const { isAsliPrepExclusive } = useSchoolProgram();
  const [activeSubTab, setActiveSubTab] = useState<EduOTTSubTab>('videos');
  const [videos, setVideos] = useState<EduVideo[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'videos') {
      if (isAsliPrepExclusive) {
        fetchVideos();
      } else {
        setVideos([]);
        setIsLoading(false);
      }
    } else if (activeSubTab === 'live-sessions') {
      fetchLiveSessions();
    }
  }, [activeSubTab, selectedSubject, isAsliPrepExclusive]);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const res = await teacherService.asliPrepContent({ type: 'Video' });
      const videosArray = dedupeLibraryContents(asArray<any>(res.data));

      const mappedVideos = videosArray.map((content: any) => {
        const videoFileUrl = content.fileUrls?.[0] || content.fileUrl || content.videoUrl || '';
        const isYouTube =
          !!content.youtubeUrl ||
          (videoFileUrl &&
            (videoFileUrl.includes('youtube.com') || videoFileUrl.includes('youtu.be')));

        const subjectName = content.subject?.name || content.subject || 'Unknown Subject';
        const classNumber =
          content.classNumber != null && String(content.classNumber).trim() !== ''
            ? String(content.classNumber).trim()
            : content.subject?.classNumber != null
              ? String(content.subject.classNumber).trim()
              : undefined;

        return {
          _id: content._id || content.id,
          title: getVideoDisplayTitle({ ...content, type: 'Video' }),
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
    } catch {
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
    } catch {
      setLiveSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const filteredVideos = useMemo(
    () =>
      videos.filter((video) => {
        const matchesSearch =
          video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          video.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSubject = selectedSubject === 'all' || video.subjectName === selectedSubject;
        return matchesSearch && matchesSubject;
      }),
    [videos, searchTerm, selectedSubject]
  );

  const filteredSessions = useMemo(
    () =>
      liveSessions.filter((session) => {
        const matchesSearch =
          session.title?.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
          session.description?.toLowerCase().includes(sessionSearchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
        return matchesSearch && matchesStatus;
      }),
    [liveSessions, sessionSearchTerm, filterStatus]
  );

  const { numColumns, isGrid, gridCardWidth } = useEduOTTGridLayout(filteredVideos.length);

  const handlePlayVideo = useCallback((video: EduVideo) => {
    openContentPreview(
      router,
      {
        _id: video._id,
        title: video.title,
        type: 'Video',
        fileUrl: video.videoUrl || video.fileUrl,
        youtubeUrl: video.youtubeUrl,
      },
      { returnTo: 'eduott' }
    );
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return TEACHER.danger;
      case 'scheduled':
        return TEACHER.primary;
      case 'ended':
        return TEACHER.textMuted;
      case 'cancelled':
        return TEACHER.warning;
      default:
        return TEACHER.textMuted;
    }
  };

  const listHeader = (
    <>
      <View style={styles.subTabsContainer}>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'videos' && styles.subTabActive]}
          onPress={() => setActiveSubTab('videos')}
        >
          <Ionicons
            name="play"
            size={16}
            color={activeSubTab === 'videos' ? TEACHER.primaryLight : TEACHER.textMuted}
          />
          <Text style={[styles.subTabText, activeSubTab === 'videos' && styles.subTabTextActive]}>
            Videos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeSubTab === 'live-sessions' && styles.subTabActive]}
          onPress={() => setActiveSubTab('live-sessions')}
        >
          <Ionicons
            name="radio"
            size={16}
            color={activeSubTab === 'live-sessions' ? TEACHER.primaryLight : TEACHER.textMuted}
          />
          <Text style={[styles.subTabText, activeSubTab === 'live-sessions' && styles.subTabTextActive]}>
            Live Sessions
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={TEACHER.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeSubTab === 'videos' ? 'Search videos by title...' : 'Search live sessions...'
          }
          value={activeSubTab === 'videos' ? searchTerm : sessionSearchTerm}
          onChangeText={activeSubTab === 'videos' ? setSearchTerm : setSessionSearchTerm}
          placeholderTextColor={TEACHER.textMuted}
        />
      </View>
    </>
  );

  const renderVideoItem: ListRenderItem<EduVideo> = useCallback(
    ({ item }) => (
      <EduOTTVideoCard
        variant="teacher"
        style={{ width: gridCardWidth, marginBottom: 0 }}
        title={item.title}
        durationSeconds={item.duration}
        subjectLabel={extractPlainSubjectName(item.subjectName || '').trim() || undefined}
        classLabel={
          getSubjectClassLabel({
            name: item.subjectName,
            classNumber: item.classNumber,
          }) || undefined
        }
        thumbnailUrl={item.thumbnailUrl}
        youtubeUrl={item.youtubeUrl}
        fileUrl={item.fileUrl}
        videoUrl={item.videoUrl}
        onPress={() => handlePlayVideo(item)}
      />
    ),
    [gridCardWidth, handlePlayVideo]
  );

  const renderSessionItem: ListRenderItem<any> = useCallback(
    ({ item: session }) => (
      <View style={styles.sessionCard}>
        <View style={styles.sessionCardHeader}>
          <Text style={styles.sessionTitle}>{session.title || 'Untitled Session'}</Text>
          <View
            style={[styles.sessionStatusBadge, { backgroundColor: getStatusColor(session.status) + '20' }]}
          >
            <Text style={[styles.sessionStatusText, { color: getStatusColor(session.status) }]}>
              {session.status}
            </Text>
          </View>
        </View>
        {session.description ? (
          <Text style={styles.sessionDescription}>{session.description}</Text>
        ) : null}
        <View style={styles.sessionDetails}>
          {session.streamer ? (
            <View style={styles.detailRow}>
              <Ionicons name="person" size={16} color={TEACHER.textMuted} />
              <Text style={styles.detailText}>
                {session.streamer.fullName || session.streamer.email}
              </Text>
            </View>
          ) : null}
          {session.viewerCount !== undefined ? (
            <View style={styles.detailRow}>
              <Ionicons name="eye" size={16} color={TEACHER.textMuted} />
              <Text style={styles.detailText}>{session.viewerCount} viewers</Text>
            </View>
          ) : null}
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
    ),
    []
  );

  const listEmptyVideos = (
    <View style={styles.emptyContainer}>
      <Ionicons name="play-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyText}>
        {!isAsliPrepExclusive
          ? 'Videos are available for Asli Prep schools only.'
          : searchTerm
            ? 'No videos match your search'
            : 'No videos found'}
      </Text>
    </View>
  );

  const listEmptySessions = (
    <View style={styles.emptyContainer}>
      <Ionicons name="radio-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyText}>No live sessions found</Text>
    </View>
  );

  if (activeSubTab === 'videos') {
    return (
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            {listHeader}
            <ActivityIndicator size="large" color={TEACHER.primary} style={styles.loader} />
          </View>
        ) : (
          <FlatList
            key={`teacher-eduott-videos-${numColumns}`}
            data={filteredVideos}
            keyExtractor={(item) => item._id}
            renderItem={renderVideoItem}
            numColumns={numColumns}
            columnWrapperStyle={isGrid ? styles.columnWrapper : undefined}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={listEmptyVideos}
            contentContainerStyle={[styles.listContent, isGrid && styles.listContentGrid]}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoadingSessions ? (
        <View style={styles.loadingWrap}>
          {listHeader}
          <ActivityIndicator size="large" color={TEACHER.primary} style={styles.loader} />
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item._id}
          renderItem={renderSessionItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmptySessions}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TEACHER.bg,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.sm,
    paddingBottom: 96,
  },
  listContentGrid: {
    maxWidth: EDUOTT_GRID_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  columnWrapper: {
    gap: TEACHER_SPACING.md,
    marginBottom: TEACHER_SPACING.md,
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingTop: TEACHER_SPACING.sm,
  },
  loader: {
    marginTop: 48,
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: TEACHER.surface,
    padding: 8,
    marginBottom: TEACHER_SPACING.md,
    borderRadius: TEACHER_RADIUS.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: TEACHER_RADIUS.sm,
    backgroundColor: TEACHER.surfaceElevated,
    gap: 8,
  },
  subTabActive: {
    backgroundColor: TEACHER.navActiveBg,
    borderWidth: 1,
    borderColor: TEACHER.primary,
  },
  subTabText: { fontSize: 14, fontWeight: '600', color: TEACHER.textMuted },
  subTabTextActive: { color: TEACHER.primaryLight },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TEACHER.surface,
    marginBottom: TEACHER_SPACING.md,
    paddingHorizontal: 16,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 48, fontSize: 16, color: TEACHER.text },
  sessionCard: { ...glassCard, borderRadius: TEACHER_RADIUS.lg, padding: 16, marginBottom: TEACHER_SPACING.md },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: { fontSize: 18, fontWeight: '700', color: TEACHER.text, flex: 1 },
  sessionStatusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  sessionStatusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sessionDescription: { fontSize: 14, color: TEACHER.textMuted, marginBottom: 12 },
  watchLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEACHER.danger,
    padding: 12,
    borderRadius: TEACHER_RADIUS.md,
    marginTop: 8,
  },
  watchLiveText: { color: TEACHER.textOnPrimary, fontWeight: '700', fontSize: 14 },
  sessionDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: TEACHER.textMuted },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: { fontSize: 16, fontWeight: '700', color: TEACHER.text, marginTop: 16, textAlign: 'center' },
});
