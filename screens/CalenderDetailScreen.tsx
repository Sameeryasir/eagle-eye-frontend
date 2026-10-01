// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Timetable from 'react-native-calendar-timetable';
import { Ionicons } from '@expo/vector-icons';
import HomeBottomNav from '../components/HomeBottomNav';
import { getUserRole } from '../services/utils/userRole';
import CreateEventModal from '../components/CreateEventModal';
import EventDetailsModal from '../components/EventDetailsModal';
import PastDateDialog from '../components/PastDateDialog';
import TaskDetailsModal from '../components/TaskDetailsModal';
import AccessDeniedDialog from '../components/AccessDeniedDialog';
import { useCalendarFeed, useInvalidateCalendar } from '../hooks/queries';
import {
  formatDisplayDate,
  getPriorityColor,
  toLocalDateKey,
} from '../services/calendar/calendarHelpers';
import { Brand } from '../constants/brandColors';

const CalenderDetailScreen = ({ route, navigation }) => {
  const {
    selectedDate,
    tasks: routeTasks = [],
    events: routeEvents = [],
    combinedItems: routeCombined = [],
  } = route.params || {};

  const { data: feed, isLoading, refetch } = useCalendarFeed();
  const invalidateCalendar = useInvalidateCalendar();

  const [dialogTask, setDialogTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showEventCreationDialog, setShowEventCreationDialog] = useState(false);
  const [showPastDateDialog, setShowPastDateDialog] = useState(false);
  const [dialogEvent, setDialogEvent] = useState(null);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);
  const [accessDeniedDialogVisible, setAccessDeniedDialogVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);

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

  const dayTasks = useMemo(() => {
    if (feed?.tasksByDate?.[selectedDate]) {
      return feed.tasksByDate[selectedDate];
    }
    return Array.isArray(routeTasks) ? routeTasks : [];
  }, [feed, selectedDate, routeTasks]);

  const dayEvents = useMemo(() => {
    if (feed?.eventsByDate?.[selectedDate]) {
      return feed.eventsByDate[selectedDate];
    }
    return Array.isArray(routeEvents) ? routeEvents : [];
  }, [feed, selectedDate, routeEvents]);

  const items = useMemo(() => {
    const allItems = [];

    dayTasks.forEach((task) => {
      let startDate = task.startTime
        ? new Date(task.startTime)
        : selectedDate
          ? new Date(`${selectedDate}T09:00:00`)
          : new Date();

      let endDate;
      if (task.endTime && (task.hasEndTime || task.endTime)) {
        endDate = new Date(task.endTime);
        if (selectedDate && toLocalDateKey(endDate) !== selectedDate) {
          const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
          endDate = new Date(selectedDateObj);
          endDate.setHours(
            new Date(task.endTime).getHours(),
            new Date(task.endTime).getMinutes(),
            0,
            0
          );
        }
      } else {
        endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      }

      if (selectedDate && toLocalDateKey(startDate) !== selectedDate) {
        const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
        const hours = startDate.getHours();
        const minutes = startDate.getMinutes();
        startDate = new Date(selectedDateObj);
        startDate.setHours(hours, minutes, 0, 0);
      }

      const uniqueKey = `task-${task.id}`;
      allItems.push({
        id: uniqueKey,
        key: uniqueKey,
        title: task.title || 'Untitled Task',
        startDate,
        endDate,
        description: task.description,
        priority: task.priority,
        status: task.status,
        assignedTo: task.assignedTo,
        originalTaskId: task.id,
        type: 'task',
        hasEndTime: !!task.hasEndTime || !!task.endTime,
        endTimeFormatted: task.endTimeFormatted || 'No end time',
      });
    });

    dayEvents.forEach((event) => {
      let startDate = event.startTime
        ? new Date(event.startTime)
        : new Date(`${selectedDate}T09:00:00`);
      let endDate = event.endTime
        ? new Date(event.endTime)
        : new Date(startDate.getTime() + 60 * 60 * 1000);

      const eventStartKey = toLocalDateKey(startDate);
      const eventEndKey = toLocalDateKey(endDate);
      const isMultiDayEvent = eventStartKey !== eventEndKey;

      if (isMultiDayEvent && selectedDate) {
        if (eventStartKey !== selectedDate) {
          startDate = new Date(`${selectedDate}T00:00:00`);
        }
        if (eventEndKey !== selectedDate) {
          endDate = new Date(`${selectedDate}T23:59:00`);
        }
      }

      const uniqueKey = `event-${event.id}-${selectedDate || 'day'}`;
      allItems.push({
        id: uniqueKey,
        key: uniqueKey,
        title: event.title || 'Untitled Event',
        startDate,
        endDate,
        description: event.description,
        priority: event.priority || 'medium',
        status: event.status || 'pending',
        originalEventId: event.id,
        type: 'event',
        assignedTo: event.assignedTo || [],
        projects: event.projects || [],
        isMultiDayEvent,
        originalStartDate: event.originalStartDate || eventStartKey,
        originalEndDate: event.originalEndDate || eventEndKey,
        currentDisplayDate: selectedDate,
      });
    });

    if (
      allItems.length === 0 &&
      Array.isArray(routeCombined) &&
      routeCombined.length > 0
    ) {
      routeCombined.forEach((item) => {
        const startDate = item.startTime
          ? new Date(item.startTime)
          : new Date(`${selectedDate}T09:00:00`);
        const endDate = item.endTime
          ? new Date(item.endTime)
          : new Date(startDate.getTime() + 45 * 60 * 1000);
        allItems.push({
          id: `${item.type || 'item'}-${item.id}`,
          key: `${item.type || 'item'}-${item.id}`,
          title: item.title || 'Untitled',
          startDate,
          endDate,
          description: item.description,
          priority: item.priority,
          type: item.type || 'task',
          originalTaskId: item.type === 'task' ? item.id : undefined,
          originalEventId: item.type === 'event' ? item.id : undefined,
          isMultiDayEvent: !!item.isMultiDayEvent,
          originalStartDate: item.originalStartDate,
          originalEndDate: item.originalEndDate,
          hasEndTime: !!item.hasEndTime || !!item.endTime,
        });
      });
    }

    return allItems.sort((a, b) => a.startDate - b.startDate);
  }, [dayTasks, dayEvents, selectedDate, routeCombined]);

  const handleEventCreated = async () => {
    await invalidateCalendar();
    await refetch();
  };

  const handleViewTask = (task) => {
    navigation.navigate('TaskDetails', {
      taskId: task.originalTaskId || task.id,
    });
  };

  const renderItem = ({ style, item }) => {
    const isEvent = item.type === 'event';
    const isMultiDayEvent = !!item.isMultiDayEvent;
    const priorityColor = getPriorityColor(item.priority);
    const durationMinutes = Math.round(
      (item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60)
    );
    const isShortDuration = durationMinutes < 60;

    const backgroundColor = isEvent
      ? isMultiDayEvent
        ? '#DBEAFE'
        : '#EFF6FF'
      : Brand.paperSoft;
    const borderColor = isEvent
      ? isMultiDayEvent
        ? '#1D4ED8'
        : '#2563EB'
      : priorityColor;

    const handleItemPress = () => {
      if (isEvent) {
        setDialogEvent(item);
        setShowEventDetailsDialog(true);
      } else {
        setDialogTask(item);
        setShowTaskDialog(true);
      }
    };

    const timeLabel = (() => {
      if (isMultiDayEvent) {
        return `${item.originalStartDate} → ${item.originalEndDate}`;
      }
      const start = item.startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      if (!isEvent && !item.hasEndTime) return `${start} · open`;
      const end = item.endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${start} – ${end}`;
    })();

    return (
      <TouchableOpacity
        style={[
          style,
          styles.itemCard,
          {
            backgroundColor,
            borderLeftColor: borderColor,
            borderStyle: isMultiDayEvent ? 'dashed' : 'solid',
            padding: isShortDuration ? 6 : 10,
          },
        ]}
        activeOpacity={0.7}
        onPress={handleItemPress}
      >
        <View style={styles.itemTopRow}>
          <Text style={styles.itemType}>
            {isEvent ? (isMultiDayEvent ? 'EVENT · MULTI' : 'EVENT') : 'TASK'}
          </Text>
          {!isEvent && item.priority ? (
            <View style={[styles.priorityPill, { backgroundColor: `${priorityColor}22` }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {String(item.priority).toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text
          style={[styles.itemTime, isShortDuration && { fontSize: 10 }]}
          numberOfLines={1}
        >
          {timeLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  const timetableDate = selectedDate
    ? new Date(`${selectedDate}T12:00:00`)
    : new Date();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={Brand.ink} />
        </TouchableOpacity>
        <View style={styles.topBarText}>
          <Text style={styles.eyebrow}>Day schedule</Text>
          <Text style={styles.dateTitle}>{formatDisplayDate(selectedDate)}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countNumber}>{items.length}</Text>
          <Text style={styles.countLabel}>
            {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Brand.ink} />
          <Text style={styles.muted}>Loading day…</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="sunny-outline" size={28} color={Brand.inkFaint} />
              <Text style={styles.emptyTitle}>Nothing scheduled</Text>
              <Text style={styles.emptySub}>
                Tasks and events for this day will show on the timeline below.
              </Text>
            </View>
          ) : null}

          <View style={styles.timetableWrap}>
            <Timetable
              items={items}
              renderItem={renderItem}
              date={timetableDate}
              fromHour={0}
              toHour={24}
              is12Hour
              hourHeight={58}
              timeWidth={58}
            />
          </View>
        </ScrollView>
      )}

      <HomeBottomNav
        onAddPress={() => {
          if (userRole === 'Owner') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDateObj = selectedDate
              ? new Date(`${selectedDate}T12:00:00`)
              : new Date();
            selectedDateObj.setHours(0, 0, 0, 0);

            if (selectedDateObj < today) {
              setShowPastDateDialog(true);
            } else {
              setShowEventCreationDialog(true);
            }
            return;
          }

          setAccessDeniedDialogVisible(true);
        }}
      />

      <TaskDetailsModal
        visible={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        task={dialogTask}
        onViewTask={handleViewTask}
      />

      <CreateEventModal
        visible={showEventCreationDialog}
        onClose={() => setShowEventCreationDialog(false)}
        selectedDate={selectedDate}
        onEventCreated={handleEventCreated}
      />

      <PastDateDialog
        visible={showPastDateDialog}
        onClose={() => setShowPastDateDialog(false)}
      />

      <EventDetailsModal
        visible={showEventDetailsDialog}
        onClose={() => setShowEventDetailsDialog(false)}
        event={dialogEvent}
        onEventUpdated={handleEventCreated}
      />

      <AccessDeniedDialog
        visible={accessDeniedDialogVisible}
        onClose={() => setAccessDeniedDialogVisible(false)}
        title="Access Denied"
        message="Managers and Employees cannot create events from this calendar."
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.paper,
  },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    marginTop: 10,
    color: Brand.inkMuted,
    fontSize: 13,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Brand.line,
    backgroundColor: Brand.paper,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  topBarText: {
    flex: 1,
    marginLeft: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dateTitle: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.2,
  },
  countBadge: {
    minWidth: 54,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Brand.ink,
    alignItems: 'center',
  },
  countNumber: {
    color: Brand.onInk,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  countLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.paperSoft,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: Brand.ink,
  },
  emptySub: {
    marginTop: 4,
    fontSize: 13,
    color: Brand.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  timetableWrap: {
    marginTop: 8,
  },
  itemCard: {
    borderRadius: 8,
    borderLeftWidth: 3,
    justifyContent: 'center',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemType: {
    fontSize: 9,
    fontWeight: '800',
    color: Brand.inkMuted,
    letterSpacing: 0.6,
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 8,
    fontWeight: '800',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.ink,
    marginBottom: 2,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '500',
    color: Brand.inkMuted,
  },
});

export default CalenderDetailScreen;
