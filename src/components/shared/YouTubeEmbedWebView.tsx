import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  extractYouTubeId,
  getYoutubeEmbedWebViewSource,
} from '../../utils/contentPreview';

type Props = {
  videoUrl: string;
  style?: ViewStyle;
};

export default function YouTubeEmbedWebView({ videoUrl, style }: Props) {
  const source = getYoutubeEmbedWebViewSource(videoUrl);
  const videoId = extractYouTubeId(videoUrl);

  if (!source || !videoId) {
    return null;
  }

  return (
    <WebView
      source={source}
      style={[styles.player, style]}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  player: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
});
