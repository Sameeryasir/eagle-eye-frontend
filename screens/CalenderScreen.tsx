// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { getUserRole } from '../services/utils/userRole';
import HomeBottomNav from '../components/HomeBottomNav';
import MyWeekView from '../components/WeekView';
import CalendarToggle from '../components/CalendarToggle';
import CreateEventModal from '../components/CreateEventModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import EventDetailsModal from '../components/EventDetailsModal';
import { useCalendarFeed, useInvalidateCalendar } from '../hooks/queries';
import { calendarRangeForMonth } from '../services/api/endpoints/calendar';
import {
  getPriorityColor,
  toLocalDateKey,
} from '../services/calendar/calendarHelpers';

const ACCENT = '#2563EB';
const EVENT_DOT = '#2563EB';
const PAGE_BG = '#F3F4F6';
const TEXT = '#111827';
const TEXT_MUTED = '#9CA3AF';
const TEXT_SOFT = '#6B7280';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shiftMonth(dateKey, delta) {
  const [y, m] = String(dateKey).split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatMonthTitle(dateKey) {
  const [y, m] = String(dateKey).split('-').map(Number);
  return `${MONTH_NAMES[(m || 1) - 1]} ${y}`;
}

function formatAgendaHeader(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = WEEKDAYS_SHORT[date.getDay()];
  const month = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${weekday}, ${month} ${d}`;
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

  if (!end || Number.isNaN(end.getTime()) || !item.hasEndTime && !item.endTime) {
    return fmt(start);
  }
  return `${fmt(start)} — ${fmt(end)}`;
}

function getItemMeta(item) {
  if (item.type === 'event') {
    return {
      kind: 'Event',
      label: 'Event',
      color: EVENT_DOT,
      soft: '#EFF6FF',
    };
  }

  const priority = String(item.priority || 'medium').toLowerCase();
  const color = getPriorityColor(priority);

  if (priority === 'critical') {
    return {
      kind: 'Task',
      label: 'Critical',
      color,
      soft: '#FFF1F2',
    };
  }
  if (priority === 'high') {
    return {
      kind: 'Task',
      label: 'High',
      color,
      soft: '#FDF2F8',
    };
  }
  if (priority === 'low') {
    return {
      kind: 'Task',
      label: 'Low',
      color,
      soft: '#F0FDF4',
    };
  }
  return {
    kind: 'Task',
    label: 'Medium',
    color,
    soft: '#FFF7ED',
  };
}

const MonthDayCell = React.memo(function MonthDayCell({
  date,
  state,
  dots,
  selected,
  onPress,
}) {
  const isDisabled = state === 'disabled';
  const isToday = state === 'today';

  return (
    <TouchableOpacity
      onPress={() => onPress(date)}
      activeOpacity={0.75}
      style={styles.dayCell}
    >
      <View
        style={[
          styles.dayCircle,
          isToday && !selected && styles.dayCircleToday,
          selected && styles.dayCircleSelected,
        ]}
      >
        <Text
          style={[
            styles.dayNumber,
            isDisabled && styles.dayNumberDisabled,
            selected && styles.dayNumberSelected,
            isToday && !selected && styles.dayNumberToday,
          ]}
        >
          {date.day}
        </Text>
      </View>
      <View style={styles.dotRow}>
        {(dots || []).slice(0, 3).map((color, index) => (
          <View
            key={`${date.dateString}-dot-${index}`}
            style={[styles.dot, { backgroundColor: color }]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
});

function AgendaCard({ item, onPress }) {
  const meta = getItemMeta(item);
  const description = String(item.description || '').trim();
  const timeLabel = formatTimeRange(item);

  return (
    <TouchableOpacity
      style={styles.agendaCard}
      activeOpacity={0.8}
      onPress={() => onPress(item)}
    >
      <View style={[styles.agendaAccent, { backgroundColor: meta.color }]} />

      <View style={styles.agendaBody}>
        <View style={styles.agendaTopRow}>
          <View style={[styles.kindChip, { backgroundColor: meta.soft }]}>
            <Text style={[styles.kindChipText, { color: meta.color }]}>
              {meta.kind}
              {item.type === 'task' ? ` · ${meta.label}` : ''}
            </Text>
          </View>
          <Text style={styles.agendaTime}>{timeLabel}</Text>
        </View>

        <Text style={styles.agendaTitle} numberOfLines={2}>
          {item.title || 'Untitled'}
        </Text>

        {description ? (
          <Text style={styles.agendaDesc} numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function CalenderScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const todayKey = toLocalDateKey(new Date());
  const [viewMode, setViewMode] = useState('monthly');
  const [userRole, setUserRole] = useState(null);
  const [showEventCreationDialog, setShowEventCreationDialog] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => todayKey);
  const [selectedDate, setSelectedDate] = useState(() => todayKey);
  const [dialogTask, setDialogTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [dialogEvent, setDialogEvent] = useState(null);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);

  const monthRange = useMemo(
    () => calendarRangeForMonth(visibleMonth),
    [visibleMonth]
  );

  const {
    data: feed,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useCalendarFeed(viewMode === 'monthly', monthRange);
  const invalidateCalendar = useInvalidateCalendar();

  const tasksByDate = feed?.tasksByDate || {};
  const eventsByDate = feed?.eventsByDate || {};
  const combinedByDate = feed?.combinedByDate || {};
  const feedTruncated =
    !!feed?.meta?.truncatedTasks || !!feed?.meta?.truncatedEvents;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const role = await getUserRole();
        if (mounted) setUserRole(role);
      } catch {
        if (mounted) setUserRole(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  const onDayPress = useCallback((day) => {
    setSelectedDate(day.dateString);
    setVisibleMonth(`${day.dateString.slice(0, 8)}01`);
  }, []);

  const renderDay = useCallback(
    ({ date, state }) => {
      const combined = combinedByDate[date.dateString] || [
        ...(tasksByDate[date.dateString] || []),
        ...(eventsByDate[date.dateString] || []),
      ];
      const dots = combined.slice(0, 3).map((item) =>
        item.type === 'event' ? EVENT_DOT : getPriorityColor(item.priority)
      );

      return (
        <MonthDayCell
          date={date}
          state={state}
          dots={dots}
          selected={date.dateString === selectedDate}
          onPress={onDayPress}
        />
      );
    },
    [tasksByDate, eventsByDate, combinedByDate, selectedDate, onDayPress]
  );

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleEventCreated = useCallback(async () => {
    await invalidateCalendar();
    await refetch();
  }, [invalidateCalendar, refetch]);

  const openItem = useCallback(
    (item) => {
      if (item.type === 'event') {
        setDialogEvent(item);
        setShowEventDetailsDialog(true);
        return;
      }
      setDialogTask(item);
      setShowTaskDialog(true);
    },
    []
  );

  if (isLoading && !feed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.muted}>Loading calendar…</Text>
        </View>
        <HomeBottomNav />
      </View>
    );
  }

  if (error && !feed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={36} color={TEXT_MUTED} />
          <Text style={styles.errorText}>
            {error?.message || 'Failed to load calendar'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <HomeBottomNav />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />

      {viewMode === 'monthly' ? (
        <View style={styles.monthLayout}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.monthScroll,
              { paddingTop: insets.top },
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
            <CalendarToggle
              currentView={viewMode}
              onWeeklyPress={() => setViewMode('weekly')}
              onMonthlyPress={() => setViewMode('monthly')}
              containerStyle={styles.toggleInScroll}
            />

            <View style={styles.monthNav}>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => setVisibleMonth((m) => shiftMonth(m, -1))}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={22} color={TEXT} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {formatMonthTitle(visibleMonth)}
              </Text>
              <TouchableOpacity
                style={styles.monthNavBtn}
                onPress={() => setVisibleMonth((m) => shiftMonth(m, 1))}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={22} color={TEXT} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarCard}>
              <Calendar
                key={visibleMonth}
                current={visibleMonth}
                onDayPress={onDayPress}
                onMonthChange={(month) => {
                  setVisibleMonth(
                    `${month.year}-${String(month.month).padStart(2, '0')}-01`
                  );
                }}
                dayComponent={renderDay}
                hideArrows
                renderHeader={() => null}
                enableSwipeMonths
                theme={{
                  backgroundColor: 'transparent',
                  calendarBackground: 'transparent',
                  textSectionTitleColor: TEXT_MUTED,
                  textDayHeaderFontSize: 12,
                  textDayHeaderFontWeight: '500',
                  stylesheet: {
                    calendar: {
                      header: {
                        height: 0,
                        margin: 0,
                        padding: 0,
                        opacity: 0,
                      },
                    },
                  },
                }}
              />
            </View>

            <View style={styles.agendaSheet}>
              <View style={styles.agendaHeader}>
                <View>
                  <Text style={styles.agendaHeaderDate}>
                    {formatAgendaHeader(selectedDate)}
                  </Text>
                  <Text style={styles.agendaSubtitle}>
                    {selectedDate === todayKey ? 'Today' : 'Schedule'}
                  </Text>
                </View>
                <View style={styles.agendaCountPill}>
                  <Text style={styles.agendaCount}>
                    {selectedItems.length}{' '}
                    {selectedItems.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>

              {feedTruncated ? (
                <Text style={styles.truncatedNotice}>
                  Showing the first batch of items for this range
                </Text>
              ) : null}

              {selectedItems.length === 0 ? (
                <View style={styles.emptyAgenda}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons
                      name="calendar-outline"
                      size={22}
                      color={TEXT_MUTED}
                    />
                  </View>
                  <Text style={styles.emptyAgendaTitle}>No plans yet</Text>
                  <Text style={styles.emptyAgendaText}>
                    Tasks and events for this day will show up here
                  </Text>
                </View>
              ) : (
                selectedItems.map((item) => (
                  <AgendaCard
                    key={`${item.type}-${item.id}-${item.currentDisplayDate || ''}`}
                    item={item}
                    onPress={openItem}
                  />
                ))
              )}
            </View>
          </ScrollView>
        </View>
      ) : (
        <MyWeekView
          navigation={navigation}
          hideBottomNav
          topInset={insets.top}
          header={
            <CalendarToggle
              currentView={viewMode}
              onWeeklyPress={() => setViewMode('weekly')}
              onMonthlyPress={() => setViewMode('monthly')}
              containerStyle={styles.toggleInScroll}
            />
          }
        />
      )}

      <HomeBottomNav
        onAddPress={() => {
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
        }}
      />

      <CreateEventModal
        visible={showEventCreationDialog}
        onClose={() => setShowEventCreationDialog(false)}
        selectedDate={selectedDate}
        onEventCreated={handleEventCreated}
      />

      <TaskDetailsModal
        visible={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        task={dialogTask}
        onViewTask={(task) => {
          setShowTaskDialog(false);
          navigation.navigate('TaskDetails', {
            taskId: task.originalTaskId || task.id,
          });
        }}
      />

      <EventDetailsModal
        visible={showEventDetailsDialog}
        onClose={() => setShowEventDetailsDialog(false)}
        event={dialogEvent}
        onEventUpdated={handleEventCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  flex: { flex: 1 },
  monthLayout: {
    flex: 1,
  },
  toggleInScroll: {
    marginTop: 0,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  muted: {
    marginTop: 12,
    color: TEXT_SOFT,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    color: '#DC2626',
    textAlign: 'center',
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: ACCENT,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  monthScroll: {
    paddingBottom: 120,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginBottom: 6,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.3,
  },
  calendarCard: {
    marginHorizontal: 12,
    paddingBottom: 4,
  },
  dayCell: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  dayCircleSelected: {
    backgroundColor: ACCENT,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT,
  },
  dayNumberToday: {
    color: ACCENT,
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumberDisabled: {
    color: '#D1D5DB',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 3,
    minHeight: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  agendaSheet: {
    marginTop: 10,
    marginHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 18,
    minHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  agendaHeaderDate: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.2,
  },
  agendaSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_MUTED,
  },
  agendaCountPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  agendaCount: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SOFT,
  },
  truncatedNotice: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_MUTED,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  emptyAgenda: {
    paddingVertical: 36,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyAgendaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  emptyAgendaText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  agendaCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  agendaAccent: {
    width: 4,
  },
  agendaBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  agendaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  kindChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kindChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  agendaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  agendaDesc: {
    marginTop: 4,
    fontSize: 12,
    color: TEXT_SOFT,
    lineHeight: 16,
  },
  agendaTime: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
});

export default CalenderScreen;
