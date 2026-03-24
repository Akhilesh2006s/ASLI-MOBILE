import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';
import { useAuth } from '../src/context/AuthContext';
import studentService from '../src/services/api/studentService';

type ProfileTab = 'overview' | 'achievements' | 'progress' | 'settings';

export default function Profile() {
  const router = useRouter();
  const { role, user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const firstName = useMemo(() => {
    const fromName = profileData?.fullName || user?.fullName;
    if (fromName) return String(fromName).split(' ')[0];
    if (userEmail) return userEmail.split('@')[0];
    return 'Student';
  }, [profileData, user, userEmail]);

  const performance = useMemo(() => {
    const questionsSolved = Number(profileData?.questionsSolved ?? user?.questionsSolved ?? 0);
    const accuracyRate = Number(profileData?.accuracyRate ?? user?.accuracyRate ?? 0);
    const rank = Number(profileData?.rank ?? user?.rank ?? 0);
    const dayStreak = Number(profileData?.dayStreak ?? user?.dayStreak ?? 0);
    return { questionsSolved, accuracyRate, rank, dayStreak };
  }, [profileData, user]);

  useEffect(() => {
    loadUserData();
    // Get dashboard path for back navigation
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, []);

  // Navigate back to dashboard when back button is pressed
  useBackNavigation(dashboardPath, false);

  const loadUserData = async () => {
    try {
      const me = await studentService.getProfile();
      const apiUser = me?.user || user;
      setProfileData(apiUser || null);
      setUserEmail(apiUser?.email || null);
      setUserRole(apiUser?.role || role || null);
    } catch (_) {
      setProfileData(user || null);
      setUserEmail(user?.email || null);
      setUserRole(role || null);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={[styles.header, compact && { paddingHorizontal: 14 }]}>
        <TouchableOpacity onPress={() => router.replace(dashboardPath)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, compact && { fontSize: 18 }]}>Profile</Text>
        <TouchableOpacity style={styles.editProfileTop} onPress={() => Alert.alert('Edit Profile', 'Profile edit will be available soon.')}>
          <Ionicons name="create-outline" size={16} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.profileHero, compact && { padding: 14 }]}
        >
          <View style={styles.profileRow}>
            <View style={[styles.avatar, compact && { width: 60, height: 60, borderRadius: 30 }]}>
              <Text style={[styles.avatarText, compact && { fontSize: 24 }]}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileTextWrap}>
              <Text style={[styles.userName, compact && { fontSize: 18 }]}>{profileData?.fullName || firstName}</Text>
              <Text style={styles.userEmail}>{userEmail || 'student@email.com'}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.schoolBadge}>
                  <Text style={styles.schoolBadgeText}>{profileData?.educationStream || 'High School (10-12)'}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.tabStrip, compact && { padding: 3 }]}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'achievements', label: 'Achievements' },
            { id: 'progress', label: 'Progress' },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => {
            const active = activeTab === (tab.id as ProfileTab);
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id as ProfileTab)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'overview' && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Performance Overview</Text>
              <View style={styles.metricRow}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#f97316' }]}>{performance.dayStreak}</Text>
                  <Text style={styles.metricLabel}>Day Streak</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#16a34a' }]}>{performance.questionsSolved}</Text>
                  <Text style={styles.metricLabel}>Questions Solved</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#2563eb' }]}>{performance.accuracyRate}%</Text>
                  <Text style={styles.metricLabel}>Accuracy Rate</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: '#7c3aed' }]}>#{performance.rank}</Text>
                  <Text style={styles.metricLabel}>Rank</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>This Week&apos;s Activity</Text>
              <View style={styles.activityRow}>
                {[
                  { day: 'Mon', hrs: '2.5h' },
                  { day: 'Tue', hrs: '3h' },
                  { day: 'Wed', hrs: '1.8h' },
                  { day: 'Thu', hrs: '2.2h' },
                  { day: 'Fri', hrs: '2.8h' },
                  { day: 'Sat', hrs: '4h' },
                  { day: 'Sun', hrs: '1.5h' },
                ].map((item) => (
                  <View key={item.day} style={styles.activityPill}>
                    <Text style={styles.activityDay}>{item.day}</Text>
                    <Text style={styles.activityHrs}>{item.hrs}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.activityTotal}>Total: 17.8 hours this week</Text>
            </View>
          </>
        )}

        {activeTab === 'achievements' && (
          <View style={styles.sectionCard}>
            <View style={styles.achievementsHeader}>
              <Text style={styles.sectionTitle}>Achievements & Badges</Text>
              <View style={styles.achievementsCounter}>
                <Text style={styles.achievementsCounterText}>
                  {[
                    performance.dayStreak >= 7,
                    performance.questionsSolved >= 50,
                    performance.accuracyRate >= 70,
                    performance.rank > 0 && performance.rank <= 10,
                  ].filter(Boolean).length}
                  /4
                </Text>
              </View>
            </View>
            {[
              {
                title: 'Study Streak Master',
                sub: `${performance.dayStreak} days continuous learning`,
                pct: Math.min(100, Math.round((performance.dayStreak / 7) * 100)),
                color: '#f59e0b',
              },
              {
                title: 'Problem Solver',
                sub: `${performance.questionsSolved} questions solved`,
                pct: Math.min(100, Math.round((performance.questionsSolved / 50) * 100)),
                color: '#3b82f6',
              },
              {
                title: 'Accuracy Expert',
                sub: `${performance.accuracyRate}% average accuracy`,
                pct: Math.min(100, performance.accuracyRate),
                color: '#16a34a',
              },
              {
                title: 'Rank Champion',
                sub: performance.rank > 0 ? `Current rank #${performance.rank}` : 'Attempt tests to get ranked',
                pct: performance.rank > 0 ? Math.max(10, Math.min(100, Math.round((10 / performance.rank) * 100))) : 0,
                color: '#8b5cf6',
              },
            ].map((item) => (
              <View key={item.title} style={styles.achievementCard}>
                <View style={styles.achievementTop}>
                  <View style={[styles.achievementIcon, { backgroundColor: `${item.color}22` }]}>
                    <Ionicons name="ribbon-outline" size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.achievementTitle}>{item.title}</Text>
                    <Text style={styles.achievementSub}>{item.sub}</Text>
                  </View>
                  <View style={[styles.lockedChip, item.pct >= 100 ? styles.unlockedChip : undefined]}>
                    <Text style={[styles.lockedText, item.pct >= 100 ? styles.unlockedText : undefined]}>
                      {item.pct >= 100 ? 'Unlocked' : 'Locked'}
                    </Text>
                  </View>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, item.pct))}%` }]} />
                </View>
                <Text style={styles.progressText}>{item.pct}% complete</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'progress' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Progress Snapshot</Text>
            <View style={styles.quickGrid}>
              <View style={styles.quickCard}>
                <Text style={styles.quickValue}>1</Text>
                <Text style={styles.quickLabel}>Tests Completed</Text>
              </View>
              <View style={styles.quickCard}>
                <Text style={styles.quickValue}>{performance.accuracyRate}%</Text>
                <Text style={styles.quickLabel}>Best Score</Text>
              </View>
              <View style={styles.quickCard}>
                <Text style={styles.quickValue}>17.8h</Text>
                <Text style={styles.quickLabel}>Study Hours</Text>
              </View>
              <View style={styles.quickCard}>
                <Text style={styles.quickValue}>0/4</Text>
                <Text style={styles.quickLabel}>Achievements</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'settings' && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Account</Text>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  Alert.alert('Edit Profile', 'Profile editing feature is coming soon. You can update your information from the web dashboard.');
                }}
              >
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="person-outline" size={18} color="#2563eb" />
                  </View>
                  <Text style={styles.menuText}>Edit Profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
              <View style={styles.menuItem}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="mail-outline" size={18} color="#2563eb" />
                  </View>
                  <Text style={styles.menuText}>{userEmail || 'Email'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Learning</Text>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/learning-paths')}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="book-outline" size={18} color="#16a34a" />
                  </View>
                  <Text style={styles.menuText}>My Courses</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/attendance')}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="calendar-number-outline" size={18} color="#f59e0b" />
                  </View>
                  <Text style={styles.menuText}>Attendance</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/assignments')}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="clipboard-outline" size={18} color="#16a34a" />
                  </View>
                  <Text style={styles.menuText}>Assignments</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
              {(userRole === 'teacher' || userRole === 'admin') ? (
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/staff/dashboard')}>
                  <View style={styles.menuLeft}>
                    <View style={styles.menuIcon}>
                      <Ionicons name="people-outline" size={18} color="#2563eb" />
                    </View>
                    <Text style={styles.menuText}>Staff Dashboard</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  editProfileTop: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 12,
  },
  profileHero: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  profileTextWrap: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  userEmail: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748b',
  },
  badgeRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  schoolBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  schoolBadgeText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  tabStrip: {
    marginTop: 10,
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#0f172a',
  },
  sectionCard: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  metricItem: {
    width: '50%',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activityPill: {
    width: '23.8%',
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    paddingVertical: 6,
    alignItems: 'center',
  },
  activityDay: {
    fontSize: 10,
    color: '#334155',
    marginBottom: 2,
  },
  activityHrs: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '700',
  },
  activityTotal: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: '#334155',
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  achievementsCounter: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  achievementsCounterText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '700',
  },
  achievementCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  achievementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  achievementSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  lockedChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  unlockedChip: {
    backgroundColor: '#dcfce7',
  },
  lockedText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  unlockedText: {
    color: '#166534',
  },
  track: {
    marginTop: 8,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#8b5cf6',
  },
  progressText: {
    marginTop: 5,
    fontSize: 11,
    color: '#64748b',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickCard: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
  },
  quickValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  quickLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 14,
    marginBottom: 24,
    paddingVertical: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
});
