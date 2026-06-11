import { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import VidyaAvatar from './VidyaAvatar';

export type VidyaAssistantRole = 'student' | 'admin' | 'teacher' | 'super_admin';

type Props = {
  role: VidyaAssistantRole;
  onPress: () => void;
  hidden?: boolean;
};

export default function VidyaAIFloatingAssistant({ onPress, hidden = false }: Props) {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  if (hidden) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.touchTarget}
        onPress={handlePress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel="Open Vidya AI"
      >
        <VidyaAvatar size={56} borderColor="#fdba74" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  touchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
