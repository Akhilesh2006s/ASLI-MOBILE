import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  buildPdfInjectScript,
  describePdfPreviewSource,
  fetchPdfPreviewLoadInfo,
  PDF_JS_VIEWER_SHELL_HTML,
  resolveContentUrl,
  YOUTUBE_EMBED_ORIGIN,
  type PdfPreviewLoadInfo,
} from '../../utils/contentPreview';

type Props = {
  fileUrl: string;
  title?: string;
  style?: ViewStyle;
  onBusyChange?: (busy: boolean) => void;
};

export default function PdfPreviewWebView({ fileUrl, title, style, onBusyChange }: Props) {
  const webRef = useRef<WebView>(null);
  const [webReady, setWebReady] = useState(false);
  const [base64, setBase64] = useState<string | null>(null);
  const [loadInfo, setLoadInfo] = useState<PdfPreviewLoadInfo | null>(null);
  const [fetching, setFetching] = useState(true);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const injectedRef = useRef(false);
  const mountedRef = useRef(true);

  const busy = fetching || rendering;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  const loadPdf = useCallback(async () => {
    setFetching(true);
    setRendering(true);
    setError(null);
    setBase64(null);
    setLoadInfo(null);
    injectedRef.current = false;

    const loaded = await fetchPdfPreviewLoadInfo(fileUrl, title);
    if (!mountedRef.current) return;

    setFetching(false);
    if (!loaded) {
      setRendering(false);
      setError('Could not load this PDF. Check your connection and try again.');
      return;
    }
    setLoadInfo(loaded);
    setBase64(loaded.base64);
  }, [fileUrl, title]);

  useEffect(() => {
    mountedRef.current = true;
    setWebReady(false);
    void loadPdf();

    return () => {
      mountedRef.current = false;
      onBusyChange?.(false);
      webRef.current?.stopLoading();
    };
  }, [loadPdf, reloadKey, onBusyChange]);

  useEffect(() => {
    if (!webReady || !base64 || injectedRef.current) return;
    injectedRef.current = true;
    setRendering(true);
    webRef.current?.injectJavaScript(buildPdfInjectScript(base64));
  }, [webReady, base64]);

  const onWebMessage = useCallback((event: WebViewMessageEvent) => {
    const data = event.nativeEvent.data;
    if (data === 'pdf-ready' || data === 'pdf-error') {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (!rendering || fetching) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setRendering(false);
    }, 45000);
    return () => clearTimeout(timer);
  }, [rendering, fetching]);

  if (error) {
    return (
      <View style={[styles.centered, style]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => setReloadKey((k) => k + 1)}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sourceHint = loadInfo ? describePdfPreviewSource(loadInfo) : null;
  const loadingTarget = resolveContentUrl(fileUrl);
  const loadingLabel = fetching ? 'Loading PDF in app…' : 'Rendering pages…';

  return (
    <View style={[styles.wrap, style]} collapsable={false}>
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ html: PDF_JS_VIEWER_SHELL_HTML, baseUrl: YOUTUBE_EMBED_ORIGIN }}
        style={styles.viewer}
        pointerEvents={busy ? 'none' : 'auto'}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mixedContentMode="always"
        onLoadEnd={() => setWebReady(true)}
        onMessage={onWebMessage}
      />
      {busy && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>{loadingLabel}</Text>
          {fetching && (
            <>
              <Text style={styles.loadingSubtext}>Not saved to your device</Text>
              {!!loadingTarget && (
                <Text style={styles.loadingSource} numberOfLines={2}>
                  {loadingTarget.replace(/^https?:\/\//, '')}
                </Text>
              )}
            </>
          )}
        </View>
      )}
      {sourceHint && !busy && (
        <View style={styles.sourceBar} pointerEvents="none">
          <Text style={styles.sourceText} numberOfLines={1}>
            {sourceHint}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#525659',
  },
  viewer: {
    flex: 1,
    backgroundColor: '#525659',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(82, 86, 89, 0.92)',
    zIndex: 10,
    elevation: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#525659',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 6,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  loadingSource: {
    marginTop: 10,
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  sourceBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },
  sourceText: {
    fontSize: 11,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
