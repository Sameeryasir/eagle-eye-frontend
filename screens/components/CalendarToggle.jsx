import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * Reusable Calendar Toggle Component
 * 
 * What was changed: Created a new reusable component for Weekly/Monthly toggle buttons
 * Why it was changed: To eliminate code duplication between WeekView and CalenderScreen
 * Dependencies: Used in WeekView.jsx and CalenderScreen.js
 * MCP Context Reference: Following MCP context 7 best practices for clean, maintainable code
 */
export default function CalendarToggle({ 
  currentView, 
  onWeeklyPress, 
  onMonthlyPress, 
  containerStyle = {} 
}) {
  return (
    <View style={[styles.toggleContainer, containerStyle]}>
      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          currentView === 'weekly' ? styles.activeButton : styles.inactiveButton
        ]} 
        onPress={onWeeklyPress}
      >
        <Text style={[
          styles.toggleText, 
          currentView === 'weekly' ? styles.activeText : styles.inactiveText
        ]}>
          Weekly
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          currentView === 'monthly' ? styles.activeButton : styles.inactiveButton
        ]} 
        onPress={onMonthlyPress}
      >
        <Text style={[
          styles.toggleText, 
          currentView === 'monthly' ? styles.activeText : styles.inactiveText
        ]}>
          Monthly
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Toggle Button Styles (consistent across all calendar views) ---
const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    marginHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#000000', // Black background for selected button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveButton: {
    backgroundColor: 'transparent', // Transparent for inactive button
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeText: {
    color: '#FFFFFF', // White text for active button
  },
  inactiveText: {
    color: '#6B7280', // Gray text for inactive button
  },
});
