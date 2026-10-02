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
import appEmitter from '../utils/appEmitter';
import { Brand } from '../constants/brandColors';

const ACCENT = Brand.ink;
const EVENT_DOT = Brand.inkSoft;
const PAGE_BG = Brand.paperSoft;
const TEXT = Brand.ink;
const TEXT_MUTED = Brand.inkFaint;
const TEXT_SOFT = Brand.inkMuted;

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
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
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
      soft: Brand.paperSoft,
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
      activeOpacity={0.85}
      onPress={() => onPress(item)}
    >
      <View style={[styles.agendaAccent, { backgroundColor: meta.color }]} />

      <View style={styles.agendaBody}>
        <View style={[styles.kindChip, { backgroundColor: meta.soft }]}>
          <Text style={[styles.kindChipText, { color: meta.color }]}>
            {meta.kind}
            {item.type === 'task' ? ` · ${meta.label}` : ''}
          </Text>
        </View>

        <View style={styles.agendaMainRow}>
          <View style={styles.agendaTextCol}>
            <Text style={styles.agendaTitle} numberOfLines={2}>
              {item.title || 'Untitled'}
            </Text>
            {description ? (
              <Text style={styles.agendaDesc} numberOfLines={1}>
                {description}
              </Text>
            ) : null}
          </View>

          <View style={styles.agendaRightCol}>
            <Text style={styles.agendaTime}>{timeLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={TEXT_MUTED} />
          </View>
        </View>
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

  useEffect(() => {
    const openCreate = () => {
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
    appEmitter.on('calendar-fab-press', openCreate);
    return () => appEmitter.off('calendar-fab-press', openCreate);
  }, [userRole]);

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
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={PAGE_BG} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.muted}>Loading calendar…</Text>
        </View>
      </View>
    );
  }

  if (error && !feed) {
    return (
      <View style={styles.root}>
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
            contentContainerStyle={styles.monthScroll}
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

            <View style={styles.calendarCard}>
              <View style={styles.monthNav}>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={() => setVisibleMonth((m) => shiftMonth(m, -1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={TEXT} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  {formatMonthTitle(visibleMonth)}
                </Text>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={() => setVisibleMonth((m) => shiftMonth(m, 1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={20} color={TEXT} />
                </TouchableOpacity>
              </View>

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
                  textDayHeaderFontWeight: '600',
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
              <View style={styles.sheetHandle} />

              <View style={styles.agendaHeader}>
                <View style={styles.agendaHeaderLeft}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeDay}>
                      {String(selectedDate).split('-')[2]}
                    </Text>
                    <Text style={styles.dateBadgeWeek}>
                      {WEEKDAYS_SHORT[
                        new Date(
                          Number(String(selectedDate).split('-')[0]),
                          Number(String(selectedDate).split('-')[1]) - 1,
                          Number(String(selectedDate).split('-')[2])
                        ).getDay()
                      ]}
                    </Text>
                  </View>
                  <View style={styles.agendaHeaderCopy}>
                    <Text style={styles.agendaHeaderDate}>
                      {formatAgendaHeader(selectedDate)}
                    </Text>
                    <Text style={styles.agendaSubtitle}>
                      {selectedItems.length}{' '}
                      {selectedItems.length === 1 ? 'item' : 'items'} scheduled
                    </Text>
                  </View>
                </View>

                <View style={styles.agendaActions}>
                  <TouchableOpacity
                    style={styles.agendaActionBtn}
                    onPress={() => {
                      if (userRole === 'Owner') {
                        setShowEventCreationDialog(true);
                        return;
                      }
                      Toast.show({
                        type: 'info',
                        text1: 'Access Restricted',
                        text2: 'Only Owners can create events',
                        visibilityTime: 3000,
                        topOffset: 80,
                      });
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="calendar-outline" size={18} color={TEXT_SOFT} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.agendaActionBtn} activeOpacity={0.75}>
                    <Ionicons name="ellipsis-vertical" size={16} color={TEXT_SOFT} />
                  </TouchableOpacity>
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
          topInset={0}
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
    paddingTop: 4,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
    paddingTop: 8,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.paperSoft,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.3,
  },
  calendarCard: {
    marginHorizontal: 14,
    backgroundColor: Brand.paper,
    borderRadius: 24,
    paddingBottom: 10,
    paddingHorizontal: 6,
    shadowColor: Brand.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.line,
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
    color: Brand.onInk,
    fontWeight: '700',
  },
  dayNumberDisabled: {
    color: Brand.lineStrong,
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
    marginTop: 14,
    marginHorizontal: 14,
    backgroundColor: Brand.paper,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 18,
    minHeight: 220,
    shadowColor: Brand.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.line,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.lineStrong,
    marginBottom: 14,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  agendaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  dateBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateBadgeDay: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.onInk,
    lineHeight: 18,
  },
  dateBadgeWeek: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  agendaHeaderCopy: {
    flex: 1,
  },
  agendaHeaderDate: {
    fontSize: 16,
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
  agendaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agendaActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.paperSoft,
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
    backgroundColor: Brand.paperSoft,
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
    backgroundColor: Brand.paper,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.line,
  },
  agendaAccent: {
    width: 4,
  },
  agendaBody: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  kindChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 8,
  },
  kindChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  agendaMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agendaTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  agendaRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
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
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
});

export default CalenderScreen;
