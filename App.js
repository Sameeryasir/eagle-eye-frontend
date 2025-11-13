// --- Change Summary ---
// What: Restored the profile icon on the chat screen header so users can reach account info quickly.
// Why: Business feedback indicated the chat view should match other headers for consistent access.
// Dependencies: Relies on shared `AppHeader` component and navigation to `AccountInfo`.
// MCP Context 7: Maintains consistent UI/UX and readability-focused navigation patterns.

import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  TouchableOpacity,
  View,
  TextInput,
  StatusBar,
  Text,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuProvider } from "react-native-popup-menu";
import Toast from "react-native-toast-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SQLiteProvider, useSQLiteContext, SQLiteDatabase } from "expo-sqlite";
import * as Notifications from "expo-notifications";

// --- Redux Store Integration (MCP Context 7) ---
// Import Redux store and provider for global state management
import { Provider } from "react-redux";
import store from "./store";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              color: "#333",
              textAlign: "center",
              margin: 20,
            }}
          >
            Something went wrong. Please restart the app.
          </Text>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
import SignIn from "./screens/SignInScreen";
import LogIn from "./screens/LogInScreen";
import Code from "./screens/OtpScreen";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider, useAuth } from "./context/AuthContext";
import appEmitter from "./utils/appEmitter";

import HomeScreen from "./screens/HomeScreen";
import WidgetScreen from "./screens/WidgetScreen";
import CalenderScreen from "./screens/CalenderScreen";
import CalenderDetailScreen from "./screens/CalenderDetailScreen";
import ViewAllTasksScreen from "./screens/ViewAllTasksScreen";
import ViewAllLogScreen from "./screens/ViewAllLogScreen";
import CreateProjectScreen from "./screens/CreateProjectScreen";
import CreateTaskScreen from "./screens/CreateTaskScreen";
import UpdateTaskScreen from "./screens/UpdateTaskScreen";
import UpdateProjectScreen from "./screens/UpdateProjectScreen";
import TaskDetailsScreen from "./screens/TaskDetailsScreen";
import LogsDetailScreen from "./screens/LogsDetailScreen";
import CreatLogScreen from "./screens/CreatLogScreen";
import PersonalScreen from "./screens/PersonalScreen";
import FilesScreen from "./screens/FilesScreen";
import ProjectAssignment from "./screens/ProjectAssignment";
import WeekView from "./screens/WeekView";
import ChatScreen from "./screens/ChatScreen";
import UserChatScreen from "./screens/UserChatScreen";
import SignatureScreen from "./screens/SignatureScreen";
import NotificationScreen from "./screens/NotificationScreen";
import AccountInfoScreen from "./screens/AccountInfoScreen";
import ProjectFilesScreen from "./screens/ProjectFilesScreen";

const Stack = createNativeStackNavigator();

const AppHeader = ({
  title,
  onMenuPress,
  navigation,
  showMenu = true,
  leftIconName = "menu",
  showRightIcon = true,
  rightIconName = "person",
  onRightPress,
}) => {
  const handleRightPress = () => {
    if (onRightPress) {
      onRightPress();
    } else if (showRightIcon) {
      navigation?.navigate("AccountInfo");
    }
  };

  const effectiveMenuPress =
    showMenu && onMenuPress ? onMenuPress : undefined;

  return (
    <SafeAreaView style={{ backgroundColor: "#3155A1" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      <Header
        title={title}
        onMenuPress={effectiveMenuPress}
        onRightPress={showRightIcon ? handleRightPress : undefined}
        rightIcon={showRightIcon ? rightIconName : undefined}
        leftIconName={leftIconName}
        showMenu={showMenu}
        showRight={showRightIcon}
        backgroundColor="#3155A1"
        textColor="white"
        iconColor="white"
      />
    </SafeAreaView>
  );
};

// Loading Screen Component
const LoadingScreen = () => (
  <SafeAreaView
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#ffffff",
    }}
  >
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    <Text style={{ fontSize: 16, color: "#666" }}>Loading...</Text>
  </SafeAreaView>
);

