// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import HomeBottomNav from './HomeBottomNav';
import TaskDetailsModal from './TaskDetailsModal';
import EventDetailsModal from './EventDetailsModal';
import CreateEventModal from './CreateEventModal';
import { useCalendarFeed, useInvalidateCalendar } from '../hooks/queries';
import { calendarRangeForWeek } from '../services/api/endpoints/calendar';
import {
  getPriorityColor,
  toLocalDateKey,
} from '../services/calendar/calendarHelpers';
import { getUserRole } from '../services/utils/userRole';

const ACCENT = '#2563EB';
const EVENT_COLOR = '#2563EB';
const PAGE_BG = '#F5F6F8';
const TEXT = '#111827';
const TEXT_MUTED = '#9CA3AF';
const TEXT_SOFT = '#6B7280';
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const HOUR_HEIGHT = 76;
const HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => DAY_START_HOUR + i
);
const TIMELINE_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startLabel = `${MONTH_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}`;
  const endLabel = sameMonth
    ? `${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${MONTH_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
}

function formatHourLabel(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatTimeRange(item) {
  const start = item.startTime ? new Date(item.startTime) : null;
  const end = item.endTime ? new Date(item.endTime) : null;
  if (!start || Number.isNaN(start.getTime())) return 'All day';

  const fmt = (date) =>
    date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  if (!end || Number.isNaN(end.getTime())) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function softTint(hex, fallback = '#F4F7FF') {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return fallback;
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return fallback;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.08)`;
}

function getItemColor(item) {
  if (item.type === 'event') return EVENT_COLOR;
  return getPriorityColor(item.priority);
}

function getItemIcon(item) {
  if (item.type === 'event') return 'calendar-outline';
  const priority = String(item.priority || '').toLowerCase();
  if (priority === 'critical' || priority === 'high') return 'briefcase-outline';
  if (priority === 'low') return 'leaf-outline';
  return 'flag-outline';
}

function minutesFromDayStart(date) {
  return date.getHours() * 60 + date.getMinutes() - DAY_START_HOUR * 60;
}

