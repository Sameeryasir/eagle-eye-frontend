import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserConversations } from '../services/chats/getConversation';
import SelectUserModal from './components/SelectUserModal';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import pusher from '../pusherClient';

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

const ChatScreen = ({ navigation }) => {
  // --- State Management (MCP Context 7) ---
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSelectUserModalVisible, setIsSelectUserModalVisible] = useState(false);
  // Business Rule: Start with loading=true to show loader on first mount instead of empty state
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState(null);
  const searchInputRef = useRef(null);
  
  // --- Get Current User (MCP Context 7) ---
  // Used to filter out current user from conversation participants
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  // --- Helper Function to Process Conversations (MCP Context 7) ---
  // Shared logic to transform API response to UI format
  // This prevents code duplication between regular and silent fetch
  const processConversations = (response) => {
    if (response && Array.isArray(response)) {
      // Transform API response to match our UI format
      const formattedConversations = response.map(conversation => {
        console.log('Processing conversation:', conversation.id);
        console.log('Conversation type:', conversation.type);
        console.log('Participants:', conversation.participants);
        console.log('Project:', conversation.project);
        
        let displayName = 'Unknown User';
        
        // Business Rule: For group conversations, use project name
        // For private conversations, show the other person's name
        if (conversation.type === 'group' && conversation.project?.name) {
          // Group conversation - use project name
          displayName = conversation.project.name;
          console.log('Group conversation - using project name:', displayName);
        } else {
          // Private conversation - find the "other" participant (not the current logged-in user)
          // API Structure: participants[].user.{first_name, last_name, email}
          
          let otherParticipantUser = null;
          
          if (conversation.participants && conversation.participants.length > 0) {
            // Filter out current user to get the "other" participant
            const otherParticipant = conversation.participants.find(
              participant => participant.user?.id?.toString() !== currentUserId?.toString()
            );
            
            // If we found the other participant, use their user data
            // Otherwise fallback to first participant
            otherParticipantUser = otherParticipant?.user || conversation.participants[0]?.user;
            
            console.log('Current user ID:', currentUserId);
            console.log('Other participant user:', otherParticipantUser);
          }
          
          const firstName = otherParticipantUser?.first_name || '';
          const lastName = otherParticipantUser?.last_name || '';
          const email = otherParticipantUser?.email || '';
          displayName = `${firstName} ${lastName}`.trim() || email || 'Unknown User';
        }
        
        // Get last message (if messages array has items)
        const lastMessage = conversation.messages?.[conversation.messages?.length - 1];
        const hasFile = lastMessage?.fileUrl ? true : false;
        const fileType = lastMessage?.fileType || '';
        const fileName = lastMessage?.fileName || '';
        
        // Business Rule: Format last message with file indicators (same as Pusher logic)
        let lastMessageText = lastMessage?.content || '';
        
        if (lastMessage?.fileUrl) {
          // Message has file attachment
          const hasImage = lastMessage.fileType?.startsWith('image/');
          
          if (hasImage) {
            // Image attachment - show camera emoji
            lastMessageText = lastMessageText 
              ? `📷 ${lastMessageText}` 
              : '📷 Photo';
          } else {
            // Document attachment - show paperclip emoji
            const fileNameToShow = lastMessage.fileName || 'File';
            lastMessageText = lastMessageText 
              ? `📎 ${lastMessageText}` 
              : `📎 ${fileNameToShow}`;
          }
        } else if (!lastMessageText) {
          // No content and no file
          lastMessageText = '';
        }
        
        // Format timestamp
        const timestamp = conversation.createdAt 
          ? new Date(conversation.createdAt).toLocaleString()
          : 'Just now';
        
        console.log('Formatted conversation name:', displayName);
        console.log('Last message:', lastMessageText);
        
        return {
          id: conversation.id?.toString(),
          name: displayName,
          lastMessage: lastMessageText,
          lastMessageHasFile: hasFile,
          lastMessageFileType: fileType,
          lastMessageFileName: fileName,
          timestamp: timestamp,
          unreadCount: 0, // TODO: Add unread count from API
          isOnline: false, // TODO: Add real online status
          isTyping: false,
          conversation: conversation, // Keep full conversation data
        };
      });
      
      console.log('Total conversations formatted:', formattedConversations.length);
      console.log('Formatted conversations:', formattedConversations);
      return formattedConversations;
    } else {
      console.log('No conversations data or empty array');
      return [];
    }
  };

  // --- Fetch Conversations from API (MCP Context 7) ---
  // Business Rule: Load all user conversations when screen mounts
  // Shows loading spinner for user-initiated refreshes
  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    setConversationsError(null);
    
    try {
      console.log('=== Fetching Conversations ===');
      const response = await getUserConversations();
      
      console.log('Conversations received:', response);
      console.log('Response structure:', JSON.stringify(response, null, 2));
      
      const formattedConversations = processConversations(response);
      setConversations(formattedConversations);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      console.error('Error details:', err.message);
      setConversationsError('Failed to load conversations');
      
      // Show error toast
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load conversations. Please try again.',
        visibilityTime: 3000,
        position: 'top',
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // --- Fetch Conversations Silently (MCP Context 7) ---
  // Business Rule: Refresh conversations without showing loader
  // Used for real-time Pusher updates to avoid UI flickering
  // Parameter: turnOffLoader - if true, sets loading state to false after fetch (used for initial mount)
  const fetchConversationsSilently = async (turnOffLoader = false) => {
    try {
      console.log('=== Silently Fetching Conversations (Pusher Update) ===');
      const response = await getUserConversations();
      
      console.log('Conversations received (silent):', response);
      
      const formattedConversations = processConversations(response);
      setConversations(formattedConversations);
    } catch (err) {
      console.error('Error silently fetching conversations:', err);
      console.error('Error details:', err.message);
      // Don't show error toast for silent updates to avoid annoying users
    } finally {
      // Business Rule: Turn off loading state only if requested (initial mount)
      // This ensures loader shows on first mount, then disappears after data loads
      // But doesn't interfere with manual refresh loading state
      if (turnOffLoader) {
        setIsLoadingConversations(false);
      }
    }
  };

  // --- Load Conversations on Mount (MCP Context 7) ---
  // Fetch conversations when component mounts
  // Pass true to turn off loader after initial fetch completes
  useEffect(() => {
    fetchConversationsSilently(true);
  }, []);

  // --- Pusher Real-Time Listener for New Conversations (MCP Context 7) ---
  // Business Rule: Subscribe to user-specific channel to get notified of new conversations
  // Backend triggers: pusher.trigger(`user-${userId}`, 'new-conversation', conversationData)
  // NOTE: Backend sends FULL conversation data via Pusher - NO API call needed!
  useEffect(() => {
    // Ensure we have a user ID before subscribing
    if (!currentUserId) {
      console.log('⚠️ No user ID available, skipping Pusher subscription');
      return;
    }

    // Subscribe to user-specific channel
    const channelName = `user-${currentUserId}`;
    console.log('📡 Subscribing to Pusher channel:', channelName);
    
    const channel = pusher.subscribe(channelName);

    // Listen for new conversation events
    // Backend sends full conversation data, so we can add it directly to the list
    channel.bind('new-conversation', (data) => {
      console.log('🔔 New conversation notification received via Pusher:', data);
      console.log('Conversation data from Pusher:', data.conversation);
      
      // Backend should send the conversation object in data.conversation
      const newConversation = data.conversation || data;
      
      if (!newConversation) {
        console.warn('⚠️ No conversation data received from Pusher');
        return;
      }

      // Process the single new conversation to match our UI format
      const formattedConversations = processConversations([newConversation]);
      
      if (formattedConversations.length > 0) {
        const newFormattedConvo = formattedConversations[0];
        
        console.log('✅ Adding new conversation to list:', newFormattedConvo);
        
        // Add the new conversation to the list
        // Business Rule: Conversations with messages go to TOP, empty conversations go to BOTTOM
        // Check if conversation already exists to avoid duplicates
        setConversations(prevConversations => {
          const existingIndex = prevConversations.findIndex(
            user => user.id === newFormattedConvo.id
          );
          
          if (existingIndex !== -1) {
            // Conversation already exists, update it
            console.log('Conversation already exists, updating it');
            const updatedConversations = [...prevConversations];
            updatedConversations[existingIndex] = newFormattedConvo;
            return updatedConversations;
          } else {
            // New conversation - position based on whether it has messages
            const hasMessages = newFormattedConvo.lastMessage && newFormattedConvo.lastMessage.trim() !== '';
            
            if (hasMessages) {
              // Has messages - add to TOP (most recent activity)
              console.log('Adding new conversation with messages to top of list');
              return [newFormattedConvo, ...prevConversations];
            } else {
              // No messages - add to BOTTOM (less priority)
              console.log('Adding new empty conversation to bottom of list');
              return [...prevConversations, newFormattedConvo];
            }
          }
        });
        
        // Show toast notification to user
        Toast.show({
          type: 'success',
          text1: 'New Conversation',
          text2: `New chat with ${newFormattedConvo.name}`,
          visibilityTime: 3000,
          position: 'top',
        });
      }
    });

    // Cleanup: Unsubscribe when component unmounts or userId changes
    return () => {
      console.log('🔌 Unsubscribing from Pusher channel:', channelName);
      channel.unbind('new-conversation');
      pusher.unsubscribe(channelName);
    };
  }, [currentUserId]); // Re-subscribe if user ID changes

  // --- Pusher Real-Time Listener for New Messages in All Conversations (MCP Context 7) ---
  // Business Rule: Subscribe to ALL conversations to get real-time message updates
  // Backend triggers: pusher.trigger(`conversation-${conversationId}`, 'new-message', messageData)
  // NOTE: This updates the conversation list when new messages arrive
  useEffect(() => {
    // Ensure we have conversations to subscribe to
    if (!conversations || conversations.length === 0) {
      console.log('⚠️ No conversations to subscribe to');
      return;
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('📡 PUSHER: Subscribing to ALL Conversation Channels (ChatScreen)');
    console.log('═══════════════════════════════════════════════════');
    
    // Extract conversation IDs from current conversations
    const conversationIds = conversations
      .map(user => user.conversation?.id)
      .filter(id => id != null); // Remove null/undefined IDs
    
    console.log('📋 Total conversations to subscribe:', conversationIds.length);
    console.log('📋 Conversation IDs:', conversationIds);
    
    // Array to store all channel subscriptions for cleanup
    const channels = [];

    // Subscribe to ALL conversations
    conversationIds.forEach((conversationId, index) => {
      const channelName = `conversation-${conversationId}`;
      console.log(`   ${index + 1}. Subscribing to: ${channelName}`);
      
      const channel = pusher.subscribe(channelName);
      channels.push({ channelName, channel, conversationId });

      // --- Message Handler Function (MCP Context 7) ---
      // Business Rule: Update conversation list when new message arrives
      // Using arrow function to avoid closure issues
      const handleNewMessage = (data) => {
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('🔔 PUSHER: New Message Received in ChatScreen');
        console.log('═══════════════════════════════════════════════════');
        console.log('📍 Conversation ID:', conversationId);
        console.log('📦 Full Pusher Data:', JSON.stringify(data, null, 2));
        
        const newMessage = data.message || data;
        
        if (!newMessage) {
          console.warn('⚠️ ERROR: No message data received from Pusher');
          console.log('═══════════════════════════════════════════════════');
          console.log('');
          return;
        }

        console.log('📨 Extracted Message:', {
          id: newMessage.id,
          content: newMessage.content,
          sender: newMessage.sender,
          createdAt: newMessage.createdAt,
          fileUrl: newMessage.fileUrl,
          fileName: newMessage.fileName,
          fileType: newMessage.fileType,
        });

        // Update the conversation list
        // Business Rule: Move conversation to top and update last message
        // Using functional setState to always get latest state
        setConversations(prevConversations => {
          console.log('🔍 Searching for conversation in list...');
          console.log('   Total conversations:', prevConversations.length);
          
          // Find the conversation that received the new message
          const conversationIndex = prevConversations.findIndex(
            u => u.conversation?.id?.toString() === conversationId?.toString()
          );

          if (conversationIndex === -1) {
            console.log('❌ ERROR: Conversation not found in list');
            console.log('   Looking for conversation ID:', conversationId);
            console.log('   Available conversation IDs:', prevConversations.map(c => c.conversation?.id));
            console.log('═══════════════════════════════════════════════════');
            console.log('');
            return prevConversations;
          }

          console.log('✅ Found conversation at index:', conversationIndex);
          console.log('   Conversation name:', prevConversations[conversationIndex].name);

          // Create a new array to avoid mutation
          const updatedConversations = [...prevConversations];
          
          // Get the conversation to update
          const conversationToUpdate = { ...updatedConversations[conversationIndex] };
          
          console.log('🔄 Updating conversation details...');
          
          // Update last message and timestamp
          // Business Rule: Show file indicator if message has file attachment
          let lastMessageText = newMessage.content || '';
          
          if (newMessage.fileUrl) {
            // Message has file attachment
            const hasImage = newMessage.fileType?.startsWith('image/');
            
            if (hasImage) {
              // Image attachment
              lastMessageText = lastMessageText 
                ? `📷 ${lastMessageText}` 
                : '📷 Photo';
              console.log('📷 Message has image attachment');
            } else {
              // Document attachment
              const fileName = newMessage.fileName || 'File';
              lastMessageText = lastMessageText 
                ? `📎 ${lastMessageText}` 
                : `📎 ${fileName}`;
              console.log('📎 Message has document attachment');
            }
          } else if (!lastMessageText) {
            // No content and no file
            lastMessageText = 'New message';
            console.log('💬 Message has no content or file');
          } else {
            console.log('💬 Message has text content:', lastMessageText);
          }
          
          conversationToUpdate.lastMessage = lastMessageText;
          conversationToUpdate.lastMessageHasFile = newMessage.fileUrl ? true : false;
          conversationToUpdate.lastMessageFileType = newMessage.fileType || '';
          conversationToUpdate.lastMessageFileName = newMessage.fileName || '';
          conversationToUpdate.timestamp = new Date(newMessage.createdAt).toLocaleString();
          
          console.log('📝 Updated conversation preview:', {
            name: conversationToUpdate.name,
            lastMessage: conversationToUpdate.lastMessage,
            timestamp: conversationToUpdate.timestamp,
          });
          
          // Remove conversation from current position
          updatedConversations.splice(conversationIndex, 1);
          
          // Add conversation to the TOP of the list (most recent)
          const finalConversations = [conversationToUpdate, ...updatedConversations];
          
          console.log('⬆️ Moved conversation to TOP of list');
          console.log('✅ ChatScreen conversation list updated successfully!');
          console.log('═══════════════════════════════════════════════════');
          console.log('');
          
          return finalConversations;
        });
      };

      // Bind the message handler to this channel
      channel.bind('new-message', handleNewMessage);
    });

    console.log('✅ All conversation channels subscribed successfully!');
    console.log('   Total subscriptions:', channels.length);
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Cleanup: Unsubscribe from ALL channels when component unmounts or conversations change
    return () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('🔌 PUSHER: Unsubscribing from ALL Conversation Channels (ChatScreen)');
      console.log('═══════════════════════════════════════════════════');
      console.log('   Unsubscribing from', channels.length, 'channels');
      channels.forEach(({ channelName, channel }, index) => {
        console.log(`   ${index + 1}. Unsubscribing: ${channelName}`);
        channel.unbind('new-message');
        pusher.unsubscribe(channelName);
      });
      console.log('✅ All channels unsubscribed');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
    };
  }); // ✅ Runs on every render - will re-subscribe whenever component updates

  // --- Navigation Focus Listener (MCP Context 7) ---
  // Fetch conversations when returning to screen
  // Business Rule: Call API to get latest data, then Pusher will subscribe to ALL conversations
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      // Fetch conversations when returning to this screen
      // Business Rule: Get fresh data from API, then Pusher useEffect will unsubscribe old and subscribe to all current conversations
      console.log('📱 ChatScreen focused - fetching latest conversations from API');
      fetchConversations();
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      // Only dismiss keyboard when leaving the screen
      Keyboard.dismiss();
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  // --- Search Functionality (MCP Context 7) ---
  // Use useMemo to prevent unnecessary re-renders that might dismiss keyboard
  const filteredConversations = React.useMemo(() => {
    if (searchQuery.trim() === '') {
      return conversations;
    }
    return conversations.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, conversations]);

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
  // Navigate to individual chat screen with user data from API
  // Business Rule: Pass conversation ID for fetching/sending messages
  const handleUserPress = (user) => {
    console.log('=== Opening Conversation ===');
    console.log('User:', user);
    console.log('Conversation ID:', user.conversation?.id);
    console.log('Full conversation:', user.conversation);
    
    // Ensure we have a conversation ID before navigating
    const conversationId = user.conversation?.id;
    
    if (!conversationId) {
      console.warn('⚠️ Warning: No conversation ID found for user:', user.name);
    } else {
      console.log('✅ Navigating with conversation ID:', conversationId);
    }
    
    navigation.navigate('UserChatScreen', {
      userId: user.id,
      userName: user.name,
      userData: user,
      conversationId: conversationId, // Pass conversation ID
      conversation: user.conversation, // Pass full conversation object
      messages: user.conversation?.messages || [], // Use messages from API
    });
    
    console.log('=== End Opening Conversation ===');
  };

  // --- Open Select User Modal (MCP Context 7) ---
  // Opens modal to select a team member for new conversation
  const handleOpenSelectUserModal = () => {
    // Dismiss keyboard before opening modal
    Keyboard.dismiss();
    setIsSelectUserModalVisible(true);
  };

  // --- Close Select User Modal (MCP Context 7) ---
  // Closes the select user modal
  const handleCloseSelectUserModal = () => {
    setIsSelectUserModalVisible(false);
  };

  // --- Handle User Selection from Modal (MCP Context 7) ---
  // When user selects a team member from modal, navigate to chat with them
  const handleUserSelectFromModal = (data) => {
    console.log('=== User Selected from Modal ===');
    console.log('Data received:', data);
    
    const { employee, conversation, isGroupChat, project } = data;
    
    // Business Rule: Handle group chat vs private chat differently
    if (isGroupChat) {
      // Group conversation - use project name
      console.log('Navigating to group chat with project:', project);
      
      const groupData = {
        id: conversation?.id?.toString(),
        name: project?.name || 'Project Group Chat',
        lastMessage: '', // Empty for new conversation
        timestamp: 'Just now',
        unreadCount: 0,
        isOnline: false,
        isTyping: false,
      };
      
      // Navigate to chat screen with group conversation
      navigation.navigate('UserChatScreen', {
        userId: conversation?.id?.toString(),
        userName: groupData.name,
        userData: groupData,
        messages: [], // Start with empty messages for new conversation
        conversationId: conversation?.id, // Pass conversation ID from API
        conversation: conversation, // Pass full conversation object
        isGroupChat: true,
        project: project,
      });
    } else {
      // Private conversation - use employee name
      const firstName = employee.first_name || '';
      const lastName = employee.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
      
      const userData = {
        id: employee.id?.toString(),
        name: fullName,
        email: employee.email,
        lastMessage: '', // Empty for new conversation
        timestamp: 'Just now',
        unreadCount: 0,
        isOnline: false, // Could be enhanced with real online status later
        isTyping: false,
      };
      
      console.log('Navigating to UserChatScreen with:', userData);
      console.log('Conversation data:', conversation);
      
      // Navigate to chat screen with new user and conversation
      navigation.navigate('UserChatScreen', {
        userId: userData.id,
        userName: userData.name,
        userData: userData,
        messages: [], // Start with empty messages for new conversation
        conversationId: conversation?.id, // Pass conversation ID from API
        conversation: conversation, // Pass full conversation object
      });
    }
    
    // NOTE: No need to manually refresh conversations here!
    // When you navigate to UserChatScreen, you leave this screen anyway.
    // When you come back, one of two things will happen:
    // 1. Pusher will have already added the conversation (if backend triggered notification)
    // 2. The screen 'focus' listener will call fetchConversations() automatically
    // This prevents unnecessary API calls and lets Pusher do its job!
    
    console.log('=== End User Selection ===');
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
        <View className="flex-row items-center mb-2">
          <Text className="text-lg font-semibold text-black flex-1" numberOfLines={1}>
            {item.name}
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
  // Show when no conversations exist or no search results
  const renderEmptyState = () => {
    // Business Rule: Different empty states for "no conversations" vs "no search results"
    const hasNoConversations = conversations.length === 0;
    const hasNoSearchResults = conversations.length > 0 && filteredConversations.length === 0;
    
    if (hasNoConversations) {
      // True empty state - no conversations at all
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="chatbubbles-outline" size={100} color="#C7C7CC" />
          <Text className="text-2xl font-bold text-gray-700 mt-6 text-center">
            No conversations yet
          </Text>
          <Text className="text-base text-gray-400 mt-3 text-center">
            Tap the + button below to start chatting
          </Text>
          
          {/* Note: FAB button (bottom-right) handles conversation creation */}
          {/* Removed duplicate button to keep UI clean */}
        </View>
      );
    }
    
    // No search results
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="search-outline" size={80} color="#C7C7CC" />
        <Text className="text-xl font-semibold text-gray-500 mt-6 text-center">
          No conversations found
        </Text>
        <Text className="text-base text-gray-400 mt-3 text-center">
          Try adjusting your search terms
        </Text>
      </View>
    );
  };

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
        {/* Loading State (MCP Context 7) */}
        {isLoadingConversations ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#000000" />
            <Text className="text-base text-gray-500 mt-4">Loading conversations...</Text>
          </View>
        ) : filteredConversations.length > 0 ? (
          <FlatList
            data={filteredConversations}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 20 : 0 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            refreshing={isLoadingConversations}
            onRefresh={fetchConversations}
          />
        ) : (
          <View className="flex-1">
            {renderEmptyState()}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* FAB - Floating Action Button (MCP Context 7) */}
      {/* Business Rule: Always visible for quick access to start new conversation */}
      {/* Shows in all states - empty or with conversations */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-16 h-16 bg-black rounded-full items-center justify-center shadow-lg"
        onPress={handleOpenSelectUserModal}
        activeOpacity={0.8}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* Select User Modal (MCP Context 7) */}
      {/* Modal for selecting team member to start conversation */}
      <SelectUserModal
        visible={isSelectUserModalVisible}
        onClose={handleCloseSelectUserModal}
        onUserSelect={handleUserSelectFromModal}
      />
    </SafeAreaView>
  );
};

export default ChatScreen;
