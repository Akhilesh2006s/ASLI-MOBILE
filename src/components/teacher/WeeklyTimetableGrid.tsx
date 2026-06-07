import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  WEEKDAY_LABELS,
  buildWeekdayPlacements,
  formatHourLabel,
  formatSlotRange,
  getCellEntries,
  getTimeSlots,
  teacherSlotLabel,
  todayWeekdayIndex,
  type TimetableEntryLike,
  type WeekdayIndex,
} from '../../lib/timetable-utils';

type Props = {
  entries: TimetableEntryLike[];
  onEntryClick?: (entry: TimetableEntryLike) => void;
};

const DAY_COL = 84;
const TIME_COL = 92;
const HEADER_ORANGE = '#D3723E';
const HEADER_CORNER = '#B85F34';

export default function WeeklyTimetableGrid({ entries, onEntryClick }: Props) {
  const placements = buildWeekdayPlacements(entries);
  const timeSlots = getTimeSlots();
  const todayIdx = todayWeekdayIndex(new Date());
  const minWidth = DAY_COL + timeSlots.length * TIME_COL;

  return (
    <View style={styles.shell}>
      <ScrollView horizontal showsHorizontalScrollIndicator bounces={false}>
        <View style={{ minWidth }}>
          <View style={styles.headerRow}>
            <View style={[styles.cornerCell, { width: DAY_COL }]}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.cornerText}>TIME</Text>
            </View>
            {timeSlots.map((hour) => (
              <View key={hour} style={[styles.timeHeader, { width: TIME_COL }]}>
                <View style={styles.timeDot} />
                <Text style={styles.timeHeaderLabel}>{formatHourLabel(hour)}</Text>
                <Text style={styles.timeHeaderRange}>{formatSlotRange(hour)}</Text>
              </View>
            ))}
          </View>

          {WEEKDAY_LABELS.map((label, dayIndex) => {
            const isToday = todayIdx === dayIndex;
            return (
              <View key={label} style={styles.dayRow}>
                <View
                  style={[
                    styles.dayCell,
                    { width: DAY_COL },
                    isToday && styles.dayCellToday,
                  ]}
                >
                  {isToday ? <View style={styles.todayAccent} /> : null}
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]} numberOfLines={1}>
                    {label.slice(0, 3).toUpperCase()}
                  </Text>
                  {isToday ? (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Today</Text>
                    </View>
                  ) : null}
                </View>

                {timeSlots.map((hour, colIdx) => {
                  const cellEntries = getCellEntries(placements, dayIndex as WeekdayIndex, hour);
                  return (
                    <View
                      key={`${dayIndex}-${hour}`}
                      style={[
                        styles.slotCell,
                        { width: TIME_COL },
                        colIdx % 2 === 0 ? styles.slotCellAlt : null,
                      ]}
                    >
                      {cellEntries.length === 0 ? (
                        <View style={styles.emptyCell} />
                      ) : (
                        cellEntries.map((entry) => {
                          const done = entry.status === 'Completed';
                          const label = teacherSlotLabel(entry);
                          return (
                            <Pressable
                              key={entry._id || entry.id || `${label}-${hour}`}
                              style={[styles.entryCard, done && styles.entryDone]}
                              onPress={() => onEntryClick?.(entry)}
                            >
                              <Text style={styles.entryText} numberOfLines={3}>
                                {label}
                              </Text>
                              {done ? (
                                <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={styles.doneIcon} />
                              ) : null}
                            </Pressable>
                          );
                        })
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>Monday – Saturday · same weekly pattern</Text>
        {onEntryClick ? (
          <Text style={styles.footerHint}>Tap a class to mark as completed</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(211,114,62,0.35)',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_ORANGE,
  },
  cornerCell: {
    backgroundColor: HEADER_CORNER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.15)',
    gap: 4,
  },
  cornerText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.6,
  },
  timeHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.15)',
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  timeHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  timeHeaderRange: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243,244,246,0.9)',
  },
  dayCell: {
    backgroundColor: '#FFF9F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(254,215,170,0.5)',
    position: 'relative',
  },
  dayCellToday: {
    backgroundColor: '#FFF0E6',
  },
  todayAccent: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: HEADER_ORANGE,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.4,
  },
  dayLabelToday: {
    color: '#4A3121',
  },
  todayBadge: {
    marginTop: 4,
    backgroundColor: HEADER_ORANGE,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#fff',
  },
  slotCell: {
    minHeight: 52,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(243,244,246,0.8)',
    backgroundColor: '#fff',
  },
  slotCellAlt: {
    backgroundColor: '#fff',
  },
  emptyCell: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#f3f4f6',
    backgroundColor: 'rgba(249,250,251,0.5)',
  },
  entryCard: {
    backgroundColor: '#FFF9F2',
    borderWidth: 1,
    borderColor: 'rgba(211,114,62,0.35)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  entryDone: {
    opacity: 0.65,
  },
  entryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4A3121',
    lineHeight: 12,
  },
  doneIcon: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: HEADER_ORANGE,
  },
  footerText: {
    fontSize: 10,
    color: '#6b7280',
  },
  footerHint: {
    fontSize: 10,
    color: '#9ca3af',
  },
});
