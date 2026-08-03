import { StyleSheet, View } from 'react-native';
import {
  type GlassTone,
} from '../../theme/glass';

export { GLASS_BLUE } from '../../theme/glass';

type Props = {
  intensity?: number;
  /** Sheen gradient colors (kept for API compat — unused; surfaces are opaque). */
  colors?: [string, string];
  /** Prefer tone when colors omitted. */
  tone?: GlassTone;
  /** Extra specular catch-light (kept for API compat — unused). */
  specular?: boolean;
};

/**
 * Opaque surface fill for cards / sheets.
 * Frosted BlurView over AppBackground caused content bleed-through on modals
 * and pickers (iOS) and muddy grey cards (Android) — solid white everywhere.
 */
export default function GlassSurface({
  tone = 'medium',
}: Props) {
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: tone === 'light' ? '#FAFBFC' : '#FFFFFF',
        },
      ]}
      pointerEvents="none"
    />
  );
}
