import { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GLASS_RIM, GLASS_SHADOW } from '../../theme/glass';
import GlassSurface from '../ui/GlassSurface';
import VidyaAvatar from './VidyaAvatar';

export type VidyaAssistantRole = 'student' | 'admin' | 'teacher' | 'super_admin';

type Props = {
  role: VidyaAssistantRole;
  onPress: () => void;
  hidden?: boolean;
};

export default function VidyaAIFloatingAssistant({ onPress, hidden = false }: Props) {
  const insets = useSafeAreaInsets();
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  if (hidden) return null;

  return (
    <View
      style={[styles.container, { bottom: 82 + Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.orb}
        onPress={handlePress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Open Vidya AI"
      >
        <GlassSurface
          intensity={50}
          colors={['rgba(255,255,255,0.55)', 'rgba(253,186,116,0.28)']}
        />
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
    borderColor: GLASS_RIM.border,
    ...GLASS_SHADOW.soft,
  },
  avatarWrap: {
    position: 'relative',
    zIndex: 1,
  },
});
