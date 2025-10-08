import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Keyboard,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserConversations } from '../services/chats/getConversation';

const { width, height } = Dimensions.get('window');

// --- Helper Function to Generate Initials (MCP Context 7) ---
// Extract first letter of first name and first letter of last name
const getInitials = (name) => {
  if (!name) return '?';
  const nameParts = name.trim().split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

// --- Helper Function to Generate Avatar Background Color (MCP Context 7) ---
// Generate consistent background color based on name
const getAvatarColor = (name) => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Light Purple
    '#85C1E9', // Light Blue
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// --- Mock Users Data (MCP Context 7) ---
// In a real app, this would come from your API/Redux store
const mockUsers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    lastMessage: 'Hey! How was your weekend?',
    timestamp: '2 min ago',
    unreadCount: 2,
    isOnline: true,
    isTyping: false,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    lastMessage: 'Thanks for the help with the presentation!',
    timestamp: '1 hour ago',
    unreadCount: 0,
    isOnline: true,
    isTyping: false,
  },
  {
    id: '4',
    name: 'David Kim',
    lastMessage: 'Can we reschedule the meeting?',
    timestamp: '2 hours ago',
    unreadCount: 1,
    isOnline: false,
    isTyping: false,
  },
  {
    id: '5',
    name: 'Lisa Wang',
    lastMessage: 'The new design looks amazing!',
    timestamp: '3 hours ago',
    unreadCount: 0,
    isOnline: true,
    isTyping: false,
  },
  {
    id: '6',
    name: 'Alex Thompson',
    lastMessage: 'See you at the conference next week',
    timestamp: '1 day ago',
    unreadCount: 0,
    isOnline: false,
    isTyping: false,
  },
  {
    id: '7',
    name: 'Jessica Brown',
    lastMessage: 'Happy birthday! 🎉',
    timestamp: '2 days ago',
    unreadCount: 0,
    isOnline: true,
    isTyping: false,
  },
  {
    id: '8',
    name: 'Ryan Davis',
    lastMessage: 'The code review is ready',
    timestamp: '3 days ago',
    unreadCount: 0,
    isOnline: false,
    isTyping: false,
  },
];

// --- Mock Messages Data (MCP Context 7) ---
// Individual conversation messages for each user
const getMockMessages = (userId) => {
  const mockConversations = {
    '1': [
      { id: '1', text: 'Hey! How was your weekend?', isMe: false, timestamp: '2 min ago' },
      { id: '2', text: 'It was great! Went hiking with friends. How about you?', isMe: true, timestamp: '1 min ago' },
      { id: '3', text: 'That sounds amazing! I just relaxed at home and caught up on some reading.', isMe: false, timestamp: '1 min ago' },
    ],
    '3': [
      { id: '1', text: 'Thanks for the help with the presentation!', isMe: false, timestamp: '1 hour ago' },
      { id: '2', text: 'You\'re welcome! It turned out really well', isMe: true, timestamp: '1 hour ago' },
    ],
    '4': [
      { id: '1', text: 'Can we reschedule the meeting?', isMe: false, timestamp: '2 hours ago' },
      { id: '2', text: 'Sure, what time works better for you?', isMe: true, timestamp: '2 hours ago' },
      { id: '3', text: 'How about tomorrow at 2 PM?', isMe: false, timestamp: '1 hour ago' },
    ],
    '5': [
      { id: '1', text: 'The new design looks amazing!', isMe: false, timestamp: '3 hours ago' },
      { id: '2', text: 'Thank you! I\'m really happy with how it turned out', isMe: true, timestamp: '3 hours ago' },
    ],
    '6': [
      { id: '1', text: 'See you at the conference next week', isMe: false, timestamp: '1 day ago' },
      { id: '2', text: 'Looking forward to it! Safe travels', isMe: true, timestamp: '1 day ago' },
    ],
    '7': [
      { id: '1', text: 'Happy birthday! 🎉', isMe: false, timestamp: '2 days ago' },
      { id: '2', text: 'Thank you so much! 🎂', isMe: true, timestamp: '2 days ago' },
    ],
    '8': [
      { id: '1', text: 'The code review is ready', isMe: false, timestamp: '3 days ago' },
      { id: '2', text: 'Perfect! I\'ll take a look at it today', isMe: true, timestamp: '3 days ago' },
    ],
  };
  return mockConversations[userId] || [];
};

