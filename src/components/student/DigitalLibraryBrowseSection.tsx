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
import api from '../../services/api/api';
import { useSchoolProgram } from '../../hooks/useSchoolProgram';
import { prepareLibraryContents } from '../../lib/dedupe-library-content';
import { openDigitalLibraryType } from '../../lib/digital-library-nav';
import PremiumSectionHeader from './PremiumSectionHeader';
import { STUDENT, STUDENT_RADIUS, SUBJECT_COLORS } from '../../theme/student';
import { GLASS_ROW } from '../../theme/glass';
import GlassPanel from '../ui/GlassPanel';

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

  const cols = width < 380 ? 2 : 3;
  const tileWidth = cols === 2 ? '48%' : '31.5%';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingContent(true);
      try {
        const { data } = await api.get('/api/student/asli-prep-content');
        if (cancelled) return;
        setAllContent(prepareLibraryContents(data?.data || data || [], isAsliPrepExclusive));
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
          subtitle="Browse by type"
          icon="library-outline"
          accent={STUDENT.accent}
        />
      ) : null}

      {programLoading || isLoadingContent ? (
        <ActivityIndicator color={STUDENT.primary} style={styles.loader} />
      ) : (
        <View style={styles.grid}>
          {libraryTiles.map((tile, index) => {
            const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
            return (
              <TouchableOpacity
                key={tile.key}
                style={[styles.tileWrap, { width: tileWidth }]}
                activeOpacity={0.88}
                onPress={() => openDigitalLibraryType(tile.type, returnTo)}
                accessibilityRole="button"
                accessibilityLabel={tile.label}
              >
                <GlassPanel
                  tone="light"
                  radius={STUDENT_RADIUS.lg}
                  style={styles.tile}
                  contentStyle={styles.tileInner}
                >
                  <View style={[styles.tileIcon, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
                    <Ionicons
                      name={tile.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={color}
                    />
                  </View>
                  <Text style={[styles.tileLabel, dark && styles.tileLabelDark]} numberOfLines={2}>
                    {tile.label}
                  </Text>
                  <Text style={styles.tileCount}>{libraryCounts[tile.type] ?? 0} files</Text>
                </GlassPanel>
              </TouchableOpacity>
            );
          })}
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
    gap: 10,
  },
  tileWrap: {
    marginBottom: 2,
  },
  tile: {
    width: '100%',
  },
  tileInner: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 6,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: STUDENT.text,
    textAlign: 'center',
  },
  tileLabelDark: {
    color: STUDENT.text,
  },
  tileCount: {
    fontSize: 11,
    fontWeight: '600',
    color: STUDENT.textMuted,
    backgroundColor: GLASS_ROW.fillSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