// Navigation component that handles initial routing
const AppNavigator = () => {
  // Temporarily comment out useAuth to test
  // const { isAuthenticated } = useAuth();
  const isAuthenticated = true; // Temporary fix
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const navigationRef = useRef(null);
  const [headerConfig, setHeaderConfig] = useState({
    visible: false,
    title: "",
    showMenu: false,
    leftIconName: "menu",
    onMenuPress: undefined,
    showRightIcon: false,
    rightIconName: "person",
    onRightPress: undefined,
  });

  // SplashScreen will handle initial routing and auth checking

  // --- Handle notification when app is in background or closed (MCP Context 7) ---
  // Business Rule: Navigate to appropriate screen when user taps on notification
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("📱 Notification clicked:", data);

        // Navigate based on notification type
        if (navigationRef) {
          if (data?.type === "task-assignment" && data.taskId) {
            console.log(
              "📋 Navigating to TaskDetailsScreen with taskId:",
              data.taskId
            );
            navigationRef.navigate("TaskDetails", { taskId: data.taskId });
          } else if (data?.type === "project-assignment" && data.projectId) {
            console.log("📁 Navigating to HomeScreen");
            navigationRef.navigate("HomeScreen");
          } else if (data?.type === "event-assignment" && data.eventId) {
            console.log("📅 Navigating to CalenderScreen");
            navigationRef.navigate("CalenderScreen");
          } else if (
            data?.type === "project-conversation-created" &&
            data.conversationId
          ) {
            console.log("💬 Navigating to ChatScreen");
            navigationRef.navigate("ChatScreen");
          } else if (
            data?.type === "conversation-created" &&
            data.conversationId
          ) {
            console.log("💬 Navigating to ChatScreen");
            navigationRef.navigate("ChatScreen");
          } else if (data?.type === "chat-message" && data.conversationId) {
            console.log("💬 Navigating to ChatScreen");
            navigationRef.navigate("ChatScreen");
          }
        }
      }
    );

    return () => subscription.remove();
  }, [navigationRef]);

  const handleMenuPress = useCallback(() => {
    setSidebarVisible(true);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarVisible(false);
  }, []);

  const handleSidebarNavigate = (itemId) => {
    // Handle navigation based on sidebar item
    console.log("Navigate to:", itemId);
    if (navigationRef.current) {
      // Add navigation logic here based on itemId
      switch (itemId) {
        case "chats":
          navigationRef.current.navigate("ChatScreen");
          break;
        case "files":
          // Navigate to files screenF
          break;
        case "material":
          // Navigate to material screen
          break;
        case "personnel":
          navigationRef.current.navigate("PersonalScreen");
          break;
        default:
          break;
      }
    }
    setSidebarVisible(false);
  };

  const goBack = useCallback(() => {
    navigationRef.current?.goBack();
  }, []);

  const updateHeaderForRoute = useCallback(
    (route) => {
      if (!route) {
        setHeaderConfig((prev) => ({ ...prev, visible: false }));
        return;
      }

      const baseConfig = {
        visible: true,
        title: "Projects",
        showMenu: true,
        leftIconName: "menu",
        onMenuPress: handleMenuPress,
        showRightIcon: true,
        rightIconName: "person",
        onRightPress: undefined,
      };

      let config = { ...baseConfig };

      switch (route.name) {
        case "SplashScreen":
        case "SignIn":
        case "LogIn":
        case "OtpScreen":
          config = { visible: false };
          break;
        case "HomeScreen":
          config.title = "Projects";
          break;
        case "WidgetScreen":
          config.title = "Dashboard";
          break;
        case "CalenderScreen":
          config.title = "Calendar";
          break;
        case "CalenderDetailScreen":
        case "TaskDetails":
          config.title = "Task Details";
          break;
        case "ViewAllTasksScreen":
          config.title = "All Tasks";
          break;
        case "ViewAllLogScreen":
          config.title = "All Logs";
          break;
        case "CreateProject":
          config.title = "Create Project";
          break;
        case "CreateTask":
          config.title = "Create Task";
          break;
        case "UpdateTask":
          config.title = "Update Task";
          break;
        case "UpdateProject":
          config.title = "Update Project";
          break;
        case "LogsDetail":
          config.title = "Log Details";
          break;
        case "CreatLog":
          config.title = "Create Logs";
          break;
        case "PersonalScreen":
          config.title = "Personnel";
          break;
        case "FilesScreen":
          config.title = "Files";
          break;
        case "ProjectAssignment":
          config.title = "Assign Project";
          break;
        case "WeekView":
          config.title = "Week View";
          break;
        case "ChatScreen":
          config.title = "Messages";
          config.showRightIcon = false;
          break;
        case "UserChatScreen":
          config.title = route.params?.userName || "Chat";
          config.showRightIcon = false;
          config.leftIconName = "chevron-back";
          config.onMenuPress = goBack;
          break;
        case "SignatureScreen":
          config.title = "Signature";
          config.showRightIcon = false;
          config.leftIconName = "chevron-back";
          config.onMenuPress = goBack;
          break;
        case "NotificationScreen":
          config.title = "Notifications";
          break;
        case "AccountInfo":
          config.title = "Account Info";
          config.showRightIcon = false;
          break;
        case "ProjectFiles":
          config.title = route.params?.projectName || "Project Files";
          break;
        default:
          config.title = route.name.replace(/([A-Z])/g, " $1").trim();
          break;
      }

      setHeaderConfig(config);
    },
    [goBack, handleMenuPress]
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
              screenOptions={{ headerShown: false }}
              initialRouteName="SplashScreen"
            >
              <Stack.Screen name="SplashScreen" component={SplashScreen} />
              <Stack.Screen name="SignIn" component={SignIn} />
              <Stack.Screen name="LogIn" component={LogIn} />
              <Stack.Screen name="OtpScreen" component={Code} />
              <Stack.Screen
                name="HomeScreen"
                component={HomeScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      title="Projects"
                      onMenuPress={handleMenuPress}
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />

              <Stack.Screen
                name="WidgetScreen"
                component={WidgetScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Dashboard"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="CalenderScreen"
                component={CalenderScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Calendar"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="CalenderDetailScreen"
                component={CalenderDetailScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Task Details"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />

              <Stack.Screen
                name="ViewAllTasksScreen"
                component={ViewAllTasksScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="All Tasks"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="ViewAllLogScreen"
                component={ViewAllLogScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="All Logs"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="CreateProject"
                component={CreateProjectScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Create Project"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="CreateTask"
                component={CreateTaskScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Create Task"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="UpdateTask"
                component={UpdateTaskScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Update Task"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="UpdateProject"
                component={UpdateProjectScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Update Project"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="TaskDetails"
                component={TaskDetailsScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Task Details"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="LogsDetail"
                component={LogsDetailScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Log Details"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="CreatLog"
                component={CreatLogScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Create Logs"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="PersonalScreen"
                component={PersonalScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Personnel"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="FilesScreen"
                component={FilesScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Files"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="ProjectAssignment"
                component={ProjectAssignment}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Assign Project"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="WeekView"
                component={WeekView}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Week View"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="ChatScreen"
                component={ChatScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      title="Messages"
                      onMenuPress={handleMenuPress}
                      navigation={navigation}
                      // NOTE: showRightIcon restored to keep quick access to account details (MCP Context 7 consistency).
                      showRightIcon={true}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="UserChatScreen"
                component={UserChatScreen}
                options={({ navigation, route }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      title={route.params?.userName || "Chat"}
                      onMenuPress={() => navigation.goBack()}
                      navigation={navigation}
                      showRightIcon={false}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="SignatureScreen"
                component={SignatureScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      title="Signature"
                      onMenuPress={() => navigation.goBack()}
                      navigation={navigation}
                      showRightIcon={false}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="NotificationScreen"
                component={NotificationScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Notifications"
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="AccountInfo"
                component={AccountInfoScreen}
                options={({ navigation }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title="Account Info"
                      navigation={navigation}
                      showRightIcon={false}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
              <Stack.Screen
                name="ProjectFiles"
                component={ProjectFilesScreen}
                options={({ navigation, route }) => ({
                  headerShown: true,
                  header: () => (
                    <AppHeader
                      onMenuPress={handleMenuPress}
                      title={route.params?.projectName || "Project Files"}
                      navigation={navigation}
                    />
                  ),
                  headerBackTitleVisible: false,
                  headerStyle: {
                    backgroundColor: "white",
                  },
                  headerShadowVisible: false,
                })}
              />
            </Stack.Navigator>

            {/* Sidebar - rendered at app level for proper overlay */}
            <Sidebar
              isVisible={sidebarVisible}
              onClose={handleSidebarClose}
              onNavigate={handleSidebarNavigate}
            />
          </NavigationContainer>
          <Toast />
        </SafeAreaProvider>
      </MenuProvider>
    </GestureHandlerRootView>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SQLiteProvider databaseName="messages.db">
        <Provider store={store}>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </Provider>
      </SQLiteProvider>
    </ErrorBoundary>
  );
}
