import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { filterVisibleStudentTools, type StudentAiTool } from '../../../src/lib/student-ai-tools';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';
import GlassCard from '../../../src/components/student/GlassCard';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import {
  STUDENT,
  STUDENT_ANIMATION,
  STUDENT_RADIUS,
  STUDENT_SPACING,
  STUDENT_TYPO,
} from '../../../src/theme/student';

const GRID_H_PAD = 36;
const GRID_GAP = STUDENT_SPACING.md;

export default function VidyaAIView() {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const isTablet = width >= 768;
  const columns = isTablet ? 3 : 2;
  const cardWidth = (width - GRID_H_PAD - GRID_GAP * (columns - 1)) / columns;
  const cardHeight = compact ? 178 : 192;
  const [subjectNames, setSubjectNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.data || data.subjects || data || [];
          const names = (Array.isArray(list) ? list : [])
            .map((s: any) => (typeof s === 'object' ? s.name || '' : String(s)))
            .filter(Boolean);
          setSubjectNames(names);
        }
      } catch {
        /* optional */
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const visibleTools = useMemo(() => filterVisibleStudentTools(subjectNames), [subjectNames]);

  const openTool = (tool: StudentAiTool) => {
    if (tool.id === 'ai-chat') {
      router.push('/ai-tutor');
      return;
    }
    router.push(`/student/tools/${tool.id}` as any);
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)} style={styles.vidyaHeader}>
        <VidyaAvatar size={44} borderColor="#c7d2fe" />
        <View style={styles.vidyaHeaderText}>
          <Text style={[styles.vidyaTitle, compact && { fontSize: 20 }]}>Vidya AI</Text>
          <Text style={styles.vidyaSubtitle}>Your AI study buddy — tools & chat</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(40)}>
        <Text style={[styles.headerTitle, compact && { fontSize: 22 }]}>AI Tools</Text>
        <Text style={styles.headerSubtitle}>Tap a tool to generate study content instantly</Text>
      </Animated.View>

      {isLoading ? (
        <View style={styles.shimmerGrid}>
          <ShimmerCard style={{ width: cardWidth, height: cardHeight }} />
          <ShimmerCard style={{ width: cardWidth, height: cardHeight }} />
          <ShimmerCard style={{ width: cardWidth, height: cardHeight }} />
          <ShimmerCard style={{ width: cardWidth, height: cardHeight }} />
        </View>
      ) : (
        <View style={styles.toolsGrid}>
          {visibleTools.map((tool, index) => (
            <Animated.View
              key={tool.id}
              entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(80 + index * 45)}
              style={[styles.toolCell, { width: cardWidth, height: cardHeight }]}
            >
              <GlassCard
                variant="elevated"
                padding={compact ? 14 : 16}
                style={styles.toolCard}
                onPress={() => openTool(tool)}
              >
                <View style={styles.toolCardBody}>
                  <View style={[styles.toolTint, { backgroundColor: `${tool.color}08` }]} />
                  <View style={styles.toolBadgeRow}>
                    <View style={[styles.toolIconContainer, { backgroundColor: `${tool.color}22` }]}>
                      <Ionicons
                        name={tool.icon as keyof typeof Ionicons.glyphMap}
                        size={22}
                        color={tool.color}
                      />
                    </View>
                    <View style={styles.aiPoweredBadge}>
                      <Ionicons name="sparkles" size={10} color={STUDENT.accent} />
                      <Text style={styles.aiPoweredText}>AI</Text>
                    </View>
                  </View>
                  <View style={styles.toolTextBlock}>
                    <Text style={styles.toolTitle} numberOfLines={2}>
                      {tool.name}
                    </Text>
                    <Text style={styles.toolDescription} numberOfLines={2}>
                      {tool.description}
                    </Text>
                  </View>
                  <View style={styles.toolFooter}>
                    <Text style={[styles.toolLink, { color: tool.color }]}>Open</Text>
                    <Ionicons name="arrow-forward" size={14} color={tool.color} />
                  </View>
                </View>
              </GlassCard>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  vidyaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: STUDENT_SPACING.lg,
  },
  vidyaHeaderText: { flex: 1, minWidth: 0 },
  vidyaTitle: {
    ...STUDENT_TYPO.section,
    color: STUDENT.text,
  },
  vidyaSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: STUDENT.textMuted,
    lineHeight: 18,
  },
  headerTitle: {
    ...STUDENT_TYPO.section,
    color: STUDENT.text,
  },
  headerSubtitle: {
    marginTop: 4,
    marginBottom: STUDENT_SPACING.lg,
    fontSize: 13,
    color: STUDENT.textMuted,
    lineHeight: 18,
  },
  shimmerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    alignItems: 'stretch',
    paddingBottom: STUDENT_SPACING.md,
  },
  toolCell: {
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  toolCard: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
  },
  toolCardBody: {
    flex: 1,
    minHeight: '100%',
    justifyContent: 'space-between',
  },
  toolTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: STUDENT_RADIUS.card,
  },
  toolBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  toolTextBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  toolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: STUDENT_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiPoweredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: STUDENT.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: STUDENT_RADIUS.full,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
  },
  aiPoweredText: { fontSize: 10, fontWeight: '800', color: STUDENT.accent },
  toolTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: STUDENT.text,
    marginBottom: 4,
    lineHeight: 20,
    height: 40,
  },
  toolDescription: {
    fontSize: 12,
    color: STUDENT.textMuted,
    lineHeight: 18,
    height: 36,
  },
  toolFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
    paddingTop: 4,
  },
  toolLink: { fontSize: 12, fontWeight: '700' },
});
