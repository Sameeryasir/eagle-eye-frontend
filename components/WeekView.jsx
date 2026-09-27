import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import WeekView from "react-native-week-view";
import Toast from "react-native-toast-message";
import getAllTasks from "../services/tasks/getAllTasks";
import { getEventsForLogInUser } from "../services/event/getEventsForLogInUser";
import { getUserRole } from "../services/utils/userRole";
import CustomBottomNav from "./CustomBottomNav";
import TaskDetailsModal from "./TaskDetailsModal";
import EventDetailsModal from "./EventDetailsModal";
import CreateEventModal from "./CreateEventModal";

export default function MyWeekView({ navigation }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [dialogTask, setDialogTask] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [dialogEvent, setDialogEvent] = useState(null);
  const [showEventDetailsDialog, setShowEventDetailsDialog] = useState(false);

  const [showEventCreationDialog, setShowEventCreationDialog] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
      case "urgent":
      case "critical":
        return "#EF4444";
      case "medium":
      case "normal":
        return "#F59E0B";
      case "low":
      case "lowest":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const fetchData = async () => {
    try {
      setError(null);

      const [tasksResponse, eventsResponse] = await Promise.all([
        getAllTasks(),
        fetchEventsWithRoleCheck(),
      ]);

      const calendarEvents = [];

      if (tasksResponse.success && tasksResponse.data) {
        tasksResponse.data.forEach((task) => {
          if (task.startTime) {
            calendarEvents.push({
              id: `task-${task.id}`,
              description: task.title,
              startDate: new Date(task.startTime),
              endDate: task.endTime
                ? new Date(task.endTime)
                : new Date(new Date(task.startTime).getTime() + 60 * 60 * 1000),
              color: getPriorityColor(task.priority),
              type: "task",
              priority: task.priority,
              status: task.status,
              assignedTo: task.assignedTo,
              originalTaskId: task.id,
            });
          }
        });
      }

      if (eventsResponse && eventsResponse.length > 0) {
        eventsResponse.forEach((event) => {
          if (event.startTime) {
            calendarEvents.push({
              id: `event-${event.id}`,
              description: event.title,
              startDate: new Date(event.startTime),
              endDate: event.endTime
                ? new Date(event.endTime)
                : new Date(
                    new Date(event.startTime).getTime() + 60 * 60 * 1000
                  ),
              color: "#3B82F6",
              type: "event",
              priority: event.priority || "medium",
              status: event.status || "pending",
              originalEventId: event.id,
              assignedTo: event.assignedTo || [],
              projects: event.projects || [],
            });
          }
        });
      }

      setEvents(calendarEvents);
    } catch (err) {
      console.error("WeekView - Error fetching data:", err);
      setError(err.message);

      Toast.show({
        type: "error",
        text1: "Error Loading Calendar Data",
        text2: "Failed to load tasks and events",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });

      setEvents([]);
    }
  };

  const fetchEventsWithRoleCheck = async () => {
    try {
      const userRole = await getUserRole();
      const allowedRoles = ["Owner", "Employee", "Manager"];

      if (!allowedRoles.includes(userRole)) {
        console.log("WeekView - User role not allowed for events:", userRole);
        return [];
      }

      const response = await getEventsForLogInUser();
      return response.success ? response.data : [];
    } catch (err) {
      console.error("WeekView - Error fetching events:", err);
      return [];
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEventCreated = () => {
    fetchData();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (err) {
      console.error("WeekView - Error during refresh:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to refresh calendar data",
        visibilityTime: 3000,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleFabPress = async () => {
    const userRole = await getUserRole();
    if (userRole === "Owner") {
      setShowEventCreationDialog(true);
    } else {
      Toast.show({
        type: "info",
        text1: "Access Restricted",
        text2: "Only Owners can create events",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  const handleViewTask = (task) => {
    navigation.navigate("TaskDetails", {
      taskId: task.originalTaskId || task.id,
    });
  };

  const onEventPress = (event) => {
    if (event.type === "task") {
      setDialogTask(event);
      setShowTaskDialog(true);
    } else if (event.type === "event") {
      setDialogEvent(event);
      setShowEventDetailsDialog(true);
    } else {
      Toast.show({
        type: "info",
        text1: event.description,
        text2: `${event.startDate.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })} - ${event.endDate.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })}`,
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.weekViewContainer}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3155A1"]}
              tintColor="#3155A1"
              progressBackgroundColor="#ffffff"
            />
          }
        >
          <WeekView
            events={events}
            selectedDate={currentDate}
            numberOfDays={7}
            formatDateHeader="ddd M/D"
            hoursInDisplay={8}
            startHour={6}
            endHour={22}
            formatTimeLabel="h:mm a"
            onSwipeNext={() => {
              const next = new Date(currentDate);
              next.setDate(currentDate.getDate() + 7);
              setCurrentDate(next);
            }}
            onSwipePrev={() => {
              const prev = new Date(currentDate);
              prev.setDate(currentDate.getDate() - 7);
              setCurrentDate(prev);
            }}
            onEventPress={onEventPress}
            headerStyle={styles.header}
            todayHeaderStyle={styles.todayHeader}
            hourTextStyle={styles.hourText}
            eventContainerStyle={styles.eventContainer}
          />
        </ScrollView>
      </View>

      <CustomBottomNav handleFabPress={handleFabPress} />

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
        onEventUpdated={() => {
          fetchData();
        }}
      />

      <CreateEventModal
        visible={showEventCreationDialog}
        onClose={() => setShowEventCreationDialog(false)}
        selectedDate={null}
        onEventCreated={handleEventCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  weekViewContainer: {
    flex: 0.85,
  },

  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#f8f9fa",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 0,
  },
  todayHeader: {
    backgroundColor: "#007AFF",
    color: "white",
  },
  hourText: {
    color: "#333",
  },
  eventContainer: {
    borderRadius: 4,
    padding: 2,
    margin: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
