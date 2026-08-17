import React from 'react';
import { StyleSheet, View } from 'react-native';
import VidyaAIView from './VidyaAIView';

export default function AITabView({ chatEnabled: _chatEnabled = true }: { chatEnabled?: boolean }) {
  return (
    <View style={styles.wrap}>
      <VidyaAIView />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
