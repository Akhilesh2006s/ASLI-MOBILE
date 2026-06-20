import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingState } from '../src/components/ui';
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
  return pathname.startsWith('/auth/') || pathname === '/onboarding';
}

const STAFF_ROLES = ['student', 'admin', 'teacher', 'super-admin'] as const;

function canAccessPath(pathname: string, role: string | null) {
  if (!role) return false;
  if (pathname.startsWith('/super-admin/') || pathname.startsWith('/super-admin-dashboard')) return role === 'super-admin';
  if (pathname.startsWith('/admin/')) return role === 'admin';
  if (pathname === '/notifications') return true;
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
    pathname.startsWith('/exam/') ||
    pathname.startsWith('/practice-tests') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/notifications') ||
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

    if (!isAuthenticated && !publicPath && pathname !== '/') {
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

  if (isLoading && pathname === '/') {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState variant="stats" style={{ width: '100%', paddingHorizontal: 24 }} />
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
      <Stack.Screen name="exam/[id]" />
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
      <Stack.Screen
        name="video-player"
        options={{
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="drive-viewer"
        options={{
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="asli-prep-content"
        options={{
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen name="iq-rank-boost-subjects" />
      <Stack.Screen name="iq-rank-boost-quiz/[quizId]" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="student/timetable" />
      <Stack.Screen name="student/schedule" />
      <Stack.Screen name="student/results" />
      <Stack.Screen name="teacher/attendance" />
      <Stack.Screen name="teacher/vidya-chat" />
      <Stack.Screen name="teacher/subject/[id]" />
      <Stack.Screen name="super-admin/analytics" />
      <Stack.Screen name="super-admin/detailed-ai-analytics" />
      <Stack.Screen name="super-admin/schools/[id]" />
      <Stack.Screen name="super-admin/create-order" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
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

