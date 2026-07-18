import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminSearchBar,
  AdminStatCard,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminFAB,
  AdminModalShell,
  AdminScalePressable,
  useAdminTheme,
} from '../_ui';

interface AdminItem {
  id: string;
  name: string;
  email: string;
  board?: string;
  state?: string;
  schoolName?: string;
  status?: string;
  joinDate?: string;
  stats?: {
    students?: number;
    teachers?: number;
  };
}

const BOARD_OPTIONS = ['CBSE', 'SSC', 'ICSE', 'IB', 'Others'];
const STATE_OPTIONS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi',
];

export default function SchoolManagementView() {
  const { colors, spacing, radius } = useAdminTheme();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminItem | null>(null);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    board: '',
    state: '',
    schoolName: '',
    isActive: true,
  });

  const fetchAdmins = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch schools (${response.status})`);
      const data = await response.json();
      const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      setAdmins(list);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to fetch schools');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAdmins();
  }, [fetchAdmins]);

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter((admin) =>
      (admin.schoolName || '').toLowerCase().includes(q) ||
      (admin.name || '').toLowerCase().includes(q) ||
      (admin.email || '').toLowerCase().includes(q) ||
      (admin.board || '').toLowerCase().includes(q) ||
      (admin.state || '').toLowerCase().includes(q)
    );
  }, [admins, searchQuery]);

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      password: '',
      board: '',
      state: '',
      schoolName: '',
      isActive: true,
    });
    setEditingAdmin(null);
  };

  const openEdit = (admin: AdminItem) => {
    setEditingAdmin(admin);
    setForm({
      name: admin.name || '',
      email: admin.email || '',
      password: '',
      board: admin.board || '',
      state: admin.state || '',
      schoolName: admin.schoolName || '',
      isActive: (admin.status || '').toLowerCase() === 'active',
    });
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.board || !form.state || !form.schoolName) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          board: form.board,
          state: form.state,
          schoolName: form.schoolName,
          permissions: [],
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to add school');
      }
      setShowAddModal(false);
      resetForm();
      await fetchAdmins();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add school');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAdmin?.id) return;
    if (!form.name || !form.email || !form.board || !form.state || !form.schoolName) {
      Alert.alert('Required', 'Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          board: form.board,
          state: form.state,
          schoolName: form.schoolName,
          isActive: form.isActive,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || 'Failed to update school');
      }
      setShowEditModal(false);
      resetForm();
      await fetchAdmins();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update school');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    Alert.alert('Delete School', 'Delete this school and associated data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await SecureStore.getItemAsync('authToken');
            const response = await fetch(`${API_BASE_URL}/api/super-admin/admins/${adminId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            if (!response.ok) throw new Error('Failed to delete school');
            await fetchAdmins();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete school');
          }
        },
      },
    ]);
  };

  const totalStudents = admins.reduce((sum, a) => sum + (a.stats?.students || 0), 0);
  const totalTeachers = admins.reduce((sum, a) => sum + (a.stats?.teachers || 0), 0);

  const renderPicker = (title: string, options: string[], onSelect: (v: string) => void, onClose: () => void) => (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.pickerOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.pickerSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((option) => (
              <AdminScalePressable
                key={option}
                onPress={() => { onSelect(option); onClose(); }}
                style={[styles.pickerItem, { borderBottomColor: colors.surfaceBorder }]}
              >
                <Text style={[styles.pickerItemText, { color: colors.text }]}>{option}</Text>
              </AdminScalePressable>
            ))}
          </ScrollView>
          <AdminScalePressable
            onPress={onClose}
            style={[styles.cancelButton, { borderColor: colors.surfaceBorder, borderRadius: radius.sm }]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Close</Text>
          </AdminScalePressable>
        </View>
      </View>
    </Modal>
  );

  const inputStyle = [
    styles.input,
    { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg, borderRadius: radius.sm },
  ];

  if (isLoading && !refreshing) {
    return <AdminSkeletonList count={4} />;
  }

  return (
    <>
      <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
        <AdminSectionHeader
          icon="business"
          title="School Management"
          subtitle="Web content adapted for mobile"
        />

        <AdminSearchBar
          placeholder="Search by school, contact, email, board..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ marginBottom: spacing.md }}
        />

        <View style={styles.statsRow}>
          <View style={styles.statSlot}>
            <AdminStatCard label="Total Schools" value={admins.length} icon="business" gradientIndex={0} />
          </View>
          <View style={styles.statSlot}>
            <AdminStatCard label="Total Students" value={totalStudents} icon="people" gradientIndex={1} />
          </View>
        </View>
        <View style={{ marginBottom: spacing.md }}>
          <AdminStatCard label="Total Teachers" value={totalTeachers} icon="person" gradientIndex={2} />
        </View>

        {filteredAdmins.length === 0 ? (
          <AdminEmptyState icon="school-outline" title="No schools found" />
        ) : (
          filteredAdmins.map((admin, index) => (
            <AdminGlassCard key={admin.id} delay={index * 50} style={{ marginBottom: spacing.sm }}>
              <View style={styles.schoolHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.schoolName, { color: colors.text }]}>
                    {admin.schoolName || admin.name}
                  </Text>
                  <Text style={[styles.schoolMeta, { color: colors.textMuted }]}>{admin.name}</Text>
                  <Text style={[styles.schoolMeta, { color: colors.textMuted }]}>{admin.email}</Text>
                  <View style={styles.badgesRow}>
                    {!!admin.board && (
                      <Text style={[styles.badge, { backgroundColor: colors.primaryMuted, color: colors.primary }]}>
                        {admin.board}
                      </Text>
                    )}
                    {!!admin.state && (
                      <Text style={[styles.badge, { backgroundColor: colors.bgElevated, color: colors.textSecondary }]}>
                        {admin.state}
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.statusPill,
                    (admin.status || '').toLowerCase() === 'active'
                      ? { backgroundColor: colors.successMuted, color: colors.success }
                      : { backgroundColor: colors.dangerMuted, color: colors.danger },
                  ]}
                >
                  {admin.status || 'inactive'}
                </Text>
              </View>

              <View style={styles.miniStats}>
                <View style={[styles.miniStat, { backgroundColor: colors.bgElevated, borderRadius: radius.sm }]}>
                  <Text style={[styles.miniValue, { color: colors.text }]}>{admin.stats?.students || 0}</Text>
                  <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Students</Text>
                </View>
                <View style={[styles.miniStat, { backgroundColor: colors.bgElevated, borderRadius: radius.sm }]}>
                  <Text style={[styles.miniValue, { color: colors.text }]}>{admin.stats?.teachers || 0}</Text>
                  <Text style={[styles.miniLabel, { color: colors.textMuted }]}>Teachers</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <AdminScalePressable
                  onPress={() => openEdit(admin)}
                  style={[styles.iconBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.sm }]}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </AdminScalePressable>
                <AdminScalePressable
                  onPress={() => handleDelete(admin.id)}
                  style={[styles.iconBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.sm }]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </AdminScalePressable>
              </View>
            </AdminGlassCard>
          ))
        )}
      </AdminScreenShell>

      <AdminFAB onPress={() => { resetForm(); setShowAddModal(true); }} icon="add" />

      <AdminModalShell
        visible={showAddModal || showEditModal}
        title={showEditModal ? 'Edit School' : 'Add New School'}
        onClose={() => { setShowAddModal(false); setShowEditModal(false); }}
      >
        <ScrollView style={{ maxHeight: 400 }}>
          <TextInput style={inputStyle} placeholder="Full name" placeholderTextColor={colors.textMuted} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
          <TextInput style={inputStyle} placeholder="Email" placeholderTextColor={colors.textMuted} value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
          {!showEditModal ? (
            <TextInput style={inputStyle} placeholder="Password (optional)" placeholderTextColor={colors.textMuted} value={form.password} secureTextEntry onChangeText={(v) => setForm((p) => ({ ...p, password: v }))} />
          ) : null}
          <AdminScalePressable
            onPress={() => setShowBoardPicker(true)}
            style={[styles.pickerTrigger, { borderColor: colors.inputBorder, borderRadius: radius.sm }]}
          >
            <Text style={[styles.pickerTriggerText, { color: colors.text }]}>{form.board || 'Select board'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </AdminScalePressable>
          <AdminScalePressable
            onPress={() => setShowStatePicker(true)}
            style={[styles.pickerTrigger, { borderColor: colors.inputBorder, borderRadius: radius.sm }]}
          >
            <Text style={[styles.pickerTriggerText, { color: colors.text }]}>{form.state || 'Select state'}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </AdminScalePressable>
          <TextInput style={inputStyle} placeholder="School name" placeholderTextColor={colors.textMuted} value={form.schoolName} onChangeText={(v) => setForm((p) => ({ ...p, schoolName: v }))} />
          {showEditModal ? (
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>Active Account</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))} trackColor={{ true: colors.primary }} />
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.modalActions}>
          <AdminScalePressable
            onPress={() => { setShowAddModal(false); setShowEditModal(false); }}
            style={[styles.cancelButton, { borderColor: colors.surfaceBorder, borderRadius: radius.sm }]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </AdminScalePressable>
          <AdminScalePressable
            onPress={showEditModal ? handleUpdate : handleCreate}
            disabled={submitting}
            style={[styles.saveButton, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          >
            <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
              {submitting ? 'Saving...' : showEditModal ? 'Update' : 'Add School'}
            </Text>
          </AdminScalePressable>
        </View>
      </AdminModalShell>

      {renderPicker('Select Board', BOARD_OPTIONS, (v) => setForm((p) => ({ ...p, board: v })), () => setShowBoardPicker(false))}
      {renderPicker('Select State', STATE_OPTIONS, (v) => setForm((p) => ({ ...p, state: v })), () => setShowStatePicker(false))}
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statSlot: { flex: 1, minWidth: 0 },
  schoolHeader: { flexDirection: 'row', gap: 8 },
  schoolName: { fontSize: 16, fontWeight: '800' },
  schoolMeta: { fontSize: 12, marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusPill: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start', overflow: 'hidden' },
  miniStats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  miniStat: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  miniValue: { fontSize: 18, fontWeight: '800' },
  miniLabel: { fontSize: 11 },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  iconBtn: { width: 34, height: 34, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  pickerTrigger: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerTriggerText: { fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelButton: { flex: 1, borderWidth: 1, alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { fontWeight: '700' },
  saveButton: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  saveButtonText: { fontWeight: '700' },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: { padding: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 14 },
});
