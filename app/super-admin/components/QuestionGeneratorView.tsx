import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';

interface Subject {
  _id: string;
  name: string;
}

export default function QuestionGeneratorView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    classNumber: '',
    subject: '',
    topic: '',
    questionCount: '10',
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setError('');
        const response = await api.get('/api/super-admin/subjects');
        const data = response?.data;
        setSubjects(data?.data || data?.subjects || []);
      } catch (err: any) {
        setError(err?.friendlyMessage || 'Failed to fetch subjects.');
        console.error('Failed to fetch subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  const generate = async () => {
    if (!formData.classNumber || !formData.subject || !formData.topic) return;
    setIsLoading(true);
    setResult('');
    setError('');
    try {
      const response = await api.post('/api/super-admin/iq-rank-activities/generate-questions', {
          classNumber: formData.classNumber,
          subject: formData.subject,
          topic: formData.topic,
          questionCount: parseInt(formData.questionCount || '10', 10),
      });
      const data = response?.data;
      const generated = data?.data || data?.questions || data;
      setResult(typeof generated === 'string' ? generated : JSON.stringify(generated, null, 2));
    } catch (err: any) {
      console.error('Failed to generate questions:', err);
      setError(err?.friendlyMessage || 'Generation failed. Please try again.');
      setResult('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Question Generator</Text>
        <Text style={styles.subtitle}>Generate IQ / Rank Boost questions for mobile learners</Text>
      </View>

      <View style={styles.form}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Text style={styles.label}>Class</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 8"
          value={formData.classNumber}
          onChangeText={(v) => setFormData((p) => ({ ...p, classNumber: v }))}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Subject</Text>
        <View style={styles.chips}>
          {subjects.slice(0, 8).map((s) => (
            <TouchableOpacity
              key={s._id}
              style={[styles.chip, formData.subject === s._id && styles.chipActive]}
              onPress={() => setFormData((p) => ({ ...p, subject: s._id }))}
            >
              <Text style={[styles.chipText, formData.subject === s._id && styles.chipTextActive]}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Topic</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Quadratic Equations"
          value={formData.topic}
          onChangeText={(v) => setFormData((p) => ({ ...p, topic: v }))}
        />

        <Text style={styles.label}>Question Count</Text>
        <TextInput
          style={styles.input}
          placeholder="10"
          value={formData.questionCount}
          onChangeText={(v) => setFormData((p) => ({ ...p, questionCount: v }))}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.btn} onPress={generate} disabled={isLoading}>
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={styles.btnText}>{isLoading ? 'Generating...' : 'Generate Questions'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.resultWrap}>
          <ActivityIndicator color="#f97316" />
        </View>
      ) : result ? (
        <View style={styles.resultWrap}>
          <Text style={styles.resultTitle}>Generated Output</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 4, color: '#6b7280' },
  form: { paddingHorizontal: 16, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  chipActive: { borderColor: '#f97316', backgroundColor: '#fff7ed' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#c2410c', fontWeight: '700' },
  btn: { marginTop: 12, backgroundColor: '#f97316', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  resultWrap: { margin: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12 },
  resultTitle: { fontWeight: '700', color: '#111827', marginBottom: 6 },
  resultText: { color: '#374151', fontSize: 12, lineHeight: 18 },
  errorText: { color: '#dc2626', fontSize: 12, marginBottom: 4 },
});
