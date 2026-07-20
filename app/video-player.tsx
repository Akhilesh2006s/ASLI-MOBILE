import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Video as ExpoVideo, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import api from '../src/services/api/api';
import YouTubeEmbedWebView from '../src/components/shared/YouTubeEmbedWebView';
import GlassPanel from '../src/components/ui/GlassPanel';
import { useContentViewerBack } from '../src/hooks/useBackNavigation';
import {
  extractYouTubeId,
  getAuthHeaders,
  resolveContentUrl,
} from '../src/utils/contentPreview';
import { getVideoDisplayTitle } from '../src/lib/video-chapter-schedule';
import { STUDENT, STUDENT_RADIUS, STUDENT_TYPO } from '../src/theme/student';
import { GLASS_ROW, GLASS_VIOLET } from '../src/theme/glass';

const VIDEO_CONTENT_MAX = 960;

function pickParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : '';
}

function extractApiList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.videos)) return obj.videos;
  }
  return [];
}

function findByIdInList(list: unknown, videoId: string) {
  const id = String(videoId);
  return extractApiList(list).find(
    (item: any) => String(item?._id) === id || String(item?.id) === id
  );
}

function normalizeAiFeatures(raw: unknown) {
  if (!raw || typeof raw !== 'object') return undefined;
  const features = raw as Record<string, unknown>;
  const hasAutoNotes = !!(features.hasAutoNotes ?? features.hasNotes);
  const hasVisualMaps = !!(features.hasVisualMaps ?? features.hasMindMap);
  const hasVoiceQA = !!features.hasVoiceQA;
  if (!hasAutoNotes && !hasVisualMaps && !hasVoiceQA) return undefined;
  return { hasAutoNotes, hasVisualMaps, hasVoiceQA };
}

function resolveDurationSeconds(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 100 ? Math.round(n) : Math.round(n * 60);
}

function transformLibraryVideo(videoData: any) {
  const videoFileUrl = videoData.videoUrl || videoData.fileUrl || '';
  const isYouTube =
    !!videoData.isYouTubeVideo ||
    !!videoData.youtubeUrl ||
    (videoFileUrl &&
      (videoFileUrl.includes('youtube.com') || videoFileUrl.includes('youtu.be')));
  const notesText = [
    videoData.autoNotes,
    videoData.generatedNotes,
    videoData.notes,
    videoData.aiNotes,
  ].find((v) => typeof v === 'string' && v.trim().length > 0) as string | undefined;

  return {
    _id: videoData._id || videoData.id,
    title: getVideoDisplayTitle({ ...videoData, type: videoData.type || 'Video' }),
    description: videoData.description || '',
    topic: videoData.topic || '',
    chapter: videoData.chapter || '',
    module: videoData.module || '',
    notesText: notesText?.trim() || '',
    duration: resolveDurationSeconds(videoData.duration),
    views: videoData.views || 0,
    createdAt: videoData.createdAt || new Date().toISOString(),
    videoUrl: videoFileUrl,
    youtubeUrl: videoData.youtubeUrl || (isYouTube ? videoFileUrl : ''),
    isYouTubeVideo: isYouTube,
    thumbnailUrl: videoData.thumbnailUrl || null,
    subject: videoData.subject?.name || videoData.subject || 'Unknown',
    difficulty: videoData.difficulty,
    language: videoData.language,
    aiFeatures: normalizeAiFeatures(videoData.aiFeatures),
  };
}

interface LibraryVideo {
  _id: string;
  title: string;
  description?: string;
  topic?: string;
  chapter?: string;
  module?: string;
  notesText?: string;
  duration: number;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
  thumbnailUrl?: string;
  difficulty?: string;
  language?: string;
  subject?: string;
  subjectId?: string;
  aiFeatures?: {
    hasAutoNotes?: boolean;
    hasVisualMaps?: boolean;
    hasVoiceQA?: boolean;
  };
}

type AiTab = 'notes' | 'mindmap' | 'qa';

