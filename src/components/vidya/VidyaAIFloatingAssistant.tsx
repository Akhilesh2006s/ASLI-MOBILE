import { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      style={[
        styles.container,
        { bottom: 118 + Math.max(insets.bottom, 12) },
      ]}
      pointerEvents="box-none"
    >
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
    right: 20,
    zIndex: 40,
    alignItems: 'flex-end',
  },
  touchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
