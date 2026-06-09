import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

/**
 * Hook to handle back button navigation for authenticated users
 * - Prevents going back to login/home from dashboard
 * - Redirects to appropriate dashboard when back is pressed from other pages
 */
export function useBackNavigation(dashboardPath: string, preventBack: boolean = false) {
  const router = useRouter();

  useEffect(() => {
    const backAction = async () => {
      // Check if user is authenticated
      const token = await SecureStore.getItemAsync('authToken');
      const userRole = await SecureStore.getItemAsync('userRole');

      if (!token || !userRole) {
        // Not authenticated, allow default back behavior
        return false;
      }

      // If preventBack is true (for dashboard screens), prevent back navigation
      if (preventBack) {
        return true; // Prevent default back behavior
      }

      // For other pages, navigate to dashboard instead of going back
      if (dashboardPath) {
        router.replace(dashboardPath);
        return true; // Prevent default back behavior
      }

      return false; // Allow default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [dashboardPath, preventBack, router]);
}

export type ContentReturnTarget = 'eduott' | 'learning';

export type TeacherDashboardTab =
  | 'dashboard'
  | 'students'
  | 'eduott'
  | 'learning-paths'
  | 'vidya-ai';

const TEACHER_DASHBOARD_TABS: TeacherDashboardTab[] = [
  'dashboard',
  'students',
  'eduott',
  'learning-paths',
  'vidya-ai',
];

export function parseTeacherDashboardTab(value?: string): TeacherDashboardTab {
  if (value && TEACHER_DASHBOARD_TABS.includes(value as TeacherDashboardTab)) {
    return value as TeacherDashboardTab;
  }
  return 'vidya-ai';
}

/** Back from teacher tool screens → dashboard tab (default Vidya AI tools list). */
export function useTeacherDashboardBack(returnTab: TeacherDashboardTab = 'vidya-ai') {
  const router = useRouter();

  const goBack = useCallback(() => {
    router.navigate({
      pathname: '/teacher/dashboard',
      params: { tab: returnTab },
    });
  }, [returnTab, router]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [goBack]);

  return goBack;
}

function dashboardPathForRole(role: string | null): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/dashboard';
}

/**
 * Navigate to a dashboard section (EduOTT or Learning Paths).
 * Uses navigate (not replace) so an existing dashboard in the stack is reused.
 */
export async function navigateToDashboardSection(
  router: ReturnType<typeof useRouter>,
  returnTo: ContentReturnTarget
) {
  const role = await SecureStore.getItemAsync('userRole');
  const pathname = dashboardPathForRole(role);
  const tab =
    returnTo === 'eduott'
      ? 'eduott'
      : role === 'student'
        ? 'learning'
        : 'learning-paths';
  router.navigate({ pathname, params: { tab } });
}

/** @deprecated use navigateToDashboardSection */
export function navigateToEduOTTDashboard(router: ReturnType<typeof useRouter>) {
  navigateToDashboardSection(router, 'eduott');
}

/**
 * Back navigation for video-player, drive-viewer, and similar content screens.
 */
export function useContentViewerBack(returnTo?: string) {
  const router = useRouter();

  const goBack = useCallback(async () => {
    if (returnTo === 'eduott') {
      await navigateToDashboardSection(router, 'eduott');
      return;
    }
    if (returnTo === 'learning') {
      await navigateToDashboardSection(router, 'learning');
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    const path = await getDashboardPath();
    router.navigate(path || '/dashboard');
  }, [returnTo, router]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      void goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [goBack]);

  return goBack;
}

/** @deprecated use useContentViewerBack */
export const useVideoPlayerBack = useContentViewerBack;

/**
 * Helper function to get dashboard path based on user role
 */
export async function getDashboardPath(): Promise<string | null> {
  try {
    const userRole = await SecureStore.getItemAsync('userRole');
    
    switch (userRole) {
      case 'super-admin':
        return '/super-admin-dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'student':
        return '/dashboard';
      default:
        return null;
    }
  } catch (error) {
    console.error('Error getting dashboard path:', error);
    return null;
  }
}
