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
import React, { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuProvider } from "react-native-popup-menu";
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// --- Redux Store Integration (MCP Context 7) ---
// Import Redux store and provider for global state management
import { Provider } from 'react-redux';
import store from './store';

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
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <Text style={{ fontSize: 18, color: '#333', textAlign: 'center', margin: 20 }}>
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
import Sidebar from "./screens/components/Sidebar";
import SplashScreen from "./screens/components/SplashScreen";
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

// Custom Header Component with Header + Search Bar
const CustomHeader = ({ onMenuPress, navigation }) => {
  return (
    <SafeAreaView style={{ backgroundColor: "#3155A1" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      <Header
        title="Projects"
        onMenuPress={onMenuPress}
        onRightPress={() => navigation?.navigate('AccountInfo')}
        rightIcon="person"
        backgroundColor="#3155A1"
        textColor="white"
        iconColor="white"
      />
    </SafeAreaView>
  );
};

// Custom Header Component for all other screens (without search bar)
const CustomHeaderForScreens = ({ onMenuPress, title = "Screen", navigation, showPersonIcon = true }) => {
  return (
    <SafeAreaView style={{ backgroundColor: "#3155A1" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      <Header
        title={title}
        onMenuPress={onMenuPress}
        onRightPress={showPersonIcon ? () => navigation?.navigate('AccountInfo') : undefined}
        rightIcon={showPersonIcon ? "person" : undefined}
        backgroundColor="#3155A1"
        textColor="white"
        iconColor="white"
      />
    </SafeAreaView>
  );
};

// Custom Header Component for ChatScreen
const CustomHeaderForChat = ({ onMenuPress, navigation }) => {
  return (
    <SafeAreaView style={{ backgroundColor: "#3155A1" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      <View className="border-b border-gray-200" style={{ backgroundColor: "#3155A1" }}>
        {/* Main Header */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <Text className="text-3xl font-bold text-white">Messages</Text>
          <View className="flex-row items-center">
            <TouchableOpacity className="w-10 h-10 items-center justify-center">
              <Ionicons name="create-outline" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Custom Header Component for SignatureScreen
const CustomHeaderForSignature = ({ navigation }) => {
  return (
    <SafeAreaView style={{ backgroundColor: "#3155A1" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      <View className="border-b border-gray-200" style={{ backgroundColor: "#3155A1" }}>
        {/* Main Header */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <Text className="text-xl font-bold text-white">Signature</Text>
          
          <TouchableOpacity 
            onPress={() => {
              // Emit a custom event for clear action
              navigation.navigate('SignatureScreen', { action: 'clear' });
            }} 
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Custom Header Component for UserChatScreen
const CustomHeaderForUserChat = ({ navigation, route }) => {
  const { userName = 'Chat', userData } = route.params || {};
  const [menuVisible, setMenuVisible] = useState(false);
  
  return (
    <SafeAreaView style={{ backgroundColor: "#3155A1" }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#3155A1" />
      <View className="border-b border-gray-200" style={{ backgroundColor: "#3155A1" }}>
        {/* Main Header */}
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            className="w-10 items-start"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View className="flex-1 items-center justify-center">
            <Text className="text-xl font-semibold text-white">{userName}</Text>
            <View className="flex-row items-center mt-0.5">
              {userData?.isOnline && <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />}
              <Text className="text-sm text-gray-200">
                {userData?.isOnline ? 'Online' : 'Last seen recently'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            className="w-10 items-end"
            onPress={() => setMenuVisible(!menuVisible)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {/* Dropdown Menu */}
        {menuVisible && (
          <View 
            className="absolute top-16 right-4 bg-white rounded-xl shadow-2xl z-50 min-w-36"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <TouchableOpacity
              className="flex-row items-center px-5 py-4"
              style={{ backgroundColor: 'transparent' }}
              onPress={() => {
                console.log('All Files pressed');
                console.log('Emitting fetchAllFiles event...');
                setMenuVisible(false);
                // Emit event to fetch all files
                appEmitter.emit("fetchAllFiles");
                console.log('fetchAllFiles event emitted');
              }}
            >
              <View className="w-8 h-8  items-center justify-center mr-2">
                <Ionicons name="folder" size={18} color="black" />
              </View>
              <Text className="text-base font-semibold text-gray-800">Files</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="flex-row items-center px-5 py-4"
              style={{ backgroundColor: 'transparent' }}
              onPress={() => {
                console.log('Signatures pressed');
                console.log('Emitting fetchSignatures event...');
                setMenuVisible(false);
                // Emit event to fetch signatures
                appEmitter.emit("fetchSignatures");
                console.log('fetchSignatures event emitted');
              }}
            >
              <View className="w-8 h-8  items-center justify-center mr-2">
                <Ionicons name="create" size={20} color="black" />
              </View>
              <Text className="text-base font-semibold text-gray-800">Signatures</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Overlay to close menu when tapping outside */}
      {menuVisible && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
          }}
          onPress={() => setMenuVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

// Loading Screen Component
const LoadingScreen = () => (
  <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
    <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
  </SafeAreaView>
);

// Navigation component that handles initial routing
const AppNavigator = () => {
  // Temporarily comment out useAuth to test
  // const { isAuthenticated } = useAuth();
  const isAuthenticated = true; // Temporary fix
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [navigationRef, setNavigationRef] = useState(null);
  
  // SplashScreen will handle initial routing and auth checking

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
          navigationRef.navigate("ChatScreen");
          break;
        case "files":
          // Navigate to files screen
          break;
        case "material":
          // Navigate to material screen
          break;
        case "personnel":
          navigationRef.navigate("PersonalScreen");
          break;
        default:
          break;
      }
    }
    setSidebarVisible(false);
  };


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MenuProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={setNavigationRef}>
          <Stack.Navigator 
            screenOptions={{ headerShown: false }} 
            initialRouteName="SplashScreen"
          >
            <Stack.Screen
              name="SplashScreen"
              component={SplashScreen}
              options={{
                headerShown: false,
              }}
            />
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
              options={({ navigation }) => ({
                headerShown: true,
                header: () => <CustomHeader onMenuPress={handleMenuPress} navigation={navigation} />,
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
                  <CustomHeaderForScreens
                    onMenuPress={handleMenuPress}
                    title=" Dashboard"
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
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
                header: () => <CustomHeaderForChat onMenuPress={handleMenuPress} navigation={navigation} />,
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
                header: () => <CustomHeaderForUserChat navigation={navigation} route={route} />,
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
                  <CustomHeaderForSignature
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
              name="NotificationScreen"
              component={NotificationScreen}
              options={({ navigation }) => ({
                headerShown: true,
                header: () => (
                  <CustomHeaderForScreens
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
                  <CustomHeaderForScreens
                    onMenuPress={handleMenuPress}
                    title="Account Info"
                    navigation={navigation}
                    showPersonIcon={false}
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
                  <CustomHeaderForScreens
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
            navigation={navigationRef}
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
      <Provider store={store}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </Provider>
    </ErrorBoundary>
  );
}
