import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { AppSplash, SPLASH_DURATION_MS, SPLASH_EXIT_DURATION_MS } from '../src/components/AppSplash';

function getDashboardByRole(role: string | null) {
  if (role === 'super-admin') return '/super-admin-dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/dashboard';
}

export default function Index() {
  const { isLoading, isAuthenticated, role } = useAuth();
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setSplashExiting(true), SPLASH_DURATION_MS - SPLASH_EXIT_DURATION_MS);
    const doneTimer = setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (!splashDone || isLoading) {
    return <AppSplash exiting={splashExiting} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return <Redirect href={getDashboardByRole(role)} />;
}
