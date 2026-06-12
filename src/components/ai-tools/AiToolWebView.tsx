import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { renderAiToolOutputHtml } from '../../lib/render-ai-tool-output-html';
import { resolveRichDisplayContent } from '../../lib/ai-tool-display-content';

type Props = {
  toolType: string;
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
};

const MIN_HEIGHT = 240;
const INITIAL_HEIGHT = 520;

const HEIGHT_SCRIPT = `
(function() {
  function sendHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    if (window.ReactNativeWebView && h > 0) {
      window.ReactNativeWebView.postMessage(String(Math.ceil(h)));
    }
  }
  sendHeight();
  [50, 150, 350, 700, 1200, 2000].forEach(function(ms) {
    setTimeout(sendHeight, ms);
  });
  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(sendHeight);
    ro.observe(document.body);
    ro.observe(document.documentElement);
  }
})();
true;
`;

export default function AiToolWebView({ toolType, content, rawContent, variant = 'student' }: Props) {
  const html = useMemo(
    () => renderAiToolOutputHtml(toolType, content, rawContent, variant),
    [toolType, content, rawContent, variant]
  );

  const contentKey = useMemo(() => {
    const display = resolveRichDisplayContent(content, rawContent);
    return `${toolType}:${display.length}:${html.length}`;
  }, [toolType, content, rawContent, html.length]);

  const webViewRef = useRef<WebView>(null);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const heightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyHeight = useCallback((next: number) => {
    const target = Math.max(MIN_HEIGHT, next);
    setHeight((prev) => {
      if (Math.abs(target - prev) < 12) return prev;
      return target;
    });
  }, []);

  const measureHeight = useCallback(() => {
    webViewRef.current?.injectJavaScript(HEIGHT_SCRIPT);
  }, []);

  useEffect(() => {
    const timers = [40, 200, 600, 1200].map((ms) => setTimeout(measureHeight, ms));
    return () => {
      timers.forEach(clearTimeout);
      if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
    };
  }, [html, measureHeight]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const next = Number(event.nativeEvent.data);
      if (!Number.isFinite(next) || next <= 0) return;
      if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
      heightDebounceRef.current = setTimeout(() => applyHeight(next), 80);
    },
    [applyHeight]
  );

  const webViewHeight = Math.max(height, MIN_HEIGHT);

  return (
    <View style={[styles.wrap, { minHeight: MIN_HEIGHT, height: webViewHeight }]} collapsable={false}>
      <WebView
        key={contentKey}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={[
          styles.webView,
          { height: webViewHeight },
          Platform.OS === 'android' ? styles.webViewAndroid : null,
        ]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        onMessage={onMessage}
        onLoadEnd={measureHeight}
        injectedJavaScript={HEIGHT_SCRIPT}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        collapsable={false}
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  webView: { width: '100%', backgroundColor: '#ffffff', opacity: 0.99 },
  webViewAndroid: { backgroundColor: '#ffffff' },
});
