import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 1; i < 24; i++) {
    let hour = i % 12 === 0 ? 12 : i % 12;
    let ampm = i < 12 ? "am" : "pm";
    slots.push(`${hour} ${ampm}`);
  }
  return slots;
};

const CalendarDetailScreen = ({ route }) => {
  const timeSlots = generateTimeSlots();
  
  // --- Get task data from navigation ---
  const { selectedDate, taskList = [], selectedTask } = route?.params || {};

  // --- Assign tasks to time slots ---
  const getTasksForTimeSlot = (timeSlot) => {
    if (!taskList || taskList.length === 0) return [];
    
    return taskList.filter(task => {
      if (!task.startTime || task.startTime === 'No time set') return false;
      
      // Parse the time slot (e.g., "1 am", "2 pm")
      const slotHour = parseInt(timeSlot.split(' ')[0]);
      const slotPeriod = timeSlot.split(' ')[1];
      
      // Parse task time (e.g., "1:30 AM", "2:45 PM")
      const taskTimeMatch = task.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!taskTimeMatch) return false;
      
      let taskHour = parseInt(taskTimeMatch[1]);
      const taskPeriod = taskTimeMatch[3].toUpperCase();
      
      // Convert to 24-hour format for comparison
      if (taskPeriod === 'PM' && taskHour !== 12) {
        taskHour += 12;
      } else if (taskPeriod === 'AM' && taskHour === 12) {
        taskHour = 0;
      }
      
      // Convert slot to 24-hour format
      let slotHour24 = slotHour;
      if (slotPeriod === 'pm' && slotHour !== 12) {
        slotHour24 = slotHour + 12;
      } else if (slotPeriod === 'am' && slotHour === 12) {
        slotHour24 = 0;
      }
      
      return taskHour === slotHour24;
    });
  };


  return (
    <View style={styles.container}>
      {/* Date Section */}
      <View style={styles.dateSection}>
        <Text style={styles.dayText}>Tue</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateNumber}>9</Text>
        </View>
      </View>

      {/* Time Slots */}
      <View style={styles.timeSlotsContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {timeSlots.map((time, index) => {
            const tasksForSlot = getTasksForTimeSlot(time);
            return (
              <View key={index} style={styles.timeSlotRow}>
                <View style={styles.timeLabel}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>
                <View style={styles.timeSlot}>
                  {tasksForSlot.length > 0 ? (
                    tasksForSlot.map((task, taskIndex) => (
                      <View key={taskIndex} style={styles.taskItem}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <Text style={styles.taskTime}>{task.startTime}</Text>
                        {task.description && task.description !== 'No description' && (
                          <Text style={styles.taskDescription}>{task.description}</Text>
                        )}
                        {task.priority && (
                          <Text style={styles.taskPriority}>Priority: {task.priority}</Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptySlotText}>No tasks</Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

export default CalendarDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginRight: 15,
  },
  dateBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a73e8",
    justifyContent: "center",
    alignItems: "center",
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  debugTime: {
    fontSize: 12,
    color: "#666",
    marginLeft: 10,
  },
  timeSlotsContainer: {
    flex: 1,
  },
  timeSlotRow: {
    flexDirection: "row",
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timeLabel: {
    width: 60,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#666",
  },
  timeSlot: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    paddingLeft: 15,
    paddingVertical: 5,
  },
  taskItem: {
    backgroundColor: "#f9fafb", // bg-gray-50
    borderRadius: 6, // rounded-md
    paddingHorizontal: 6, // px-1.5
    paddingVertical: 4, // py-1
    marginBottom: 2, // my-0.5
    borderLeftWidth: 2, // border-l-2
    borderLeftColor: "#000000", // border-l-black
    minWidth: 60, // min-w-15
    maxWidth: "90%", // max-w-11/12
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1, // shadow-sm
  },
  taskTitle: {
    fontSize: 12, // text-xs
    fontWeight: "500", // font-medium
    color: "#1f2937", // text-gray-800
    textAlign: "center", // text-center
    marginBottom: 2,
  },
  taskTime: {
    fontSize: 10,
    color: "#6b7280", // text-gray-500
    textAlign: "center",
    marginBottom: 2,
  },
  taskDescription: {
    fontSize: 10,
    color: "#6b7280",
    fontStyle: 'italic',
    textAlign: "center",
    marginBottom: 2,
  },
  taskPriority: {
    fontSize: 9,
    color: "#dc2626", // text-red-600
    fontWeight: "600",
    textAlign: "center",
  },
  emptySlotText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    marginLeft: 56, // Align with the right edge of time label
  },
  timeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#000000',
    marginRight: 20,
  },
});
