import React from 'react';
import { StyleSheet, View } from 'react-native';
import ExamsView from './ExamsView';

export default function ExamsTabView() {
  return (
    <View style={styles.wrap}>
      <ExamsView initialTab="available" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 0 },
});
