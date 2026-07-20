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
  // Transparent: the shared app background artwork shows through.
  root: { flex: 1, minHeight: 0, backgroundColor: 'transparent', paddingHorizontal: 16, paddingBottom: 8 },
});
