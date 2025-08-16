import React from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserRole } from '../../services/utils/userRole';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Sidebar = ({ isVisible, onClose, onNavigate }) => {
  const slideAnim = React.useRef(new Animated.Value(-width)).current;
  const [userData, setUserData] = React.useState({
    name: '',
    role: ''
  });
  const [userRole, setUserRole] = React.useState(null);
  const navigation = useNavigation();

  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      loadUserData();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const loadUserData = async () => {
    try {
      const role = await getUserRole();
      const userFirstName = await AsyncStorage.getItem('userFirstName');
      const userLastName = await AsyncStorage.getItem('userLastName');
      
      const fullName = `${userFirstName || ''} ${userLastName || ''}`.trim();
      
      setUserRole(role);
      setUserData({
        name: fullName || 'User',
        role: role || 'User'
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserRole(null);
      setUserData({
        name: 'User',
        role: 'User'
      });
    }
  };

  const getMenuItems = () => {
    const baseItems = [
      { id: 'chats', title: 'Chats', icon: 'chatbubbles', isActive: true },
      { id: 'files', title: 'Files', icon: 'document-text' },
      { id: 'material', title: 'Material', icon: 'cube' },
    ];

    // Only show Personnel menu item if user is not an Employee
    if (userRole !== 'Employee') {
      baseItems.push({ id: 'personnel', title: 'Personnel.', icon: 'people' });
    }

    return baseItems;
  };

  const handleNavigate = (itemId) => {
    onNavigate(itemId);
    onClose();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored tokens and user data
              await AsyncStorage.multiRemove([
                'token',
                'refreshToken',
                'userRole',
                'userFirstName',
                'userLastName',
                'userId'
              ]);
              
              // Close sidebar
              onClose();
              
              // Navigate to SignIn screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignIn' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isVisible && (
        <TouchableOpacity
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 9999 }}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Sidebar */}
      <Animated.View
        className="absolute top-0 left-0 h-full bg-white"
        style={{
          width: width * 0.75,
          zIndex: 10000,
          shadowColor: '#000',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 12,
          transform: [{ translateX: slideAnim }],
        }}
      >
        {/* User Profile Section */}
        <View className="flex-row items-center pt-[100px] pb-[30px] border-b border-[#F2F2F7] bg-white px-5">
          <View className="w-20 h-20 rounded-full bg-[#f0f0f0] items-center justify-center mr-4 mt-4">
            <Ionicons name="person" size={40} color="black" />
          </View>
          <View className="flex-1 mt-4">
            <Text className="text-[20px] font-bold text-[#1C1C1E] mb-1.5 tracking-[0.5px]">{userData.name}</Text>
            <Text className="text-[14px] text-[#8E8E93] font-medium tracking-[0.3px]">{userData.role}</Text>
          </View>
        </View>

        {/* Navigation Items */}
        <View className="flex-1 pt-5 px-4">
          {getMenuItems().map((item) => (
            <TouchableOpacity
              key={item.id}
              className={`flex-row items-center px-5 py-4 mb-2 rounded-[12px] ${
                item.isActive ? 'bg-[#f0f0f0] border-l-4 border-l-black' : 'bg-transparent'
              }`}
              onPress={() => handleNavigate(item.id)}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={item.isActive ? 'black' : '#8E8E93'}
              />
              <Text
                className={`text-[16px] text-black ml-4 ${
                  item.isActive ? 'font-bold' : 'font-semibold'
                } tracking-[0.3px]`}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Section */}
        <View className="px-5 pb-10 mt-6">
          <TouchableOpacity
            className="flex-row items-center justify-center py-4 px-5 rounded-[12px] bg-black self-center"
            style={{
              shadowColor: '#6c757d',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
              width: '60%',
            }}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={24} color="white" />
            <Text className="text-[16px] text-white ml-3 font-semibold tracking-[0.3px]">Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
};
export default Sidebar; 