import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  buildPdfJsPreviewHtml,
  getPdfJsFetchUrl,
  YOUTUBE_EMBED_ORIGIN,
} from '../../utils/contentPreview';

type Props = {
  fileUrl: string;
  title?: string;
  style?: ViewStyle;
};

export default function PdfPreviewWebView({ fileUrl, title, style }: Props) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfUrl = await getPdfJsFetchUrl(fileUrl, title);
      if (cancelled || !pdfUrl) return;
      setHtml(buildPdfJsPreviewHtml(pdfUrl));
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, title]);

  if (!html) {
    return (
      <View style={[styles.loading, style]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <WebView
      source={{ html, baseUrl: YOUTUBE_EMBED_ORIGIN }}
      style={[styles.viewer, style]}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  viewer: {
    flex: 1,
    backgroundColor: '#525659',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#525659',
  },
});
