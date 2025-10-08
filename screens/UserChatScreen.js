import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMessagesByConversationId } from '../services/chats/getMessagesByConversationId';
import { sendMessage } from '../services/chats/sendMessage';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';

const UserChatScreen = ({ navigation, route }) => {
  const { 
    userId = '1', 
    userName = 'Sarah Johnson', 
    userData,
    conversationId,
    conversation,
    messages: initialMessages = []
  } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const flatListRef = useRef(null);
  
  // --- Get Current User (MCP Context 7) ---
  // Used to determine if message is from current user or other person
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  // --- Console Log Conversation ID (MCP Context 7) ---
  // Log conversation ID for debugging
  useEffect(() => {
    console.log('=== UserChatScreen Loaded ===');
    console.log('Conversation ID:', conversationId);
    console.log('User ID:', userId);
    console.log('User Name:', userName);
    console.log('Current User ID (for message comparison):', currentUserId);
    console.log('Full conversation:', conversation);
    console.log('Initial messages:', initialMessages);
    console.log('=== End UserChatScreen Info ===');
  }, []);

  // --- Fetch Messages from API (MCP Context 7) ---
  // Business Rule: Fetch messages for the conversation using conversationId
  const fetchMessages = async () => {
    if (!conversationId) {
      console.log('No conversation ID provided, skipping message fetch');
      return;
    }

    setIsLoadingMessages(true);
    
    try {
      console.log('=== Fetching Messages for Conversation ===');
      console.log('Conversation ID:', conversationId);
      
      const response = await getMessagesByConversationId(conversationId);
      
      console.log('Messages received:', response);
      console.log('Total messages:', response?.length || 0);
      
      if (response && Array.isArray(response)) {
        setMessages(response);
        console.log('✅ Messages loaded successfully');
      } else {
        console.log('No messages in response');
        setMessages([]);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load messages. Please try again.',
        visibilityTime: 3000,
        position: 'top',
      });
      
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // --- Load Messages on Mount (MCP Context 7) ---
  // Fetch messages when component mounts
  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  // --- Auto-scroll to Bottom (MCP Context 7) ---
  // Scroll to latest message when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // --- Send Message Function (MCP Context 7) ---
  // Business Rule: Add message locally immediately (optimistic update), then send to API
  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      console.log('Empty message, not sending');
      return;
    }

    if (!conversationId) {
      console.error('No conversation ID found');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Conversation ID not found',
        visibilityTime: 3000,
        position: 'top',
      });
      return;
    }

    const messageText = inputText.trim();
    console.log('=== Sending Message ===');
    console.log('Conversation ID:', conversationId);
    console.log('Message content:', messageText);

    // Create temporary message object for optimistic update
    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempMessageId,
      sender: {
        id: currentUserId,
        first_name: userInfo?.firstName || '',
        last_name: userInfo?.lastName || '',
        email: userInfo?.email || '',
      },
      content: messageText,
      createdAt: new Date().toISOString(),
      status: 'sending', // Indicates message is being sent
    };

    // Add message to UI immediately (optimistic update)
    setMessages(prev => [...prev, optimisticMessage]);
    console.log('Message added to UI immediately (optimistic)');

    // Clear input immediately for better UX
    setInputText('');
    Keyboard.dismiss();

    try {
      // Call API to send message in background
      // API: POST /chat/messages
      // Body: { conversationId, content }
      const response = await sendMessage(conversationId, messageText);
      
      console.log('✅ Message sent successfully:', response);
      
      // Replace temporary message with real message from API
      setMessages(prev => 
        prev.map(msg => msg.id === tempMessageId ? response : msg)
      );
      console.log('Temporary message replaced with real message from API');
      
    } catch (err) {
      console.error('❌ Error sending message:', err);
      
      // Remove the failed message from UI
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      
      // Show error toast
      Toast.show({
        type: 'error',
        text1: 'Failed to Send',
        text2: 'Could not send message. Please try again.',
        visibilityTime: 3000,
        position: 'top',
      });
      
      // Restore the message text so user can retry
      setInputText(messageText);
    }
  };


  // --- Message Item Component (MCP Context 7) ---
  // Individual message bubble with iOS Messages style
  // API Structure: { id, sender: { id, first_name, last_name }, content, createdAt, status }
  const renderMessage = ({ item, index }) => {
    // Determine if message is from current user by comparing sender ID
    const isMe = item.sender?.id?.toString() === currentUserId?.toString();
    
    // Business Rule: Show time with every message separately
    const showTime = true; // Always show time for each message

    // Format timestamp to 12-hour format with AM/PM (MCP Context 7)
    // Convert UTC time from API (saved by @CreateDateColumn) to local timezone
    const formatTime = (utcString) => {
      if (!utcString) return '';
      
      // Parse UTC string and convert to local timezone
      // Backend saves as UTC with @CreateDateColumn(), frontend displays in user's local time
      const date = new Date(utcString);
      
      // Get local time components
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      // Convert to 12-hour format
      const hour12 = hours % 12 || 12; // Convert 0 to 12 for midnight
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const minutesStr = minutes.toString().padStart(2, '0');
      
      const formattedTime = `${hour12}:${minutesStr} ${ampm}`;
      
      console.log('UTC string:', utcString, '→ Local time:', formattedTime);
      
      return formattedTime;
    };

    return (
      <View className={`mb-2 px-5 ${isMe ? 'items-end' : 'items-start'}`}>
        <View className={`max-w-3/4 px-4 py-3 rounded-2xl shadow-sm ${
          isMe 
            ? 'bg-blue-500 rounded-br-1 shadow-blue-500/30' 
            : 'bg-white/95 rounded-bl-1 shadow-gray-500/20'
        }`}>
          <Text className={`text-lg leading-6 ${
            isMe ? 'text-white' : 'text-black'
          }`}>
            {item.content}
          </Text>
        </View>
        {showTime && (
          <Text className={`text-xs text-gray-500 mt-1 mx-2 ${
            isMe ? 'text-right' : 'text-left'
          }`}>
            {formatTime(item.createdAt)}
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List - Full Screen (MCP Context 7) */}
        {/* Clean chat interface without background distractions */}
        
        {/* Loading State (MCP Context 7) */}
        {isLoadingMessages ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#000000" />
            <Text className="text-base text-gray-500 mt-4">Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
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
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input Bar (MCP Context 7) */}
        {/* Message input with send button at bottom of screen */}
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            {/* Text Input */}
            <TextInput
              className="flex-1 text-base text-gray-900 max-h-24"
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
              editable={!isSendingMessage}
            />

            {/* Send Button */}
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSendingMessage}
              className={`ml-3 w-9 h-9 rounded-full items-center justify-center ${
                inputText.trim() && !isSendingMessage ? 'bg-black' : 'bg-gray-300'
              }`}
              activeOpacity={0.7}
            >
              {isSendingMessage ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color="white"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default UserChatScreen;
