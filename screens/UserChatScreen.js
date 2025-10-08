import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// --- Mock Messages Data (MCP Context 7) ---
// In a real app, this would come from your API/Redux store
const getMockMessages = (userId) => {
  const mockConversations = {
    '1': [
      { id: '1', text: 'Hey! How was your weekend?', isMe: false, timestamp: '2 min ago', time: '2:30 PM' },
      { id: '2', text: 'It was great! Went hiking with friends. How about you?', isMe: true, timestamp: '2 min ago', time: '2:31 PM' },
      { id: '3', text: 'That sounds amazing! I just relaxed at home and caught up on some reading.', isMe: false, timestamp: '1 min ago', time: '2:32 PM' },
      { id: '4', text: 'What book were you reading?', isMe: true, timestamp: '1 min ago', time: '2:33 PM' },
      { id: '5', text: 'I was reading "The Psychology of Money" - it\'s really insightful about financial decision making!', isMe: false, timestamp: 'now', time: '2:35 PM' },
    ],
    '2': [
      { id: '1', text: 'The project deadline is tomorrow', isMe: false, timestamp: '15 min ago', time: '2:15 PM' },
      { id: '2', text: 'I know, I\'m working on the final touches right now', isMe: true, timestamp: '10 min ago', time: '2:20 PM' },
      { id: '3', text: 'Need any help with the presentation?', isMe: true, timestamp: '5 min ago', time: '2:25 PM' },
    ],
    '3': [
      { id: '1', text: 'Thanks for the help with the presentation!', isMe: false, timestamp: '1 hour ago', time: '1:35 PM' },
      { id: '2', text: 'You\'re welcome! It turned out really well', isMe: true, timestamp: '1 hour ago', time: '1:36 PM' },
      { id: '3', text: 'The client was very impressed with our work', isMe: false, timestamp: '30 min ago', time: '2:05 PM' },
    ],
    '4': [
      { id: '1', text: 'Can we reschedule the meeting?', isMe: false, timestamp: '2 hours ago', time: '12:35 PM' },
      { id: '2', text: 'Sure, what time works better for you?', isMe: true, timestamp: '2 hours ago', time: '12:36 PM' },
      { id: '3', text: 'How about tomorrow at 2 PM?', isMe: false, timestamp: '1 hour ago', time: '1:35 PM' },
      { id: '4', text: 'Perfect! I\'ll send you the meeting link', isMe: true, timestamp: '1 hour ago', time: '1:36 PM' },
    ],
    '5': [
      { id: '1', text: 'The new design looks amazing!', isMe: false, timestamp: '3 hours ago', time: '11:35 AM' },
      { id: '2', text: 'Thank you! I\'m really happy with how it turned out', isMe: true, timestamp: '3 hours ago', time: '11:36 AM' },
      { id: '3', text: 'The color scheme is perfect for our brand', isMe: false, timestamp: '2 hours ago', time: '12:35 PM' },
    ],
    '6': [
      { id: '1', text: 'See you at the conference next week', isMe: false, timestamp: '1 day ago', time: '2:35 PM' },
      { id: '2', text: 'Looking forward to it! Safe travels', isMe: true, timestamp: '1 day ago', time: '2:36 PM' },
    ],
    '7': [
      { id: '1', text: 'Happy birthday! 🎉', isMe: false, timestamp: '2 days ago', time: '2:35 PM' },
      { id: '2', text: 'Thank you so much! 🎂', isMe: true, timestamp: '2 days ago', time: '2:36 PM' },
    ],
    '8': [
      { id: '1', text: 'The code review is ready', isMe: false, timestamp: '3 days ago', time: '2:35 PM' },
      { id: '2', text: 'Perfect! I\'ll take a look at it today', isMe: true, timestamp: '3 days ago', time: '2:36 PM' },
    ],
  };
  return mockConversations[userId] || [];
};

const UserChatScreen = ({ navigation, route }) => {
  const { userId = '1', userName = 'Sarah Johnson', userData } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  // --- Initialize Messages (MCP Context 7) ---
  // Load conversation messages when component mounts
  useEffect(() => {
    const conversationMessages = getMockMessages(userId);
    setMessages(conversationMessages);
  }, [userId]);

  // --- Auto-scroll to Bottom (MCP Context 7) ---
  // Scroll to latest message when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);


  // --- Message Item Component (MCP Context 7) ---
  // Individual message bubble with iOS Messages style
  const renderMessage = ({ item, index }) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    const showTime = nextMessage === null || nextMessage.isMe !== item.isMe;

    return (
      <View className={`mb-2 px-5 ${item.isMe ? 'items-end' : 'items-start'}`}>
        <View className={`max-w-3/4 px-4 py-3 rounded-2xl shadow-sm ${
          item.isMe 
            ? 'bg-blue-500 rounded-br-1 shadow-blue-500/30' 
            : 'bg-white/95 rounded-bl-1 shadow-gray-500/20'
        }`}>
          <Text className={`text-lg leading-6 ${
            item.isMe ? 'text-white' : 'text-black'
          }`}>
            {item.text}
          </Text>
        </View>
        {showTime && (
          <Text className={`text-xs text-gray-500 mt-1 mx-2 ${
            item.isMe ? 'text-right' : 'text-left'
          }`}>
            {item.time}
          </Text>
        )}
      </View>
    );
  };

  // --- Typing Indicator Component (MCP Context 7) ---
  // Shows when the other person is typing
  const renderTypingIndicator = () => (
    <View className="mb-2 px-5 items-start">
      <View className="bg-white/95 px-4 py-2.5 rounded-2xl rounded-bl-1 shadow-sm shadow-gray-500/20">
        <View className="flex-row items-center">
          <View className="w-1.5 h-1.5 rounded-full bg-gray-500 mx-0.5 opacity-40" />
          <View className="w-1.5 h-1.5 rounded-full bg-gray-500 mx-0.5 opacity-70" />
          <View className="w-1.5 h-1.5 rounded-full bg-gray-500 mx-0.5 opacity-100" />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" edges={['bottom', 'left', 'right']}>
      {/* Background Image Container (MCP Context 7) --- */}
      {/* Subtle background image that doesn't interfere with chat */}
      <View className="flex-1 relative">
        {/* Background Image - positioned and sized to be subtle */}
        <Image
          source={require('../assets/icons/Vector.png')}
          style={{
            position: 'absolute',
            top: '10%',
            left: '15%',
            width: '70%',
            height: '70%',
            zIndex: 0,
            opacity: 0.2
          }}
          resizeMode="contain"
        />
        
        {/* Messages List - Full Screen */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerStyle={{ 
            paddingVertical: 16, 
            paddingHorizontal: 8, 
            flexGrow: 1
          }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isTyping ? renderTypingIndicator : null}
          inverted={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />


      </View>
    </SafeAreaView>
  );
};

export default UserChatScreen;
