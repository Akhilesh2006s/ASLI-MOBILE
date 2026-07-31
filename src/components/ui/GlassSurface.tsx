import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GLASS_BLUE,
  GLASS_RIM,
  GLASS_SPECULAR,
  GLASS_TONES,
  type GlassTone,
} from '../../theme/glass';

const IS_ANDROID = Platform.OS === 'android';
const ANDROID_BLUR_METHOD = IS_ANDROID ? 'none' : undefined;

export { GLASS_BLUE };

type Props = {
  intensity?: number;
  /** Sheen gradient colors (top-left -> bottom-right). */
  colors?: [string, string];
  /** Prefer tone when colors omitted — pulls shared liquid tokens. */
  tone?: GlassTone;
  /** Extra specular catch-light (default on). */
  specular?: boolean;
};

/**
 * Liquid-glass sheet: real blur, chromatic sheen, specular highlight, dual rim.
 * Parent must have overflow: 'hidden' + a border radius.
 */
export default function GlassSurface({
  intensity,
  colors,
  tone = 'medium',
  specular = true,
}: Props) {
  const toneSpec = GLASS_TONES[tone];
  const sheen = colors ?? toneSpec.colors;
  const blurIntensity = intensity ?? toneSpec.intensity;

  return (
    <>
      {IS_ANDROID ? (
        // Android cannot frost-blur reliably. Semi-transparent white over the
        // pastel page art reads as muddy grey in release/Play builds, while
        // Expo web/preview (non-android path) still looks white. Use solid fills.
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: tone === 'light' ? '#FAFBFC' : '#FFFFFF',
            },
          ]}
        />
      ) : (
        <BlurView
          intensity={blurIntensity}
          tint="light"
          experimentalBlurMethod={ANDROID_BLUR_METHOD}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {!IS_ANDROID ? (
        <>
          <LinearGradient
            colors={sheen}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {specular ? (
            <LinearGradient
              colors={[...GLASS_SPECULAR]}
              locations={[0, 0.35, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.75, y: 0.55 }}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
          ) : null}
          <View style={styles.rimTop} pointerEvents="none" />
          <View style={styles.rimBottom} pointerEvents="none" />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  rimTop: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    height: 1.5,
    backgroundColor: GLASS_RIM.top,
    borderRadius: 1,
  },
  rimBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 1,
    backgroundColor: GLASS_RIM.bottom,
  },
});
