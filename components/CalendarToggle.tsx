// @ts-nocheck
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/brandColors';

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
        <Ionicons
          name="calendar"
          size={15}
          color={currentView === 'monthly' ? Brand.onInk : Brand.inkMuted}
          style={styles.icon}
        />
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
        <Ionicons
          name="list"
          size={15}
          color={currentView === 'weekly' ? Brand.onInk : Brand.inkMuted}
          style={styles.icon}
        />
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
    backgroundColor: Brand.paperSoft,
    borderRadius: 22,
    padding: 4,
    minWidth: 220,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: Brand.ink,
    shadowColor: Brand.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  icon: {
    marginRight: 6,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeText: {
    color: Brand.onInk,
  },
  inactiveText: {
    color: Brand.inkMuted,
  },
});
