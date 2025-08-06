import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignIn from "./screens/SignInScreen";
import LogIn from "./screens/LogInScreen";
import Code from "./screens/OtpScreen";

import HomeScreen from "./screens/HomeScreen";
import CalenderScreen from "./screens/CalenderScreen";
import TaskDetailScreen from "./screens/TaskDetailScreen";
import CreateProjectScreen from "./screens/CreateProjectScreen";
import UpdateProjectScreen from "./screens/UpdateProjectScreen";
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
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
            headerShown: false,
            title: "Home",
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
  );
}
