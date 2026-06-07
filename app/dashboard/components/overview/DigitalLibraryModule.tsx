import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import GlassCard from '../../../../src/components/student/GlassCard';
import PremiumSectionHeader from '../../../../src/components/student/PremiumSectionHeader';
import { useSchoolProgram } from '../../../../src/hooks/useSchoolProgram';
import { STUDENT, STUDENT_RADIUS } from '../../../../src/theme/student';

const TILE_COLORS: Record<string, string> = {
  TextBook: STUDENT.accent,
  Workbook: STUDENT.primary,
  Material: STUDENT.textSecondary,
  Video: STUDENT.primary,
  Audio: STUDENT.warning,
  Homework: STUDENT.danger,
};

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
  const { libraryTiles, loading } = useSchoolProgram();
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
      {loading ? (
        <ActivityIndicator color={STUDENT.primary} style={{ marginVertical: 16 }} />
      ) : (
        <View style={styles.grid}>
          {libraryTiles.map((item) => {
            const color = TILE_COLORS[item.type] || STUDENT.accent;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.card, { width: cardWidth }]}
                onPress={() => openLibraryType(item.type)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[`${color}33`, `${color}18`]} style={styles.iconWrap}>
                  <Ionicons name={item.icon as any} size={16} color={color} />
                </LinearGradient>
                <Text style={[styles.cardText, dark && styles.cardTextDark]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
