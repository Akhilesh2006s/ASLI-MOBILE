import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { getDashboardPath } from '../src/hooks/useBackNavigation';

export default function HomePage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const userRole = await SecureStore.getItemAsync('userRole');

      if (token && userRole) {
        // User is authenticated, redirect to their dashboard
        const dashboardPath = await getDashboardPath();
        if (dashboardPath) {
          router.replace(dashboardPath);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const features = [
    {
      iconBg: '#a855f7',
      title: 'AI Tutor 24/7',
      description: 'Get instant answers, step-by-step explanations, and personalized guidance from our intelligent AI assistant.',
    },
    {
      iconBg: '#3b82f6',
      title: 'Interactive Videos',
      description: 'Engaging lectures with animations, quizzes, and real-world examples in multiple languages.',
    },
    {
      iconBg: '#f97316',
      title: 'Smart Notes & Maps',
      description: 'Auto-generated summaries, visual mind maps, and voice-enabled Q&A for efficient revision.',
    },
    {
      iconBg: '#10b981',
      title: 'Adaptive Tests',
      description: 'Board-aligned exams with instant AI grading, detailed feedback, and difficulty adjustment.',
    },
    {
      iconBg: '#3b82f6',
      title: 'Teacher Connect',
      description: 'Real-time doubt resolution, live classes, and interactive whiteboards with expert teachers.',
    },
    {
      iconBg: '#f97316',
      title: 'Gamification',
      description: 'Earn badges, climb leaderboards, maintain streaks, and unlock rewards as you progress!',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Navbar */}
        <View style={styles.navbar}>
          <View style={styles.navbarContent}>
            <View style={styles.logoContainer}>
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>AL</Text>
              </View>
              <Text style={styles.brandName}>ASLILEARN AI</Text>
            </View>
            <View style={styles.navButtons}>
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.getStartedButton}
                onPress={() => router.push('/auth/register')}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.badge}>
              <Ionicons name="sparkles" size={16} color="#2563eb" />
              <Text style={styles.badgeText}>AI-Powered Learning Platform</Text>
            </View>

            <Text style={styles.heroTitle}>
              Learn Smarter,{'\n'}
              <Text style={styles.heroTitleSecondary}>Achieve Faster!</Text>
            </Text>

            <Text style={styles.heroDescription}>
              Master CBSE, ICSE, State Boards, NEET, JEE & more with personalized AI tutoring, 
              interactive videos, and gamified learning. Join 100,000+ students transforming their education!
            </Text>

            <View style={styles.ctaButtons}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => router.push('/auth/login')}
              >
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Start Learning Free</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryButton}
              >
                <Ionicons name="trophy" size={20} color="#374151" />
                <Text style={styles.secondaryButtonText}>View Demo</Text>
              </TouchableOpacity>
            </View>

            {/* Statistics */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>10K+</Text>
                <Text style={styles.statLabel}>Active Students</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>500+</Text>
                <Text style={styles.statLabel}>Video Lectures</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>95%</Text>
                <Text style={styles.statLabel}>Success Rate</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Ionicons name="sparkles" size={16} color="#f97316" />
              <Text style={styles.sectionBadgeText}>Powerful Features</Text>
            </View>
            <Text style={styles.sectionTitle}>
              Everything You Need to <Text style={styles.sectionTitleAccent}>Excel</Text>
            </Text>
            <Text style={styles.sectionDescription}>
              Comprehensive tools designed to make learning engaging, effective, and fun for students of all levels.
            </Text>
          </View>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => {
              const iconMap: Record<string, string> = {
                'Brain': 'bulb',
                'Video': 'videocam',
                'FileText': 'document-text',
                'Target': 'target',
                'Users': 'people',
                'Zap': 'flash',
              };
              const iconName = iconMap[feature.title.split(' ')[0]] || 'star';
              return (
                <View key={index} style={styles.featureCard}>
                  <View style={[styles.featureIcon, { backgroundColor: feature.iconBg }]}>
                    <Ionicons name={iconName as any} size={24} color="#fff" />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Transform Your Learning Journey?</Text>
          <Text style={styles.ctaDescription}>
            Join thousands of students achieving their academic dreams with AI-powered education
          </Text>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.ctaButtonText}>Start Free Trial Today</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  navbar: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  navbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563eb',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  loginButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  getStartedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  getStartedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  heroSection: {
    padding: 20,
    paddingTop: 32,
  },
  heroContent: {
    gap: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 44,
  },
  heroTitleSecondary: {
    color: '#111827',
  },
  heroDescription: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#9333ea',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingTop: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#9333ea',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  featuresSection: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#c2410c',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  sectionTitleAccent: {
    color: '#f97316',
  },
  sectionDescription: {
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  ctaSection: {
    padding: 32,
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f0f9ff',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    marginTop: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});