function WeekDayChip({ day, selected, dots, onPress }) {
  return (
    <TouchableOpacity style={styles.dayChip} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.dayChipLabel, selected && styles.dayChipLabelSelected]}>
        {WEEKDAY_SHORT[day.getDay()]}
      </Text>
      <View style={[styles.dayChipCircle, selected && styles.dayChipCircleSelected]}>
        <Text
          style={[styles.dayChipNumber, selected && styles.dayChipNumberSelected]}
        >
          {day.getDate()}
        </Text>
      </View>
      <View style={styles.dayDotRow}>
        {(dots || []).slice(0, 4).map((color, index) => (
          <View
            key={`${toLocalDateKey(day)}-dot-${index}`}
            style={[styles.dayDot, { backgroundColor: color }]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

function TimelineCard({ item, top, height, onPress }) {
  const color = getItemColor(item);
  return (
    <TouchableOpacity
      style={[
        styles.timelineCard,
        {
          top,
          height: Math.max(height, 58),
          backgroundColor: softTint(color),
        },
      ]}
      activeOpacity={0.85}
      onPress={() => onPress(item)}
    >
      <View style={[styles.timelineAccent, { backgroundColor: color }]} />
      <View style={[styles.timelineIconWrap, { backgroundColor: softTint(color, '#E0E7FF') }]}>
        <Ionicons name={getItemIcon(item)} size={16} color={color} />
      </View>
      <View style={styles.timelineCardBody}>
        <Text style={styles.timelineTitle} numberOfLines={1}>
          {item.title || 'Untitled'}
        </Text>
        <Text style={styles.timelineTime} numberOfLines={1}>
          {formatTimeRange(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MyWeekView({
  navigation,
  hideBottomNav = false,
  header = null,
  topInset = 0,
}) {
  const todayKey = toLocalDateKey(new Date());
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => todayKey);
  const [now, setNow] = useState(() => new Date());
  const [dialogTask, setDialogTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [dialogEvent, setDialogEvent] = useState(null);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);
  const [showEventCreationDialog, setShowEventCreationDialog] = useState(false);

  const weekRange = useMemo(
    () => calendarRangeForWeek(weekAnchor),
    [weekAnchor]
  );
  const { data: feed, isLoading, isRefetching, refetch } = useCalendarFeed(
    true,
    weekRange
  );
  const invalidateCalendar = useInvalidateCalendar();

  const tasksByDate = feed?.tasksByDate || {};
  const eventsByDate = feed?.eventsByDate || {};
  const combinedByDate = feed?.combinedByDate || {};
  const feedTruncated =
    !!feed?.meta?.truncatedTasks || !!feed?.meta?.truncatedEvents;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(weekAnchor, index));
  }, [weekAnchor]);

  useEffect(() => {
    const keys = weekDays.map((d) => toLocalDateKey(d));
    if (!keys.includes(selectedDate)) {
      const todayInWeek = keys.includes(todayKey);
      setSelectedDate(todayInWeek ? todayKey : keys[0]);
    }
  }, [weekDays, selectedDate, todayKey]);

  const selectedItems = useMemo(() => {
    const list = combinedByDate[selectedDate] || [
      ...(tasksByDate[selectedDate] || []),
      ...(eventsByDate[selectedDate] || []),
    ];
    return [...list].sort((a, b) => {
      const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
      return aTime - bTime;
    });
  }, [combinedByDate, tasksByDate, eventsByDate, selectedDate]);

  const dotsByDate = useMemo(() => {
    const map = {};
    weekDays.forEach((day) => {
      const key = toLocalDateKey(day);
      const items = combinedByDate[key] || [
        ...(tasksByDate[key] || []),
        ...(eventsByDate[key] || []),
      ];
      map[key] = items.slice(0, 4).map((item) => getItemColor(item));
    });
    return map;
  }, [weekDays, combinedByDate, tasksByDate, eventsByDate]);

  const positionedItems = useMemo(() => {
    return selectedItems
      .map((item) => {
        if (!item.startTime) {
          return { item, top: 0, height: 58, allDay: true };
        }
        const start = new Date(item.startTime);
        const end = item.endTime
          ? new Date(item.endTime)
          : new Date(start.getTime() + 60 * 60 * 1000);
        let startMin = minutesFromDayStart(start);
        let endMin = minutesFromDayStart(end);
        if (Number.isNaN(startMin)) return null;
        if (endMin <= startMin) endMin = startMin + 60;
        startMin = Math.max(0, Math.min(startMin, (DAY_END_HOUR - DAY_START_HOUR) * 60 - 30));
        endMin = Math.max(startMin + 30, Math.min(endMin, (DAY_END_HOUR - DAY_START_HOUR) * 60));
        const top = (startMin / 60) * HOUR_HEIGHT;
        const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
        return { item, top, height: Math.max(height, 58), allDay: false };
      })
      .filter(Boolean);
  }, [selectedItems]);

  const nowIndicatorTop = useMemo(() => {
    if (selectedDate !== todayKey) return null;
    const mins = minutesFromDayStart(now);
    if (mins < 0 || mins > (DAY_END_HOUR - DAY_START_HOUR) * 60) return null;
    return (mins / 60) * HOUR_HEIGHT;
  }, [now, selectedDate, todayKey]);

  const onRefresh = async () => {
    await refetch();
  };

  const handleEventCreated = async () => {
    await invalidateCalendar();
    await refetch();
  };

  const handleFabPress = async () => {
    const userRole = await getUserRole();
    if (userRole === 'Owner') {
      setShowEventCreationDialog(true);
      return;
    }
    Toast.show({
      type: 'info',
      text1: 'Access Restricted',
      text2: 'Only Owners can create events',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });
  };

  const handleViewTask = (task) => {
    navigation?.navigate?.('TaskDetails', {
      taskId: task.originalTaskId || task.id,
    });
  };

  const openItem = (item) => {
    if (item.type === 'event') {
      setDialogEvent(item);
      setShowEventDetailsDialog(true);
      return;
    }
    setDialogTask(item);
    setShowTaskDialog(true);
  };

  const shiftWeek = (delta) => {
    setWeekAnchor((prev) => addDays(prev, delta * 7));
  };

  if (isLoading && !feed) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} />
          <Text style={styles.muted}>Loading week…</Text>
        </View>
        {!hideBottomNav ? <HomeBottomNav onAddPress={handleFabPress} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          topInset ? { paddingTop: topInset } : null,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={[ACCENT]}
            tintColor={ACCENT}
            progressBackgroundColor="#FFFFFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {header}

        <View style={styles.weekNav}>
          <TouchableOpacity
            style={styles.weekNavBtn}
            onPress={() => shiftWeek(-1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.weekRange}>{formatWeekRange(weekAnchor)}</Text>
          <TouchableOpacity
            style={styles.weekNavBtn}
            onPress={() => shiftWeek(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={22} color={TEXT} />
          </TouchableOpacity>
        </View>

        <View style={styles.dayStrip}>
          {weekDays.map((day) => {
            const key = toLocalDateKey(day);
            return (
              <WeekDayChip
                key={key}
                day={day}
                selected={key === selectedDate}
                dots={dotsByDate[key]}
                onPress={() => setSelectedDate(key)}
              />
            );
          })}
        </View>

        {feedTruncated ? (
          <Text style={styles.truncatedNotice}>
            Showing the first batch of items for this range
          </Text>
        ) : null}

        <View style={styles.timelineWrap}>
          <View style={styles.hourLabels}>
            {HOURS.map((hour) => (
              <View key={`label-${hour}`} style={styles.hourLabelSlot}>
                <Text style={styles.hourLabel}>{formatHourLabel(hour)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.timelineTrack, { height: TIMELINE_HEIGHT + HOUR_HEIGHT }]}>
            <View style={styles.timelineLine} />

            {HOURS.map((hour) => (
              <View
                key={`grid-${hour}`}
                style={[
                  styles.hourGridLine,
                  { top: (hour - DAY_START_HOUR) * HOUR_HEIGHT },
                ]}
              />
            ))}

            {nowIndicatorTop != null ? (
              <View style={[styles.nowRow, { top: nowIndicatorTop }]}>
                <View style={styles.nowDot} />
                <View style={styles.nowLine} />
              </View>
            ) : null}

            <View style={styles.cardsLayer}>
              {positionedItems.map(({ item, top, height }) => (
                <TimelineCard
                  key={`${item.type}-${item.id}-${item.currentDisplayDate || ''}`}
                  item={item}
                  top={top}
                  height={height}
                  onPress={openItem}
                />
              ))}
            </View>

            {selectedItems.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>Nothing scheduled</Text>
                <Text style={styles.emptyText}>
                  Tasks and events for this day will show up here
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {!hideBottomNav ? <HomeBottomNav onAddPress={handleFabPress} /> : null}

      <TaskDetailsModal
        visible={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        task={dialogTask}
        onViewTask={handleViewTask}
      />

      <EventDetailsModal
        visible={showEventDetailsDialog}
        onClose={() => setShowEventDetailsDialog(false)}
        event={dialogEvent}
        onEventUpdated={handleEventCreated}
      />

      <CreateEventModal
        visible={showEventCreationDialog}
        onClose={() => setShowEventCreationDialog(false)}
        selectedDate={selectedDate}
        onEventCreated={handleEventCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    marginTop: 10,
    color: TEXT_SOFT,
    fontSize: 13,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  weekNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRange: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.2,
  },
  dayStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayChipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MUTED,
    marginBottom: 6,
  },
  dayChipLabelSelected: {
    color: ACCENT,
  },
  dayChipCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipCircleSelected: {
    backgroundColor: ACCENT,
  },
  dayChipNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT,
  },
  dayChipNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 5,
    minHeight: 6,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  truncatedNotice: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  timelineWrap: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  hourLabels: {
    width: 52,
  },
  hourLabelSlot: {
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MUTED,
    marginTop: -6,
  },
  timelineTrack: {
    flex: 1,
    position: 'relative',
    marginLeft: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#BFDBFE',
    borderRadius: 1,
  },
  hourGridLine: {
    position: 'absolute',
    left: 18,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
  },
  nowRow: {
    position: 'absolute',
    left: 2,
    right: 0,
    height: 14,
    marginTop: -7,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
    marginRight: 0,
  },
  nowLine: {
    flex: 1,
    height: 2,
    backgroundColor: ACCENT,
    borderRadius: 1,
    marginLeft: -1,
  },
  cardsLayer: {
    position: 'absolute',
    left: 22,
    right: 0,
    top: 0,
    bottom: 0,
  },
  timelineCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    paddingRight: 10,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  timelineAccent: {
    width: 5,
    alignSelf: 'stretch',
  },
  timelineIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 8,
  },
  timelineCardBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  timelineTime: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_SOFT,
  },
  emptyWrap: {
    position: 'absolute',
    left: 22,
    right: 8,
    top: 40,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
});
