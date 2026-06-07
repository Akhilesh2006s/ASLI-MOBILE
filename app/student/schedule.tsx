import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScheduleView from '../dashboard/components/ScheduleView';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { STUDENT } from '../../src/theme/student';

export default function StudentScheduleScreen() {
  useBackNavigation('/dashboard', false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={STUDENT.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Study Schedule</Text>
        <TouchableOpacity onPress={() => router.push('/student/timetable')} style={styles.linkBtn}>
          <Text style={styles.linkText}>Timetable</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <ScheduleView />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: STUDENT.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: STUDENT.text },
  linkBtn: { padding: 4 },
  linkText: { fontSize: 13, fontWeight: '700', color: STUDENT.primary },
  body: { flex: 1, paddingHorizontal: 16 },
});
