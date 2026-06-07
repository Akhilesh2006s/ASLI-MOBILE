import { View, StyleSheet } from 'react-native';
import SuperAdminVidyaChatPanel from './SuperAdminVidyaChatPanel';

export default function VidyaAIView() {
  return (
    <View style={styles.root}>
      <SuperAdminVidyaChatPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingBottom: 8 },
});
