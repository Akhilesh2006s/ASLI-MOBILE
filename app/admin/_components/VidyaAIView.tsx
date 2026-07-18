import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import authService from '../../../src/services/api/authService';
import AdminVidyaChatPanel from './AdminVidyaChatPanel';
import { AdminSkeletonList, useAdminTheme } from '../_ui';

export default function VidyaAIView() {
  const { colors } = useAdminTheme();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('Admin');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    authService
      .me()
      .then((data) => {
        const user = data?.user;
        if (user) {
          setAdminId(String(user._id || user.id || ''));
          setAdminName(
            user.schoolName || user.fullName || user.email?.split('@')[0] || 'Admin'
          );
        }
      })
      .catch(() => null)
      .finally(() => setLoadingUser(false));
  }, []);

  if (loadingUser) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.bg }]}>
        <AdminSkeletonList count={3} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Vidya AI...</Text>
      </View>
    );
  }

  if (!adminId) {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={[styles.loadingWrap, { backgroundColor: colors.bg }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Sign in to use Vidya AI</Text>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.panelWrap, { backgroundColor: colors.bg }]}>
      <AdminVidyaChatPanel adminId={adminId} adminName={adminName} />
    </View>
  );
}

const styles = StyleSheet.create({
  panelWrap: { flex: 1, minHeight: 0, paddingHorizontal: 8 },
  loadingWrap: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 14 },
});
