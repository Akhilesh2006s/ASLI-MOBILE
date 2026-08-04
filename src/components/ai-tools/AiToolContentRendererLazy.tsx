import { lazy, Suspense, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AI } from '../../theme/ai';

const AiToolContentRenderer = lazy(() => import('./AiToolContentRenderer'));

type Props = ComponentProps<typeof AiToolContentRenderer>;

/** Defers the WebView/HTML render graph until a result actually exists. */
export default function AiToolContentRendererLazy(props: Props) {
  return (
    <Suspense
      fallback={
        <View style={styles.fallback}>
          <ActivityIndicator color={AI.primary} />
        </View>
      }
    >
      <AiToolContentRenderer {...props} />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  fallback: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
