import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const { width } = Dimensions.get('window');

function TaskDetailScreen({ route, navigation }) {
  const { selectedDate, taskList } = route.params;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationStatus, setNotificationStatus] = useState('checking');
  const scrollViewRef = useRef(null);

  // Configure notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const PIXELS_PER_MINUTE = 1.5;

  const enhancedTaskList = taskList.map((task) => ({
    ...task,
    description: task.description || `Details for ${task.title}`,
    startTime: task.startTime,
    endTime: task.endTime,
    priority: task.priority || '',
    status: task.status || '',
  }));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Add notification listener for proper handling
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification response:', response);
      // Handle notification tap - navigate to task detail if needed
      const data = response.notification.request.content.data;
      if (data && data.screen === 'TaskDetailScreen') {
        // Navigate to task detail screen
        navigation.navigate('TaskDetailScreen', {
          selectedDate: data.selectedDate,
          taskList: data.taskList
        });
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [navigation]);

  useEffect(() => {
    // Auto-scroll to first task after a short delay
    if (enhancedTaskList.length > 0) {
      const firstTask = enhancedTaskList[0];
      const firstTaskStartMin = timeToMinutes(firstTask.startTime);
      const scrollToY = Math.max(0, (firstTaskStartMin * PIXELS_PER_MINUTE) - 150);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scrollToY,
          animated: true,
        });
      }, 800);
    } else {
      // If no tasks, scroll to show a good range of hours
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 0,
          animated: true,
        });
      }, 500);
    }
  }, [enhancedTaskList]);

  // Request notification permissions and schedule task reminders
  useEffect(() => {
    const requestPermissionsAndScheduleNotifications = async () => {
      if (Device.isDevice) {
        try {
          // Set up notification channel for Android
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('task-reminders', {
              name: 'Task Reminders',
              importance: Notifications.AndroidImportance.HIGH,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF231F7C',
              sound: 'default',
              enableVibrate: true,
              showBadge: true,
            });
          }

          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          
          if (finalStatus !== 'granted') {
            console.log('❌ Failed to get notification permissions!');
            setNotificationStatus('denied');
            return;
          }
          
          console.log('✅ Notification permissions granted');
          setNotificationStatus('granted');
          
          // Schedule notifications for all tasks
          await scheduleTaskNotifications();
        } catch (error) {
          console.error('Error setting up notifications:', error);
        }
      }
    };

    requestPermissionsAndScheduleNotifications();
  }, [selectedDate, taskList]);

  const scheduleTaskNotifications = async () => {
    try {
      console.log('Scheduling notifications for tasks:', taskList.length);
      
      // Cancel existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled existing notifications');
      
      let scheduledCount = 0;
      let skippedCount = 0;
      
      // Use for...of instead of forEach for proper async handling
      for (const task of taskList) {
        try {
          // Improved date parsing - handle multiple formats
          let datePart;
          if (selectedDate.includes('T')) {
            [datePart] = selectedDate.split('T');
          } else if (selectedDate.includes(' ')) {
            [datePart] = selectedDate.split(' ');
          } else {
            datePart = selectedDate;
          }
          
          // Create task start time with proper timezone handling
          const taskStartTime = new Date(`${datePart}T${task.startTime}:00`);
          
          // Check if the date is valid
          if (isNaN(taskStartTime.getTime())) {
            console.log(`Invalid date format for task: ${task.title}`);
            continue;
          }
          
          const currentTime = new Date();
          
          console.log(`\n📋 Processing task: ${task.title}`);
          console.log(`📅 Task start time: ${taskStartTime.toLocaleString()}`);
          console.log(`🕐 Current time: ${currentTime.toLocaleString()}`);
          console.log(`⏰ Is task start time in future: ${taskStartTime > currentTime}`);
          
          // Only schedule notification if task start time is in the future
          if (taskStartTime > currentTime) {
            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `Task Starting: ${task.title}`,
                body: `Your task "${task.title}" is starting now`,
                data: { 
                  taskId: task.id, 
                  screen: 'TaskDetailScreen', 
                  selectedDate, 
                  taskList,
                  taskTitle: task.title,
                  taskStartTime: task.startTime
                },
                sound: 'default',
                priority: 'high',
              },
              trigger: {
                date: taskStartTime, // Send notification at exact start time
                channelId: 'task-reminders',
              },
            });
            console.log(`✅ Scheduled notification with ID: ${notificationId} for task: ${task.title} at ${taskStartTime.toLocaleString()}`);
            scheduledCount++;
          } else {
            console.log(`⏰ Skipping notification for ${task.title} - task start time (${taskStartTime.toLocaleString()}) is in the past or current time`);
            skippedCount++;
          }
        } catch (taskError) {
          console.error(`Error scheduling notification for task ${task.title}:`, taskError);
          skippedCount++;
        }
      }
      
      // Summary
      console.log(`\n📊 Notification Summary:`);
      console.log(`✅ Scheduled: ${scheduledCount} notifications`);
      console.log(`⏰ Skipped: ${skippedCount} notifications`);
      console.log(`📋 Total tasks processed: ${taskList.length}`);
      
    } catch (error) {
      console.error('Error in scheduleTaskNotifications:', error);
    }
  };

  const generateTimeSlots = () => {
    const timeSlots = [];
    // Generate 24 hours from 12:00 AM to 11:00 PM
    for (let hour = 0; hour < 24; hour++) {
      let displayHour = hour % 12;
      if (displayHour === 0) displayHour = 12;
      const timeString = `${displayHour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
      timeSlots.push(timeString);
    }

    console.log('Generated time slots:', timeSlots);
    return timeSlots;
  };

  const timeToMinutes = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const getEventColor = (priority) => {
    switch (priority) {
      case 'Medium':
        return '#fbbc04';
      case 'Low':
        return '#34a853';
      default:
        return '#4285f4';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#fbbc04';
      case 'In Progress':
        return '#4285f4';
      case 'Completed':
        return '#34a853';
      default:
        return '#5f6368';
    }
  };

  const timeSlots = generateTimeSlots();
  console.log('Generated time slots:', timeSlots);

  const renderTimeSlot = (time) => {
    const currentHour = currentTime.getHours();
    const currentTimeString = `${currentHour % 12 === 0 ? 12 : currentHour % 12}:00 ${currentHour >= 12 ? 'PM' : 'AM'}`;
    const isCurrentTime = time === currentTimeString;

    return (
      <View key={time} style={styles.timeSlot}>
        <View style={styles.timeHeader}>
          <Text style={[styles.timeText, isCurrentTime && styles.currentTimeText]}>
            {time}
          </Text>
          <View style={[styles.timeLine, isCurrentTime && styles.currentTimeLine]} />
        </View>
      </View>
    );
  };

  const renderAllTasks = () => {
    return enhancedTaskList.map((task, index) => {
      const taskStartMin = timeToMinutes(task.startTime);
      let taskEndMin = timeToMinutes(task.endTime);
      
      // Handle tasks that span across midnight
      if (taskEndMin < taskStartMin) {
        taskEndMin += 24 * 60; // Add 24 hours (1440 minutes)
      }
      
      const taskDuration = taskEndMin - taskStartMin;
      const top = taskStartMin * PIXELS_PER_MINUTE;
      
      // Calculate height based on actual duration - keep it proportional to real time
      let height = taskDuration * PIXELS_PER_MINUTE;
      
      // Only apply minimum height for very short tasks to maintain readability
      if (taskDuration < 15) {
        height = Math.max(height, 60);
      } else if (taskDuration < 30) {
        height = Math.max(height, 45); // Keep closer to actual duration for 30-min tasks
      } else if (taskDuration < 60) {
        height = Math.max(height, 60); // Reduced minimum for better accuracy
      } else {
        height = Math.max(height, 80); // Reduced minimum for longer tasks
      }
      
      // Maximum height for very long tasks to prevent excessive height
      const maxHeight = 400;
      height = Math.min(height, maxHeight);

      // Determine how many lines to show based on task height
      const getNumberOfLines = () => {
        if (height < 60) return 1;
        if (height < 80) return 2;
        if (height < 120) return 3;
        if (height < 200) return 4;
        return 5;
      };

      const numberOfLines = getNumberOfLines();

      return (
        <View
          key={`${task.id}-${index}`}
          style={[
            styles.eventCard,
            {
              position: 'absolute',
              top,
              height,
              zIndex: 10,
              borderLeftColor: "black",
              marginLeft: 68,
              width: width - 84,
              overflow: 'hidden', // Changed to hidden to prevent content overflow
            },
          ]}
        >
          <View style={styles.eventContent}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle} numberOfLines={numberOfLines}>
                {task.title}
              </Text>
              {height >= 60 && (
                <View style={styles.eventBadges}>
                  {task.priority && (
                    <View style={[styles.badge, { backgroundColor: getEventColor(task.priority) }]}>
                      <Text style={styles.badgeText}>{task.priority}</Text>
                    </View>
                  )}
                  {task.status && (
                    <View style={[styles.badge, { backgroundColor: getStatusColor(task.status) }]}>
                      <Text style={styles.badgeText}>{task.status}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            {task.description && height >= 80 && (
              <Text style={styles.eventDescription} numberOfLines={Math.max(1, numberOfLines - 2)}>
                {task.description}
              </Text>
            )}
            <View style={styles.eventTimeContainer}>
              <Text style={styles.eventTime}>
                🕐 {task.startTime} - {task.endTime}
              </Text>
            </View>
          </View>
        </View>
      );
    });
  };

  const calculateTimelineHeight = () => {
    const fullDayHeight = 24 * 60 * PIXELS_PER_MINUTE;

    if (enhancedTaskList.length === 0) {
      return fullDayHeight;
    }

    let maxEndTime = 0;
    enhancedTaskList.forEach(task => {
      let taskEndMin = timeToMinutes(task.endTime);
      let taskStartMin = timeToMinutes(task.startTime);
      
      // Handle tasks that go past midnight
      if (taskEndMin < taskStartMin) {
        taskEndMin += 24 * 60;
      }

      maxEndTime = Math.max(maxEndTime, taskEndMin);
    });

    // Small padding instead of large space
    const lastTaskPadding = 20;

    const requiredHeight = Math.max(
      (maxEndTime * PIXELS_PER_MINUTE) + lastTaskPadding,
      fullDayHeight
    );

    return requiredHeight;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            <Text style={styles.headerSubtitle}>
              {enhancedTaskList.length} {enhancedTaskList.length === 1 ? 'event' : 'events'} • {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })} • {notificationStatus === 'granted' ? 'Notifications ON' : notificationStatus === 'denied' ? 'Notifications OFF' : 'Checking...'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ overflow: 'visible' }}
      >
        <View style={styles.scheduleContainer}>
          <View style={[styles.timelineContainer, { minHeight: calculateTimelineHeight() }]}>
            {timeSlots.map(time => renderTimeSlot(time))}
            {renderAllTasks()}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default TaskDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: 50,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backButtonText: {
    fontSize: 24,
    color: '#1e293b',
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scheduleContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    overflow: 'visible',
  },
  timelineContainer: {
    position: 'relative',
    overflow: 'visible',
  },
  timeSlot: {
    marginBottom: 60,
  },
  timeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    width: 65,
  },
  currentTimeText: {
    color: '#1e293b',
    fontWeight: '700',
  },
  timeLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
    marginLeft: 10,
  },
  currentTimeLine: {
    backgroundColor: '#000000',
    height: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventContent: {
    flex: 1,
    paddingVertical: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 10,
  },
  eventBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 6,
  },
  eventTimeContainer: {
    marginTop: 4,
  },
  eventTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
});