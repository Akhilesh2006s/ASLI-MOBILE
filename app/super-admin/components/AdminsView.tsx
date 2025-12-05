import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import * as SecureStore from 'expo-secure-store';

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

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        const adminsList = Array.isArray(data) ? data : (data.data || []);
        setAdmins(adminsList);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
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
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin),
      });
      if (response.ok) {
        setShowAddModal(false);
        setNewAdmin({ name: '', email: '', password: '', board: 'ASLI_EXCLUSIVE_SCHOOLS', schoolName: '' });
        fetchAdmins();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const response = await fetch(`${API_BASE_URL}/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        fetchAdmins();
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
    }
  };

  return (
    <ScrollView style={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>School Management</Text>
          <Text style={styles.headerSubtitle}>Manage schools and their associated data</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <LinearGradient
            colors={['#2563eb', '#1d4ed8']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add New School</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        {/* Total Schools */}
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#fdba74', '#fb923c']}
            style={styles.summaryCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.summaryCardContent}>
              <View>
                <Text style={styles.summaryCardLabel}>Total Schools</Text>
                <Text style={styles.summaryCardValue}>{admins.length}</Text>
              </View>
              <Ionicons name="shield" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Total Students */}
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#7dd3fc', '#38bdf8']}
            style={styles.summaryCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summaryCardContent}>
              <View>
                <Text style={styles.summaryCardLabel}>Total Students</Text>
                <Text style={styles.summaryCardValue}>{totalStudents}</Text>
              </View>
              <Ionicons name="people" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>

        {/* Total Teachers */}
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={['#2dd4bf', '#14b8a6']}
            style={styles.summaryCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summaryCardContent}>
              <View>
                <Text style={styles.summaryCardLabel}>Total Teachers</Text>
                <Text style={styles.summaryCardValue}>{totalTeachers}</Text>
              </View>
              <Ionicons name="school" size={48} color="#fff" />
            </View>
          </LinearGradient>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search schools by name, email, or school name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Schools List */}
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

              {/* Stats Section */}
              <View style={styles.schoolCardStats}>
                <View style={styles.statBox}>
                  <LinearGradient
                    colors={['#fdba74', '#fb923c']}
                    style={styles.statBoxGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="people" size={24} color="#fff" />
                    <Text style={styles.statBoxValue}>{admin.stats?.students || 0}</Text>
                    <Text style={styles.statBoxLabel}>Students</Text>
                  </LinearGradient>
                </View>
                <View style={styles.statBox}>
                  <LinearGradient
                    colors={['#2dd4bf', '#14b8a6']}
                    style={styles.statBoxGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="school" size={24} color="#fff" />
                    <Text style={styles.statBoxValue}>{admin.stats?.teachers || 0}</Text>
                    <Text style={styles.statBoxLabel}>Teachers</Text>
                  </LinearGradient>
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
  content: { flex: 1 },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryCardGradient: {
    padding: 20,
    minHeight: 100,
  },
  summaryCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCardLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  summaryCardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    gap: 16,
    paddingBottom: 20,
  },
  schoolCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statBoxGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
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
