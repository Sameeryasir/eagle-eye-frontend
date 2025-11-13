import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const EventCard = ({ event, onPress }) => {
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

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

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(event)}
      className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
      style={{
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
      activeOpacity={0.7}
    >
      {}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text
            className="text-lg font-bold text-gray-800 leading-5"
            numberOfLines={2}
          >
            {event.title}
          </Text>
        </View>
        <View
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: getPriorityColor(event.priority) }}
        />
      </View>

      {}
      {event.description && (
        <Text
          className="text-sm text-gray-600 mb-3 leading-4"
          numberOfLines={2}
        >
          {event.description}
        </Text>
      )}

      {}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text className="text-sm text-gray-600 ml-1">
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text className="text-sm text-gray-600 ml-1">
            {formatDate(event.startTime)}
          </Text>
        </View>
      </View>

      {}
      {event.status && (
        <View className="mt-3">
          <View
            className="self-start px-2 py-1 rounded-full"
            style={{
              backgroundColor:
                event.status === "completed" ? "#D1FAE5" : "#FEF3C7",
            }}
          >
            <Text
              className="text-xs font-medium capitalize"
              style={{
                color: event.status === "completed" ? "#065F46" : "#92400E",
              }}
            >
              {event.status}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default EventCard;
