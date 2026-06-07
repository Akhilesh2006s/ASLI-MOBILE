import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import teacherService from '../../../src/services/api/teacherService';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import { SubNavChips, TeacherShimmer } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING } from '../../../src/theme/teacher';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import { filterContentsBySchoolProgram } from '../../../src/lib/school-program';

type ContentItem = {
  _id: string;
  title: string;
  description?: string;
  type: string;
  fileUrl?: string;
  fileUrls?: string[];
  date?: string;
  deadline?: string;
  classNumber?: string;
};

export default function TeacherSubjectContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAsliPrepExclusive } = useSchoolProgram();
  const [subject, setSubject] = useState<any>(null);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [preview, setPreview] = useState<ContentItem | null>(null);

  useEffect(() => {
    if (id) load(String(id));
  }, [id, isAsliPrepExclusive]);

  const load = async (subjectId: string) => {
    setLoading(true);
    try {
      const [subRes, contentRes, classRes] = await Promise.all([
        teacherService.subject(subjectId),
        teacherService.asliPrepContent({ subject: subjectId }),
        teacherService.classes(),
      ]);
      const subData = subRes.data?.subject ?? subRes.data;
      setSubject(subData || { _id: subjectId, name: 'Subject' });
      const raw = Array.isArray(contentRes.data) ? contentRes.data : [];
      setContents(filterContentsBySchoolProgram(raw, isAsliPrepExclusive));
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);
    } catch {
      setSubject({ _id: subjectId, name: 'Subject' });
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const classOptions = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => c.classNumber && set.add(String(c.classNumber)));
    contents.forEach((c) => c.classNumber && set.add(String(c.classNumber)));
    return Array.from(set).sort();
  }, [classes, contents]);

  const typeChips = useMemo(() => {
    const types = Array.from(new Set(contents.map((c) => c.type))).sort();
    return [{ id: 'all', label: 'All' }, ...types.map((t) => ({ id: t, label: t }))];
  }, [contents]);

  const filtered = useMemo(() => {
    return contents.filter((c) => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (classFilter && String(c.classNumber) !== classFilter) return false;
      return true;
    });
  }, [contents, typeFilter, classFilter]);

  const openContent = (item: ContentItem) => {
    const url = item.fileUrls?.[0] || item.fileUrl;
    if (url) {
      openContentPreview(router, item);
    } else {
      setPreview(item);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <TeacherShimmer variant="list" count={4} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={TEACHER.text} />
        </Pressable>
        <View style={styles.topText}>
          <Text style={styles.title}>{subject?.name || 'Subject'}</Text>
          <Text style={styles.sub}>{filtered.length} items</Text>
        </View>
      </View>

      {classOptions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.classFilterScroll}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            style={[styles.chip, !classFilter && styles.chipActive]}
            onPress={() => setClassFilter(null)}
          >
            <Text style={[styles.chipText, !classFilter && styles.chipTextActive]}>All Classes</Text>
          </Pressable>
          {classOptions.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, classFilter === c && styles.chipActive]}
              onPress={() => setClassFilter(c)}
            >
              <Text style={[styles.chipText, classFilter === c && styles.chipTextActive]}>Class {c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <SubNavChips
        items={typeChips}
        active={typeFilter || 'all'}
        onChange={(t) => setTypeFilter(t === 'all' ? null : t)}
      />

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => (
          <Pressable key={item._id} style={styles.item} onPress={() => openContent(item)}>
            <View style={styles.itemIcon}>
              <Ionicons
                name={item.type === 'Video' ? 'play-circle' : 'document-text'}
                size={20}
                color={TEACHER.primaryLight}
              />
            </View>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemMeta}>
                {item.type}
                {item.classNumber ? ` · Class ${item.classNumber}` : ''}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={TEACHER.textMuted} />
          </Pressable>
        ))}
        {!filtered.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No content for selected filters</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{preview?.title}</Text>
            <Text style={styles.modalMeta}>{preview?.type}</Text>
            {preview?.description ? <Text style={styles.modalDesc}>{preview.description}</Text> : null}
            <Pressable style={styles.modalClose} onPress={() => setPreview(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: TEACHER.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TEACHER_SPACING.lg,
    gap: TEACHER_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  backBtn: { padding: 4 },
  topText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: TEACHER.text },
  sub: { fontSize: 13, color: TEACHER.textMuted, marginTop: 2 },
  classFilterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 48,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TEACHER_SPACING.lg,
    gap: 8,
    paddingVertical: TEACHER_SPACING.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  chipActive: { backgroundColor: TEACHER.navActiveBg, borderColor: TEACHER.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: TEACHER.textMuted },
  chipTextActive: { color: TEACHER.primaryLight },
  listScroll: { flex: 1 },
  list: { padding: TEACHER_SPACING.lg, paddingBottom: 120 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
    backgroundColor: TEACHER.surface,
    borderRadius: TEACHER_RADIUS.lg,
    padding: TEACHER_SPACING.md,
    marginBottom: TEACHER_SPACING.sm,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: TEACHER.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: TEACHER.text },
  itemMeta: { fontSize: 12, color: TEACHER.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: TEACHER.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: TEACHER.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: TEACHER_SPACING.xxl,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEACHER.text },
  modalMeta: { fontSize: 13, color: TEACHER.textMuted, marginTop: 4 },
  modalDesc: { fontSize: 14, color: TEACHER.textSecondary, marginTop: 12, lineHeight: 20 },
  modalClose: { alignItems: 'center', marginTop: TEACHER_SPACING.xl },
  modalCloseText: { color: TEACHER.primaryLight, fontWeight: '700' },
});
