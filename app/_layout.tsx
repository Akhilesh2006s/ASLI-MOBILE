import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
import { queryClient } from '../src/lib/queryClient';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

function getDashboardByRole(role: string | null) {
  if (role === 'super-admin') return '/super-admin-dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/dashboard';
}

function isPublicPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    pathname === '/onboarding'
  );
}

const STAFF_ROLES = ['student', 'admin', 'teacher', 'super-admin'] as const;

function canAccessPath(pathname: string, role: string | null) {
  if (!role) return false;
  if (pathname.startsWith('/super-admin/') || pathname.startsWith('/super-admin-dashboard')) return role === 'super-admin';
  if (pathname.startsWith('/admin/')) return role === 'admin';
  if (pathname.startsWith('/teacher/')) return role === 'teacher';

  // Student app shell only — not used by admin/teacher dashboards
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/assignments') ||
    pathname.startsWith('/student-') ||
    pathname.startsWith('/student/')
  ) {
    return role === 'student';
  }

  // Learning paths, media, quizzes, profile — students + staff (preview from admin Learning Paths, etc.)
  if (
    pathname.startsWith('/learning-paths') ||
    pathname.startsWith('/subject/') ||
    pathname.startsWith('/quiz/') ||
    pathname.startsWith('/practice-tests') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/video-') ||
    pathname.startsWith('/live-stream') ||
    pathname.startsWith('/drive-viewer') ||
    pathname.startsWith('/asli-prep-content') ||
    pathname.startsWith('/iq-rank-boost')
  ) {
    return (STAFF_ROLES as readonly string[]).includes(role);
  }

  if (pathname.startsWith('/staff/')) {
    return role === 'teacher' || role === 'admin';
  }
  return true;
}

function AuthGate() {
  const { isLoading, isAuthenticated, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    const publicPath = isPublicPath(pathname);

    if (!isAuthenticated && !publicPath) {
      router.replace('/auth/login');
      return;
    }

    if (isAuthenticated && publicPath) {
      router.replace(getDashboardByRole(role));
      return;
    }

    if (isAuthenticated && !canAccessPath(pathname, role)) {
      router.replace(getDashboardByRole(role));
    }
  }, [isLoading, isAuthenticated, pathname, role, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
      <Stack.Screen name="dashboard/index" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="assignments" />
      <Stack.Screen name="staff/dashboard" />
      <Stack.Screen name="learning-paths" />
      <Stack.Screen name="subject/[id]" />
      <Stack.Screen name="quiz/[id]" />
      <Stack.Screen name="ai-tutor" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="admin/dashboard" />
      <Stack.Screen name="teacher/dashboard" />
      <Stack.Screen name="teacher/tools/[toolType]" />
      <Stack.Screen name="super-admin-dashboard" />
      <Stack.Screen name="super-admin/dashboard" />
      <Stack.Screen name="student/tools/[toolType]" />
      <Stack.Screen name="student-exams" />
      <Stack.Screen name="practice-tests" />
      <Stack.Screen name="video-lectures" />
      <Stack.Screen name="live-stream" />
      <Stack.Screen name="video-player" />
      <Stack.Screen name="drive-viewer" />
      <Stack.Screen name="asli-prep-content" />
      <Stack.Screen name="iq-rank-boost-subjects" />
      <Stack.Screen name="iq-rank-boost-quiz/[quizId]" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="super-admin/analytics" />
      <Stack.Screen name="super-admin/detailed-ai-analytics" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});

