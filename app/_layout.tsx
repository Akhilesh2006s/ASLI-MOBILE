import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="learning-paths" />
        <Stack.Screen name="subject/[id]" />
        <Stack.Screen name="quiz/[id]" />
        <Stack.Screen name="ai-tutor" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="admin/dashboard" />
        <Stack.Screen name="admin/subject/[id]" />
        <Stack.Screen name="admin/subjects" />
        <Stack.Screen name="teacher/dashboard" />
        <Stack.Screen name="teacher/subject/[id]" />
        <Stack.Screen name="teacher/tools/[toolType]" />
        <Stack.Screen name="super-admin/login" />
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
    </QueryClientProvider>
  );
}

