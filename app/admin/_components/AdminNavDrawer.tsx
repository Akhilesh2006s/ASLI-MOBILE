import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAdminTheme } from '../_ui/useAdminTheme';
import AdminNavPanel from './AdminNavPanel';

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
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
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
              borderRightColor: colors.drawerBorder,
            },
            drawerStyle,
          ]}
        >
          <AdminNavPanel
            activeView={activeView}
            userName={userName}
            onSelect={onSelect}
            onLogout={onLogout}
          />
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
});
