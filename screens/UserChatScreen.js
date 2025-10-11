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
  Image,
  Linking,
  Modal,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getMessagesByConversationId } from '../services/chats/getMessagesByConversationId';
import { sendMessage } from '../services/chats/sendMessage';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import pusher from '../pusherClient';

// --- Helper Function to Generate Initials (MCP Context 7) ---
// Extract first letter of first name and first letter of last name
const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return '?';
  if (!lastName) return firstName?.charAt(0).toUpperCase() || '?';
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
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

const UserChatScreen = ({ navigation, route }) => {
  const { 
    userId = '1', 
    userName = 'Sarah Johnson', 
    userData,
    conversationId,
    conversation,
    messages: initialMessages = [],
    isGroupChat: isGroupChatParam = false, // Determine if this is a group chat from navigation
    project
  } = route.params || {};
  
  // --- Determine if Group Chat (MCP Context 7) ---
  // Business Rule: Detect group chat from route params or conversation.type
  // This ensures sender names show up in group chats even if isGroupChat isn't explicitly passed
  const isGroupChat = isGroupChatParam || conversation?.type === 'group';
  
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const flatListRef = useRef(null);
  
  // --- Get Current User (MCP Context 7) ---
  // Used to determine if message is from current user or other person
  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;
  const currentUserIdRef = useRef(currentUserId);
  
  // Update ref when currentUserId changes
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // --- Listen to Keyboard Events (MCP Context 7) ---
  // Business Rule: Manually adjust input bar position when keyboard opens/closes
  // This prevents the entire content from being pushed upward
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  // --- Console Log Conversation ID (MCP Context 7) ---
  // Log conversation ID for debugging
  useEffect(() => {
    console.log('=== UserChatScreen Loaded ===');
    console.log('Conversation ID:', conversationId);
    console.log('User ID:', userId);
    console.log('User Name:', userName);
    console.log('Is Group Chat:', isGroupChat);
    console.log('Project:', project);
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

  // --- Removed separate sorting useEffect (MCP Context 7) ---
  // Business Rule: Messages are now sorted at display time (in FlatList) instead of in state
  // This prevents race conditions and timing issues when Pusher adds messages
  // Previous approach: Sort in useEffect whenever messages.length changed → caused inconsistent display
  // New approach: Sort when displaying → always shows messages in correct order

  // --- Pusher Real-Time Listener for New Messages (MCP Context 7) ---
  // Business Rule: Subscribe to conversation-specific channel to get real-time message updates
  // Backend triggers: pusher.trigger(`conversation-${conversationId}`, 'new-message', messageData)
  useEffect(() => {
    if (!conversationId) {
      console.log('⚠️ No conversation ID, skipping Pusher');
      return;
    }

    const channelName = `conversation-${conversationId}`;
    console.log('📡 Subscribing to Pusher:', channelName);
    
    const channel = pusher.subscribe(channelName);

    // Listen for new messages in this conversation
    const handleNewMessage = (data) => {
      console.log('💬 New message from Pusher:', data);
      
      const newMessage = data.message || data;
      
      if (!newMessage) {
        console.warn('⚠️ No message data');
        return;
      }

      // Check if message is from current user (avoid duplicates)
      const messageSenderId = newMessage.sender?.id?.toString();
      const isFromMe = messageSenderId === currentUserIdRef.current?.toString();
      
      console.log('🔍 Sender ID:', messageSenderId);
      console.log('🔍 My ID:', currentUserIdRef.current);
      console.log('🔍 Is from me?:', isFromMe);
      
      // Log file attachment info if present
      if (newMessage.fileUrl) {
        console.log('📎 File attached:');
        console.log('   - URL:', newMessage.fileUrl);
        console.log('   - Name:', newMessage.fileName);
        console.log('   - Type:', newMessage.fileType);
        console.log('   - Size:', newMessage.fileSize, 'MB');
      }
      
      if (isFromMe) {
        console.log('⏭️ Skipping my own message (already added locally)');
        return;
      }

      console.log('✅ Adding message from other user:', newMessage.content);

      // --- Duplicate Detection Step (MCP Context 7) ---
      // Business Rule: Check if message already exists before adding it
      // This prevents duplicate messages from appearing when Pusher sends the same message twice
      // (can happen due to connection issues, re-subscriptions, or race conditions)
      setMessages(prev => {
        // Check if message with this ID already exists in the array
        const messageExists = prev.some(msg => msg.id?.toString() === newMessage.id?.toString());
        
        if (messageExists) {
          console.log('⚠️ Message already exists, skipping duplicate:', newMessage.id);
          return prev; // Don't add duplicate, return existing array
        }
        
        console.log('➕ Adding new message to chat:', newMessage.id);
        // Message doesn't exist, add it to the array
        return [...prev, newMessage];
      });
    };

    channel.bind('new-message', handleNewMessage);
    console.log('✅ Listening for messages');

    // Cleanup: Unsubscribe when component unmounts or conversationId changes
    return () => {
      console.log('🔌 Unsubscribing from Pusher:', channelName);
      channel.unbind('new-message', handleNewMessage);
      pusher.unsubscribe(channelName);
    };
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

  // --- Pick File Function (MCP Context 7) ---
  // Business Rule: Allow users to attach files (images, PDFs, documents, etc.)
  // Uses expo-document-picker to select files from device
  const handlePickFile = async () => {
    try {
      console.log('📎 Opening file picker...');
      
      // Open document picker
      // Allows all file types: images, PDFs, docs, spreadsheets, etc.
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // All file types
        copyToCacheDirectory: true,
      });
      
      console.log('File picker result:', result);
      
      // Check if user selected a file (didn't cancel)
      if (result.canceled) {
        console.log('User canceled file picker');
        return;
      }
      
      // Get the selected file
      const file = result.assets[0];
      
      if (!file) {
        console.log('No file selected');
        return;
      }
      
      // Validate file size (max 10 MB)
      // Business Rule: Prevent large files from being uploaded to save bandwidth
      const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
      if (file.size > maxSizeInBytes) {
        Toast.show({
          type: 'error',
          text1: 'File Too Large',
          text2: 'Please select a file smaller than 10 MB',
          visibilityTime: 3000,
          position: 'top',
        });
        return;
      }
      
      console.log('✅ File selected:', file.name);
      console.log('   - Size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
      console.log('   - Type:', file.mimeType);
      
      // Store selected file in state
      setSelectedFile(file);
      
      Toast.show({
        type: 'success',
        text1: 'File Selected',
        text2: file.name,
        visibilityTime: 2000,
        position: 'top',
      });
      
    } catch (error) {
      console.error('Error picking file:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick file. Please try again.',
        visibilityTime: 3000,
        position: 'top',
      });
    }
  };

  // --- Remove Selected File (MCP Context 7) ---
  // Allows user to cancel/remove the selected file before sending
  const handleRemoveFile = () => {
    console.log('🗑️ Removing selected file');
    setSelectedFile(null);
  };

  // --- Send Message Function (MCP Context 7) ---
  // Business Rule: Optimistic UI - Show message immediately, then wait for API confirmation
  // Changed: Now supports sending messages with file attachments
  const handleSendMessage = async () => {
    // Validation: Must have either text or file
    if (!inputText.trim() && !selectedFile) {
      console.log('Empty message and no file, not sending');
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
    const fileToSend = selectedFile;
    
    console.log('=== Sending Message ===');
    console.log('Conversation ID:', conversationId);
    console.log('Message content:', messageText);
    console.log('File attached:', fileToSend ? fileToSend.name : 'None');

    // Clear input immediately for better UX
    setInputText('');
    setSelectedFile(null);
    Keyboard.dismiss();
    setIsSendingMessage(true);

    // --- Step 1: Create Optimistic Message (MCP Context 7) ---
    // Business Rule: Show message immediately in chat before API responds
    // This provides instant feedback to user (like WhatsApp/iMessage)
    const optimisticMessage = {
      id: `temp-${Date.now()}`, // Temporary ID (will be replaced with real ID from API)
      content: messageText,
      fileUrl: fileToSend ? fileToSend.uri : null, // Use file.uri directly (React Native DocumentPicker provides this)
      fileName: fileToSend ? fileToSend.name : null,
      fileType: fileToSend ? fileToSend.mimeType : null,
      fileSize: fileToSend ? (fileToSend.size / (1024 * 1024)).toFixed(2) : null,
      sender: {
        id: currentUserId,
        first_name: userInfo?.first_name,
        last_name: userInfo?.last_name,
      },
      createdAt: new Date().toISOString(), // Current timestamp
      status: 'sending', // Mark as sending (can be used to show loading indicator)
    };

    // Add optimistic message to chat immediately
    console.log('✨ Adding optimistic message to chat');
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // --- Step 2: Call API to Send Message (MCP Context 7) ---
      // API: POST /chat/messages
      // Body (with file): FormData { conversationId, content, file }
      // Body (without file): JSON { conversationId, content }
      const response = await sendMessage(conversationId, messageText, fileToSend);
      
      console.log('✅ Message sent successfully:', response);
      
      // --- Step 3: Replace Optimistic Message with Real API Response (MCP Context 7) ---
      // Business Rule: Remove temporary message, add real message from API with actual ID
      if (response) {
        setMessages(prev => {
          // Remove the optimistic message (with temp ID)
          const filtered = prev.filter(msg => msg.id !== optimisticMessage.id);
          // Add the real message from API
          return [...filtered, response];
        });
        console.log('✅ Optimistic message replaced with real message from API');
      }
      
    } catch (err) {
      console.error('❌ Error sending message:', err);
      
      // --- Step 4: Remove Optimistic Message on Error (MCP Context 7) ---
      // Business Rule: If API fails, remove the optimistic message from chat
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      console.log('🗑️ Optimistic message removed due to API error');
      
      // Show error toast
      Toast.show({
        type: 'error',
        text1: 'Failed to Send',
        text2: 'Could not send message. Please try again.',
        visibilityTime: 3000,
        position: 'top',
      });
      
      // Restore the message text and file so user can retry
      setInputText(messageText);
      setSelectedFile(fileToSend);
      
    } finally {
      setIsSendingMessage(false);
    }
  };


  // --- Helper: Get File Icon Based on File Type (MCP Context 7) ---
  // Returns appropriate icon name for each file type
  const getFileIcon = (fileType) => {
    if (!fileType) return 'insert-drive-file';
    
    // PDFs
    if (fileType === 'application/pdf') return 'picture-as-pdf';
    
    // Word Documents
    if (fileType === 'application/msword' || 
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'description';
    }
    
    // Excel Spreadsheets
    if (fileType === 'application/vnd.ms-excel' || 
        fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return 'table-chart';
    }
    
    // PowerPoint Presentations
    if (fileType === 'application/vnd.ms-powerpoint' || 
        fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      return 'slideshow';
    }
    
    // Text files
    if (fileType === 'text/plain' || fileType === 'text/csv') return 'article';
    
    // Archives (ZIP, RAR)
    if (fileType === 'application/zip' || 
        fileType === 'application/x-rar-compressed') {
      return 'folder-zip';
    }
    
    // Default icon for unknown types
    return 'insert-drive-file';
  };

  // --- Helper: Open Image in Full Screen (MCP Context 7) ---
  // Opens image in full-screen modal viewer
  const handleOpenImage = (imageUrl) => {
    console.log('🖼️ Opening image in full view:', imageUrl);
    setSelectedImageUrl(imageUrl);
    setImageViewerVisible(true);
  };

  // --- Helper: Close Image Viewer (MCP Context 7) ---
  // Closes the full-screen image viewer modal
  const handleCloseImageViewer = () => {
    console.log('❌ Closing image viewer');
    setImageViewerVisible(false);
    setSelectedImageUrl(null);
  };

  // --- Helper: Download and Share File (MCP Context 7) ---
  // Downloads file to device and opens share dialog using expo-sharing
  // Business Rule: Allow users to download and share documents from chat
  const handleDownloadAndShareFile = async (fileUrl, fileName) => {
    try {
      console.log('📥 Downloading file:', fileName);

      // Check if sharing is available on device
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Toast.show({
          type: 'error',
          text1: 'Sharing Not Available',
          text2: 'Your device does not support file sharing',
          visibilityTime: 3000,
          position: 'top',
        });
        return;
      }

      // Create file path in cache directory
      // Business Rule: Download file to device cache for temporary storage
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Download the file from URL
      const downloadResult = await FileSystem.downloadAsync(fileUrl, fileUri);
      
      console.log('✅ File downloaded to:', downloadResult.uri);

      // Share the downloaded file
      // This opens the native share dialog (WhatsApp, Email, Save to Files, etc.)
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/octet-stream',
        dialogTitle: fileName,
        UTI: 'public.item',
      });
      
      console.log('✅ File shared successfully');

    } catch (error) {
      console.error('❌ Error downloading/sharing file:', error);
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: 'Could not download file. Please try again.',
        visibilityTime: 3000,
        position: 'top',
      });
    }
  };

  // --- Helper: Open File/Document (MCP Context 7) ---
  // Opens file URL in browser or appropriate app
  const handleOpenFile = async (fileUrl, fileName) => {
    try {
      console.log('📂 Opening file:', fileName);
      const canOpen = await Linking.canOpenURL(fileUrl);
      
      if (canOpen) {
        await Linking.openURL(fileUrl);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Cannot Open File',
          text2: 'Unable to open this file type',
          visibilityTime: 3000,
          position: 'top',
        });
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to open file',
        visibilityTime: 3000,
        position: 'top',
      });
    }
  };

  // --- Message Item Component (MCP Context 7) ---
  // Individual message bubble with iOS Messages style
  // API Structure: { id, sender: { id, first_name, last_name }, content, fileUrl, fileName, fileType, fileSize, createdAt, status }
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

    // Check file type (MCP Context 7)
    // Business Rule: Display images inline, show document cards for PDFs/docs/archives
    const hasImage = item.fileUrl && item.fileType?.startsWith('image/');
    const hasDocument = item.fileUrl && !hasImage;
    const hasFile = hasImage || hasDocument;

    // --- Get Sender Info for Display (MCP Context 7) ---
    // Business Rule: Show sender's name and avatar ONLY in group chats for messages from other users
    const senderFirstName = item.sender?.first_name || '';
    const senderLastName = item.sender?.last_name || '';
    const senderFullName = `${senderFirstName} ${senderLastName}`.trim() || 'Unknown';
    const showSenderInfo = !isMe && isGroupChat; // Show avatar and name only in group chats

    return (
      <View className={`mb-3 px-5 ${isMe ? 'items-end' : 'items-start'}`}>
        {/* WhatsApp-Style Message Container with Avatar (MCP Context 7) */}
        {/* Business Rule: Messages from others show avatar on left side */}
        {/* Dynamic width: Short messages = narrow bubble, Long messages = wider bubble */}
        <View className={`flex-row ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
          {/* Avatar Circle (Only for messages from others) */}
          {showSenderInfo && (
            <View 
              className="w-10 h-10 rounded-full items-center justify-center mr-2 mb-1"
              style={{ backgroundColor: getAvatarColor(senderFullName) }}
            >
              <Text className="text-sm font-bold text-white">
                {getInitials(senderFirstName, senderLastName)}
              </Text>
            </View>
          )}

          {/* Message Content Container - Dynamic width like WhatsApp */}
          <View className={`${isMe ? 'mr-2' : ''}`} style={{ maxWidth: '75%' }}>
            {/* Business Rule: Files (images/documents) render without bubble background */}
            {/* Only text-only messages get the bubble styling */}
            
            {/* Display image if fileUrl exists and it's an image type */}
            {/* Business Rule: Images are tappable to open in full-screen view */}
            {hasImage && (
              <TouchableOpacity 
                onPress={() => handleOpenImage(item.fileUrl)}
                activeOpacity={0.9}
                className="mb-1"
              >
                <Image
                  source={{ uri: item.fileUrl }}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 12,
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            
            {/* Display document card for PDFs, Word, Excel, etc. */}
            {/* Business Rule: Tap card to open file, tap download icon to share/download */}
            {hasDocument && (
              <TouchableOpacity
                onPress={() => handleOpenFile(item.fileUrl, item.fileName)}
                activeOpacity={0.7}
                className={`flex-row items-center p-3 rounded-lg mb-1 shadow-sm ${
                  isMe 
                    ? 'bg-white shadow-gray-300/50' 
                    : 'bg-white shadow-gray-300/50'
                }`}
              >
                {/* File Icon */}
                <View className="w-12 h-12 bg-gray-100 rounded-lg items-center justify-center mr-3">
                  <MaterialIcons
                    name={getFileIcon(item.fileType)}
                    size={24}
                    color="#000000"
                  />
                </View>
                
                {/* File Info */}
                <View className="flex-1">
                  <Text 
                    className="text-sm font-semibold text-gray-900"
                    numberOfLines={1}
                  >
                    {item.fileName || 'Document'}
                  </Text>
                  <Text className="text-xs mt-1 text-gray-500">
                    {item.fileSize ? `${item.fileSize} MB` : 'File'}
                  </Text>
                </View>
                
                {/* Download/Share Icon */}
                {/* Business Rule: Download file and open share dialog (Save to Files, WhatsApp, etc.) */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent card's onPress from firing
                    handleDownloadAndShareFile(item.fileUrl, item.fileName);
                  }}
                  activeOpacity={0.6}
                  className="p-2"
                >
                  <MaterialIcons
                    name="file-download"
                    size={20}
                    color="#000000"
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            
            {/* Display text content in bubble (only if text exists) */}
            {/* Business Rule: Dynamic width - bubble wraps content, min width for short messages */}
            {item.content && (
              <View 
                className={`px-4 py-3 rounded-2xl shadow-sm ${
                  hasFile ? 'mt-1' : ''
                } ${
                  isMe 
                    ? 'bg-blue-500 rounded-br-sm shadow-blue-500/30' 
                    : 'bg-white rounded-bl-sm shadow-gray-500/20'
                }`}
                style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
              >
                {/* Sender Name (WhatsApp Style - inside bubble for messages from others) */}
                {showSenderInfo && (
                  <Text className="text-xs font-semibold text-gray-900 mb-1">
                    {senderFullName}
                  </Text>
                )}
                
                <Text className={`text-base leading-6 ${
                  isMe ? 'text-white' : 'text-gray-900'
                }`}>
                  {item.content}
                </Text>
              </View>
            )}
            
            {showTime && (
              <Text className={`text-xs text-gray-500 mt-1 ${
                isMe ? 'text-right mr-2' : 'text-left ml-2'
              }`}>
                {formatTime(item.createdAt)}
              </Text>
            )}
          </View>
        </View>
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

  // --- Sort Messages for Display (MCP Context 7) ---
  // Business Rule: Sort messages by timestamp (oldest to newest) when displaying
  // This ensures messages always appear in correct chronological order
  // Sorting at display time (instead of in state) prevents race conditions with Pusher
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB; // Oldest first (top), newest last (bottom)
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'left', 'right']}>
      {/* Messages List - Full Screen (MCP Context 7) */}
      {/* WhatsApp-style dull background for better message visibility */}
      {/* Business Rule: Messages take full height, input bar overlays at bottom */}
      
      {/* Loading State (MCP Context 7) */}
      {isLoadingMessages ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="text-base text-gray-500 mt-4">Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={sortedMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          className="flex-1"
          contentContainerStyle={{ 
            paddingVertical: 16, 
            paddingHorizontal: 8, 
            paddingBottom: 90, // Extra padding at bottom so last message isn't hidden by input bar
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

      {/* Input Bar at Bottom - Moves with Keyboard (MCP Context 7) */}
      {/* Business Rule: Input bar appears on top of keyboard (like WhatsApp/iMessage) */}
      {/* Messages don't get pushed - only input bar moves up when keyboard opens */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          {/* File Preview (MCP Context 7) */}
          {/* Shows when user has selected a file but hasn't sent it yet */}
          {selectedFile && (
            <View className="mb-2 bg-gray-100 rounded-lg p-3 flex-row items-center">
              {/* File Icon */}
              <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
                <MaterialIcons
                  name={getFileIcon(selectedFile.mimeType)}
                  size={20}
                  color="#000000"
                />
              </View>
              
              {/* File Info */}
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </Text>
              </View>
              
              {/* Remove File Button */}
              <TouchableOpacity
                onPress={handleRemoveFile}
                className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Message Input Container */}
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            {/* Plus Icon - File Attachment Button (MCP Context 7) */}
            {/* Business Rule: Allows users to attach files before sending message */}
            <TouchableOpacity
              onPress={handlePickFile}
              disabled={isSendingMessage}
              className="mr-2"
              activeOpacity={0.7}
            >
              <Ionicons
                name="add-circle"
                size={28}
                color={isSendingMessage ? '#D1D5DB' : '#000000'}
              />
            </TouchableOpacity>

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
              disabled={(!inputText.trim() && !selectedFile) || isSendingMessage}
              className={`ml-3 w-9 h-9 rounded-full items-center justify-center ${
                (inputText.trim() || selectedFile) && !isSendingMessage ? 'bg-black' : 'bg-gray-300'
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

      {/* Full-Screen Image Viewer Modal (MCP Context 7) */}
      {/* Business Rule: Allow users to view images in full screen with zoom capability */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseImageViewer}
      >
        <View style={styles.imageViewerContainer}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleCloseImageViewer}
            style={styles.closeButton}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Full-Screen Image */}
          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// --- StyleSheet for Image Viewer (MCP Context 7) ---
// Used for full-screen image modal styling
const styles = StyleSheet.create({
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default UserChatScreen;
