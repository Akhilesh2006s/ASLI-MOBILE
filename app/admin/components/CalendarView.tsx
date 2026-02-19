import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../src/lib/api-config';
// Image picker will be added when expo-image-picker is installed
// import * as ImagePicker from 'expo-image-picker';

interface Event {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  photo?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
    description: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/admin/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const eventsList = Array.isArray(data) ? data : (data.events || data.data || []);
        console.log('Fetched events:', eventsList.length, eventsList);
        setEvents(eventsList);
      } else {
        console.error('Failed to fetch events:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getLastDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentDate);
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

  const getEventsForDate = (date: Date) => {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dateStr = `${normalizedDate.getFullYear()}-${String(normalizedDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedDate.getDate()).padStart(2, '0')}`;

    const matchingEvents = events.filter(event => {
      if (!event.date) return false;
      
      const eventDateObj = new Date(event.date);
      // Handle timezone issues by normalizing to local date
      const normalizedEventDate = new Date(
        eventDateObj.getFullYear(),
        eventDateObj.getMonth(),
        eventDateObj.getDate()
      );
      const eventDateStr = `${normalizedEventDate.getFullYear()}-${String(normalizedEventDate.getMonth() + 1).padStart(2, '0')}-${String(normalizedEventDate.getDate()).padStart(2, '0')}`;
      
      const matches = eventDateStr === dateStr;
      if (matches) {
        console.log('Event matched:', {
          calendarDate: dateStr,
          eventDate: eventDateStr,
          eventName: event.name,
          originalEventDate: event.date
        });
      }
      return matches;
    });
    
    return matchingEvents;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() &&
           date.getFullYear() === currentDate.getFullYear();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date: Date) => {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const year = normalizedDate.getFullYear();
    const month = String(normalizedDate.getMonth() + 1).padStart(2, '0');
    const day = String(normalizedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    setSelectedDate(normalizedDate);
    setEventForm({
      name: '',
      date: dateString,
      photo: null,
      photoUrl: '',
      description: ''
    });
    setIsEditMode(false);
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = async () => {
    if (!eventForm.name || !eventForm.date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;

      const formData = new FormData();
      formData.append('name', eventForm.name);
      formData.append('date', eventForm.date);
      formData.append('description', eventForm.description);

      if (eventForm.photo) {
        formData.append('photo', {
          uri: eventForm.photo,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);
      }

      const url = isEditMode && editingEvent
        ? `${API_BASE_URL}/api/admin/events/${editingEvent._id || editingEvent.id}`
        : `${API_BASE_URL}/api/admin/events`;

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', isEditMode ? 'Event updated successfully' : 'Event created successfully');
        setIsEventModalOpen(false);
        resetForm();
        fetchEvents();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to save event');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('authToken');
              if (!token) return;

              const response = await fetch(`${API_BASE_URL}/api/admin/events/${event._id || event.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Event deleted successfully');
                fetchEvents();
              } else {
                Alert.alert('Error', 'Failed to delete event');
              }
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsEditMode(true);
    setEventForm({
      name: event.name,
      date: new Date(event.date).toISOString().split('T')[0],
      photo: null,
      photoUrl: event.photo || '',
      description: event.description || ''
    });
    setSelectedDate(new Date(event.date));
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
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      photo: null,
      photoUrl: '',
      description: ''
    });
    setIsEditMode(false);
    setEditingEvent(null);
  };

  const handlePhotoPick = async () => {
    // Image picker functionality - can be enabled when expo-image-picker is installed
    setIsUrlModalOpen(true);
    setImageUrlInput('');
  };

  const handleUrlSubmit = () => {
    if (imageUrlInput.trim()) {
      setEventForm({
        ...eventForm,
        photoUrl: imageUrlInput.trim()
      });
      setIsUrlModalOpen(false);
      setImageUrlInput('');
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const eventColors = ['#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#ef4444'];

  const getEventColor = (index: number) => {
    return eventColors[index % eventColors.length];
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Text style={styles.headerSubtitle}>Manage and view your events</Text>
        </View>
        <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={goToPreviousMonth}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={goToNextMonth}>
            <Ionicons name="chevron-forward" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarGrid}>
          {dayNames.map(day => (
            <View key={day} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>
          ))}

          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  !isCurrentMonthDay && styles.calendarDayOtherMonth,
                  isTodayDate && styles.calendarDayToday
                ]}
                onPress={() => handleDateClick(date)}
              >
                <Text style={[
                  styles.dayNumber,
                  isTodayDate && styles.dayNumberToday,
                  !isCurrentMonthDay && styles.dayNumberOtherMonth
                ]}>
                  {date.getDate()}
                </Text>

                <View style={styles.eventsContainer}>
                  {dayEvents.length > 0 ? (
                    <>
                      {dayEvents.slice(0, 3).map((event, eventIndex) => {
                        const eventId = event._id || event.id || `event-${eventIndex}`;
                        return (
                          <TouchableOpacity
                            key={eventId}
                            style={[styles.eventDot, { backgroundColor: getEventColor(eventIndex) }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleViewEvent(event);
                            }}
                          >
                            <Text style={styles.eventDotText} numberOfLines={1}>
                              {event.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <Text style={styles.moreEventsText}>+{dayEvents.length - 3} more</Text>
                      )}
                    </>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Events List Section */}
      {events.length > 0 && (
        <View style={styles.eventsListSection}>
          <Text style={styles.eventsListTitle}>Upcoming Events</Text>
          <View style={styles.eventsList}>
            {events
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 10)
              .map((event, index) => {
                const eventDate = new Date(event.date);
                const isPast = eventDate < new Date(new Date().setHours(0, 0, 0, 0));
                return (
                  <TouchableOpacity
                    key={event._id || event.id || `event-list-${index}`}
                    style={[styles.eventListItem, isPast && styles.eventListItemPast]}
                    onPress={() => handleViewEvent(event)}
                  >
                    <View style={[styles.eventListDot, { backgroundColor: getEventColor(index) }]} />
                    <View style={styles.eventListContent}>
                      <Text style={styles.eventListName}>{event.name}</Text>
                      <Text style={styles.eventListDate}>
                        {eventDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      {event.description && (
                        <Text style={styles.eventListDescription} numberOfLines={2}>
                          {event.description}
                        </Text>
                      )}
                    </View>
                    {event.photo && (
                      <Image source={{ uri: event.photo }} style={styles.eventListImage} />
                    )}
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      )}

      {/* Add/Edit Event Modal */}
      <Modal
        visible={isEventModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEventModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Event' : 'Add Event'}</Text>
              <TouchableOpacity onPress={() => {
                setIsEventModalOpen(false);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
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
                <Text style={styles.label}>Date *</Text>
                <TextInput
                  style={styles.input}
                  value={eventForm.date}
                  onChangeText={(text) => setEventForm({ ...eventForm, date: text })}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Photo</Text>
                {eventForm.photoUrl && (
                  <Image source={{ uri: eventForm.photoUrl }} style={styles.photoPreview} />
                )}
                <TouchableOpacity style={styles.photoButton} onPress={handlePhotoPick}>
                  <Ionicons name="image" size={20} color="#fff" />
                  <Text style={styles.photoButtonText}>Pick Photo</Text>
                </TouchableOpacity>
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
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleEventSubmit}
                >
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? 'Update Event' : 'Create Event'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Event Modal */}
      <Modal
        visible={isViewModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsViewModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEvent?.name}</Text>
              <TouchableOpacity onPress={() => setIsViewModalOpen(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedEvent?.photo && (
                <Image source={{ uri: selectedEvent.photo }} style={styles.viewPhoto} />
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.viewText}>
                  {selectedEvent ? new Date(selectedEvent.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : ''}
                </Text>
              </View>
              {selectedEvent?.description && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <Text style={styles.viewText}>{selectedEvent.description}</Text>
                </View>
              )}
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image URL Input Modal */}
      <Modal
        visible={isUrlModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsUrlModalOpen(false)}
      >
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
                  onPress={handleUrlSubmit}
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
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    minHeight: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  calendarCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  calendarDay: {
    width: '14.28%',
    minHeight: 100,
    padding: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  calendarDayOtherMonth: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#fb923c',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  dayNumberToday: {
    color: '#fb923c',
    fontWeight: '800',
  },
  dayNumberOtherMonth: {
    color: '#9ca3af',
  },
  eventsContainer: {
    gap: 4,
    width: '100%',
    flex: 1,
  },
  eventDot: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
    minHeight: 20,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDotText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  moreEventsText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 16,
  },
  viewText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#fb923c',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsListSection: {
    margin: 20,
    marginTop: 0,
  },
  eventsListTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  eventsList: {
    gap: 12,
  },
  eventListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventListItemPast: {
    opacity: 0.6,
  },
  eventListDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  eventListContent: {
    flex: 1,
  },
  eventListName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventListDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  eventListDescription: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  eventListImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
  },
});
