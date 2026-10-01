// @ts-nocheck
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const ACCENT = '#2563EB';

export default function CalendarToggle({
  currentView,
  onWeeklyPress,
  onMonthlyPress,
  containerStyle = {},
}) {
  return (
    <View style={[styles.toggleContainer, containerStyle]}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          currentView === 'monthly' && styles.activeButton,
        ]}
        onPress={onMonthlyPress}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.toggleText,
            currentView === 'monthly' ? styles.activeText : styles.inactiveText,
          ]}
        >
          Month
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.toggleButton,
          currentView === 'weekly' && styles.activeButton,
        ]}
        onPress={onWeeklyPress}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.toggleText,
            currentView === 'weekly' ? styles.activeText : styles.inactiveText,
          ]}
        >
          Week
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 10,
    backgroundColor: '#EEF0F3',
    borderRadius: 22,
    padding: 4,
    minWidth: 200,
  },
  toggleButton: {
    paddingVertical: 9,
    paddingHorizontal: 28,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: 15,
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
