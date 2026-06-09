import React, { useEffect, useState } from 'react';
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
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminTheme } from '../_ui/useAdminTheme';

export type AdminNavView =
  | 'overview'
  | 'analytics'
  | 'students'
  | 'classes'
  | 'teachers'
  | 'subjects'
  | 'exams'
  | 'assessments'
  | 'quizzes'
  | 'learning-paths'
  | 'eduott'
  | 'videos'
  | 'timetable'
  | 'calendar'
  | 'school-management'
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

const SLIDE_MS = 240;
const slideEasing = Easing.out(Easing.cubic);

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
  const { colors } = useAdminTheme();
  const drawerWidth = Math.min(width * 0.82, 320);
  const [mounted, setMounted] = useState(visible);
  const translateX = useSharedValue(-drawerWidth);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateX.value = -drawerWidth;
      backdropOpacity.value = 0;
      translateX.value = withTiming(0, { duration: SLIDE_MS, easing: slideEasing });
      backdropOpacity.value = withTiming(1, { duration: SLIDE_MS, easing: slideEasing });
      return;
    }

    if (!mounted) return;

    translateX.value = withTiming(-drawerWidth, { duration: SLIDE_MS, easing: slideEasing });
    backdropOpacity.value = withTiming(
      0,
      { duration: SLIDE_MS, easing: slideEasing },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      }
    );
  }, [visible, drawerWidth, mounted, translateX, backdropOpacity]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              paddingTop: insets.top,
              borderRightColor: colors.drawerBorder,
            },
            drawerStyle,
          ]}
        >
          <LinearGradient colors={[...colors.drawerGradient]} style={StyleSheet.absoluteFill} />

          <View style={[styles.logoSection, { borderBottomColor: colors.drawerBorder }]}>
            <View style={[styles.logoBadge, { backgroundColor: colors.drawerSurface }]}>
              <Text style={[styles.logoBadgeText, { color: colors.primary }]}>AS</Text>
            </View>
            <View style={styles.logoTextWrap}>
              <Text style={[styles.logoTitle, { color: colors.drawerText }]}>ASLILEARN AI</Text>
              <Text style={[styles.logoSubtitle, { color: colors.drawerTextMuted }]}>Admin Panel</Text>
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
                  style={[
                    styles.navItem,
                    isActive && [styles.navItemActive, { backgroundColor: colors.navActiveBg }],
                  ]}
                  onPress={() => onSelect(item.id)}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={isActive ? colors.navActiveText : colors.drawerText}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      { color: isActive ? colors.navActiveText : colors.drawerText },
                      isActive && styles.navLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: colors.drawerBorder },
            ]}
          >
            <View style={styles.userRow}>
              <View style={[styles.userAvatar, { backgroundColor: colors.drawerSurface }]}>
                <Ionicons name="person" size={16} color={colors.drawerText} />
              </View>
              <View style={styles.userTextWrap}>
                <Text style={[styles.userName, { color: colors.drawerText }]} numberOfLines={1}>
                  {userName}
                </Text>
                <Text style={[styles.userRole, { color: colors.drawerTextMuted }]}>Administrator</Text>
              </View>
            </View>
            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.drawerTextMuted} />
              <Text style={[styles.logoutText, { color: colors.drawerTextMuted }]}>Logout</Text>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontWeight: '800',
    fontSize: 18,
  },
  logoTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  logoTitle: {
    fontWeight: '800',
    fontSize: 16,
  },
  logoSubtitle: {
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
  navItemActive: {},
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  navLabelActive: {
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontWeight: '700',
    fontSize: 14,
  },
  userRole: {
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
    fontWeight: '600',
    fontSize: 14,
  },
});
