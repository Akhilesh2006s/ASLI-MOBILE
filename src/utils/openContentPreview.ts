import { Alert } from 'react-native';
import type { Router } from 'expo-router';
import { getPreviewKind, resolveContentUrl } from './contentPreview';

type ContentLike = {
  _id?: string;
  id?: string;
  title?: string;
  type?: string;
  topic?: string;
  chapter?: string;
  module?: string;
  fileUrl?: string;
  fileUrls?: string[];
  youtubeUrl?: string;
  driveLink?: string;
  videoUrl?: string;
};

import type { ContentReturnTarget } from '../hooks/useBackNavigation';

export function openContentPreview(
  router: Router,
  item: ContentLike,
  options?: { returnTo?: ContentReturnTarget }
) {
  const rawUrl =
    item.fileUrls?.[0] ||
    item.fileUrl ||
    item.videoUrl ||
    item.driveLink ||
    item.youtubeUrl ||
    '';
  const contentId = item._id || item.id;
  const returnParams = options?.returnTo ? { returnTo: options.returnTo } : {};
  const kind = getPreviewKind(rawUrl, item.type, item.youtubeUrl);

  /** Use native video player only for real streams — not PDFs/audio mis-tagged as Video. */
  const useVideoPlayer =
    kind === 'youtube' ||
    (kind === 'video' && (item.type === 'Video' || item.type === 'video'));

  if (useVideoPlayer && (rawUrl || item.youtubeUrl)) {
    const contentPayload = {
      _id: contentId || 'preview',
      title: item.title || item.topic || 'Video',
      topic: item.topic,
      chapter: item.chapter,
      module: item.module,
      fileUrl: resolveContentUrl(rawUrl),
      youtubeUrl: item.youtubeUrl,
      videoUrl: item.videoUrl,
      type: item.type || 'Video',
    };
    router.push({
      pathname: '/video-player',
      params: {
        ...(contentId ? { videoId: String(contentId) } : {}),
        isContentItem: 'true',
        contentData: JSON.stringify(contentPayload),
        ...returnParams,
      },
    });
    return;
  }

  const link = item.driveLink || rawUrl;
  if (!link) {
    Alert.alert('Content', item.title || 'No preview available for this item.');
    return;
  }

  router.push({
    pathname: '/drive-viewer',
    params: {
      driveLink: encodeURIComponent(link),
      title: item.title || 'Preview',
      contentType: item.type || '',
      ...returnParams,
    },
  });
}
