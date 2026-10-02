// @ts-nocheck
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import CalenderScreen from "../screens/CalenderScreen";
import ChatScreen from "../screens/ChatScreen";
import NotificationScreen from "../screens/NotificationScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: true,
      }}
    >
      <Tab.Screen name="HomeScreen" component={HomeScreen} />
      <Tab.Screen name="CalenderScreen" component={CalenderScreen} />
      <Tab.Screen name="ChatScreen" component={ChatScreen} />
      <Tab.Screen name="NotificationScreen" component={NotificationScreen} />
    </Tab.Navigator>
  );
}
