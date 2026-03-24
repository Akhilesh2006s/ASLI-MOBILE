import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';

interface Admin {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  board?: string;
  schoolName?: string;
  status?: string;
  joinDate?: string;
  stats?: {
    students?: number;
    teachers?: number;
  };
}

export default function AdminsView() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '', board: 'ASLI_EXCLUSIVE_SCHOOLS', schoolName: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setError('');
      const response = await api.get('/api/super-admin/admins');
      const data = response?.data;
      const adminsList = Array.isArray(data) ? data : (data?.data || []);
      setAdmins(adminsList);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to load admins');
      console.error('Error fetching admins:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAdmins = useMemo(() => {
    if (!searchQuery.trim()) return admins;
    const query = searchQuery.toLowerCase();
    return admins.filter(admin => 
      (admin.name || '').toLowerCase().includes(query) ||
      (admin.email || '').toLowerCase().includes(query) ||
      (admin.schoolName || '').toLowerCase().includes(query)
    );
  }, [admins, searchQuery]);

  const totalStudents = useMemo(() => {
    return admins.reduce((sum, admin) => sum + (admin.stats?.students || 0), 0);
  }, [admins]);

  const totalTeachers = useMemo(() => {
    return admins.reduce((sum, admin) => sum + (admin.stats?.teachers || 0), 0);
  }, [admins]);

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password || !newAdmin.schoolName) {
      return;
    }
    setIsAdding(true);
    try {
      await api.post('/api/super-admin/admins', newAdmin);
      setShowAddModal(false);
      setNewAdmin({ name: '', email: '', password: '', board: 'ASLI_EXCLUSIVE_SCHOOLS', schoolName: '' });
      fetchAdmins();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to add admin');
      console.error('Error adding admin:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      await api.delete(`/api/super-admin/admins/${adminId}`);
      fetchAdmins();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to delete admin');
      console.error('Error deleting admin:', err);
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Header — title + compact add (no full-width gradient bar) */}
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>School Management</Text>
          <Text style={styles.headerSubtitle}>Manage schools and their associated data</Text>
        </View>
        <TouchableOpacity style={styles.addSchoolInline} onPress={() => setShowAddModal(true)} activeOpacity={0.9}>
          <Ionicons name="business-outline" size={18} color="#ea580c" />
          <Text style={styles.addSchoolInlineText}>Add new school</Text>
          <Ionicons name="chevron-forward" size={18} color="#f97316" />
        </TouchableOpacity>
      </View>

      {/* Summary — clean cards (accent stripe + icon), aligned with board dashboard */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryStatCard, { borderLeftColor: '#fb923c' }]}>
          <View style={[styles.summaryIconBadge, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="shield-checkmark" size={18} color="#ea580c" />
          </View>
          <Text style={styles.summaryStatLabel}>Schools</Text>
          <Text style={styles.summaryStatValue}>{admins.length}</Text>
        </View>
        <View style={[styles.summaryStatCard, { borderLeftColor: '#38bdf8' }]}>
          <View style={[styles.summaryIconBadge, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="people" size={18} color="#0284c7" />
          </View>
          <Text style={styles.summaryStatLabel}>Students</Text>
          <Text style={styles.summaryStatValue}>{totalStudents}</Text>
        </View>
        <View style={[styles.summaryStatCard, { borderLeftColor: '#14b8a6' }]}>
          <View style={[styles.summaryIconBadge, { backgroundColor: '#f0fdfa' }]}>
            <Ionicons name="school" size={18} color="#0d9488" />
          </View>
          <Text style={styles.summaryStatLabel}>Teachers</Text>
          <Text style={styles.summaryStatValue}>{totalTeachers}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <Text style={styles.searchLabel}>Find a school</Text>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Name, email, or school…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Schools List */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading schools...</Text>
        </View>
      ) : filteredAdmins.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="school" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No schools found matching your search' : 'No schools found'}
          </Text>
        </View>
      ) : (
        <View style={styles.schoolsList}>
          {filteredAdmins.map((admin) => (
            <View key={admin.id || admin._id} style={styles.schoolCard}>
              {/* School Header */}
              <View style={styles.schoolCardHeader}>
                <View style={styles.schoolCardHeaderLeft}>
                  <View style={styles.schoolIconContainer}>
                    <Ionicons name="shield" size={24} color="#fb923c" />
                  </View>
                  <View style={styles.schoolCardInfo}>
                    <Text style={styles.schoolCardName}>{admin.name || 'Unknown Admin'}</Text>
                    <Text style={styles.schoolCardEmail}>{admin.email || 'No email'}</Text>
                    {admin.schoolName && (
                      <Text style={styles.schoolCardSchoolName}>{admin.schoolName}</Text>
                    )}
                    <View style={styles.badgeContainer}>
                      <View style={styles.boardBadge}>
                        <Text style={styles.boardBadgeText}>ASLI EXCLUSIVE SCHOOLS</Text>
                      </View>
                      <View style={[styles.statusBadge, admin.status === 'active' || admin.status === 'Active' ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                        <Text style={styles.statusBadgeText}>
                          {admin.status === 'active' || admin.status === 'Active' ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Stats — inline chips */}
              <View style={styles.schoolCardStats}>
                <View style={styles.miniStatChip}>
                  <Ionicons name="people-outline" size={16} color="#c2410c" />
                  <Text style={styles.miniStatChipValue}>{admin.stats?.students ?? 0}</Text>
                  <Text style={styles.miniStatChipLabel}>Students</Text>
                </View>
                <View style={[styles.miniStatChip, styles.miniStatChipTeal]}>
                  <Ionicons name="school-outline" size={16} color="#0f766e" />
                  <Text style={[styles.miniStatChipValue, { color: '#0f766e' }]}>{admin.stats?.teachers ?? 0}</Text>
                  <Text style={[styles.miniStatChipLabel, { color: '#0d9488' }]}>Teachers</Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.schoolCardFooter}>
                <Text style={styles.schoolCardDate}>
                  Added: {admin.joinDate ? new Date(admin.joinDate).toLocaleDateString() : 'Unknown'}
                </Text>
                <View style={styles.schoolCardActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="pencil" size={18} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteAdmin(admin.id || admin._id || '')}
                  >
                    <Ionicons name="trash" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add School Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New School</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter school administrator's full name"
                  value={newAdmin.name}
                  onChangeText={(text) => setNewAdmin({...newAdmin, name: text})}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter school administrator's email"
                  keyboardType="email-address"
                  value={newAdmin.email}
                  onChangeText={(text) => setNewAdmin({...newAdmin, email: text})}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Password *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter temporary password"
                  secureTextEntry
                  value={newAdmin.password}
                  onChangeText={(text) => setNewAdmin({...newAdmin, password: text})}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Board *</Text>
                <View style={styles.formInput}>
                  <Text style={styles.formInputText}>ASLI EXCLUSIVE SCHOOLS</Text>
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>School Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter school name"
                  value={newAdmin.schoolName}
                  onChangeText={(text) => setNewAdmin({...newAdmin, schoolName: text})}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, isAdding && styles.submitButtonDisabled]}
                onPress={handleAddAdmin}
                disabled={isAdding}
              >
                <Text style={styles.submitButtonText}>
                  {isAdding ? 'Adding...' : 'Add School'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTextBlock: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  addSchoolInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addSchoolInlineText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  summaryStatCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  schoolsList: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 20,
  },
  schoolCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  schoolCardHeader: {
    marginBottom: 16,
  },
  schoolCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  schoolIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  schoolCardInfo: {
    flex: 1,
  },
  schoolCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  schoolCardEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  schoolCardSchoolName: {
    fontSize: 12,
    color: '#fb923c',
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  boardBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardBadgeText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#10b981',
  },
  statusBadgeInactive: {
    backgroundColor: '#6b7280',
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  schoolCardStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  miniStatChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  miniStatChipTeal: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  miniStatChipValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#c2410c',
  },
  miniStatChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ea580c',
  },
  schoolCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  schoolCardDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  schoolCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    paddingHorizontal: 20,
    marginBottom: 8,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formInputText: {
    fontSize: 16,
    color: '#111827',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
