// @ts-nocheck
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

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
    backgroundColor: '#000000', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveButton: {
    backgroundColor: 'transparent', 
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeText: {
    color: '#FFFFFF', 
  },
  inactiveText: {
    color: '#6B7280', 
  },
});
