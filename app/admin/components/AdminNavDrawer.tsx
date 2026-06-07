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
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AdminNavView =
  | 'overview'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'subjects'
  | 'exams'
  | 'learning-paths'
  | 'eduott'
  | 'timetable'
  | 'calendar'
  | 'vidya-ai';

type NavItem = {
  id: AdminNavView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: 'bar-chart-outline' },
  { id: 'students', label: 'Students', icon: 'people-outline' },
  { id: 'classes', label: 'Classes', icon: 'school-outline' },
  { id: 'teachers', label: 'Teachers', icon: 'person-circle-outline' },
  { id: 'subjects', label: 'Subjects', icon: 'book-outline' },
  { id: 'exams', label: 'Exams', icon: 'document-text-outline' },
  { id: 'learning-paths', label: 'Learning Paths', icon: 'locate-outline' },
  { id: 'eduott', label: 'EduOTT', icon: 'play-outline' },
  { id: 'timetable', label: 'Timetable', icon: 'calendar-number-outline' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar-outline' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline' },
];

export function adminNavLabel(view: AdminNavView): string {
  return ADMIN_NAV_ITEMS.find((item) => item.id === view)?.label ?? 'Dashboard';
}

type Props = {
  visible: boolean;
  activeView: AdminNavView;
  userName: string;
  onClose: () => void;
  onSelect: (view: AdminNavView) => void;
  onLogout: () => void;
};

export default function AdminNavDrawer({
  visible,
  activeView,
  userName,
  onClose,
  onSelect,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.82, 320);
  const translateX = useSharedValue(-drawerWidth);

  useEffect(() => {
    translateX.value = withTiming(visible ? 0 : -drawerWidth, { duration: 260 });
  }, [visible, drawerWidth, translateX]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.drawer, { width: drawerWidth, paddingTop: insets.top }, drawerStyle]}>
          <LinearGradient
            colors={['#fb923c', '#f97316']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.logoSection}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>AS</Text>
            </View>
            <View style={styles.logoTextWrap}>
              <Text style={styles.logoTitle}>ASLILEARN AI</Text>
              <Text style={styles.logoSubtitle}>Admin Panel</Text>
            </View>
          </View>

          <ScrollView
            style={styles.navScroll}
            contentContainerStyle={styles.navContent}
            showsVerticalScrollIndicator={false}
          >
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                  onPress={() => onSelect(item.id)}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isActive ? '#ea580c' : '#fff'}
                  />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
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
                <Text style={styles.userRole}>Administrator</Text>
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
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.25)',
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  navLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#ea580c',
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
