import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';
import { API_BASE_URL } from '../../../src/lib/api-config';

interface Event {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  startDate?: string;
  endDate?: string;
  type?: 'event' | 'exam';
  examType?: string;
  examId?: string;
  photo?: string;
  description?: string;
}

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.events)) return payload.events;
  return [];
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseEventDateKey(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return toLocalDateKey(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function resolvePhotoUrl(photo?: string): string | undefined {
  if (!photo) return undefined;
  if (photo.startsWith('http') || photo.startsWith('//')) return photo;
  if (photo.startsWith('/')) return `${API_BASE_URL}${photo}`;
  return `${API_BASE_URL}/${photo}`;
}

function formatDisplayDate(value?: string): string {
  const key = parseEventDateKey(value);
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENT_COLORS = ['#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    photo: null as string | null,
    photoUrl: '',
    description: '',
  });

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const [eventsRes, examsRes] = await Promise.all([
        api.get('/api/admin/events'),
        api.get('/api/admin/exams/viewable'),
      ]);

      const calendarEvents: Event[] = [];
      const baseEvents = asArray(eventsRes?.data);
      calendarEvents.push(
        ...baseEvents.map((event: any) => ({
          ...event,
          type: 'event' as const,
          startDate: event.date,
          endDate: event.date,
        }))
      );

      const exams = asArray(examsRes?.data);
      calendarEvents.push(
        ...exams.map((exam: any) => ({
          id: `exam-${exam._id}`,
          examId: exam._id,
          name: exam.title,
          date: exam.startDate,
          startDate: exam.startDate,
          endDate: exam.endDate,
          description: exam.description,
          type: 'exam' as const,
          examType: exam.examType,
        }))
      );

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const getEventsForDate = useCallback(
    (date: Date) => {
      const dateStr = toLocalDateKey(date);
      return events.filter((event) => {
        const start = parseEventDateKey(event.startDate || event.date);
        const end = parseEventDateKey(event.endDate || event.date);
        return dateStr >= start && dateStr <= end;
      });
    },
    [events]
  );

  const monthlyEvents = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startMs = monthStart.getTime();
    const endMs = monthEnd.getTime();

    return events
      .filter((event) => {
        const eventStart = new Date(parseEventDateKey(event.startDate || event.date)).getTime();
        const eventEnd = new Date(parseEventDateKey(event.endDate || event.date)).getTime();
        return eventStart <= endMs && eventEnd >= startMs;
      })
      .sort((a, b) => {
        const aTime = new Date(parseEventDateKey(a.startDate || a.date)).getTime();
        const bTime = new Date(parseEventDateKey(b.startDate || b.date)).getTime();
        return aTime - bTime;
      });
  }, [events, currentDate]);

  const monthlyEventsByDate = useMemo(() => {
    const grouped = monthlyEvents.reduce<Record<string, Event[]>>((acc, event) => {
      const key = parseEventDateKey(event.startDate || event.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [monthlyEvents]);

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear();

  const getEventColor = (event: Event, index: number) => {
    if (event.type === 'exam') return '#2563eb';
    return EVENT_COLORS[index % EVENT_COLORS.length];
  };

  const openAddEvent = (date: Date) => {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(normalizedDate);
    setEventForm({
      name: '',
      date: toLocalDateKey(normalizedDate),
      photo: null,
      photoUrl: '',
      description: '',
    });
    setIsEditMode(false);
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = async () => {
    if (!eventForm.name.trim() || !eventForm.date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', eventForm.name.trim());
      formData.append('date', eventForm.date);
      formData.append('description', eventForm.description || '');

      if (eventForm.photo) {
        formData.append('photo', {
          uri: eventForm.photo,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);
      }

      const eventId = editingEvent?._id || editingEvent?.id;
      const url = isEditMode && eventId
        ? `/api/admin/events/${eventId}`
        : '/api/admin/events';

      await api.request({
        url,
        method: isEditMode ? 'put' : 'post',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', isEditMode ? 'Event updated successfully' : 'Event created successfully');
      setIsEventModalOpen(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      console.error('Error saving event:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (event.type === 'exam') return;

    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const eventId = event._id || event.id;
            await api.delete(`/api/admin/events/${eventId}`);
            Alert.alert('Success', 'Event deleted successfully');
            setIsViewModalOpen(false);
            fetchEvents();
          } catch {
            Alert.alert('Error', 'Failed to delete event');
          }
        },
      },
    ]);
  };

  const handleEditEvent = (event: Event) => {
    if (event.type === 'exam') return;
    setEditingEvent(event);
    setIsEditMode(true);
    setEventForm({
      name: event.name,
      date: parseEventDateKey(event.date),
      photo: null,
      photoUrl: resolvePhotoUrl(event.photo) || '',
      description: event.description || '',
    });
    setSelectedDate(new Date(parseEventDateKey(event.date)));
    setIsViewModalOpen(false);
    setIsEventModalOpen(true);
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsViewModalOpen(true);
  };

  const resetForm = () => {
    setEventForm({
      name: '',
      date: selectedDate ? toLocalDateKey(selectedDate) : '',
      photo: null,
      photoUrl: '',
      description: '',
    });
    setIsEditMode(false);
    setEditingEvent(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fb923c" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Text style={styles.headerSubtitle}>Manage and view your events</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.todayButton} onPress={() => setCurrentDate(new Date())}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => openAddEvent(new Date())}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarNav}>
          <TouchableOpacity
            onPress={() =>
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
            }
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity
            onPress={() =>
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
            }
          >
            <Ionicons name="chevron-forward" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.miniGrid}>
          {DAY_NAMES.map((day) => (
            <View key={day} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{day.slice(0, 1)}</Text>
            </View>
          ))}
          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);

            return (
              <Pressable
                key={`${toLocalDateKey(date)}-${index}`}
                style={[
                  styles.miniDay,
                  !isCurrentMonthDay && styles.miniDayOtherMonth,
                  isTodayDate && styles.miniDayToday,
                ]}
                onPress={() => openAddEvent(date)}
              >
                <Text
                  style={[
                    styles.miniDayNumber,
                    !isCurrentMonthDay && styles.miniDayNumberMuted,
                    isTodayDate && styles.miniDayNumberToday,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {dayEvents.length > 0 ? (
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <View
                        key={event._id || event.id || i}
                        style={[styles.dot, { backgroundColor: getEventColor(event, i) }]}
                      />
                    ))}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.agendaSection}>
        <View style={styles.agendaHeader}>
          <Text style={styles.agendaTitle}>This Month</Text>
          <Text style={styles.agendaCount}>{monthlyEvents.length} scheduled</Text>
        </View>

        {monthlyEventsByDate.length === 0 ? (
          <View style={styles.emptyAgenda}>
            <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyAgendaText}>No events or exams scheduled this month.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => openAddEvent(new Date())}>
              <Text style={styles.emptyAddBtnText}>Add Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          monthlyEventsByDate.map(([dateKey, dayEvents]) => (
            <View key={dateKey} style={styles.agendaDayGroup}>
              <Text style={styles.agendaDayLabel}>
                {formatDisplayDate(dateKey)}
              </Text>
              {dayEvents.map((event, idx) => (
                <TouchableOpacity
                  key={event._id || event.id || `${event.name}-${idx}`}
                  style={styles.agendaItem}
                  onPress={() => handleViewEvent(event)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.agendaStripe, { backgroundColor: getEventColor(event, idx) }]} />
                  <View style={styles.agendaItemBody}>
                    <View style={styles.agendaItemTop}>
                      <Text style={styles.agendaItemTitle} numberOfLines={2}>
                        {event.type === 'exam' ? `Exam: ${event.name}` : event.name}
                      </Text>
                      <View
                        style={[
                          styles.typeBadge,
                          event.type === 'exam' ? styles.typeBadgeExam : styles.typeBadgeEvent,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            event.type === 'exam' ? styles.typeBadgeTextExam : styles.typeBadgeTextEvent,
                          ]}
                        >
                          {event.type === 'exam' ? 'Exam' : 'Event'}
                        </Text>
                      </View>
                    </View>
                    {event.description ? (
                      <Text style={styles.agendaItemDesc} numberOfLines={2}>
                        {event.description}
                      </Text>
                    ) : null}
                    {event.endDate &&
                    parseEventDateKey(event.endDate) !== parseEventDateKey(event.startDate || event.date) ? (
                      <Text style={styles.agendaItemRange}>
                        {formatDisplayDate(event.startDate || event.date)} – {formatDisplayDate(event.endDate)}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </View>

      <Modal visible={isEventModalOpen} animationType="slide" transparent onRequestClose={() => setIsEventModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Event' : 'Add Event'}</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsEventModalOpen(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Event Name *</Text>
                <TextInput
                  style={styles.input}
                  value={eventForm.name}
                  onChangeText={(text) => setEventForm({ ...eventForm, name: text })}
                  placeholder="Enter event name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date * (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={eventForm.date}
                  onChangeText={(text) => setEventForm({ ...eventForm, date: text })}
                  placeholder="2026-06-07"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={eventForm.description}
                  onChangeText={(text) => setEventForm({ ...eventForm, description: text })}
                  placeholder="Enter event description"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setIsEventModalOpen(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleEventSubmit}>
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? 'Update Event' : 'Create Event'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isViewModalOpen} animationType="slide" transparent onRequestClose={() => setIsViewModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEvent?.name}</Text>
              <TouchableOpacity onPress={() => setIsViewModalOpen(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedEvent?.photo ? (
                <Image
                  source={{ uri: resolvePhotoUrl(selectedEvent.photo) }}
                  style={styles.viewPhoto}
                />
              ) : null}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.viewText}>
                  {formatDisplayDate(selectedEvent?.startDate || selectedEvent?.date)}
                </Text>
              </View>

              {selectedEvent?.endDate &&
              parseEventDateKey(selectedEvent.endDate) !==
                parseEventDateKey(selectedEvent.startDate || selectedEvent.date) ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>End Date</Text>
                  <Text style={styles.viewText}>{formatDisplayDate(selectedEvent.endDate)}</Text>
                </View>
              ) : null}

              {selectedEvent?.type === 'exam' ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Type</Text>
                  <Text style={styles.viewText}>
                    Exam ({selectedEvent.examType || 'scheduled'})
                  </Text>
                </View>
              ) : null}

              {selectedEvent?.description ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <Text style={styles.viewText}>{selectedEvent.description}</Text>
                </View>
              ) : null}

              {selectedEvent?.type !== 'exam' ? (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.button, styles.editButton]}
                    onPress={() => selectedEvent && handleEditEvent(selectedEvent)}
                  >
                    <Ionicons name="create" size={20} color="#fff" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={() => selectedEvent && handleDeleteEvent(selectedEvent)}
                  >
                    <Ionicons name="trash" size={20} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isUrlModalOpen} animationType="slide" transparent onRequestClose={() => setIsUrlModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Image URL</Text>
              <TouchableOpacity onPress={() => setIsUrlModalOpen(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Image URL</Text>
                <TextInput
                  style={styles.input}
                  value={imageUrlInput}
                  onChangeText={setImageUrlInput}
                  placeholder="https://..."
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setIsUrlModalOpen(false);
                    setImageUrlInput('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={() => {
                    if (imageUrlInput.trim()) {
                      setEventForm({ ...eventForm, photoUrl: imageUrlInput.trim() });
                    }
                    setIsUrlModalOpen(false);
                    setImageUrlInput('');
                  }}
                >
                  <Text style={styles.submitButtonText}>Add URL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  scrollContent: { paddingBottom: 32 },
  loadingContainer: {
    minHeight: 240,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 16, color: '#64748b' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  todayButtonText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fb923c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayHeader: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  dayHeaderText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  miniDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 2,
  },
  miniDayOtherMonth: { opacity: 0.35 },
  miniDayToday: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fb923c',
  },
  miniDayNumber: { fontSize: 13, fontWeight: '600', color: '#374151' },
  miniDayNumberMuted: { color: '#9ca3af' },
  miniDayNumberToday: { color: '#ea580c', fontWeight: '800' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  agendaSection: { gap: 12 },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agendaTitle: { fontSize: 18, fontWeight: '700', color: '#0c4a6e' },
  agendaCount: { fontSize: 12, color: '#0284c7', fontWeight: '600' },
  emptyAgenda: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  emptyAgendaText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyAddBtn: {
    marginTop: 16,
    backgroundColor: '#fb923c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyAddBtnText: { color: '#fff', fontWeight: '700' },
  agendaDayGroup: { gap: 8 },
  agendaDayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    marginTop: 4,
  },
  agendaItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    overflow: 'hidden',
  },
  agendaStripe: { width: 4 },
  agendaItemBody: { flex: 1, padding: 12, gap: 4 },
  agendaItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  agendaItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeExam: { backgroundColor: '#dbeafe' },
  typeBadgeEvent: { backgroundColor: '#ffedd5' },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  typeBadgeTextExam: { color: '#1d4ed8' },
  typeBadgeTextEvent: { color: '#c2410c' },
  agendaItemDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  agendaItemRange: { fontSize: 12, color: '#0284c7', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', flex: 1, marginRight: 12 },
  modalBody: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  viewPhoto: { width: '100%', height: 220, borderRadius: 8, marginBottom: 16 },
  viewText: { fontSize: 16, color: '#374151', lineHeight: 24 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: { backgroundColor: '#f3f4f6' },
  cancelButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  submitButton: { backgroundColor: '#fb923c' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  editButton: { backgroundColor: '#3b82f6' },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#ef4444' },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
