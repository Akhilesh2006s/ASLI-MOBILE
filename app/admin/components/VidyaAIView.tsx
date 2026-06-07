import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../../src/services/api/authService';
import AdminVidyaChatPanel from './AdminVidyaChatPanel';

export default function VidyaAIView() {
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
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#fb923c" />
        <Text style={styles.loadingText}>Loading Vidya AI...</Text>
      </View>
    );
  }

  if (!adminId) {
    return (
      <View style={styles.loadingWrap}>
        <Ionicons name="chatbubbles-outline" size={40} color="#cbd5e1" />
        <Text style={styles.loadingText}>Sign in to use Vidya AI</Text>
      </View>
    );
  }

  return (
    <View style={styles.panelWrap}>
      <AdminVidyaChatPanel adminId={adminId} adminName={adminName} />
    </View>
  );
}

const styles = StyleSheet.create({
  panelWrap: { flex: 1, minHeight: 0 },
  loadingWrap: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14, color: '#64748b' },
});
