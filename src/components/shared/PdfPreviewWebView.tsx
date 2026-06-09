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
  buildPdfUrlInjectScript,
  fetchPdfPreviewLoadInfo,
  PDF_JS_VIEWER_SHELL_HTML,
  resolvePdfUrlTarget,
  YOUTUBE_EMBED_ORIGIN,
  type PdfUrlLoadTarget,
} from '../../utils/contentPreview';

type Props = {
  fileUrl: string;
  title?: string;
  style?: ViewStyle;
  onBusyChange?: (busy: boolean) => void;
};

export default function PdfPreviewWebView({ fileUrl, title, style, onBusyChange }: Props) {
  const webRef = useRef<WebView>(null);
  const webReadyRef = useRef(false);
  const [webReady, setWebReady] = useState(false);
  const [urlTarget, setUrlTarget] = useState<PdfUrlLoadTarget | null>(null);
  const [resolving, setResolving] = useState(true);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const injectedRef = useRef(false);
  const mountedRef = useRef(true);
  const fallbackTriedRef = useRef(false);
  const fileUrlRef = useRef(fileUrl);
  const titleRef = useRef(title);

  fileUrlRef.current = fileUrl;
  titleRef.current = title;

  const busy = resolving || rendering;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    webReadyRef.current = webReady;
  }, [webReady]);

  const injectWhenReady = useCallback((script: string) => {
    const run = () => {
      if (!mountedRef.current) return;
      if (webRef.current && webReadyRef.current) {
        injectedRef.current = true;
        setRendering(true);
        webRef.current.injectJavaScript(script);
        return;
      }
      setTimeout(run, 40);
    };
    run();
  }, []);

  const loadBase64Fallback = useCallback(async () => {
    if (fallbackTriedRef.current) {
      setRendering(false);
      setError('Could not load this PDF. Check your connection and try again.');
      return;
    }
    fallbackTriedRef.current = true;
    injectedRef.current = false;
    setResolving(true);
    setRendering(true);
    setError(null);

    const loaded = await fetchPdfPreviewLoadInfo(fileUrlRef.current, titleRef.current);
    if (!mountedRef.current) return;

    setResolving(false);
    if (!loaded) {
      setRendering(false);
      setError('Could not load this PDF. Check your connection and try again.');
      return;
    }
    injectWhenReady(buildPdfInjectScript(loaded.base64));
  }, [injectWhenReady]);

  useEffect(() => {
    mountedRef.current = true;
    fallbackTriedRef.current = false;
    injectedRef.current = false;
    webReadyRef.current = false;
    setWebReady(false);
    setResolving(true);
    setRendering(true);
    setError(null);
    setUrlTarget(null);

    void (async () => {
      const target = await resolvePdfUrlTarget(fileUrlRef.current, titleRef.current);
      if (!mountedRef.current) return;
      if (!target?.url) {
        setResolving(false);
        await loadBase64Fallback();
        return;
      }
      setUrlTarget(target);
      setResolving(false);
    })();

    return () => {
      mountedRef.current = false;
      onBusyChange?.(false);
      webRef.current?.stopLoading();
    };
  }, [fileUrl, title, reloadKey, onBusyChange, loadBase64Fallback]);

  useEffect(() => {
    if (!webReady || !urlTarget || injectedRef.current) return;
    injectWhenReady(buildPdfUrlInjectScript(urlTarget.url, urlTarget.headers));
  }, [webReady, urlTarget, injectWhenReady]);

  const onWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const data = event.nativeEvent.data;
      if (data === 'pdf-ready') {
        setRendering(false);
        return;
      }
      if (data === 'pdf-error') {
        void loadBase64Fallback();
      }
    },
    [loadBase64Fallback]
  );

  useEffect(() => {
    if (!rendering || resolving) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setRendering(false);
    }, 45000);
    return () => clearTimeout(timer);
  }, [rendering, resolving]);

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

  const loadingLabel = resolving
    ? 'Starting preview…'
    : !webReady
      ? 'Loading viewer…'
      : 'Opening document…';

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
        setSupportMultipleWindows={false}
        cacheEnabled
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        onLoadEnd={() => setWebReady(true)}
        onMessage={onWebMessage}
      />
      {busy && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>{loadingLabel}</Text>
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
    backgroundColor: 'rgba(82, 86, 89, 0.88)',
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
