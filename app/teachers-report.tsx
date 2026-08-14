import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import TeacherDiaryFeed from '../src/components/student/TeacherDiaryFeed';
import StudentScreenHeader from '../src/components/student/StudentScreenHeader';

export default function TeachersReportScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StudentScreenHeader
        title="Teachers Report"
        subtitle="Daily class updates from teachers"
        onBack={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TeacherDiaryFeed showHeader={false} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
});
