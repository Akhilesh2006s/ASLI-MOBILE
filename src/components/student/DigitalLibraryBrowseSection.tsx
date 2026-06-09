import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api/api';
import { useSchoolProgram } from '../../hooks/useSchoolProgram';
import { filterContentsBySchoolProgram } from '../../lib/school-program';
import { openDigitalLibraryType } from '../../lib/digital-library-nav';
import PremiumSectionHeader from './PremiumSectionHeader';
import { STUDENT, STUDENT_RADIUS, SUBJECT_COLORS } from '../../theme/student';

type Props = {
  returnTo?: 'learning';
  showHeader?: boolean;
  dark?: boolean;
};

export default function DigitalLibraryBrowseSection({
  returnTo = 'learning',
  showHeader = true,
  dark,
}: Props) {
  const { width } = useWindowDimensions();
  const { isAsliPrepExclusive, libraryTiles, loading: programLoading } = useSchoolProgram();
  const [allContent, setAllContent] = useState<{ type?: string }[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const tileWidth = width < 380 ? '48%' : '31.5%';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingContent(true);
      try {
        const { data } = await api.get('/api/student/asli-prep-content');
        if (cancelled) return;
        const rows = filterContentsBySchoolProgram(
          data?.data || data || [],
          isAsliPrepExclusive
        );
        setAllContent(Array.isArray(rows) ? rows : []);
      } catch (error) {
        console.error('Failed to load digital library counts:', error);
        if (!cancelled) setAllContent([]);
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAsliPrepExclusive]);

  const libraryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    libraryTiles.forEach((tile) => {
      counts[tile.type] = 0;
    });
    allContent.forEach((item) => {
      const t = item.type || 'Material';
      if (counts[t] != null) counts[t] += 1;
    });
    return counts;
  }, [allContent, libraryTiles]);

  return (
    <View style={styles.wrap}>
      {showHeader ? (
        <PremiumSectionHeader
          title="Digital Library"
          subtitle="Browse by Type"
          icon="library-outline"
          accent={STUDENT.accent}
        />
      ) : null}

      {programLoading || isLoadingContent ? (
        <ActivityIndicator color={STUDENT.primary} style={styles.loader} />
      ) : (
        <View style={styles.grid}>
          {libraryTiles.map((tile, index) => (
            <TouchableOpacity
              key={tile.key}
              style={[styles.tile, { width: tileWidth }]}
              activeOpacity={0.85}
              onPress={() => openDigitalLibraryType(tile.type, returnTo)}
            >
              <LinearGradient
                colors={[STUDENT.accent, SUBJECT_COLORS[index % SUBJECT_COLORS.length]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tileIcon}
              >
                <Ionicons
                  name={tile.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={STUDENT.textOnPrimary}
                />
              </LinearGradient>
              <Text style={[styles.tileLabel, dark && styles.tileLabelDark]}>{tile.label}</Text>
              <Text style={styles.tileCount}>{libraryCounts[tile.type] ?? 0} files</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  loader: {
    marginVertical: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  tile: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: STUDENT_RADIUS.inner,
    backgroundColor: STUDENT.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  tileIcon: {
    width: 52,
    height: 52,
    borderRadius: STUDENT_RADIUS.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.text,
    textAlign: 'center',
  },
  tileLabelDark: {
    color: STUDENT.surfaceHover,
  },
  tileCount: {
    marginTop: 4,
    fontSize: 11,
    color: STUDENT.textMuted,
  },
});
