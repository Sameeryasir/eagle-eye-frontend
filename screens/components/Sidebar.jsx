import React from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserRole } from '../../services/utils/userRole';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const Sidebar = ({ isVisible, onClose, onNavigate }) => {
  const slideAnim = React.useRef(new Animated.Value(-width)).current;
  const [userData, setUserData] = React.useState({
    name: '',
    role: ''
  });
  const [userRole, setUserRole] = React.useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);
  const [activeMenuItem, setActiveMenuItem] = React.useState('chats'); // Track which menu item is active
  const navigation = useNavigation();
  const { logout } = useAuth();

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
      { id: 'chats', title: 'Chats', icon: 'chatbubbles', isActive: activeMenuItem === 'chats' },
      { id: 'files', title: 'Files', icon: 'document-text', isActive: activeMenuItem === 'files' },
      { id: 'material', title: 'Material', icon: 'cube', isActive: activeMenuItem === 'material' },
    ];

    // Only show Personnel menu item if user is not an Employee
    if (userRole !== 'Employee') {
      baseItems.push({ id: 'personnel', title: 'Personnel.', icon: 'people', isActive: activeMenuItem === 'personnel' });
    }

    return baseItems;
  };

  const handleNavigate = (itemId) => {
    // Update the active menu item state to show visual feedback
    setActiveMenuItem(itemId);
    
    // Add navigation specifically for Personnel item
    if (itemId === 'personnel') {
      // Close sidebar first
      onClose();
      // Navigate to PersonalScreen
      navigation.navigate('PersonalScreen');
    }
    
    // Note: Other items only show visual feedback without navigation
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    try {
      // Close dialog and sidebar
      setShowLogoutDialog(false);
      onClose();
      
      // Navigate to SignIn screen immediately
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
      
      // Handle logout in background
      logout().catch(error => {
        console.error('Logout error:', error);
      });
      
    } catch (error) {
      console.error('Error during logout:', error);
      setShowLogoutDialog(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
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

      {/* Custom Logout Dialog */}
      <Modal
        visible={showLogoutDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl mx-8 p-6 shadow-2xl" style={{ width: width * 0.85 }}>
            {/* Dialog Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
                <Ionicons name="log-out" size={32} color="#ef4444" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">Logout</Text>
              <Text className="text-gray-600 text-center leading-6">
                Are you sure you want to logout? You'll need to sign in again to access your account.
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
                onPress={cancelLogout}
                activeOpacity={0.8}
              >
                <Text className="text-gray-700 text-lg font-semibold">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-xl py-4 items-center"
                onPress={confirmLogout}
                activeOpacity={0.8}
                style={{
                  shadowColor: '#ef4444',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text className="text-white text-lg font-semibold">Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
export default Sidebar; 