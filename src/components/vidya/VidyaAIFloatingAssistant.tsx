import { useCallback } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassSurface from '../ui/GlassSurface';
import VidyaAvatar from './VidyaAvatar';

export type VidyaAssistantRole = 'student' | 'admin' | 'teacher' | 'super_admin';

type Props = {
  role: VidyaAssistantRole;
  onPress: () => void;
  hidden?: boolean;
};

/**
 * Floating Vidya orb. Admin uses a solid disc (no BlurView) so scroll under
 * the dashboard stays smooth; other roles keep the frosted look.
 */
export default function VidyaAIFloatingAssistant({ role, onPress, hidden = false }: Props) {
  const insets = useSafeAreaInsets();
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  if (hidden) return null;

  const lite = role === 'admin';

  return (
    <View
      style={[styles.container, { bottom: 88 + Math.max(insets.bottom, 8) }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.orb, lite && styles.orbLite]}
        onPress={handlePress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Open Vidya AI"
      >
        {lite ? <View style={styles.liteFill} /> : (
          <GlassSurface
            intensity={50}
            colors={['rgba(255,255,255,0.55)', 'rgba(253,186,116,0.28)']}
          />
        )}
        <View style={styles.avatarWrap}>
          <VidyaAvatar size={52} borderColor="#fdba74" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 40,
    alignItems: 'flex-end',
  },
  orb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      default: {},
    }),
  },
  orbLite: {
    borderColor: 'rgba(14, 165, 233, 0.25)',
  },
  liteFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  avatarWrap: {
    position: 'relative',
    zIndex: 1,
  },
});
