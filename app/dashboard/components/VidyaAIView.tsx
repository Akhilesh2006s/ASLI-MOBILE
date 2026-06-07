import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { filterVisibleStudentTools, type StudentAiTool } from '../../../src/lib/student-ai-tools';
import { STUDENT, STUDENT_ANIMATION, STUDENT_RADIUS } from '../../../src/theme/student';

export default function VidyaAIView() {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const isTablet = width >= 768;
  const cardWidth = isTablet ? '31.5%' : '48%';
  const [subjectNames, setSubjectNames] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
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
      <Animated.View entering={FadeInDown.duration(STUDENT_ANIMATION.normal)}>
        <Text style={[styles.headerTitle, compact && { fontSize: 22 }]}>AI Tools</Text>
        <Text style={styles.headerSubtitle}>Tap a tool to generate study content instantly</Text>
      </Animated.View>

      <View style={styles.toolsGrid}>
        {visibleTools.map((tool, index) => (
          <Animated.View
            key={tool.id}
            entering={FadeInDown.duration(STUDENT_ANIMATION.normal).delay(80 + index * 45)}
            style={{ width: cardWidth }}
          >
            <TouchableOpacity
              style={[styles.toolCard, compact && { minHeight: 148, padding: 14 }]}
              onPress={() => openTool(tool)}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[`${tool.color}14`, `${tool.color}06`]}
                style={styles.toolGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.toolBadgeRow}>
                <View style={[styles.toolIconContainer, { backgroundColor: `${tool.color}22` }]}>
                  <Ionicons
                    name={tool.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={tool.color}
                  />
                </View>
                <View style={styles.aiPoweredBadge}>
                  <Ionicons name="sparkles" size={10} color="#0369a1" />
                  <Text style={styles.aiPoweredText}>AI</Text>
                </View>
              </View>
              <Text style={styles.toolTitle} numberOfLines={2}>
                {tool.name}
              </Text>
              <Text style={styles.toolDescription} numberOfLines={3}>
                {tool.description}
              </Text>
              <View style={styles.toolFooter}>
                <Text style={[styles.toolLink, { color: tool.color }]}>Open</Text>
                <Ionicons name="arrow-forward" size={14} color={tool.color} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: STUDENT.text,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
    color: STUDENT.textMuted,
    lineHeight: 18,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 12,
  },
  toolCard: {
    backgroundColor: STUDENT.surface,
    borderRadius: STUDENT_RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    minHeight: 168,
    overflow: 'hidden',
    ...STUDENT.shadow.sm,
  },
  toolGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  toolBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  toolIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  aiPoweredText: { fontSize: 10, fontWeight: '800', color: '#0369a1' },
  toolTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: STUDENT.text,
    marginBottom: 6,
    lineHeight: 19,
  },
  toolDescription: {
    fontSize: 12,
    color: STUDENT.textMuted,
    lineHeight: 17,
    flex: 1,
  },
  toolFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  toolLink: { fontSize: 12, fontWeight: '700' },
});
