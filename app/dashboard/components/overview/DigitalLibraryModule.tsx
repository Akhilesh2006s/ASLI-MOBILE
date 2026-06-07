import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import GlassCard from '../../../../src/components/student/GlassCard';
import PremiumSectionHeader from '../../../../src/components/student/PremiumSectionHeader';
import { STUDENT, STUDENT_RADIUS } from '../../../../src/theme/student';

const LIBRARY_ITEMS = [
  { title: 'TextBook', type: 'TextBook', icon: 'book-outline' as const, color: STUDENT.accent },
  { title: 'Workbook', type: 'Workbook', icon: 'document-text-outline' as const, color: STUDENT.primary },
  { title: 'Material', type: 'Material', icon: 'document-outline' as const, color: STUDENT.textSecondary },
  { title: 'Video', type: 'Video', icon: 'videocam-outline' as const, color: STUDENT.primary },
  { title: 'Audio', type: 'Audio', icon: 'headset-outline' as const, color: STUDENT.warning },
  { title: 'Homework', type: 'Homework', icon: 'clipboard-outline' as const, color: STUDENT.danger },
];

function openLibraryType(type: string) {
  if (type === 'Homework') {
    router.push('/assignments');
    return;
  }
  router.push({ pathname: '/asli-prep-content', params: { type } });
}

interface DigitalLibraryModuleProps {
  onPressLibrary?: () => void;
  dark?: boolean;
}

function DigitalLibraryModuleComponent({ dark }: DigitalLibraryModuleProps) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const cardWidth = compact ? '48.2%' : '31.6%';

  return (
    <GlassCard variant="elevated" padding={14}>
      <PremiumSectionHeader
        title="Digital Library"
        subtitle="Browse by Type"
        icon="library-outline"
        accent={STUDENT.accent}
      />
      <View style={styles.grid}>
        {LIBRARY_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.card, { width: cardWidth }]}
            onPress={() => openLibraryType(item.type)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[`${item.color}33`, `${item.color}18`]}
              style={styles.iconWrap}
            >
              <Ionicons name={item.icon} size={16} color={item.color} />
            </LinearGradient>
            <Text style={[styles.cardText, dark && styles.cardTextDark]}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.inner,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: STUDENT.surface,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 11,
    fontWeight: '600',
    color: STUDENT.text,
  },
  cardTextDark: {
    color: STUDENT.surfaceHover,
  },
});

export default memo(DigitalLibraryModuleComponent);
