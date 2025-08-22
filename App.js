import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  TouchableOpacity,
  View,
  TextInput,
  StatusBar,
  Image,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuProvider } from "react-native-popup-menu";
import SignIn from "./screens/SignInScreen";
import LogIn from "./screens/LogInScreen";
import Code from "./screens/OtpScreen";
import Header from "./components/Header";
import Sidebar from "./screens/components/Sidebar";
import { AuthProvider, useAuth } from "./context/AuthContext";

import HomeScreen from "./screens/HomeScreen";
import WidgetScreen from "./screens/WidgetScreen";
import CalenderScreen from "./screens/CalenderScreen";
import ViewAllTasksScreen from "./screens/ViewAllTasksScreen";
import ViewAllLogScreen from "./screens/ViewAllLogScreen";
import CreateProjectScreen from "./screens/CreateProjectScreen";
import CreateTaskScreen from "./screens/CreateTaskScreen";
import UpdateTaskScreen from "./screens/UpdateTaskScreen";
import UpdateProjectScreen from "./screens/UpdateProjectScreen";
import TaskDetailsScreen from "./screens/TaskDetailsScreen";
import LogsDetailScreen from "./screens/LogsDetailScreen";
import CreatLogScreen from "./screens/CreatLogScreen";

const Stack = createNativeStackNavigator();

// Custom Header Component with Header + Search Bar
const CustomHeader = ({ onMenuPress }) => {
  return (
    <SafeAreaView style={{ backgroundColor: "#3155A1" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      <Header
        title="Projects"
        onMenuPress={onMenuPress}
        onRightPress={() => {}}
        rightIcon="person"
        backgroundColor="#3155A1"
        textColor="white"
        iconColor="white"
      />
    </SafeAreaView>
  );
};

// Custom Header Component for all other screens (without search bar)
const CustomHeaderForScreens = ({ onMenuPress, title = "Screen" }) => {
  return (
    <SafeAreaView style={{ backgroundColor: "#3155A1" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      <Header
        title={title}
        onMenuPress={onMenuPress}
        onRightPress={() => {}}
        rightIcon="person"
        backgroundColor="#3155A1"
        textColor="white"
        iconColor="white"
      />
    </SafeAreaView>
  );
};

// Navigation component that handles initial routing
const AppNavigator = () => {
  const { isAuthenticated, isLoading, initialRoute } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState(null);

  // Show loading screen while checking authentication
  if (isLoading) {
    return null; // or a loading component
  }

  const handleMenuPress = () => {
    setSidebarVisible(true);
  };

  const handleSidebarClose = () => {
    setSidebarVisible(false);
  };

  const handleSidebarNavigate = (itemId) => {
    // Handle navigation based on sidebar item
    console.log("Navigate to:", itemId);
    if (navigationRef) {
      // Add navigation logic here based on itemId
      switch (itemId) {
        case "chats":
          navigationRef.navigate("WidgetScreen");
          break;
        case "files":
          // Navigate to files screen
          break;
        case "material":
          // Navigate to material screen
          break;
        case "personnel":
          // Navigate to personnel screen
          break;
        default:
          break;
      }
    }
    setSidebarVisible(false);
  };

  return (
    <AuthProvider>
      <MenuProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={setNavigationRef}>
            <Stack.Navigator initialRouteName={initialRoute}>
              <Stack.Screen
                name="SignIn"
                component={SignIn}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="LogIn"
                component={LogIn}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="OtpScreen"
                component={Code}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="HomeScreen"
                component={HomeScreen}
                options={{
                  headerShown: true,
                  header: () => <CustomHeader onMenuPress={handleMenuPress} />,
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />

              <Stack.Screen
                name="WidgetScreen"
                component={WidgetScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title=" Dashboard"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="CalenderScreen"
                component={CalenderScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="Calendar"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />

              <Stack.Screen
                name="ViewAllTasksScreen"
                component={ViewAllTasksScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="All Tasks"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="ViewAllLogScreen"
                component={ViewAllLogScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="All Logs"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="CreateProject"
                component={CreateProjectScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="Create Project"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="CreateTask"
                component={CreateTaskScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="Create Task"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="UpdateTask"
                component={UpdateTaskScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="Update Task"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="UpdateProject"
                component={UpdateProjectScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="Update Project"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="TaskDetails"
                component={TaskDetailsScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="Task Details"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="LogsDetail"
                component={LogsDetailScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="Log Details"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
              <Stack.Screen
                name="CreatLog"
                component={CreatLogScreen}
                options={{
                  headerShown: true,
                  header: () => (
                    <CustomHeaderForScreens
                      onMenuPress={handleMenuPress}
                      title="Create Logs"
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                }}
              />
            </Stack.Navigator>

            {/* Sidebar - rendered at app level for proper overlay */}
            <Sidebar
              isVisible={sidebarVisible}
              onClose={handleSidebarClose}
              onNavigate={handleSidebarNavigate}
              navigation={navigationRef}
            />
          </NavigationContainer>
        </SafeAreaProvider>
      </MenuProvider>
    </AuthProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
