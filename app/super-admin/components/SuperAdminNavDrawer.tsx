import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSuperAdminTheme } from '../ui/useSuperAdminTheme';

/** Matches web `SuperAdminSidebar` + `super-admin-views.ts`. */
export type SuperAdminView =
  | 'dashboard'
  | 'board'
  | 'admins'
  | 'subjects-and-content'
  | 'content'
  | 'subjects'
  | 'exams'
  | 'iq-rank-boost'
  | 'calendar'
  | 'vidya-ai'
  | 'ai-tool-generations'
  | 'ai-tool-topics'
  | 'ai-generator'
  | 'ai-content-engine'
  | 'analytics'
  | 'ai-analytics'
  | 'board-comparison'
  | 'subscriptions'
  | 'settings';

type NavItem = {
  id: SuperAdminView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'bar-chart-outline' },
  { id: 'board', label: 'Board Management', icon: 'people-outline' },
  { id: 'admins', label: 'School Management', icon: 'shield-outline' },
  { id: 'subjects-and-content', label: 'Subject & Content', icon: 'list-outline' },
  { id: 'exams', label: 'Exam Management', icon: 'document-text-outline' },
  { id: 'iq-rank-boost', label: 'IQ/Rank Boost Activities', icon: 'trophy-outline' },
  { id: 'calendar', label: 'School Calendar', icon: 'calendar-outline' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline' },
  { id: 'ai-tool-generations', label: 'AI Tool Data', icon: 'albums-outline' },
  { id: 'ai-tool-topics', label: 'AI Tool Topics', icon: 'radio-button-on-outline' },
  { id: 'ai-generator', label: 'AI Generator', icon: 'flash-outline' },
  { id: 'ai-content-engine', label: 'AI PDF', icon: 'cloud-upload-outline' },
  { id: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'card-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
];

/** First 5 items — matches web mobile bottom nav. */
export const SUPER_ADMIN_BOTTOM_TABS = SUPER_ADMIN_NAV_ITEMS.slice(0, 5);

export function superAdminNavLabel(view: SuperAdminView): string {
  if (view === 'ai-analytics') return 'AI Analytics';
  if (view === 'board-comparison') return 'Board Comparison';
  if (view === 'content' || view === 'subjects') return 'Subject & Content';
  return SUPER_ADMIN_NAV_ITEMS.find((item) => item.id === view)?.label ?? 'Dashboard';
}

type Props = {
  visible: boolean;
  activeView: SuperAdminView;
  userName: string;
  onClose: () => void;
  onSelect: (view: SuperAdminView) => void;
  onLogout: () => void;
};

export default function SuperAdminNavDrawer({
  visible,
  activeView,
  userName,
  onClose,
  onSelect,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors } = useSuperAdminTheme();
  const drawerWidth = Math.min(width * 0.92, 320);
  const translateX = useSharedValue(-drawerWidth);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withSpring(visible ? 0 : -drawerWidth, { damping: 20, stiffness: 240 });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: 260 });
  }, [visible, drawerWidth, translateX, backdropOpacity]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const isActive = (itemId: SuperAdminView) =>
    activeView === itemId ||
    (itemId === 'analytics' && activeView === 'ai-analytics') ||
    (itemId === 'subjects-and-content' &&
      (activeView === 'subjects' || activeView === 'content'));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[styles.drawer, { width: drawerWidth, paddingTop: insets.top }, drawerStyle]}
        >
          <LinearGradient colors={['#FB923C', '#F97316']} style={StyleSheet.absoluteFill} />

          <View style={styles.logoSection}>
            <Ionicons name="school" size={28} color="#fff" />
            <View style={styles.logoTextWrap}>
              <Text style={styles.logoTitle}>Aslilearn AI</Text>
              <Text style={styles.logoSubtitle}>Super Admin</Text>
            </View>
          </View>

          <ScrollView
            style={styles.navScroll}
            contentContainerStyle={styles.navContent}
            showsVerticalScrollIndicator
            bounces={false}
          >
            {SUPER_ADMIN_NAV_ITEMS.map((item) => {
              const active = isActive(item.id);
              return (
                <Pressable
                  key={item.id}
                  style={[styles.navItem, active && styles.navItemActive]}
                  onPress={() => onSelect(item.id)}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? colors.navActiveColor : '#fff'}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      active && [styles.navLabelActive, { color: colors.navActiveColor }],
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
              <View style={styles.userTextWrap}>
                <Text style={styles.userName} numberOfLines={1}>
                  {userName}
                </Text>
                <Text style={styles.userRole}>Super Administrator</Text>
              </View>
            </View>
            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    height: '100%',
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  logoTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  logoTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  logoSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  navScroll: {
    flex: 1,
  },
  navContent: {
    padding: 16,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: '#fff',
  },
  navLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  navLabelActive: {
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  userRole: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
