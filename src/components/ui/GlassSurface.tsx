import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const ANDROID_BLUR_METHOD = Platform.OS === 'android' ? 'dimezisBlurView' : undefined;

/** Light-blue glass tint — the default look for the Vidya AI surfaces. */
export const GLASS_BLUE: [string, string] = ['rgba(219,234,254,0.42)', 'rgba(191,219,254,0.14)'];

type Props = {
  intensity?: number;
  /** Sheen gradient colors (top-left -> bottom-right). Defaults to a light blue tint. */
  colors?: [string, string];
};

/**
 * Fills its parent with a thin frosted-glass sheet: real blur of whatever's
 * behind, a tinted directional sheen, and a bright top edge to sell the "glass
 * rim" catching light. Parent must have overflow: 'hidden' + a border radius.
 *
 * Uses tint="default" instead of "light" — the "light" preset stacks its own
 * automatic white wash on top of the blur, which bleaches out `colors` when
 * layered more than once (e.g. a card's glass sitting on top of the page
 * backdrop's own blur). "default" leaves color control entirely to `colors`.
 */
export default function GlassSurface({ intensity = 55, colors = GLASS_BLUE }: Props) {
  return (
    <>
      <BlurView
        intensity={intensity}
        tint="default"
        experimentalBlurMethod={ANDROID_BLUR_METHOD}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.edge} />
    </>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