function MetaChip({
  icon,
  label,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metaChip}>
      {icon ? <Ionicons name={icon} size={12} color={STUDENT.primaryDark} /> : null}
      <Text style={styles.metaChipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function VideoPlayer() {
  const params = useLocalSearchParams<{
    videoId?: string | string[];
    isContentItem?: string;
    contentData?: string;
    returnTo?: string | string[];
  }>();
  const videoId = pickParam(params.videoId);
  const returnTo = pickParam(params.returnTo);
  const { isContentItem, contentData } = params;
  const [video, setVideo] = useState<LibraryVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AiTab>('notes');
  const goBack = useContentViewerBack(returnTo || undefined);
  const [, setIsPlaying] = useState(false);
  const [videoHeaders, setVideoHeaders] = useState<Record<string, string> | undefined>();
  const videoRef = useRef<ExpoVideo>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const contentWidth = isTablet ? Math.min(windowWidth, VIDEO_CONTENT_MAX) : windowWidth;
  const horizontalPad = isTablet ? 20 : 14;
  const videoHeight = Math.round(
    Math.min(
      (contentWidth - horizontalPad * 2) * (9 / 16),
      windowHeight * (isTablet ? 0.5 : 0.42)
    )
  );

  useEffect(() => {
    if (videoId) {
      if (isContentItem === 'true' && contentData) {
        try {
          const parsedContent = JSON.parse(contentData);
          setVideo(transformLibraryVideo(parsedContent));
          setIsLoading(false);
          void fetchVideo({ silent: true });
          return;
        } catch (error) {
          console.error('Error parsing content data:', error);
        }
      }

      fetchVideo();
    }
  }, [videoId, isContentItem, contentData]);

  const fetchVideo = async (opts?: { silent?: boolean }) => {
    if (!videoId) return;
    try {
      if (!opts?.silent) setIsLoading(true);

      const libraryAttempts: Array<() => Promise<{ data: any }>> = [
        () => api.get('/api/teacher/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/teacher/asli-prep-content'),
        () => api.get('/api/student/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/student/asli-prep-content'),
        () => api.get('/api/admin/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/admin/asli-prep-content'),
        () => api.get('/api/teacher/videos'),
        () => api.get('/api/student/videos'),
      ];

      for (const run of libraryAttempts) {
        try {
          const { data } = await run();
          const match = findByIdInList(data, videoId);
          if (match) {
            setVideo(transformLibraryVideo(match));
            return;
          }
        } catch {
          // try next source
        }
      }

      console.error('Video not found in any endpoint');
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resolvedVideoUrl = resolveContentUrl(video?.videoUrl || '');
  const isDirectVideo =
    !!resolvedVideoUrl && !/youtube\.com|youtu\.be/i.test(resolvedVideoUrl);

  useEffect(() => {
    if (!isDirectVideo) {
      setVideoHeaders(undefined);
      return;
    }
    getAuthHeaders(resolvedVideoUrl).then(setVideoHeaders);
  }, [isDirectVideo, resolvedVideoUrl]);

  const contextChips = useMemo(() => {
    const chips: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
    if (video?.subject) chips.push({ icon: 'book-outline', label: video.subject });
    if (video?.chapter) chips.push({ icon: 'layers-outline', label: video.chapter });
    if (video?.module) chips.push({ icon: 'albums-outline', label: video.module });
    if (video?.topic) chips.push({ icon: 'pricetag-outline', label: video.topic });
    return chips;
  }, [video?.subject, video?.chapter, video?.module, video?.topic]);

  const notesBody = (video?.notesText || video?.description || '').trim();
  const showNotesTab = !!video?.aiFeatures?.hasAutoNotes && notesBody.length > 0;
  const showMindMapTab = !!video?.aiFeatures?.hasVisualMaps;
  const showQATab = !!video?.aiFeatures?.hasVoiceQA;
  const showAiTabs = showNotesTab || showMindMapTab || showQATab;

  useEffect(() => {
    if (!video) return;
    if (showNotesTab) setActiveTab('notes');
    else if (video.aiFeatures?.hasVisualMaps) setActiveTab('mindmap');
    else if (video.aiFeatures?.hasVoiceQA) setActiveTab('qa');
  }, [video?._id, showNotesTab, video?.aiFeatures?.hasVisualMaps, video?.aiFeatures?.hasVoiceQA]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centeredState}>
          <GlassPanel tone="medium" radius={22} contentStyle={styles.stateInner}>
            <ActivityIndicator size="large" color={STUDENT.primary} />
            <Text style={styles.stateTitle}>Loading video…</Text>
            <Text style={styles.stateSub}>Getting your lesson ready</Text>
          </GlassPanel>
        </View>
      </SafeAreaView>
    );
  }

  if (!video) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centeredState}>
          <GlassPanel tone="medium" radius={22} contentStyle={styles.stateInner}>
            <View style={styles.stateIcon}>
              <Ionicons name="videocam-off-outline" size={28} color="#dc2626" />
            </View>
            <Text style={styles.stateTitle}>Video not found</Text>
            <Text style={styles.stateSub}>This lesson may have been moved or removed.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => void goBack()} activeOpacity={0.88}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Go back</Text>
            </TouchableOpacity>
          </GlassPanel>
        </View>
      </SafeAreaView>
    );
  }

  const youtubeSourceUrl = (video.youtubeUrl || video.videoUrl || '').trim();
  const youtubeVideoId = extractYouTubeId(youtubeSourceUrl);
  const isYouTube = !!youtubeVideoId || !!video.isYouTubeVideo;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.playerShell, { maxWidth: contentWidth }]}>
        <View style={[styles.topBar, { paddingHorizontal: horizontalPad }]}>
          <TouchableOpacity
            onPress={() => void goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={STUDENT.text} />
          </TouchableOpacity>
          <View style={styles.topBarText}>
            <Text style={styles.topEyebrow}>EduOTT Player</Text>
            <Text style={styles.topTitle} numberOfLines={1}>
              {video.title}
            </Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>Watch</Text>
          </View>
        </View>

        <ScrollView
          style={styles.detailsScroll}
          contentContainerStyle={[
            styles.detailsContent,
            { paddingHorizontal: horizontalPad },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <GlassPanel
            tone="strong"
            elevated
            colors={[...GLASS_VIOLET]}
            radius={22}
            style={styles.stageCard}
            contentStyle={styles.stageInner}
          >
            <View style={[styles.cinemaFrame, { height: videoHeight }]}>
              {isYouTube && youtubeSourceUrl ? (
                <YouTubeEmbedWebView videoUrl={youtubeSourceUrl} style={styles.video} />
              ) : isDirectVideo ? (
                <ExpoVideo
                  ref={videoRef}
                  source={{ uri: resolvedVideoUrl, headers: videoHeaders }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                    if (status.isLoaded) {
                      setIsPlaying(status.isPlaying);
                    }
                  }}
                />
              ) : (
                <View style={styles.placeholder}>
                  <View style={styles.placeholderIcon}>
                    <Ionicons name="videocam-off-outline" size={28} color={STUDENT.textMuted} />
                  </View>
                  <Text style={styles.placeholderTitle}>Video not available</Text>
                  <Text style={styles.placeholderSub}>
                    This stream could not be loaded right now.
                  </Text>
                </View>
              )}
            </View>
          </GlassPanel>

          <GlassPanel
            tone="strong"
            elevated
            radius={20}
            style={styles.infoCard}
            contentStyle={styles.infoInner}
          >
            <Text style={styles.videoTitle}>{video.title}</Text>
            <View style={styles.metaRow}>
              {video.difficulty ? <MetaChip label={video.difficulty} icon="flash-outline" /> : null}
              {video.language ? <MetaChip label={video.language} icon="globe-outline" /> : null}
              <MetaChip
                label={formatDuration(video.duration || 0)}
                icon="time-outline"
              />
              {isYouTube ? <MetaChip label="YouTube" icon="logo-youtube" /> : null}
            </View>

            {contextChips.length > 0 ? (
              <View style={styles.contextBlock}>
                <Text style={styles.sectionLabel}>About this video</Text>
                <View style={styles.contextChips}>
                  {contextChips.map((chip) => (
                    <MetaChip key={chip.label} icon={chip.icon} label={chip.label} />
                  ))}
                </View>
              </View>
            ) : null}

            {video.description && video.description.trim() !== notesBody ? (
              <View style={styles.contextBlock}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.bodyText}>{video.description}</Text>
              </View>
            ) : null}
          </GlassPanel>

          {showAiTabs ? (
            <GlassPanel
              tone="medium"
              elevated
              radius={20}
              style={styles.infoCard}
              contentStyle={styles.infoInner}
            >
              <Text style={styles.sectionLabel}>Learning extras</Text>
              <View style={styles.aiTabs}>
                {showNotesTab ? (
                  <TouchableOpacity
                    style={[styles.aiTab, activeTab === 'notes' && styles.aiTabActive]}
                    onPress={() => setActiveTab('notes')}
                    activeOpacity={0.88}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color={activeTab === 'notes' ? '#fff' : STUDENT.textSecondary}
                    />
                    <Text style={[styles.aiTabText, activeTab === 'notes' && styles.aiTabTextActive]}>
                      Notes
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {showMindMapTab ? (
                  <TouchableOpacity
                    style={[styles.aiTab, activeTab === 'mindmap' && styles.aiTabActive]}
                    onPress={() => setActiveTab('mindmap')}
                    activeOpacity={0.88}
                  >
                    <Ionicons
                      name="git-network-outline"
                      size={16}
                      color={activeTab === 'mindmap' ? '#fff' : STUDENT.textSecondary}
                    />
                    <Text
                      style={[styles.aiTabText, activeTab === 'mindmap' && styles.aiTabTextActive]}
                    >
                      Mind map
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {showQATab ? (
                  <TouchableOpacity
                    style={[styles.aiTab, activeTab === 'qa' && styles.aiTabActive]}
                    onPress={() => setActiveTab('qa')}
                    activeOpacity={0.88}
                  >
                    <Ionicons
                      name="chatbubbles-outline"
                      size={16}
                      color={activeTab === 'qa' ? '#fff' : STUDENT.textSecondary}
                    />
                    <Text style={[styles.aiTabText, activeTab === 'qa' && styles.aiTabTextActive]}>
                      Q&A
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.aiBody}>
                {activeTab === 'notes' && showNotesTab ? (
                  <>
                    <Text style={styles.aiBodyTitle}>Auto-generated notes</Text>
                    <Text style={styles.bodyText}>{notesBody}</Text>
                  </>
                ) : null}
                {activeTab === 'mindmap' && showMindMapTab ? (
                  <>
                    <Text style={styles.aiBodyTitle}>Visual mind map</Text>
                    <Text style={styles.bodyText}>
                      Mind map is not available for this video yet.
                    </Text>
                  </>
                ) : null}
                {activeTab === 'qa' && showQATab ? (
                  <>
                    <Text style={styles.aiBodyTitle}>Voice-enabled Q&A</Text>
                    <Text style={styles.bodyText}>Q&A is not available for this video yet.</Text>
                  </>
                ) : null}
              </View>
            </GlassPanel>
          ) : showNotesTab ? (
            <GlassPanel
              tone="medium"
              elevated
              radius={20}
              style={styles.infoCard}
              contentStyle={styles.infoInner}
            >
              <Text style={styles.sectionLabel}>Auto-generated notes</Text>
              <Text style={styles.bodyText}>{notesBody}</Text>
            </GlassPanel>
          ) : !notesBody && contextChips.length === 0 ? (
            <GlassPanel
              tone="light"
              radius={20}
              style={styles.infoCard}
              contentStyle={styles.infoInner}
            >
              <Text style={styles.sectionLabel}>Video details</Text>
              <Text style={styles.bodyText}>
                No additional notes or description are available for this video yet.
              </Text>
            </GlassPanel>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  playerShell: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  stateInner: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
    minWidth: 260,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
    marginTop: 4,
  },
  stateSub: {
    fontSize: 13,
    color: STUDENT.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: STUDENT.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: STUDENT_RADIUS.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: {
    flex: 1,
    minWidth: 0,
  },
  topEyebrow: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: STUDENT.primary,
  },
  livePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.text,
  },
  detailsScroll: {
    flex: 1,
  },
  detailsContent: {
    paddingBottom: 36,
    gap: 12,
  },
  stageCard: {
    width: '100%',
  },
  stageInner: {
    padding: 8,
  },
  cinemaFrame: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0b1220',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    backgroundColor: '#111827',
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f3f4f6',
  },
  placeholderSub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    width: '100%',
  },
  infoInner: {
    padding: 16,
    gap: 12,
  },
  videoTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 20,
    color: STUDENT.text,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    backgroundColor: GLASS_ROW.fillStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.text,
    maxWidth: 160,
  },
  contextBlock: {
    gap: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GLASS_ROW.border,
  },
  contextChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionLabel: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: STUDENT.textSecondary,
  },
  aiTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: GLASS_ROW.fill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_ROW.border,
  },
  aiTabActive: {
    backgroundColor: STUDENT.primary,
    borderColor: STUDENT.primaryDark,
  },
  aiTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.textSecondary,
  },
  aiTabTextActive: {
    color: '#fff',
  },
  aiBody: {
    gap: 8,
    marginTop: 4,
  },
  aiBodyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: STUDENT.text,
  },
});
