import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

function useInterceptedDashboardBack(navigate: () => void) {
  const navigation = useNavigation();
  const handlingBack = useRef(false);

  const goBack = useCallback(() => {
    if (handlingBack.current) return;
    handlingBack.current = true;
    navigate();
    setTimeout(() => {
      handlingBack.current = false;
    }, 350);
  }, [navigate]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [goBack]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const actionType = e.data.action.type;
      if (actionType !== 'GO_BACK' && actionType !== 'POP') return;
      if (handlingBack.current) return;
      e.preventDefault();
      goBack();
    });
    return unsubscribe;
  }, [navigation, goBack]);

  return goBack;
}

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

export type StudentDashboardTab = 'home' | 'learning' | 'eduott' | 'exams' | 'vidya' | 'settings';

const STUDENT_DASHBOARD_TABS: StudentDashboardTab[] = [
  'home',
  'learning',
  'eduott',
  'exams',
  'vidya',
  'settings',
];

export function parseStudentDashboardTab(value?: string): StudentDashboardTab {
  if (value && STUDENT_DASHBOARD_TABS.includes(value as StudentDashboardTab)) {
    return value as StudentDashboardTab;
  }
  return 'vidya';
}

/** Back from student AI tool screens → dashboard Vidya / AI Tools tab. */
export function useStudentDashboardBack(returnTab: StudentDashboardTab = 'vidya') {
  const router = useRouter();
  const navigate = useCallback(() => {
    router.navigate({
      pathname: '/dashboard',
      params: { tab: returnTab },
    });
  }, [returnTab, router]);

  return useInterceptedDashboardBack(navigate);
}

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
  const navigate = useCallback(() => {
    router.navigate({
      pathname: '/teacher/dashboard',
      params: { tab: returnTab },
    });
  }, [returnTab, router]);

  return useInterceptedDashboardBack(navigate);
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
  returnTo: ContentReturnTarget,
  method: 'navigate' | 'replace' = 'navigate'
) {
  const role = await SecureStore.getItemAsync('userRole');
  const pathname = dashboardPathForRole(role);
  const tab =
    returnTo === 'eduott'
      ? 'eduott'
      : role === 'student'
        ? 'learning'
        : 'learning-paths';
  const target = { pathname, params: { tab } };
  if (method === 'replace') {
    router.replace(target);
  } else {
    router.navigate(target);
  }
}

/** @deprecated use navigateToDashboardSection */
export function navigateToEduOTTDashboard(router: ReturnType<typeof useRouter>) {
  navigateToDashboardSection(router, 'eduott');
}

/**
 * Back navigation for video-player, drive-viewer, and similar content screens.
 * Handles hardware back, header back, and iOS swipe-back consistently.
 */
export function useContentViewerBack(returnTo?: string) {
  const router = useRouter();
  const navigation = useNavigation();
  const handlingBack = useRef(false);

  const goBack = useCallback(async () => {
    if (handlingBack.current) return;
    handlingBack.current = true;

    try {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      if (returnTo === 'eduott') {
        await navigateToDashboardSection(router, 'eduott', 'replace');
        return;
      }
      if (returnTo === 'learning') {
        await navigateToDashboardSection(router, 'learning', 'replace');
        return;
      }
      const path = await getDashboardPath();
      router.replace(path || '/dashboard');
    } finally {
      setTimeout(() => {
        handlingBack.current = false;
      }, 350);
    }
  }, [returnTo, router]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      void goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [goBack]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const actionType = e.data.action.type;
      if (actionType !== 'GO_BACK' && actionType !== 'POP') return;
      if (handlingBack.current) return;

      e.preventDefault();
      void goBack();
    });
    return unsubscribe;
  }, [navigation, goBack]);

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
