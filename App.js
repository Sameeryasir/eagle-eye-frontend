import "./global.css";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  TouchableOpacity,
  View,
  TextInput,
  StatusBar,
  Text,
  Keyboard,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuProvider, Menu, MenuOptions, MenuOption, MenuTrigger } from "react-native-popup-menu";
import Toast from "react-native-toast-message";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SQLiteProvider, useSQLiteContext, SQLiteDatabase } from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { isRunningInExpoGo } from "expo";

import { Provider } from "react-redux";
import store from "./store";

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
import RegisterScreen from "./screens/RegisterScreen";
import RegisterCompanyScreen from "./screens/RegisterCompanyScreen";
import Code from "./screens/OtpScreen";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import SplashScreen from "./components/SplashScreen";
import { AuthProvider, useAuth } from "./context/AuthContext";
import appEmitter from "./utils/appEmitter";

import HomeScreen from "./screens/HomeScreen";
import WidgetScreen from "./screens/WidgetScreen";
import ProjectDetailsScreen from "./screens/ProjectDetailsScreen";
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
import { Brand } from "./constants/brandColors";

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
    } else if (showRightIcon && rightIconName !== "ellipsis-vertical") {
      navigation?.navigate("AccountInfo");
    }
  };

  const handleAllFiles = () => {
    console.log('📁 All Files option selected');
    appEmitter.emit('fetchAllFiles');
  };

  const handleAllSignatures = () => {
    console.log('📝 All Signatures option selected');
    appEmitter.emit('fetchSignatures');
  };

  const effectiveMenuPress = showMenu && onMenuPress ? onMenuPress : undefined;

  return (
    <SafeAreaView style={{ backgroundColor: Brand.paper }} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
      <View style={{ position: "relative" }}>
        <Header
          title={title}
          onMenuPress={effectiveMenuPress}
          onRightPress={showRightIcon && rightIconName !== "ellipsis-vertical" ? handleRightPress : undefined}
          rightIcon={showRightIcon && rightIconName !== "ellipsis-vertical" ? rightIconName : undefined}
          leftIconName={leftIconName}
          showMenu={showMenu}
          showRight={showRightIcon && rightIconName !== "ellipsis-vertical"}
          backgroundColor={Brand.paper}
          textColor={Brand.ink}
          iconColor={Brand.ink}
        />
        
        {showRightIcon && rightIconName === "ellipsis-vertical" && (
          <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "flex-end", paddingRight: 20, zIndex: 1000 }}>
            <Menu>
              <MenuTrigger>
                <View style={{ padding: 8 }}>
                  <Ionicons name="ellipsis-vertical" size={24} color={Brand.ink} />
                </View>
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    backgroundColor: "white",
                    borderRadius: 8,
                    padding: 8,
                    width: 150,
                    marginTop: 40,
                    marginRight: 10,
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 3,
                  },
                }}
              >
                <MenuOption
                  onSelect={handleAllFiles}
                  customStyles={{
                    optionWrapper: {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 4,
                    },
                  }}
                >
                  <Ionicons name="folder-outline" size={18} color="#000" />
                  <Text
                    style={{
                      marginLeft: 10,
                      fontSize: 14,
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    All Files
                  </Text>
                </MenuOption>
                <MenuOption
                  onSelect={handleAllSignatures}
                  customStyles={{
                    optionWrapper: {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 4,
                    },
                  }}
                >
                  <Ionicons name="create-outline" size={18} color="#000" />
                  <Text
                    style={{
                      marginLeft: 10,
                      fontSize: 14,
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    All Signatures
                  </Text>
                </MenuOption>
              </MenuOptions>
            </Menu>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

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

const AppNavigator = () => {
  const { isLoading: authLoading } = useAuth();
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

  useEffect(() => {
    if (isRunningInExpoGo()) {
      return undefined;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (navigationRef) {
          if (data?.type === "task-assignment" && data.taskId) {
            navigationRef.navigate("TaskDetails", { taskId: data.taskId });
          } else if (data?.type === "project-assignment" && data.projectId) {
            navigationRef.navigate("HomeScreen");
          } else if (data?.type === "event-assignment" && data.eventId) {
            navigationRef.navigate("CalenderScreen");
          } else if (
            (data?.type === "project-conversation-created" ||
              data?.type === "conversation-created" ||
              data?.type === "chat-message") &&
            data.conversationId
          ) {
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

  const handleSidebarNavigate = useCallback((itemId) => {
    setSidebarVisible(false);
    const nav = navigationRef.current;
    if (!nav) return;

    switch (itemId) {
      case "chats":
        nav.navigate("ChatScreen");
        break;
      case "files":
        nav.navigate("FilesScreen");
        break;
      case "personnel":
        nav.navigate("PersonalScreen");
        break;
      case "material":
      default:
        break;
    }
  }, []);

  const handleSidebarLogoutComplete = useCallback(() => {
    setSidebarVisible(false);
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: "SignIn" }],
    });
  }, []);

  const goBack = useCallback(() => {
    navigationRef.current?.goBack();
  }, []);

  const updateHeaderForRoute = useCallback(
    (route) => {
      if (!route) {
        setHeaderConfig((prev) => ({ ...prev, visible: false }));
        return;
      }

      const hideHeaderOn = new Set([
        "SplashScreen",
        "SignIn",
        "LogIn",
        "Register",
        "RegisterCompany",
        "OtpScreen",
        "HomeScreen",
        "SignatureScreen",
      ]);

      if (hideHeaderOn.has(route.name)) {
        setHeaderConfig({ visible: false });
        return;
      }

      const config = {
        visible: true,
        title: "Projects",
        showMenu: true,
        leftIconName: "menu",
        onMenuPress: handleMenuPress,
        showRightIcon: true,
        rightIconName: "person",
        onRightPress: undefined,
      };

      const useBackButton = new Set([
        "ProjectDetails",
        "CreateProject",
        "CreateTask",
        "UpdateTask",
        "UpdateProject",
        "CreatLog",
        "ProjectAssignment",
        "TaskDetails",
        "LogsDetail",
        "CalenderDetailScreen",
        "AccountInfo",
        "ProjectFiles",
        "WeekView",
        "ViewAllTasksScreen",
        "ViewAllLogScreen",
        "WidgetScreen",
      ]);

      if (useBackButton.has(route.name)) {
        config.leftIconName = "chevron-back";
        config.onMenuPress = goBack;
      }

      switch (route.name) {
        case "HomeScreen":
          config.title = "Projects";
          break;
        case "ProjectDetails":
          config.title = route.params?.projectName || "Project Details";
          break;
        case "WidgetScreen":
          config.title = "Dashboard";
          break;
        case "CalenderScreen":
          config.title = "Calendar";
          break;
        case "CalenderDetailScreen":
          config.title = "Event Details";
          break;
        case "WeekView":
          config.title = "Week View";
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
        case "TaskDetails":
          config.title = "Task Details";
          break;
        case "LogsDetail":
          config.title = "Log Details";
          break;
        case "CreatLog":
          config.title = "Create Log";
          break;
        case "ProjectAssignment":
          config.title = "Assign Project";
          break;
        case "PersonalScreen":
          config.title = "Crew";
          break;
        case "FilesScreen":
          config.title = "Files";
          break;
        case "ProjectFiles":
          config.title = "Project Files";
          break;
        case "AccountInfo":
          config.title = "Account";
          break;
        case "ChatScreen":
          config.title = "Messages";
          config.showRightIcon = false;
          break;
        case "UserChatScreen":
          config.title = route.params?.userName || "Chat";
          config.showRightIcon = true;
          config.rightIconName = "ellipsis-vertical";
          config.leftIconName = "chevron-back";
          config.onMenuPress = goBack;
          config.onRightPress = undefined;
          break;
        case "NotificationScreen":
          config.title = "Notifications";
          break;
        default:
          config.title = route.name.replace(/([A-Z])/g, " $1").trim();
          break;
      }

      setHeaderConfig(config);
    },
    [goBack, handleMenuPress]
  );

  const syncHeaderWithCurrentRoute = useCallback(() => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    if (currentRoute) {
      updateHeaderForRoute(currentRoute);
    }
  }, [updateHeaderForRoute]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuProvider>
        <SafeAreaProvider>
          <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
            <NavigationContainer
              ref={navigationRef}
              onReady={syncHeaderWithCurrentRoute}
              onStateChange={syncHeaderWithCurrentRoute}
            >
              <View style={{ flex: 1 }}>
                {headerConfig.visible && (
                  <AppHeader
                    title={headerConfig.title}
                    onMenuPress={
                      headerConfig.leftIconName === "menu"
                        ? handleMenuPress
                        : headerConfig.onMenuPress
                    }
                    navigation={navigationRef.current}
                    showMenu={headerConfig.showMenu}
                    leftIconName={headerConfig.leftIconName}
                    showRightIcon={headerConfig.showRightIcon}
                    rightIconName={headerConfig.rightIconName}
                    onRightPress={headerConfig.onRightPress}
                  />
                )}
                <Stack.Navigator
                  screenOptions={{
                    headerShown: false,
                    animation: "none",
                  }}
                  initialRouteName="SignIn"
                >
                  <Stack.Screen name="SplashScreen" component={SplashScreen} />
                  <Stack.Screen name="SignIn" component={SignIn} />
                  <Stack.Screen name="LogIn" component={LogIn} />
                  <Stack.Screen name="Register" component={RegisterScreen} />
                  <Stack.Screen
                    name="RegisterCompany"
                    component={RegisterCompanyScreen}
                  />
                  <Stack.Screen name="OtpScreen" component={Code} />
                  <Stack.Screen name="HomeScreen" component={HomeScreen} />
                  <Stack.Screen
                    name="ProjectDetails"
                    component={ProjectDetailsScreen}
                  />
                  <Stack.Screen name="WidgetScreen" component={WidgetScreen} />
                  <Stack.Screen
                    name="CalenderScreen"
                    component={CalenderScreen}
                  />
                  <Stack.Screen
                    name="CalenderDetailScreen"
                    component={CalenderDetailScreen}
                  />
                  <Stack.Screen
                    name="ViewAllTasksScreen"
                    component={ViewAllTasksScreen}
                  />
                  <Stack.Screen
                    name="ViewAllLogScreen"
                    component={ViewAllLogScreen}
                  />
                  <Stack.Screen
                    name="CreateProject"
                    component={CreateProjectScreen}
                  />
                  <Stack.Screen
                    name="CreateTask"
                    component={CreateTaskScreen}
                  />
                  <Stack.Screen
                    name="UpdateTask"
                    component={UpdateTaskScreen}
                  />
                  <Stack.Screen
                    name="UpdateProject"
                    component={UpdateProjectScreen}
                  />
                  <Stack.Screen
                    name="TaskDetails"
                    component={TaskDetailsScreen}
                  />
                  <Stack.Screen
                    name="LogsDetail"
                    component={LogsDetailScreen}
                  />
                  <Stack.Screen name="CreatLog" component={CreatLogScreen} />
                  <Stack.Screen
                    name="PersonalScreen"
                    component={PersonalScreen}
                  />
                  <Stack.Screen name="FilesScreen" component={FilesScreen} />
                  <Stack.Screen
                    name="ProjectAssignment"
                    component={ProjectAssignment}
                  />
                  <Stack.Screen name="WeekView" component={WeekView} />
                  <Stack.Screen name="ChatScreen" component={ChatScreen} />
                  <Stack.Screen
                    name="UserChatScreen"
                    component={UserChatScreen}
                  />
                  <Stack.Screen
                    name="SignatureScreen"
                    component={SignatureScreen}
                  />
                  <Stack.Screen
                    name="NotificationScreen"
                    component={NotificationScreen}
                  />
                  <Stack.Screen
                    name="AccountInfo"
                    component={AccountInfoScreen}
                  />
                  <Stack.Screen
                    name="ProjectFiles"
                    component={ProjectFilesScreen}
                  />
                </Stack.Navigator>

                <Sidebar
                  isVisible={sidebarVisible}
                  onClose={handleSidebarClose}
                  onNavigate={handleSidebarNavigate}
                  onLogoutComplete={handleSidebarLogoutComplete}
                />
              </View>
            </NavigationContainer>
          </View>
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
