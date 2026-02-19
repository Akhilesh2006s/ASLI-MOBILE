import { useEffect } from 'react';
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

/**
 * Helper function to get dashboard path based on user role
 */
export async function getDashboardPath(): Promise<string | null> {
  try {
    const userRole = await SecureStore.getItemAsync('userRole');
    
    switch (userRole) {
      case 'super-admin':
        return '/super-admin/dashboard';
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


