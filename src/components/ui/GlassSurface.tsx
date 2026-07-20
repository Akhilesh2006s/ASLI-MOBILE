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

const ANDROID_BLUR_METHOD = Platform.OS === 'android' ? 'dimezisBlurView' : undefined;

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
      <BlurView
        intensity={blurIntensity}
        tint="default"
        experimentalBlurMethod={ANDROID_BLUR_METHOD}
        style={StyleSheet.absoluteFillObject}
      />
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
