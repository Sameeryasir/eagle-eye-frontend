import React from 'react';
import { View, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function CustomBottomNav({ keyboardVisible = false, task = false, projectId = null, project = false, onAddPress ,handleFabPress}) {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = React.useState('home'); // Track active tab

  const handleAddPress = () => {
    if (onAddPress) {
      onAddPress();
    } else if (task) {
      navigation.navigate('CreateTask', { projectId: projectId });
    } else if (project) {
      navigation.navigate("CreateProject");
    }
    else if(handleFabPress){
      handleFabPress();
    }
  };
 
  const navigateToHome = () => {
    setActiveTab('home');
    navigation.navigate('HomeScreen')
  }

  const navigateToChats = () => {
    setActiveTab('chats');
    navigation.navigate('HomeScreen') // You can change this to actual chat screen later
  }

  const navigateToNotifications = () => {
    setActiveTab('notifications');
    navigation.navigate('HomeScreen') // You can change this to actual notification screen later
  }

  const navigateToProfile = () => {
    setActiveTab('profile');
    navigation.navigate('HomeScreen') // You can change this to actual profile screen later
  }
  // Hide the bottom navigation when keyboard is visible
  if (keyboardVisible) {
    return null;
  }

  return (
    <View className="absolute bottom-0 w-full items-center z-[1000]">
      {/* Bottom Nav Bar */}
      <View 
        className="flex-row items-center justify-between w-[90%] h-[70px] bg-black rounded-[35px] px-[15px] pb-[5px] mb-5"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 6,
        }}
      >
        <TouchableOpacity 
          className="items-center justify-center relative"
          style={{ width: (width * 0.9 - 30) / 5 }}
          onPress={navigateToHome}
        >
          <Ionicons name="home-outline" size={24} color="#fff" />
          {activeTab === 'home' && (
            <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center justify-center relative"
          style={{ width: (width * 0.9 - 30) / 5 }}
          onPress={navigateToChats}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          {activeTab === 'chats' && (
            <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
          )}
        </TouchableOpacity>

        <View style={{ width: 65 }} />

        <TouchableOpacity 
          className="items-center justify-center relative"
          style={{ width: (width * 0.9 - 30) / 5 }}
          onPress={navigateToNotifications}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
          {activeTab === 'notifications' && (
            <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
          )}
        </TouchableOpacity>

        <TouchableOpacity 
  className="items-center justify-center relative"
  style={{ width: (width * 0.9 - 30) / 5 }}
  onPress={navigateToProfile}
>
  {/* Calendar icon (fixed spelling + valid icon) */}
  <Ionicons name="calendar-outline" size={24} color="#fff" />

  {activeTab === 'profile' && (
    <View className="absolute bottom-[-6px] w-5 h-[3px] bg-white rounded-[2px]" />
  )}
</TouchableOpacity>

      </View>

      {/* Floating Action Button */}
      <View className="absolute bottom-[45px] z-[1001]">
        <TouchableOpacity 
          className="w-[65px] h-[65px] rounded-[32.5px] bg-black justify-center items-center border-[3px] border-white"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={handleAddPress}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
