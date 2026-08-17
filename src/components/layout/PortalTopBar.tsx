import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSchoolBranding } from '../../lib/school-branding';
import VidyaAvatar from '../vidya/VidyaAvatar';

type Props = {
  user?: any;
  onOpenMenu: () => void;
  onLogout: () => void;
  /** When set, shows a compact Vidya chat control in the header actions. */
  onOpenChat?: () => void;
  chatAccessibilityLabel?: string;
};

export default function PortalTopBar({
  user,
  onOpenMenu,
  onLogout,
  onOpenChat,
  chatAccessibilityLabel = 'Open Vidya AI Chat',
}: Props) {
  const branding = getSchoolBranding(user);
  const schoolName = branding?.schoolName || 'AsliLearn AI';

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.school}>
        <View style={styles.logoWrap}>
          {branding?.schoolLogo ? (
            <Image
              source={{ uri: branding.schoolLogo }}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel={`${schoolName} logo`}
            />
          ) : (
            <Ionicons name="school-outline" size={18} color="#ea580c" />
          )}
        </View>
        <Text style={styles.schoolName} numberOfLines={1}>
          {schoolName}
        </Text>
      </View>

      <View style={styles.actions}>
        {onOpenChat ? (
          <Pressable
            style={styles.chatBtn}
            onPress={onOpenChat}
            accessibilityLabel={chatAccessibilityLabel}
            accessibilityRole="button"
          >
            <VidyaAvatar size={28} borderColor="#c7d2fe" />
            <Text style={styles.chatBtnText} numberOfLines={1}>
              Chat
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.iconBtn}
          onPress={onOpenMenu}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={22} color="#0f172a" />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={onLogout}
          accessibilityLabel="Log out"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color="#0f172a" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  school: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 26, height: 26 },
  schoolName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(199,210,254,0.95)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#312e81',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
