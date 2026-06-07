import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
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
import { TEACHER } from '../../theme/teacher';

type Props = {
  entries: TimetableEntryLike[];
  onEntryClick?: (entry: TimetableEntryLike) => void;
};

const DAY_COL = 84;
const TIME_COL = 92;

function usePressScale(to = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(to, { damping: 14, stiffness: 300 }); };
  const onPressOut = () => { scale.value = withSpring(1.0, { damping: 14, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

function EntryCard({
  entry,
  hour,
  onEntryClick,
}: {
  entry: TimetableEntryLike;
  hour: number;
  onEntryClick?: (entry: TimetableEntryLike) => void;
}) {
  const press = usePressScale();
  const done = entry.status === 'Completed';
  const label = teacherSlotLabel(entry);

  return (
    <Pressable
      onPress={() => onEntryClick?.(entry)}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[styles.entryCard, done && styles.entryDone, press.style]}>
        <Text style={styles.entryText} numberOfLines={3}>
          {label}
        </Text>
        {done ? (
          <Ionicons name="checkmark-circle" size={12} color={TEACHER.success} style={styles.doneIcon} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export default function WeeklyTimetableGrid({ entries, onEntryClick }: Props) {
  const placements = buildWeekdayPlacements(entries);
  const timeSlots = getTimeSlots();
  const todayIdx = todayWeekdayIndex(new Date());
  const minWidth = DAY_COL + timeSlots.length * TIME_COL;

  return (
    <View style={styles.shell}>
      <ScrollView horizontal showsHorizontalScrollIndicator bounces={false}>
        <View style={{ minWidth }}>
          <LinearGradient
            colors={['#EEF2FF', '#E0E7FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerRow}
          >
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
          </LinearGradient>

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
                        cellEntries.map((entry) => (
                          <EntryCard
                            key={entry._id || entry.id || `${teacherSlotLabel(entry)}-${hour}`}
                            entry={entry}
                            hour={hour}
                            onEntryClick={onEntryClick}
                          />
                        ))
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
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.cardBg,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
  },
  cornerCell: {
    backgroundColor: TEACHER.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: TEACHER.surfaceBorder,
    gap: 4,
  },
  cornerText: {
    fontSize: 9,
    fontWeight: '800',
    color: TEACHER.primaryDark,
    letterSpacing: 0.6,
  },
  timeHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: TEACHER.surfaceBorder,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEACHER.primary,
    marginBottom: 4,
  },
  timeHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: TEACHER.text,
  },
  timeHeaderRange: {
    fontSize: 8,
    color: TEACHER.textMuted,
    marginTop: 2,
  },
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
  },
  dayCell: {
    backgroundColor: TEACHER.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: TEACHER.surfaceBorder,
    position: 'relative',
  },
  dayCellToday: {
    backgroundColor: TEACHER.surfaceHover,
  },
  todayAccent: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: TEACHER.primary,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: TEACHER.textSecondary,
    letterSpacing: 0.4,
  },
  dayLabelToday: {
    color: TEACHER.primaryDark,
  },
  todayBadge: {
    marginTop: 4,
    backgroundColor: TEACHER.primary,
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
    borderRightColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.cardBg,
  },
  slotCellAlt: {
    backgroundColor: TEACHER.surface,
  },
  emptyCell: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surface,
  },
  entryCard: {
    backgroundColor: TEACHER.surfaceHover,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.20)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
  },
  entryDone: {
    opacity: 0.5,
  },
  entryText: {
    fontSize: 9,
    fontWeight: '700',
    color: TEACHER.text,
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
    borderTopColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surface,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEACHER.cardBg,
    borderWidth: 2,
    borderColor: TEACHER.primary,
  },
  footerText: {
    fontSize: 10,
    color: TEACHER.textMuted,
  },
  footerHint: {
    fontSize: 10,
    color: TEACHER.textMuted,
  },
});
