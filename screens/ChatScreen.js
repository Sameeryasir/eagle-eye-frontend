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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getUserConversations } from '../services/chats/getConversation';
import SelectUserModal from './components/SelectUserModal';
import CustomBottomNav from './components/CustomBottomNav';
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
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState(null);
  const searchInputRef = useRef(null);
  
  // --- Track Subscribed Channels (MCP Context 7) ---
  // Keep track of which channels we're already subscribed to
  // This prevents duplicate subscriptions
  const subscribedChannelsRef = useRef(new Set());
  
  // --- Get Current User (MCP Context 7) ---
  // Used to filter out current user from conversation participants
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  // --- Helper Function to Process Conversations (MCP Context 7) ---
  // Shared logic to transform API response to UI format
  const processConversations = (response) => {
    if (response && Array.isArray(response)) {
      // Transform API response to match our UI format
      const formattedConversations = response.map(conversation => {
        let displayName = 'Unknown User';
        
        // Business Rule: For group conversations, use project name
        // For private conversations, show the other person's name
        if (conversation.type === 'group' && conversation.project?.name) {
          // Group conversation - use project name
          displayName = conversation.project.name;
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
        
        // Business Rule: Format last message with file indicators
        let lastMessageText = lastMessage?.content || '';
        
        // Check if it's a signature message (no content but has signature object)
        const isSignatureMessage = !lastMessage?.content && lastMessage?.signature;
        
        if (isSignatureMessage) {
          // Signature message - show professional icons
          lastMessageText = '📄 ✍️';
        } else if (lastMessage?.fileUrl) {
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
      
      return formattedConversations;
    } else {
      return [];
    }
  };

  // --- Sort Conversations by Latest Message (MCP Context 7) ---
  // Simple function to sort conversations - newest messages first
  const sortConversationsByLatest = (conversationsList) => {
    return conversationsList.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // Newest first
    });
  };

  // --- Fetch Conversations from API (MCP Context 7) ---
  // Business Rule: Load all user conversations when screen mounts
  // Shows loading spinner for user-initiated refreshes
  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    setConversationsError(null);
    
    try {
      const response = await getUserConversations();
      const formattedConversations = processConversations(response);
      const sortedConversations = sortConversationsByLatest(formattedConversations);
      setConversations(sortedConversations);
    } catch (err) {
      console.error('Error fetching conversations:', err);
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
  // Used for initial load to avoid UI flickering
  const fetchConversationsSilently = async () => {
    try {
      const response = await getUserConversations();
      const formattedConversations = processConversations(response);
      const sortedConversations = sortConversationsByLatest(formattedConversations);
      setConversations(sortedConversations);
    } catch (err) {
      console.error('Error silently fetching conversations:', err);
      // Don't show error toast for silent updates to avoid annoying users
    }
  };

  // --- Handle New Message from Pusher (MCP Context 7) ---
  // Business Rule: Update conversation list when new message arrives
  const handleNewMessage = (conversationId, data) => {
    const newMessage = data.message || data;
    
    if (!newMessage) {
      console.warn('⚠️ No message data received');
      return;
    }

    // Update the conversation list - move to top with new message
    setConversations(prevConversations => {
      const conversationIndex = prevConversations.findIndex(
        u => u.conversation?.id?.toString() === conversationId?.toString()
      );

      if (conversationIndex === -1) {
        return prevConversations;
      }

      const updatedConversations = [...prevConversations];
      const conversationToUpdate = { ...updatedConversations[conversationIndex] };
      
      // Format last message with file indicator
      let lastMessageText = newMessage.content || '';
      
      // Check if it's a signature message (no content but has signature object)
      const isSignatureMessage = !newMessage.content && newMessage.signature;
      
      if (isSignatureMessage) {
        // Signature message - show black contract icon (consistent with Pusher)
        lastMessageText = '⚫ ✍️';
      } else if (newMessage.fileUrl) {
        const hasImage = newMessage.fileType?.startsWith('image/');
        
        if (hasImage) {
          lastMessageText = lastMessageText 
            ? `📷 ${lastMessageText}` 
            : '📷 Photo';
        } else {
          const fileName = newMessage.fileName || 'File';
          lastMessageText = lastMessageText 
            ? `📎 ${lastMessageText}` 
            : `📎 ${fileName}`;
        }
      } else if (!lastMessageText) {
        lastMessageText = 'New message';
      }
      
      conversationToUpdate.lastMessage = lastMessageText;
      conversationToUpdate.lastMessageHasFile = newMessage.fileUrl ? true : false;
      conversationToUpdate.lastMessageFileType = newMessage.fileType || '';
      conversationToUpdate.lastMessageFileName = newMessage.fileName || '';
      conversationToUpdate.timestamp = new Date(newMessage.createdAt).toLocaleString();
      
      // Remove from current position and add to top
      updatedConversations.splice(conversationIndex, 1);
      return [conversationToUpdate, ...updatedConversations];
    });
  };

  // --- Handle New Signature Message from Pusher (MCP Context 7) ---
  // Business Rule: Update conversation list when new signature message arrives
  function handleSignatureMessage(conversationId, data) {
    const signatureMessage = data.message || data;
    
    if (!signatureMessage) {
      console.warn('⚠️ No signature message data received');
      return;
    }

    console.log('📝 [PUSHER] Processing signature message for conversation:', conversationId);

    // Update the conversation list - move to top with new signature message
    setConversations(prevConversations => {
      const conversationIndex = prevConversations.findIndex(
        u => u.conversation?.id?.toString() === conversationId?.toString()
      );

      if (conversationIndex === -1) {
        return prevConversations;
      }

      const updatedConversations = [...prevConversations];
      const conversationToUpdate = { ...updatedConversations[conversationIndex] };
      
      // Format signature message for conversation list
      const signatureTitle = signatureMessage.signature?.title || signatureMessage.title || 'Contract for Signature';
      const hasSignatureFile = signatureMessage.signature?.fileUrl || signatureMessage.fileUrl;
      
      let lastMessageText;
      if (hasSignatureFile) {
        // Signature has been signed - show folder icon
        lastMessageText = `📁 ✍️ ${signatureTitle}`;
      } else {
        // Signature pending - show same format as API fetch (triggers MaterialIcons)
        lastMessageText = '📄 ✍️';
      }
      
      conversationToUpdate.lastMessage = lastMessageText;
      conversationToUpdate.lastMessageHasFile = !!hasSignatureFile;
      conversationToUpdate.lastMessageFileType = hasSignatureFile ? 'signature' : '';
      conversationToUpdate.lastMessageFileName = hasSignatureFile ? (signatureMessage.signature?.fileName || signatureMessage.fileName || 'signature') : '';
      conversationToUpdate.timestamp = new Date(signatureMessage.createdAt).toLocaleString();
      
      // Remove from current position and add to top
      updatedConversations.splice(conversationIndex, 1);
      return [conversationToUpdate, ...updatedConversations];
    });
  }

  // --- Load Conversations on Mount (MCP Context 7) ---
  // Fetch conversations when component mounts
  useEffect(() => {
    fetchConversationsSilently();
  }, []);

  // --- Pusher Real-Time Listener for New Messages (Optimized - MCP Context 7) ---
  // Business Rule: Subscribe ONCE to each conversation channel and keep listening
  // No unsubscribe when navigating away - keep updating conversation list in background
  // Only subscribe to NEW channels, never duplicate subscriptions
  // Changed: When new conversation is created, only subscribe to it (don't unsubscribe existing ones)
  useEffect(() => {
    if (!conversations || conversations.length === 0) {
      return;
    }

    // Get all conversation IDs
    const conversationIds = conversations
      .map(item => item.conversation?.id)
      .filter(id => id != null);

    // Only subscribe to channels we haven't subscribed to yet
    const newChannels = conversationIds.filter(
      id => !subscribedChannelsRef.current.has(id)
    );

    if (newChannels.length === 0) {
      console.log('✅ [PUSHER] Already subscribed to all channels');
      return;
    }

    console.log('📡 [PUSHER] Subscribing to', newChannels.length, 'new channels');

    newChannels.forEach((id) => {
      const channelName = `conversation-${id}`;
      const signatureChannelName = `conversation-signature-${id}`;
      console.log('✅ [PUSHER] Subscribing to:', channelName);
      console.log('✅ [PUSHER] Subscribing to signature channel:', signatureChannelName);
      
      const channel = pusher.subscribe(channelName);
      const signatureChannel = pusher.subscribe(signatureChannelName);
      
      channel.bind('new-message', (data) => {
        handleNewMessage(id, data);
      });

      signatureChannel.bind('message-with-signature', (data) => {
        console.log('📝 [PUSHER] Signature message received for conversation:', id);
        handleSignatureMessage(id, data);
      });

      // Mark this channel as subscribed
      subscribedChannelsRef.current.add(id);
    });

    console.log('📡 [PUSHER] Total subscribed channels:', subscribedChannelsRef.current.size);

    // NOTE: No cleanup here - we want to keep subscriptions alive
    // Cleanup only happens on component unmount (see separate useEffect below)
  }, [conversations.length]); // Only re-run when number of conversations changes

  // --- Pusher Listener for New Conversation Creation (MCP Context 7) ---
  // Business Rule: Listen for when someone creates a new conversation with current user
  // Subscribe to user-specific channel to receive real-time notifications of new conversations
  useEffect(() => {
    if (!currentUserId) {
      console.log('⚠️ [PUSHER] No user ID, skipping user channel subscription');
      return;
    }

    const userChannelName = `user-${currentUserId}`;
    console.log('📡 [PUSHER] Subscribing to user channel:', userChannelName);
    
    const userChannel = pusher.subscribe(userChannelName);
    
    // Listen for new conversation creation events
    userChannel.bind('new-conversation', (data) => {
      console.log('🆕 [PUSHER] New conversation created:', data);
      
      const newConversation = data.conversation || data;
      
      if (!newConversation || !newConversation.id) {
        console.warn('⚠️ [PUSHER] Invalid conversation data received');
        return;
      }

      // Process the new conversation using the same format as API
      const formattedConversations = processConversations([newConversation]);
      
      if (formattedConversations && formattedConversations.length > 0) {
        const formattedConversation = formattedConversations[0];
        
        // Add new conversation to the top of the list
        setConversations(prevConversations => {
          // Check if conversation already exists (prevent duplicates)
          const exists = prevConversations.some(
            c => c.conversation?.id?.toString() === newConversation.id?.toString()
          );
          
          if (exists) {
            console.log('⚠️ [PUSHER] Conversation already exists in list');
            return prevConversations;
          }
          
          console.log('✅ [PUSHER] Adding new conversation to list:', formattedConversation.name);
          // Add to top of list (most recent first)
          return [formattedConversation, ...prevConversations];
        });
        
        // Subscribe to the new conversation's message channel
        const conversationId = newConversation.id;
        const conversationChannelName = `conversation-${conversationId}`;
        
        if (!subscribedChannelsRef.current.has(conversationId)) {
          console.log('📡 [PUSHER] Auto-subscribing to new conversation channel:', conversationChannelName);
          
          const channel = pusher.subscribe(conversationChannelName);
          
          channel.bind('new-message', (messageData) => {
            handleNewMessage(conversationId, messageData);
          });
          
          subscribedChannelsRef.current.add(conversationId);
          console.log('✅ [PUSHER] Subscribed to new conversation channel');
        }
      }
    });
    
    console.log('✅ [PUSHER] Listening for new conversations on:', userChannelName);
    
    // Cleanup: Unsubscribe from user channel on unmount
    return () => {
      console.log('🔴 [PUSHER] Unsubscribing from user channel:', userChannelName);
      userChannel.unbind('new-conversation');
      pusher.unsubscribe(userChannelName);
    };
  }, [currentUserId]); // Re-run if user ID changes

  // --- Cleanup Pusher Subscriptions on Unmount (MCP Context 7) ---
  // Business Rule: Only unsubscribe from all channels when component unmounts
  // This prevents unnecessary unsubscribe/resubscribe cycles when new conversations are added
  useEffect(() => {
    return () => {
      console.log('🔴 [PUSHER] Component unmounting - Unsubscribing from all channels');
      subscribedChannelsRef.current.forEach((id) => {
        const channelName = `conversation-${id}`;
        console.log('❌ [PUSHER] Unsubscribing from:', channelName);
        pusher.unsubscribe(channelName);
      });
      subscribedChannelsRef.current.clear();
      console.log('🔴 [PUSHER] All channels unsubscribed');
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  // --- Navigation Focus Listener (MCP Context 7) ---
  // Reload conversations when screen comes into focus
  // Note: Pusher subscriptions stay active even when screen is not focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🟢 [CHAT SCREEN] Screen focused - refreshing conversations');
      // Reload conversations when returning to this screen
      fetchConversations();
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log('🔴 [CHAT SCREEN] Screen blurred - Pusher still listening in background');
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
    // Ensure we have a conversation ID before navigating
    const conversationId = user.conversation?.id;
    
    if (!conversationId) {
      console.warn('⚠️ No conversation ID found for user:', user.name);
    }
    
    navigation.navigate('UserChatScreen', {
      userId: user.id,
      userName: user.name,
      userData: user,
      conversationId: conversationId, // Pass conversation ID
      conversation: user.conversation, // Pass full conversation object
      messages: user.conversation?.messages || [], // Use messages from API
    });
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
    const { employee, conversation, isGroupChat, project } = data;
    
    // Business Rule: Handle group chat vs private chat differently
    if (isGroupChat) {
      // Group conversation - use project name
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
    // When you come back, the screen 'focus' listener will call fetchConversations() automatically
    // This prevents unnecessary API calls!
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
              <View className="flex-1 flex-row items-center">
                {item.lastMessage === '📄 ✍️' ? (
                  <>
                    <MaterialIcons name="description" size={16} color="#000000" />
                    <MaterialIcons name="edit" size={16} color="#000000" style={{ marginLeft: 4 }} />
                  </>
                ) : (
                  <Text className="text-base text-gray-600 flex-1" numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                )}
              </View>
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
            Tap the + button in the bottom navigation to start chatting
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
    <SafeAreaView className="flex-1 bg-white" edges={['bottom', 'left', 'right']} style={{ paddingBottom: 100 }}>
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


      {/* Select User Modal (MCP Context 7) */}
      {/* Modal for selecting team member to start conversation */}
      <SelectUserModal
        visible={isSelectUserModalVisible}
        onClose={handleCloseSelectUserModal}
        onUserSelect={handleUserSelectFromModal}
      />
      
      {/* Custom Bottom Navigation */}
      <CustomBottomNav 
        onAddPress={handleOpenSelectUserModal}
      />
    </SafeAreaView>
  );
};

export default ChatScreen;
