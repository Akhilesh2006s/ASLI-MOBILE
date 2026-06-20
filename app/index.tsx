import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

function getDashboardByRole(role: string | null) {
  if (role === 'super-admin') return '/super-admin-dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/dashboard';
}

export default function Index() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) {
    return <View style={styles.boot} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return <Redirect href={getDashboardByRole(role)} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
});
