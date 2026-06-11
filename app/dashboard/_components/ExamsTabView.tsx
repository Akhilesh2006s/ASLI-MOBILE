import React from 'react';
import { StyleSheet, View } from 'react-native';
import { STUDENT, STUDENT_SPACING } from '../../../src/theme/student';
import ExamsView from './ExamsView';

type ExamsTabViewProps = {
  focusExamId?: string | null;
  onFocusExamHandled?: () => void;
};

export default function ExamsTabView({ focusExamId, onFocusExamHandled }: ExamsTabViewProps) {
  return (
    <View style={styles.wrap}>
      <ExamsView
        initialTab="available"
        focusExamId={focusExamId}
        onFocusExamHandled={onFocusExamHandled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: STUDENT.bg,
    paddingHorizontal: STUDENT_SPACING.lg,
    paddingTop: STUDENT_SPACING.sm,
  },
});
