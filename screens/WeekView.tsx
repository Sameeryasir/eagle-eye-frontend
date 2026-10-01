// @ts-nocheck
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeBottomNav from '../components/HomeBottomNav';
import CreateEventModal from '../components/CreateEventModal';

const { width } = Dimensions.get('window');

export default function MyWeekView() {
  const [createEventModalVisible, setCreateEventModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const [events, setEvents] = useState([
    {
      id: 1,
      description: 'Team Meeting',
      startDate: new Date(2024, 11, 27, 10, 0), // December 27, 2024, 10:00 AM
      endDate: new Date(2024, 11, 27, 11, 0),   // December 27, 2024, 11:00 AM
      color: '#4285f4',
    },
    {
      id: 2,
      description: 'Project Review',
      startDate: new Date(2024, 11, 28, 14, 30), // December 28, 2024, 2:30 PM
      endDate: new Date(2024, 11, 28, 15, 30),   // December 28, 2024, 3:30 PM
      color: '#34a853',
    },
    {
      id: 3,
      description: 'Client Call',
      startDate: new Date(2024, 11, 29, 9, 0),   // December 29, 2024, 9:00 AM
      endDate: new Date(2024, 11, 29, 10, 0),    // December 29, 2024, 10:00 AM
      color: '#ea4335',
    },
  ]);

  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const handleFabPress = () => {
    setSelectedDate(new Date()); // Use current date as default
    setCreateEventModalVisible(true);
  };

  const handleEventCreated = () => {
    // TODO: Replace with real API call to fetch events
    // For now, we'll keep the sample events
    // In real implementation, fetch events from your API here
  };

  const handleCloseModal = () => {
    setCreateEventModalVisible(false);
    setSelectedDate(null);
  };

  const handleEventPress = (event) => {
    // TODO: Implement event details modal or navigation
  };

  const handleDayPress = (date) => {
    setSelectedDate(date);
    setCreateEventModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.weekTitle}>
          {currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        
        <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.weekViewContainer} showsVerticalScrollIndicator={false}>
        {/* Days Header */}
        <View style={styles.daysHeader}>
          {getWeekDays().map((date, index) => (
            <View key={index} style={styles.dayHeader}>
              <Text style={styles.dayName}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={[
                styles.dayNumber,
                date.toDateString() === new Date().toDateString() && styles.todayDayNumber
              ]}>
                {date.getDate()}
              </Text>
            </View>
          ))}
        </View>

        {/* Week Days with Events */}
        <View style={styles.weekGrid}>
          {getWeekDays().map((date, dayIndex) => {
            const dayEvents = getEventsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <TouchableOpacity
                key={dayIndex}
                style={[styles.dayColumn, isToday && styles.todayColumn]}
                onPress={() => handleDayPress(date)}
                activeOpacity={0.7}
              >
                <View style={styles.dayContent}>
                  {dayEvents.length > 0 ? (
                    <ScrollView showsVerticalScrollIndicator={false}>
                      {dayEvents.map((event) => (
                        <TouchableOpacity
                          key={event.id}
                          style={[styles.eventItem, { backgroundColor: event.color }]}
                          onPress={() => handleEventPress(event)}
                        >
                          <Text style={styles.eventTime}>
                            {event.startDate.toLocaleTimeString([], { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </Text>
                          <Text style={styles.eventTitle} numberOfLines={2}>
                            {event.description}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyDay}>
                      <Text style={styles.emptyDayText}>Tap to add event</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      
      <HomeBottomNav
        onAddPress={handleFabPress}
        keyboardVisible={false}
      />

      <CreateEventModal
        visible={createEventModalVisible}
        onClose={handleCloseModal}
        selectedDate={selectedDate}
        onEventCreated={handleEventCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weekViewContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  daysHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#e1e8ed',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  todayDayNumber: {
    color: '#000',
    fontWeight: 'bold',
    backgroundColor: '#000',
    color: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  weekGrid: {
    flexDirection: 'row',
    flex: 1,
    minHeight: 400,
  },
  dayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e1e8ed',
    backgroundColor: 'white',
  },
  todayColumn: {
    backgroundColor: '#f8f9fa',
  },
  dayContent: {
    flex: 1,
    padding: 8,
  },
  eventItem: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    lineHeight: 16,
  },
  emptyDay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyDayText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
