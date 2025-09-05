import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Calendar } from "react-native-calendars";
import Toast from 'react-native-toast-message';

const { height } = Dimensions.get("window");

const tasks = {
  "2025-01-27": [
    {
      id: "18",
      title: "Evening Task",
      startTime: "10:35 PM",
      endTime: "11:00 PM",
      description: "Evening task for testing notifications",
    },
  ],
  "2025-01-31": [
    {
      id: "19",
      title: "Late Night Task",
      startTime: "10:50 PM",
      endTime: "11:30 PM",
      description: "Late night task for testing notifications",
    },
  ],
  "2025-07-31": [
    {
      id: "20",
      title: "Late Night Task",
      startTime: "11:40 PM",
      endTime: "11:50 PM",
      description: "Late night task for testing notifications",
    },
  ],
  "2025-08-01": [
    {
      id: "1",
      title: "Team Meeting",
      startTime: "3:30 AM",
      endTime: "4:30 AM",
      description: "Weekly team sync meeting",
    },
    {
      id: "2",
      title: "Project Review",
      startTime: "7:45 PM",
      endTime: "8:20 PM",
      description: "Review Q3 project milestones",
    },
    {
      id: "3",
      title: "Code Review",
      startTime: "4:00 PM",
      endTime: "5:00 PM",
      description: "Review pull requests",
    },
    {
      id: "4",
      title: "Bug Fixes",
      startTime: "5:30 PM",
      endTime: "6:30 PM",
      description: "Fix critical bugs",
    },
  ],
  "2025-08-03": [
    {
      id: "5",
      title: "Design Workshop",
      startTime: "11:00 AM",
      endTime: "1:00 PM",
      description: "UX/UI design workshop with team",
    },
  ],
  "2025-08-05": [
    {
      id: "6",
      title: "Sprint Planning",
      startTime: "9:30 AM",
      endTime: "10:30 AM",
      description: "Plan next sprint tasks and goals",
    },
  ],
  "2025-08-08": [
    {
      id: "7",
      title: "Client Meeting",
      startTime: "11:00 AM",
      endTime: "12:00 PM",
      description: "Meeting with new client",
    },
  ],
  "2025-08-10": [
    {
      id: "8",
      title: "Product Demo",
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      description: "Demo new features to stakeholders",
    },
  ],
  "2025-08-12": [
    {
      id: "9",
      title: "Training Session",
      startTime: "1:00 PM",
      endTime: "3:00 PM",
      description: "New tool training for team",
    },
  ],
  "2025-08-15": [
    {
      id: "10",
      title: "Database Backup",
      startTime: "10:00 AM",
      endTime: "11:00 AM",
      description: "Perform database backup",
    },
  ],
  "2025-10-01": [
    {
      id: "11",
      title: "Team Meeting at 10 AM",
      startTime: "10:30 AM",
      endTime: "11:30 AM",
      description: "Details for Team Meeting at 10 AM",
    },
    {
      id: "12",
      title: "Submit Project Report",
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      description: "Details for Submit Project Report",
    },
    {
      id: "13",
      title: "Review Budget",
      startTime: "4:00 PM",
      endTime: "5:00 PM",
      description: "Details for Review Budget",
    },
  ],
  "2025-10-03": [
    {
      id: "14",
      title: "Client Call at 3 PM",
      startTime: "3:00 PM",
      endTime: "4:00 PM",
      description: "Details for Client Call at 3 PM",
    },
    {
      id: "15",
      title: "Send Invoice",
      startTime: "11:00 AM",
      endTime: "11:30 AM",
      description: "Details for Send Invoice",
    },
    {
      id: "16",
      title: "Code Review",
      startTime: "5:00 PM",
      endTime: "6:00 PM",
      description: "Details for Code Review",
    },
  ],
  "2025-10-10": [
    {
      id: "17",
      title: "Demo with investors",
      startTime: "1:00 PM",
      endTime: "2:30 PM",
      description: "Details for Demo with investors",
    },
  ],
};

function CalenderScreen({ navigation }) {
  const onDayPress = (day) => {
    const taskList = tasks[day.dateString] || [];
    
    if (taskList.length === 0) {
      // --- Show Info Toast Message ---
      Toast.show({
        type: 'info',
        text1: 'No Tasks',
        text2: `No tasks scheduled for ${day.dateString}`,
        visibilityTime: 2000,
        autoHide: true,
        topOffset: 80,
      });
      return;
    }
    
    // --- Show Navigation Toast Message ---
    Toast.show({
      type: 'success',
      text1: 'Viewing Tasks',
      text2: `Found ${taskList.length} task(s) for ${day.dateString}`,
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 80,
    });
    
    navigation.navigate("TaskDetail", {
      selectedDate: day.dateString,
      taskList: taskList,
    });
  };

  const onTaskPress = (task, date) => {
    navigation.navigate("TaskDetail", {
      selectedDate: date.dateString,
      taskList: [task], // Pass only the selected task
      singleTask: true,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📅 My Tasks</Text>

      <Calendar
        markingType={"custom"}
        onDayPress={onDayPress}
        dayComponent={({ date, state }) => {
          const taskList = tasks[date.dateString];
          const visibleTasks = taskList?.slice(0, 2) || [];
          const hiddenCount = taskList?.length > 2 ? taskList.length - 2 : 0;

          return (
            <TouchableOpacity onPress={() => onDayPress(date)}>
              <View style={styles.dayContainer}>
                <Text style={styles.dateNumber}>{date.day}</Text>
                <View style={styles.tasksContainer}>
                  {visibleTasks.map((task, index) => (
                    <View key={index} style={styles.taskBadge}>
                      <Text numberOfLines={1} style={styles.taskText}>
                        {task.title.length > 8
                          ? `${task.title.slice(0, 8)}...`
                          : task.title}
                      </Text>
                    </View>
                  ))}
                  {hiddenCount > 0 && (
                    <View style={styles.moreBadge}>
                      <Text style={styles.moreText}>+{hiddenCount} more</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        theme={{
          todayTextColor: "#00adf5",
          arrowColor: "black",
        }}
        enableSwipeMonths={true}
      />
    </View>
  );
}

export default CalenderScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  dateNumber: {
    fontSize: 18,
    color: "black",
    fontWeight: "500",
    marginBottom: 6,
  },
  dayContainer: {
    alignItems: "center",
    paddingVertical: 8,
    margin: 4,
    minHeight: 80,
    height: "auto",
  },
  tasksContainer: {
    width: "100%",
    alignItems: "center",
    gap: 3,
  },
  taskBadge: {
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#000000",
    marginVertical: 2,
    minWidth: 60,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  taskText: {
    fontSize: 10,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
  taskTime: {
    fontSize: 8,
    color: "#616161",
    fontWeight: "400",
    marginTop: 2,
  },
  moreBadge: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#9e9e9e",
    marginTop: 2,
  },
  moreText: {
    fontSize: 8,
    color: "#616161",
    fontWeight: "600",
    textAlign: "center",
  },
});
