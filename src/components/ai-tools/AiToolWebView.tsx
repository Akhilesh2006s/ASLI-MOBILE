import { useMemo, useState, useCallback } from 'react';
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
        document.body.offsetHeight
      );
      window.ReactNativeWebView.postMessage(String(h));
    }
    sendHeight();
    setTimeout(sendHeight, 200);
    setTimeout(sendHeight, 600);
    setTimeout(sendHeight, 1200);
  })();
  true;
`;

export default function AiToolWebView({ toolType, content, rawContent, variant = 'student' }: Props) {
  const html = useMemo(
    () => renderAiToolOutputHtml(toolType, content, rawContent, variant),
    [toolType, content, rawContent, variant]
  );
  const [height, setHeight] = useState(400);

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    const next = Number(event.nativeEvent.data);
    if (Number.isFinite(next) && next > 0) {
      setHeight((prev) => (Math.abs(prev - next) > 8 ? next : prev));
    }
  }, []);

  return (
    <View style={[styles.wrap, { minHeight: height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webView, { height }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        onMessage={onMessage}
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
