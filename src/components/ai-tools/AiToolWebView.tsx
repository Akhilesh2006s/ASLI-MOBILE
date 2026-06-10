import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { renderAiToolOutputHtml } from '../../lib/render-ai-tool-output-html';

type Props = {
  toolType: string;
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
};

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
  [50, 150, 350, 700, 1200, 2000, 3500].forEach(function(ms) {
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
  const webViewRef = useRef<WebView>(null);
  const [height, setHeight] = useState(480);

  const measureHeight = useCallback(() => {
    webViewRef.current?.injectJavaScript(HEIGHT_SCRIPT);
  }, []);

  useEffect(() => {
    setHeight(480);
    const timer = setTimeout(measureHeight, 40);
    return () => clearTimeout(timer);
  }, [html, measureHeight]);

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    const next = Number(event.nativeEvent.data);
    if (Number.isFinite(next) && next > 0) {
      setHeight((prev) => (next > prev - 4 ? next : prev));
    }
  }, []);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webView, { height }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        onMessage={onMessage}
        onLoadEnd={measureHeight}
        injectedJavaScript={HEIGHT_SCRIPT}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  webView: { width: '100%', backgroundColor: 'transparent' },
});
