import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VidyaSubjectSelectOption } from '../../types/vidya';

type SubjectPickerModalProps = {
  visible: boolean;
  subjects: string[];
  groupedOptions?: VidyaSubjectSelectOption[];
  selected: string;
  onSelect: (subject: string) => void;
  onClose: () => void;
  accentColor?: string;
};

const GROUP_LABEL: Record<VidyaSubjectSelectOption['group'], string> = {
  CBSE: 'CBSE',
  IIT: 'IIT / NEET',
  Other: 'Other',
};

export default function SubjectPickerModal({
  visible,
  subjects,
  groupedOptions,
  selected,
  onSelect,
  onClose,
  accentColor = '#3b82f6',
}: SubjectPickerModalProps) {
  const groups = groupedOptions && groupedOptions.length > 0
    ? (['CBSE', 'IIT', 'Other'] as const)
        .map((group) => ({
          group,
          rows: groupedOptions.filter((row) => row.group === group),
        }))
        .filter((block) => block.rows.length > 0)
    : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close subject picker"
      >
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
        >
          <Text style={styles.title}>Teach using subject</Text>
          <Text style={styles.hint}>
            Subjects are grouped as CBSE and IIT / NEET. Vidya keeps lessons inside the selected
            subject.
          </Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {groups
              ? groups.map((block) => (
                  <View key={block.group} style={styles.groupBlock}>
                    <Text style={styles.groupLabel}>{GROUP_LABEL[block.group]}</Text>
                    {block.rows.map((row) => {
                      const active = row.value === selected;
                      return (
                        <Pressable
                          key={`${block.group}:${row.value}`}
                          style={[
                            styles.row,
                            active && { borderColor: accentColor, backgroundColor: `${accentColor}14` },
                          ]}
                          onPress={() => {
                            onSelect(row.value);
                            onClose();
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={row.label}
                          accessibilityState={{ selected: active }}
                        >
                          <Text
                            style={[styles.rowText, active && { color: accentColor, fontWeight: '700' }]}
                          >
                            {row.label}
                          </Text>
                          {active ? <Ionicons name="checkmark-circle" size={18} color={accentColor} /> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ))
              : subjects.map((subject) => {
                  const active = subject === selected;
                  return (
                    <Pressable
                      key={subject}
                      style={[
                        styles.row,
                        active && { borderColor: accentColor, backgroundColor: `${accentColor}14` },
                      ]}
                      onPress={() => {
                        onSelect(subject);
                        onClose();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={subject}
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.rowText, active && { color: accentColor, fontWeight: '700' }]}>
                        {subject}
                      </Text>
                      {active ? <Ionicons name="checkmark-circle" size={18} color={accentColor} /> : null}
                    </Pressable>
                  );
                })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '55%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
  },
  groupBlock: {
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  rowText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
});
