import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';

interface Student {
  id: string;
  name: string;
  email: string;
  classNumber: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  assignedClass?: string;
}

export default function StudentsView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isAdvancedFilterVisible, setIsAdvancedFilterVisible] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    classNumber: '',
    phone: ''
  });
  const [allClasses, setAllClasses] = useState<string[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/admin/classes');
      const data = response?.data;
      const classesData = data?.data || data || [];
      const list = Array.isArray(classesData) ? classesData : [];
      const uniqueClasses = Array.from(new Set(
        list.map((cls: any) => cls.classNumber || cls.name).filter(Boolean)
      ));
      setAllClasses(uniqueClasses);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/students');
      const data = response?.data;
      const studentsData = data?.data || data || [];
      const mappedStudents = (Array.isArray(studentsData) ? studentsData : []).map((user: any) => ({
        id: user._id || user.id,
        name: user.fullName || user.name || 'Unknown Student',
        email: user.email || '',
        classNumber: user.classNumber || user.assignedClass?.classNumber || 'N/A',
        phone: user.phone || '',
        status: user.isActive ? 'active' : 'inactive',
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin || null
      }));
      setStudents(mappedStudents);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.classNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await api.post('/api/admin/students', {
        fullName: newStudent.name.trim(),
        email: newStudent.email.trim(),
        classNumber: newStudent.classNumber.trim(),
        phone: newStudent.phone.trim(),
        password: 'Password123'
      });
      Alert.alert('Success', 'Student added successfully! Default password: Password123');
      setNewStudent({ name: '', email: '', classNumber: '', phone: '' });
      setIsAddModalVisible(false);
      fetchStudents();
    } catch (error: any) {
      console.error('Failed to add student:', error);
      Alert.alert('Error', error?.friendlyMessage || 'Network error. Please try again.');
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/students/${id}`);
              Alert.alert('Success', 'Student deleted successfully');
              fetchStudents();
            } catch (error: any) {
              console.error('Failed to delete student:', error);
              Alert.alert('Error', error?.friendlyMessage || 'Network error. Please try again.');
            }
          }
        }
      ]
    );
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = !searchTerm || 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.classNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = selectedClassFilter === 'all' || 
        student.classNumber === selectedClassFilter;
      
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClassFilter]);

  const stats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'active').length;
    const uniqueClasses = new Set(students.map(s => s.classNumber)).size;
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const newThisMonth = students.filter(s => {
      const created = new Date(s.createdAt);
      return created >= thisMonth;
    }).length;

    return {
      total: students.length,
      active: activeStudents,
      classes: uniqueClasses,
      newThisMonth
    };
  }, [students]);

  const renderStudentCard = useCallback(({ item: student }: { item: Student }) => (
    <View
      key={String(student.id ?? student.email)}
      style={styles.studentCard}
    >
      <View style={styles.studentCardContent}>
        <View style={styles.studentHeader}>
          <View style={styles.studentAvatarContainer}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>
                {(student.name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View
              style={[
                styles.statusIndicator,
                student.status === 'active' ? styles.statusIndicatorActive : styles.statusIndicatorInactive,
              ]}
            >
              <Ionicons
                name={student.status === 'active' ? 'checkmark' : 'remove'}
                size={10}
                color="#fff"
              />
            </View>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName} numberOfLines={1}>
              {student.name || 'Unknown Student'}
            </Text>
            <Text style={styles.studentEmail} numberOfLines={1}>
              {student.email || 'No email'}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.classChip}>
                <Ionicons name="school-outline" size={12} color="#0d9488" />
                <Text style={styles.classChipText}>Class {student.classNumber || 'N/A'}</Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  student.status === 'active' ? styles.statusChipOn : styles.statusChipOff,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    student.status === 'active' ? styles.statusChipTextOn : styles.statusChipTextOff,
                  ]}
                >
                  {student.status === 'active' ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.studentMeta}>
          {student.phone ? (
            <View style={styles.metaItem}>
              <Ionicons name="call-outline" size={14} color="#64748b" />
              <Text style={styles.metaItemText}>{student.phone}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.metaItemText}>
              Last login: {student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never'}
            </Text>
          </View>
        </View>

        <View style={styles.studentActions}>
          <TouchableOpacity
            style={styles.dangerOutlineBtn}
            onPress={() => handleDeleteStudent(student.id, student.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
            <Text style={styles.dangerOutlineBtnText}>Remove</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryOutlineBtn} activeOpacity={0.85}>
            <Ionicons name="swap-horizontal-outline" size={18} color="#0d9488" />
            <Text style={styles.secondaryOutlineBtnText}>Assign class</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), []);

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      {/* Summary — compact stat tiles (aligned with admin dashboard style) */}
      <View style={styles.statsRow}>
        <View style={[styles.summaryTile, { borderLeftColor: '#8b5cf6' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#f5f3ff' }]}>
            <Ionicons name="people" size={18} color="#7c3aed" />
          </View>
          <Text style={styles.summaryTileLabel}>Total</Text>
          <Text style={styles.summaryTileValue}>{stats.total}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#10b981' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
          </View>
          <Text style={styles.summaryTileLabel}>Active</Text>
          <Text style={styles.summaryTileValue}>{stats.active}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#f97316' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="layers-outline" size={18} color="#ea580c" />
          </View>
          <Text style={styles.summaryTileLabel}>Classes</Text>
          <Text style={styles.summaryTileValue}>{stats.classes}</Text>
        </View>
        <View style={[styles.summaryTile, { borderLeftColor: '#0ea5e9' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: '#f0f9ff' }]}>
            <Ionicons name="person-add-outline" size={18} color="#0284c7" />
          </View>
          <Text style={styles.summaryTileLabel}>New</Text>
          <Text style={styles.summaryTileValue}>{stats.newThisMonth}</Text>
        </View>
      </View>

      {/* Search + actions */}
      <View style={styles.toolbarCard}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or class…"
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#94a3b8"
          />
        </View>
        <View style={styles.toolbarActions}>
          <TouchableOpacity
            style={styles.toolBtnOutline}
            onPress={() => setIsAdvancedFilterVisible(true)}
          >
            <Ionicons name="options-outline" size={18} color="#0d9488" />
            <Text style={styles.toolBtnOutlineText}>Filter</Text>
            {selectedClassFilter !== 'all' && (
              <View style={styles.filterDot} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtnOutline}
            onPress={() => Alert.alert('Export', 'Export coming soon')}
          >
            <Ionicons name="download-outline" size={18} color="#64748b" />
            <Text style={styles.toolBtnMutedText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtnPrimary} onPress={() => setIsAddModalVisible(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.toolBtnPrimaryText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <View style={styles.directoryContainer}>
        <View style={styles.directoryHeader}>
          <View>
            <Text style={styles.directoryTitle}>All students</Text>
            <Text style={styles.directorySubtitle}>
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
              {searchTerm.trim() || selectedClassFilter !== 'all' ? ' matching filters' : ''}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0d9488" />
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color="#0d9488" />
            </View>
            <Text style={styles.emptyTitle}>No students found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search criteria or add new students</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.addFirstButtonText}>Add First Student</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.studentsList}>
            {filteredStudents.map((student) => renderStudentCard({ item: student }))}
          </View>
        )}
      </View>

      {/* Advanced Filter Modal */}
      <Modal
        visible={isAdvancedFilterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAdvancedFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filter</Text>
              <TouchableOpacity onPress={() => setIsAdvancedFilterVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Class</Text>
                <ScrollView style={styles.classFilterList}>
                  <TouchableOpacity
                    style={[
                      styles.classFilterItem,
                      selectedClassFilter === 'all' && styles.classFilterItemActive
                    ]}
                    onPress={() => setSelectedClassFilter('all')}
                  >
                    <Text style={[
                      styles.classFilterText,
                      selectedClassFilter === 'all' && styles.classFilterTextActive
                    ]}>All Classes</Text>
                  </TouchableOpacity>
                  {allClasses.map((classNum) => (
                    <TouchableOpacity
                      key={classNum}
                      style={[
                        styles.classFilterItem,
                        selectedClassFilter === classNum && styles.classFilterItemActive
                      ]}
                      onPress={() => setSelectedClassFilter(classNum)}
                    >
                      <Text style={[
                        styles.classFilterText,
                        selectedClassFilter === classNum && styles.classFilterTextActive
                      ]}>{classNum}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedClassFilter('all');
                  setIsAdvancedFilterVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setIsAdvancedFilterVisible(false)}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.applyButtonText}>Apply Filter</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Student Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Student</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={newStudent.name}
                  onChangeText={(text) => setNewStudent({ ...newStudent, name: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  value={newStudent.email}
                  onChangeText={(text) => setNewStudent({ ...newStudent, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Class Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10, 11, 12"
                  value={newStudent.classNumber}
                  onChangeText={(text) => setNewStudent({ ...newStudent, classNumber: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={newStudent.phone}
                  onChangeText={(text) => setNewStudent({ ...newStudent, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Default Password</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value="Password123"
                  editable={false}
                />
                <Text style={styles.helperText}>This is the default password for all new students</Text>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddStudent}
              >
                <LinearGradient
                  colors={['#0ea5e9', '#0284c7']}
                  style={styles.submitButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitButtonText}>Add Student</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    minHeight: 0,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  summaryTile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryTileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryTileValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  toolbarCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 15,
    color: '#0f172a',
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  toolBtnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    position: 'relative',
  },
  toolBtnOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },
  toolBtnMutedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
  },
  toolBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0d9488',
  },
  toolBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  directoryContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  directoryHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  directoryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  directorySubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  studentsList: {
    padding: 14,
    gap: 12,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  studentCardContent: {
    padding: 14,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  studentAvatarContainer: {
    position: 'relative',
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorActive: {
    backgroundColor: '#10b981',
  },
  statusIndicatorInactive: {
    backgroundColor: '#94a3b8',
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  classChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  classChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f766e',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipOn: {
    backgroundColor: '#ecfdf5',
  },
  statusChipOff: {
    backgroundColor: '#f1f5f9',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusChipTextOn: {
    color: '#047857',
  },
  statusChipTextOff: {
    color: '#64748b',
  },
  studentMeta: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItemText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  studentActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dangerOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  dangerOutlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  secondaryOutlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#f0fdfa',
  },
  secondaryOutlineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#f0fdfa',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d9488',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0c4a6e',
  },
  modalBody: {
    padding: 14,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#075985',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0c4a6e',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  disabledInput: {
    backgroundColor: '#e0f2fe',
    color: '#075985',
  },
  helperText: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 4,
  },
  classFilterList: {
    maxHeight: 160,
  },
  classFilterItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  classFilterItemActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0284c7',
  },
  classFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#075985',
  },
  classFilterTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#075985',
  },
  applyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    padding: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});