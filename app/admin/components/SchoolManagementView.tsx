import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';

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
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchAdmins = async () => {
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
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

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
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((option) => (
              <TouchableOpacity key={option} style={styles.pickerItem} onPress={() => { onSelect(option); onClose(); }}>
                <Text style={styles.pickerItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>School Management</Text>
          <Text style={styles.subtitle}>Web content adapted for mobile</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setShowAddModal(true); }}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Add School</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by school, contact, email, board..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.orange]}>
          <Text style={styles.statLabel}>Total Schools</Text>
          <Text style={styles.statValue}>{admins.length}</Text>
        </View>
        <View style={[styles.statCard, styles.blue]}>
          <Text style={styles.statLabel}>Total Students</Text>
          <Text style={styles.statValue}>{totalStudents}</Text>
        </View>
        <View style={[styles.statCard, styles.teal]}>
          <Text style={styles.statLabel}>Total Teachers</Text>
          <Text style={styles.statValue}>{totalTeachers}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#fb923c" />
        </View>
      ) : (
        filteredAdmins.map((admin) => (
          <View key={admin.id} style={styles.schoolCard}>
            <View style={styles.schoolHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.schoolName}>{admin.schoolName || admin.name}</Text>
                <Text style={styles.schoolMeta}>{admin.name}</Text>
                <Text style={styles.schoolMeta}>{admin.email}</Text>
                <View style={styles.badgesRow}>
                  {!!admin.board && <Text style={styles.badge}>{admin.board}</Text>}
                  {!!admin.state && <Text style={styles.badge}>{admin.state}</Text>}
                </View>
              </View>
              <Text style={[styles.statusPill, (admin.status || '').toLowerCase() === 'active' ? styles.active : styles.inactive]}>
                {admin.status || 'inactive'}
              </Text>
            </View>

            <View style={styles.miniStats}>
              <View style={styles.miniStat}><Text style={styles.miniValue}>{admin.stats?.students || 0}</Text><Text style={styles.miniLabel}>Students</Text></View>
              <View style={styles.miniStat}><Text style={styles.miniValue}>{admin.stats?.teachers || 0}</Text><Text style={styles.miniLabel}>Teachers</Text></View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(admin)}>
                <Ionicons name="create-outline" size={18} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(admin.id)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={showAddModal || showEditModal} transparent animationType="slide" onRequestClose={() => { setShowAddModal(false); setShowEditModal(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{showEditModal ? 'Edit School' : 'Add New School'}</Text>
            <ScrollView>
              <TextInput style={styles.input} placeholder="Full name" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
              <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
              {!showEditModal ? (
                <TextInput style={styles.input} placeholder="Password (optional)" value={form.password} secureTextEntry onChangeText={(v) => setForm((p) => ({ ...p, password: v }))} />
              ) : null}
              <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowBoardPicker(true)}>
                <Text style={styles.pickerTriggerText}>{form.board || 'Select board'}</Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowStatePicker(true)}>
                <Text style={styles.pickerTriggerText}>{form.state || 'Select state'}</Text>
                <Ionicons name="chevron-down" size={16} color="#6b7280" />
              </TouchableOpacity>
              <TextInput style={styles.input} placeholder="School name" value={form.schoolName} onChangeText={(v) => setForm((p) => ({ ...p, schoolName: v }))} />
              {showEditModal ? (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Active Account</Text>
                  <Switch value={form.isActive} onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
                </View>
              ) : null}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowAddModal(false); setShowEditModal(false); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={showEditModal ? handleUpdate : handleCreate} disabled={submitting}>
                <Text style={styles.saveButtonText}>{submitting ? 'Saving...' : showEditModal ? 'Update' : 'Add School'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderPicker('Select Board', BOARD_OPTIONS, (v) => setForm((p) => ({ ...p, board: v })), () => setShowBoardPicker(false))}
      {renderPicker('Select State', STATE_OPTIONS, (v) => setForm((p) => ({ ...p, state: v })), () => setShowStatePicker(false))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 30, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, marginBottom: 10 },
  searchInput: { flex: 1, height: 42, color: '#111827' },
  statsRow: { gap: 10, marginBottom: 6 },
  statCard: { borderRadius: 12, padding: 12 },
  orange: { backgroundColor: '#fb923c' },
  blue: { backgroundColor: '#38bdf8' },
  teal: { backgroundColor: '#14b8a6' },
  statLabel: { color: '#fff', fontSize: 12, opacity: 0.95 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  loadingWrap: { padding: 30, alignItems: 'center' },
  schoolCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },
  schoolHeader: { flexDirection: 'row', gap: 8 },
  schoolName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  schoolMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badgesRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badge: { fontSize: 11, color: '#374151', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusPill: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start', overflow: 'hidden' },
  active: { backgroundColor: '#dcfce7', color: '#166534' },
  inactive: { backgroundColor: '#fee2e2', color: '#991b1b' },
  miniStats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  miniStat: { flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingVertical: 8 },
  miniValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  miniLabel: { fontSize: 11, color: '#6b7280' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 14, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, color: '#111827' },
  pickerTrigger: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerTriggerText: { color: '#111827', fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 12 },
  switchLabel: { color: '#374151', fontSize: 14, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { color: '#374151', fontWeight: '700' },
  saveButton: { flex: 1, backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 14 },
  pickerItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemText: { color: '#111827', fontSize: 14 },
});

