import "./global.css"
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TouchableOpacity, View, TextInput, StatusBar } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import SignIn from "./screens/SignInScreen";
import LogIn from "./screens/LogInScreen";
import Code from "./screens/OtpScreen";
import Header from "./components/Header";
import Sidebar from "./screens/components/Sidebar";

import HomeScreen from "./screens/HomeScreen";
import WidgetScreen from "./screens/WidgetScreen";
import CalenderScreen from "./screens/CalenderScreen";
import TaskDetailScreen from "./screens/TaskDetailScreen";
import ViewAllTasksScreen from "./screens/ViewAllTasksScreen";
import CreateProjectScreen from "./screens/CreateProjectScreen";
import CreateTaskScreen from "./screens/CreateTaskScreen";
import UpdateTaskScreen from "./screens/UpdateTaskScreen";
import UpdateProjectScreen from "./screens/UpdateProjectScreen";

const Stack = createNativeStackNavigator();

// Custom Header Component with Header + Search Bar
const CustomHeader = ({onMenuPress }) => {
  return (
    <SafeAreaView style={{ backgroundColor: '#3155A1' }} edges={['top']}>
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

export default function App() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState(null);

  const handleMenuPress = () => {
    setSidebarVisible(true);
  };

  const handleSidebarClose = () => {
    setSidebarVisible(false);
  };

  const handleSidebarNavigate = (itemId) => {
    // Handle navigation based on sidebar item
    console.log('Navigate to:', itemId);
    if (navigationRef) {
      // Add navigation logic here based on itemId
      switch (itemId) {
        case 'chats':
          navigationRef.navigate('WidgetScreen');
          break;
        case 'files':
          // Navigate to files screen
          break;
        case 'material':
          // Navigate to material screen
          break;
        case 'personnel':
          // Navigate to personnel screen
          break;
        default:
          break;
      }
    }
    setSidebarVisible(false);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={setNavigationRef}>
        <Stack.Navigator initialRouteName="SignIn">
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
              backgroundColor: 'white',
            },
            headerShadowVisible: false,
          }}
        />

        <Stack.Screen
          name="WidgetScreen"
          component={WidgetScreen}
          options={{
            headerShown: false,
            title: "Widget Dashboard",
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="CalenderScreen"
          component={CalenderScreen}
          options={{
            headerShown: true,
            title: "Calendar",
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="TaskDetailScreen"
          component={TaskDetailScreen}
          options={{
            headerShown: true,
            title: "Task Details",
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="ViewAllTasksScreen"
          component={ViewAllTasksScreen}
          options={{
            headerShown: false,
            title: "All Tasks",
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="CreateProject"
          component={CreateProjectScreen}
          options={{
            headerShown: true,
            title: "Create Project",
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="CreateTask"
          component={CreateTaskScreen}
          options={{
            headerShown: true,
            title: "Create Task",
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="UpdateTask"
          component={UpdateTaskScreen}
          options={{
            headerShown: true,
            title: "Update Task",
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
          }}
        />
        <Stack.Screen
          name="UpdateProject"
          component={UpdateProjectScreen}
          options={{
            headerShown: true,
            title: "Update Project",
            headerBackTitleVisible: false,
            headerTitleAlign: "center",
          }}
        />
        </Stack.Navigator>
        </NavigationContainer>
        
        {/* Sidebar - rendered at app level for proper overlay */}
        <Sidebar
          isVisible={sidebarVisible}
          onClose={handleSidebarClose}
          onNavigate={handleSidebarNavigate}
          navigation={navigationRef}
        />
      </SafeAreaProvider>
    );
}
