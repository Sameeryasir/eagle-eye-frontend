import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Sidebar = ({ isVisible, onClose, onNavigate }) => {
  const navigation = useNavigation();
  const slideAnim = React.useRef(new Animated.Value(-width)).current;

  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const menuItems = [
    { id: 'chats', title: 'Chats', icon: 'chatbubbles', isActive: true },
    { id: 'files', title: 'Files', icon: 'document-text' },
    { id: 'material', title: 'Material', icon: 'cube' },
    { id: 'personnel', title: 'Personnel.', icon: 'people' },
  ];

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
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* User Profile Section */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="black" />
          </View>
          <Text style={styles.userName}>Wen</Text>
          <Text style={styles.userRole}>Owner</Text>
        </View>

        {/* Navigation Items */}
        <View style={styles.navSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                item.isActive && styles.activeNavItem,
              ]}
              onPress={() => handleNavigate(item.id)}
            >
              <Ionicons
                name={item.icon}
                size={24}
                color={item.isActive ? 'black' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.navText,
                  item.isActive && styles.activeNavText,
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="white" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9999,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.75,
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  userSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    backgroundColor: 'white',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f0f0f0",
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
 
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  userRole: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  navSection: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  activeNavItem: {
    backgroundColor: '#f0f0f0',
    borderLeftWidth: 4,
    borderLeftColor: 'black',
  },
  navText: {
    fontSize: 16,
    color: 'black',
    marginLeft: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  activeNavText: {
    color: 'black',
    fontWeight: '700',
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'black',
    shadowColor: '#6c757d',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default Sidebar; 