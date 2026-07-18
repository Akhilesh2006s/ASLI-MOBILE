import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useCurriculumCascade } from '../../../src/hooks/useCurriculumCascade';
import {
  deleteBookKnowledgeBook,
  fetchBookKnowledgeBooks,
  fetchImportableContent,
  importBookFromContent,
  importBooksFromContentBulk,
  reindexBookKnowledgeBook,
  uploadBookKnowledgePdf,
  type BookRow,
  type ImportableContentRow,
} from '../../../src/lib/book-knowledge';
import { fetchGeneratorBoardOptions } from '../../../src/lib/ai-generator';

type Props = {
  onOpenBookBasedGenerator?: () => void;
};

function statusLabel(status?: string, indexed?: boolean) {
  if (indexed || status === 'indexed') return 'Ready';
  if (status === 'processing') return 'Indexing…';
  if (status === 'needs_ocr') return 'Needs OCR';
  if (status === 'failed') return 'Failed';
  return 'Pending';
}

export default function BookKnowledgeBaseView({ onOpenBookBasedGenerator }: Props) {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [importable, setImportable] = useState<ImportableContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [board, setBoard] = useState('CBSE');
  const [boardOptions, setBoardOptions] = useState<string[]>(['CBSE']);
  const [classLabel, setClassLabel] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [showImported, setShowImported] = useState(false);

  const { classOptions, subjects, topics, subtopics, loadingClasses, loadingSubjects, loadingTopics, loadingSubtopics } =
    useCurriculumCascade(classLabel || undefined, subject || undefined, topic || undefined, board || undefined);

  const pendingImportable = useMemo(() => importable.filter((r) => !r.imported), [importable]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [bookRows, importRows] = await Promise.all([fetchBookKnowledgeBooks(), fetchImportableContent()]);
      setBooks(bookRows);
      setImportable(importRows);
    } catch (err: any) {
      Alert.alert('Load failed', err?.message || 'Could not load book knowledge data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
    void fetchGeneratorBoardOptions().then((boards) => {
      if (boards.length) {
        setBoardOptions(boards);
        setBoard((prev) => (boards.includes(prev) ? prev : boards[0]));
      }
    });
  }, [loadAll]);

  const handleImportOne = async (contentId: string) => {
    setImportingIds((prev) => new Set(prev).add(contentId));
    try {
      await importBookFromContent(contentId);
      await loadAll();
      Alert.alert('Imported', 'Book linked and indexing started.');
    } catch (err: any) {
      Alert.alert('Import failed', err?.message || 'Could not import content.');
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(contentId);
        return next;
      });
    }
  };

  const handleBulkImport = async () => {
    const ids = [...selectedImportIds];
    if (!ids.length) {
      Alert.alert('Select items', 'Choose at least one content item to import.');
      return;
    }
    setImportLoading(true);
    try {
      const result = await importBooksFromContentBulk(ids);
      setSelectedImportIds(new Set());
      await loadAll();
      Alert.alert('Bulk import', result.message || 'Import complete.');
    } catch (err: any) {
      Alert.alert('Bulk import failed', err?.message || 'Could not import.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !board || !classLabel || !subject) {
      Alert.alert('Missing fields', 'Title, board, class, and subject are required.');
      return;
    }
    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('board', board);
      formData.append('class', classLabel);
      formData.append('subject', subject);
      if (topic) formData.append('topic', topic);
      if (subTopic) formData.append('subtopic', subTopic);
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'book.pdf',
        type: asset.mimeType || 'application/pdf',
      } as any);
      await uploadBookKnowledgePdf(formData);
      setTitle('');
      await loadAll();
      Alert.alert('Uploaded', 'Book uploaded and indexing started.');
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not upload book.');
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (id: string) => {
    setReindexingId(id);
    try {
      await reindexBookKnowledgeBook(id);
      await loadAll();
      Alert.alert('Reindexed', 'Book indexing completed.');
    } catch (err: any) {
      Alert.alert('Reindex failed', err?.message || 'Could not reindex.');
    } finally {
      setReindexingId(null);
    }
  };

  const handleDelete = (book: BookRow) => {
    Alert.alert('Delete book', `Remove "${book.title}" from knowledge base?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(book._id);
          try {
            await deleteBookKnowledgeBook(book._id);
            await loadAll();
          } catch (err: any) {
            Alert.alert('Delete failed', err?.message || 'Could not delete.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const visibleImportRows = importable.filter((row) => (showImported ? true : !row.imported));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadAll()} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Book Knowledge Base</Text>
        <Text style={styles.heroSub}>
          Import from Subject & Content or upload a new PDF. Indexed books power Book-Based Generator.
        </Text>
        {onOpenBookBasedGenerator ? (
          <Pressable style={styles.linkBtn} onPress={onOpenBookBasedGenerator}>
            <Ionicons name="sparkles-outline" size={16} color="#6d28d9" />
            <Text style={styles.linkBtnText}>Open Book-Based Generator</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Books</Text>
          <Text style={styles.statValue}>{books.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Indexed</Text>
          <Text style={styles.statValue}>{books.filter((b) => b.processingStatus === 'indexed').length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>To import</Text>
          <Text style={styles.statValue}>{pendingImportable.length}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Import from Content</Text>
        <View style={styles.rowBetween}>
          <Pressable onPress={() => setShowImported((v) => !v)}>
            <Text style={styles.toggleText}>{showImported ? 'Hide linked' : 'Show linked'}</Text>
          </Pressable>
          {selectedImportIds.size > 0 ? (
            <Pressable style={styles.emeraldBtn} onPress={() => void handleBulkImport()} disabled={importLoading}>
              {importLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.emeraldBtnText}>Import selected ({selectedImportIds.size})</Text>}
            </Pressable>
          ) : null}
        </View>
        {importLoading ? <ActivityIndicator style={{ marginVertical: 12 }} color="#059669" /> : null}
        {visibleImportRows.length === 0 ? (
          <Text style={styles.emptyText}>No importable content found.</Text>
        ) : (
          visibleImportRows.slice(0, 40).map((row) => (
            <View key={row.contentId} style={styles.card}>
              <View style={styles.cardTop}>
                {!row.imported ? (
                  <Pressable
                    onPress={() =>
                      setSelectedImportIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(row.contentId)) next.delete(row.contentId);
                        else next.add(row.contentId);
                        return next;
                      })
                    }
                  >
                    <Ionicons
                      name={selectedImportIds.has(row.contentId) ? 'checkbox' : 'square-outline'}
                      size={20}
                      color="#059669"
                    />
                  </Pressable>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{row.title}</Text>
                  <Text style={styles.cardMeta}>
                    {row.type} · {row.board} · Class {row.classNumber || '—'} · {row.subjectName}
                  </Text>
                </View>
              </View>
              {row.imported ? (
                <Text style={styles.badgeReady}>Linked · {row.bookStatus || 'indexed'}</Text>
              ) : (
                <Pressable
                  style={styles.emeraldBtnSmall}
                  onPress={() => void handleImportOne(row.contentId)}
                  disabled={importingIds.has(row.contentId)}
                >
                  {importingIds.has(row.contentId) ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.emeraldBtnText}>Import</Text>
                  )}
                </Pressable>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload New Book</Text>
        <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
        <Text style={styles.fieldLabel}>Board</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {boardOptions.map((b) => (
            <Pressable key={b} style={[styles.chip, board === b && styles.chipActive]} onPress={() => setBoard(b)}>
              <Text style={[styles.chipText, board === b && styles.chipTextActive]}>{b}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Class</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {(loadingClasses ? [] : classOptions).map((c) => (
            <Pressable key={c} style={[styles.chip, classLabel === c && styles.chipActive]} onPress={() => setClassLabel(c)}>
              <Text style={[styles.chipText, classLabel === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {(loadingSubjects ? [] : subjects).map((s) => (
            <Pressable key={s} style={[styles.chip, subject === s && styles.chipActive]} onPress={() => setSubject(s)}>
              <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {subject ? (
          <>
            <Text style={styles.fieldLabel}>Topic (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {(loadingTopics ? [] : topics).map((t) => (
                <Pressable key={t} style={[styles.chip, topic === t && styles.chipActive]} onPress={() => setTopic(t)}>
                  <Text style={[styles.chipText, topic === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
        {topic ? (
          <>
            <Text style={styles.fieldLabel}>Sub Topic (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {(loadingSubtopics ? [] : subtopics).map((st) => (
                <Pressable key={st} style={[styles.chip, subTopic === st && styles.chipActive]} onPress={() => setSubTopic(st)}>
                  <Text style={[styles.chipText, subTopic === st && styles.chipTextActive]}>{st}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
        <Pressable style={styles.violetBtn} onPress={() => void handleUpload()} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.violetBtnText}>Pick PDF & Upload</Text>}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Indexed Books</Text>
        {books.length === 0 ? (
          <Text style={styles.emptyText}>No books yet.</Text>
        ) : (
          books.map((book) => (
            <View key={book._id} style={styles.card}>
              <Text style={styles.cardTitle}>{book.title}</Text>
              <Text style={styles.cardMeta}>
                {book.board} · {book.class} · {book.subject}
                {book.chunkCount ? ` · ${book.chunkCount} chunks` : ''}
              </Text>
              <Text style={book.processingStatus === 'indexed' ? styles.badgeReady : styles.badgePending}>
                {statusLabel(book.processingStatus, book.embeddingsCreated)}
              </Text>
              <View style={styles.cardActions}>
                <Pressable style={styles.actionBtn} onPress={() => void handleReindex(book._id)} disabled={reindexingId === book._id}>
                  <Text style={styles.actionBtnText}>{reindexingId === book._id ? '…' : 'Reindex'}</Text>
                </Pressable>
                <Pressable style={styles.actionBtnDanger} onPress={() => handleDelete(book)} disabled={deletingId === book._id}>
                  <Text style={styles.actionBtnDangerText}>{deletingId === book._id ? '…' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  hero: { gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  heroSub: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  linkBtnText: { color: '#6d28d9', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  toggleText: { color: '#059669', fontWeight: '600', fontSize: 13 },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, gap: 8 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badgeReady: { fontSize: 11, fontWeight: '700', color: '#047857' },
  badgePending: { fontSize: 11, fontWeight: '700', color: '#b45309' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eff6ff' },
  actionBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  actionBtnDanger: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
  actionBtnDangerText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipRow: { flexGrow: 0 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#ede9fe', borderColor: '#8b5cf6' },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#5b21b6' },
  violetBtn: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  violetBtnText: { color: '#fff', fontWeight: '700' },
  emeraldBtn: { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  emeraldBtnSmall: { alignSelf: 'flex-start', backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  emeraldBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
