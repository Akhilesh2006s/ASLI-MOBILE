import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import YouTubeEmbedWebView from './YouTubeEmbedWebView';
import PdfPreviewWebView from './PdfPreviewWebView';
import {
  getAuthHeaders,
  getDrivePreviewUrl,
  getPreviewKind,
  isYouTubeUrl,
  resolveContentUrl,
} from '../../utils/contentPreview';

type Props = {
  fileUrl: string;
  title?: string;
  contentType?: string;
  youtubeUrl?: string;
  onPreviewBusyChange?: (busy: boolean) => void;
};

export default function MediaPreviewPanel({
  fileUrl,
  title,
  contentType,
  youtubeUrl,
  onPreviewBusyChange,
}: Props) {
  const resolvedUrl = resolveContentUrl(fileUrl);
  const ytSource = youtubeUrl || resolvedUrl;
  const kind = getPreviewKind(resolvedUrl, contentType, youtubeUrl);

  const [loading, setLoading] = useState(kind === 'drive');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [webHeaders, setWebHeaders] = useState<Record<string, string> | undefined>();
  const [videoHeaders, setVideoHeaders] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (kind === 'pdf') {
        setLoading(false);
        return;
      }

      if (kind === 'drive') {
        setPreviewUri(getDrivePreviewUrl(resolvedUrl));
        setWebHeaders(undefined);
        setLoading(false);
        return;
      }

      if (kind === 'youtube') {
        setLoading(false);
        return;
      }

      if (kind === 'image') {
        const headers = await getAuthHeaders(resolvedUrl);
        if (!cancelled) {
          setPreviewUri(resolvedUrl);
          setWebHeaders(headers);
          setLoading(false);
        }
        return;
      }

      if (kind === 'video') {
        const headers = await getAuthHeaders(resolvedUrl);
        if (!cancelled) {
          setVideoHeaders(headers);
          setLoading(false);
        }
        return;
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, resolvedUrl, title, ytSource]);

  if (kind === 'video' && resolvedUrl) {
    return (
      <View style={styles.flex}>
        <Video
          source={{ uri: resolvedUrl, headers: videoHeaders }}
          style={styles.flex}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
        />
      </View>
    );
  }

  if (kind === 'audio' && resolvedUrl) {
    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:24px;background:#f8fafc;font-family:sans-serif">
        <audio controls style="width:100%" src="${resolvedUrl.replace(/"/g, '&quot;')}"></audio>
      </body></html>`;
    return <WebView source={{ html }} style={styles.flex} allowsInlineMediaPlayback />;
  }

  if (kind === 'image' && previewUri) {
    return (
      <Image
        source={{ uri: previewUri, headers: webHeaders }}
        style={styles.flex}
        contentFit="contain"
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading preview…</Text>
      </View>
    );
  }

  if (kind === 'youtube' && isYouTubeUrl(ytSource)) {
    return (
      <View style={styles.flex}>
        <YouTubeEmbedWebView videoUrl={ytSource} style={styles.flex} />
      </View>
    );
  }

  if (kind === 'pdf') {
    return (
      <View style={styles.flex}>
        <PdfPreviewWebView
          fileUrl={fileUrl}
          title={title}
          style={styles.flex}
          onBusyChange={onPreviewBusyChange}
        />
      </View>
    );
  }

  if (previewUri && kind === 'drive') {
    return (
      <WebView
        source={{ uri: previewUri, headers: webHeaders }}
        style={styles.flex}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        )}
      />
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.unavailableText}>Preview is not available for this file type.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  unavailableText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