const ChatScreen = ({ navigation }) => {
  const [users, setUsers] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const searchInputRef = useRef(null);

  // --- Navigation Focus Listener (MCP Context 7) ---
  // Prevent keyboard dismissal when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Don't dismiss keyboard when screen focuses
      console.log('ChatScreen focused - keeping keyboard state');
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      // Only dismiss keyboard when leaving the screen
      Keyboard.dismiss();
    });

    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  // --- Search Functionality (MCP Context 7) ---
  // Use useMemo to prevent unnecessary re-renders that might dismiss keyboard
  const filteredUsers = React.useMemo(() => {
    if (searchQuery.trim() === '') {
      return users;
    }
    return users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, users]);

  // --- Keyboard Event Listeners (MCP Context 7) ---
  // Handle keyboard show/hide events for better layout management
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // --- Navigate to User Chat (MCP Context 7) ---
  // Navigate to individual chat screen with user data
  const handleUserPress = (user) => {
    navigation.navigate('UserChatScreen', {
      userId: user.id,
      userName: user.name,
      userData: user,
      messages: getMockMessages(user.id),
    });
  };

  // --- User Item Component (MCP Context 7) ---
  // Individual chat list item with iOS Messages style
  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100"
      onPress={() => {
        // Dismiss keyboard before navigation to prevent conflicts
        Keyboard.dismiss();
        handleUserPress(item);
      }}
      activeOpacity={0.7}
      delayPressIn={0}
    >
      {/* Avatar with Initials */}
      <View className="relative">
        <View 
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{ backgroundColor: getAvatarColor(item.name) }}
        >
          <Text className="text-xl font-bold text-white">
            {getInitials(item.name)}
          </Text>
        </View>
        {/* Online indicator */}
        {item.isOnline && (
          <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
        )}
      </View>

      {/* User Info */}
      <View className="flex-1 ml-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-lg font-semibold text-black flex-1" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500 ml-2">
            {item.timestamp}
          </Text>
        </View>
        
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            {item.isTyping ? (
              <View className="flex-row items-center">
                <Text className="text-base text-blue-500 italic">typing...</Text>
                <View className="flex-row items-center ml-2">
                  <View className="w-2 h-2 rounded-full bg-blue-500 mx-1 opacity-40" />
                  <View className="w-2 h-2 rounded-full bg-blue-500 mx-1 opacity-70" />
                  <View className="w-2 h-2 rounded-full bg-blue-500 mx-1 opacity-100" />
                </View>
              </View>
            ) : (
              <Text className="text-base text-gray-600 flex-1" numberOfLines={1}>
                {item.lastMessage}
              </Text>
            )}
          </View>
          
          {/* Unread count badge */}
          {item.unreadCount > 0 && (
            <View className="ml-2 w-7 h-7 rounded-full bg-blue-500 items-center justify-center">
              <Text className="text-sm text-white font-semibold">
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );


  // --- Search Bar Component (MCP Context 7) ---
  // Search bar with bulletproof keyboard handling
  const renderSearchBar = () => (
    <View className="px-5 py-4 bg-white border-b border-gray-100">
      <View className="flex-row items-center bg-gray-100 rounded-2xl px-5 py-3">
        <Ionicons name="search" size={24} color="#8E8E93" />
        <TextInput
          ref={searchInputRef}
          className="flex-1 ml-3 text-lg text-black"
          placeholder="Search"
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            // Keep focus to prevent keyboard dismissal
            if (searchInputRef.current) {
              searchInputRef.current.focus();
            }
          }}
          style={{ includeFontPadding: false }}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          blurOnSubmit={false}
          clearButtonMode="never"
          enablesReturnKeyAutomatically={false}
          selectTextOnFocus={false}
          onSubmitEditing={() => {
            // Keep keyboard open - do nothing
          }}
          onFocus={() => {
            setIsKeyboardVisible(true);
          }}
          onBlur={() => {
            // Prevent blur from dismissing keyboard
            setTimeout(() => {
              if (searchInputRef.current) {
                searchInputRef.current.focus();
              }
            }, 50);
          }}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => {
              setSearchQuery('');
              // Refocus after clearing to keep keyboard open
              setTimeout(() => {
                if (searchInputRef.current) {
                  searchInputRef.current.focus();
                }
              }, 100);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={24} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // --- Empty State Component (MCP Context 7) ---
  // Show when no users match search criteria
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name="chatbubbles-outline" size={80} color="#C7C7CC" />
      <Text className="text-xl font-semibold text-gray-500 mt-6 text-center">
        No conversations found
      </Text>
      <Text className="text-base text-gray-400 mt-3 text-center">
        Try adjusting your search terms
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom', 'left', 'right']}>
      {/* Search Bar - Fixed at top */}
      {renderSearchBar()}
      
      {/* Messages List */}
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 20}
        enabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {filteredUsers.length > 0 ? (
          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 20 : 0 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          />
        ) : (
          <View className="flex-1">
            {renderEmptyState()}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
