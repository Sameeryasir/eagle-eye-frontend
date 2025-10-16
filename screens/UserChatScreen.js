import React, { useState, useRef, useEffect } from "react";
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
  Modal,
  Dimensions,
  StyleSheet,
  Linking,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from "../context/AuthContext";
import { getMessagesByConversationId } from "../services/chats/getMessagesByConversationId";
import { sendMessage } from "../services/chats/sendMessage";
import { isTyping } from "../services/chats/isTyping";
import { getFilesForConversation } from "../services/chats/getFilesForConversation";
import { createSignature } from "../services/chats/createSignature";
import DateTimePicker from '@react-native-community/datetimepicker';
import appEmitter from "../utils/appEmitter";
import pusher from "../pusherClient";

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
    userId = "1",
    userName = "User",
    conversationId,
    messages: initialMessages = [],
    isGroupChat: isGroupChatParam = false,
    conversation,
  } = route.params || {};

  // --- Determine if Group Chat (MCP Context 7) ---
  // Business Rule: Only show sender names in group chats, not in individual chats
  const isGroupChat = isGroupChatParam || conversation?.type === 'group';

  const { user, userInfo } = useAuth();
  const insets = useSafeAreaInsets(); // Get safe area insets for notch/navigation bar handling
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // For file uploads
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false); // For attachment options
  const [filesModalVisible, setFilesModalVisible] = useState(false); // For viewing all files
  const [conversationFiles, setConversationFiles] = useState([]); // Store files from conversation
  const [isLoadingFiles, setIsLoadingFiles] = useState(false); // Loading state for files
  const flatListRef = useRef(null);
  
  // --- Request Signature Modal State (MCP Context 7) ---
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [signatureTitle, setSignatureTitle] = useState('');
  const [signatureNotes, setSignatureNotes] = useState('');
  const [signatureDueDate, setSignatureDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- Typing State Management (MCP Context 7) ---
  // Business Rule: Track who is currently typing in the conversation
  // Used to show typing indicators below the input bar (WhatsApp-style)
  const [typingUsers, setTypingUsers] = useState([]); // Array of user objects who are typing
  const [isUserTyping, setIsUserTyping] = useState(false); // Whether current user is typing
  const typingTimeoutRef = useRef(null); // For debouncing typing status

  // --- Get Current User ID from AsyncStorage (MCP Context 7) ---
  // Business Rule: Retrieve user ID from local storage to compare with message sender
  // This ensures we're using the exact same ID that was stored during login
  const [currentUserId, setCurrentUserId] = useState(null);
  const currentUserIdRef = useRef(currentUserId);

  // Update ref when currentUserId changes
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // --- Fetch User ID from AsyncStorage (MCP Context 7) ---
  useEffect(() => {
    const getUserIdFromStorage = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        
        if (storedUserId) {
          // Convert to number since sender.id comes as number from API
          const userIdNumber = parseInt(storedUserId);
          setCurrentUserId(userIdNumber);
        }
      } catch (error) {
        console.error('Error reading userId from AsyncStorage:', error);
      }
    };

    getUserIdFromStorage();
  }, []);

  // --- Helper: Sort Messages by Timestamp (MCP Context 7) ---
  // Business Rule: Sort messages newest-first for inverted FlatList
  // When FlatList is inverted, newest-first data displays as oldest-first visually (like WhatsApp)
  // This ensures correct order even when messages arrive out of sequence via Pusher
  const sortMessagesByTime = (messages) => {
    return messages.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA; // Newest first (descending order) - will be inverted visually
    });
  };

  // --- Fetch Messages from API (MCP Context 7) ---
  // Business Rule: Fetch messages for the conversation using conversationId
  const fetchMessages = async () => {
    if (!conversationId) {
      console.log('No conversation ID provided, skipping message fetch');
      return;
    }

    setIsLoadingMessages(true);
    
    try {
      const response = await getMessagesByConversationId(conversationId);
      
      if (response && Array.isArray(response)) {
        // Sort messages to ensure chronological order
        const sortedMessages = sortMessagesByTime([...response]);
        setMessages(sortedMessages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
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

  // --- Fetch Files from Conversation (MCP Context 7) ---
  // Business Rule: Fetch all files shared in this conversation
  const fetchConversationFiles = async () => {
    const currentConversationId = route.params?.conversationId;
    
    if (!currentConversationId) {
      console.log('❌ No conversation ID found');
      Alert.alert('Error', 'No conversation ID found');
      return;
    }

    setIsLoadingFiles(true);
    
    try {
      console.log('🔄 Fetching files for conversation:', currentConversationId);
      const response = await getFilesForConversation(currentConversationId);
      
      if (response && Array.isArray(response)) {
        setConversationFiles(response);
        console.log('✅ Files fetched successfully:', response.length, 'files');
      } else {
        setConversationFiles([]);
        console.log('📭 No files found in conversation');
      }
    } catch (err) {
      console.error('❌ Error fetching conversation files:', err);
      setConversationFiles([]);
      Alert.alert('Error', 'Failed to load files. Please try again.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // --- Handle Fetch All Files Event (MCP Context 7) ---
  // Business Rule: Listen for fetchAllFiles event from App.js header
  const handleFetchAllFiles = () => {
    console.log('📁 Received fetchAllFiles event in UserChatScreen');
    console.log('📁 Setting filesModalVisible to true');
    setFilesModalVisible(true);
    fetchConversationFiles();
  };

  // --- Event Listener for fetchAllFiles (MCP Context 7) ---
  useEffect(() => {
    console.log('🔌 Setting up fetchAllFiles event listener');
    // Listen for fetchAllFiles event
    appEmitter.on('fetchAllFiles', handleFetchAllFiles);
    console.log('✅ Event listener set up successfully');
    
    // Cleanup listener on unmount
    return () => {
      console.log('🔌 Cleaning up fetchAllFiles event listener');
      appEmitter.off('fetchAllFiles', handleFetchAllFiles);
    };
  }, []);


  // --- Pusher Real-Time Listener (Fixed - MCP Context 7) ---
  // Business Rule: Always ensure we're listening to the conversation channel
  // For new conversations: subscribe and listen
  // For existing conversations: use existing subscription or create new one
  useEffect(() => {
    if (!conversationId) {
      console.log('⚠️ No conversation ID, skipping Pusher');
      return;
    }

    const channelName = `conversation-${conversationId}`;
    console.log('📡 [PUSHER] Setting up listener for:', channelName);
    
    // Always try to get or create the channel
    let channel = pusher.channel(channelName);
    
    if (!channel) {
      console.log('🆕 [PUSHER] Channel not found, subscribing now');
      channel = pusher.subscribe(channelName);
    } else {
      console.log('✅ [PUSHER] Using existing channel');
    }

    // Define message handler
    const handleNewMessage = (data) => {
      console.log('📨 [PUSHER] New message event received');
      const newMessage = data.message || data;

      // Basic validation
      if (!newMessage || !newMessage.id) {
        console.log('❌ [PUSHER] Invalid message - missing ID');
        return;
      }

      // Check if it's a signature message
      const isSignatureMessage = !newMessage.content && newMessage.signature;
      
      console.log('📬 [PUSHER] Message details:', {
        id: newMessage.id,
        senderId: newMessage.sender?.id,
        senderName: `${newMessage.sender?.first_name} ${newMessage.sender?.last_name}`.trim(),
        content: newMessage.content ? `"${newMessage.content.substring(0, 30)}..."` : '(no content)',
        hasFile: !!newMessage.fileUrl,
        isSignatureMessage: isSignatureMessage,
        signatureTitle: isSignatureMessage ? newMessage.signature?.title : 'N/A',
        signatureStatus: isSignatureMessage ? newMessage.signature?.status : 'N/A'
      });

      // Add message to state
      setMessages((prevMessages) => {
        // Check if message already exists (by ID)
        const exists = prevMessages.some(msg => msg.id === newMessage.id);
        
        if (exists) {
          console.log('⚠️ [PUSHER] Message already exists in chat - skipping (ID:', newMessage.id, ')');
          return prevMessages;
        }

        // Get current user ID from ref
        const myUserId = currentUserIdRef.current;
        const messageSenderId = newMessage.sender?.id;

        // Only skip if we have a valid user ID AND it matches the sender
        if (myUserId && messageSenderId && messageSenderId === myUserId) {
          console.log('⏭️ [PUSHER] This is my own message - skipping (already shown via optimistic UI)');
          return prevMessages;
        }

        // Add new message from other user and sort by timestamp
        if (isSignatureMessage) {
          console.log('✅ [PUSHER] Adding signature contract to chat from:', newMessage.sender?.first_name || 'Unknown');
        } else {
          console.log('✅ [PUSHER] Adding message to chat from:', newMessage.sender?.first_name || 'Unknown');
        }
        const updatedMessages = [...prevMessages, newMessage];
        return sortMessagesByTime(updatedMessages);
      });
    };

    // Define typing handler
    const handleTypingEvent = (data) => {
      console.log('⌨️ [PUSHER] Typing event received:', data);
      
      const { userId, userName, isTyping: userIsTyping } = data;
      
      // Don't show typing indicator for current user
      if (userId === currentUserIdRef.current) {
        return;
      }

      setTypingUsers(prevTypingUsers => {
        if (userIsTyping) {
          // Add user to typing list if not already there
          const userExists = prevTypingUsers.some(user => user.id === userId);
          if (!userExists) {
            return [...prevTypingUsers, { id: userId, name: userName }];
          }
        } else {
          // Remove user from typing list
          return prevTypingUsers.filter(user => user.id !== userId);
        }
        return prevTypingUsers;
      });
    };

    // Bind the listeners
    channel.bind('new-message', handleNewMessage);
    channel.bind('typing', handleTypingEvent);
    console.log('✅ [PUSHER] Listening for new messages and typing events on:', channelName);

    // Cleanup: Only unbind our listeners, don't unsubscribe
    // Let ChatScreen manage subscriptions
    return () => {
      console.log('🔌 [PUSHER] Unbinding listeners from:', channelName);
      channel.unbind('new-message', handleNewMessage);
      channel.unbind('typing', handleTypingEvent);
      // Note: We do NOT unsubscribe - ChatScreen manages subscriptions
    };
  }, [conversationId]);

  // --- Cleanup Typing Timeout on Unmount (MCP Context 7) ---
  // Business Rule: Clear typing timeout when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // --- Date Picker Handler for Signature Request (MCP Context 7) ---
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSignatureDueDate(selectedDate);
    }
  };

  // --- Helper: Get File Icon Based on File Name (MCP Context 7) ---
  // Returns appropriate icon name for each file type based on file extension
  const getFileIcon = (fileName) => {
    if (!fileName) return 'insert-drive-file';
    
    const extension = fileName.toLowerCase().split('.').pop();
    
    // PDFs
    if (extension === 'pdf') return 'picture-as-pdf';
    
    // Word Documents
    if (extension === 'doc' || extension === 'docx') return 'description';
    
    // Excel Spreadsheets
    if (extension === 'xls' || extension === 'xlsx') return 'table-chart';
    
    // PowerPoint Presentations
    if (extension === 'ppt' || extension === 'pptx') return 'slideshow';
    
    // Text files
    if (extension === 'txt' || extension === 'csv') return 'article';
    
    // Archives (ZIP, RAR)
    if (extension === 'zip' || extension === 'rar') return 'folder-zip';
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return 'image';
    
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

  // --- Helper: Download and Share Image (MCP Context 7) ---
  // Downloads image to device and opens share dialog (WhatsApp-style)
  // Business Rule: Allow users to download and share images from chat
  const handleDownloadAndShareImage = async (imageUrl, fileName) => {
    try {
      console.log('📥 Downloading image:', fileName || 'image');

      // Check if sharing is available on device
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert('Sharing not available on this device');
        return;
      }

      // Create file path in cache directory
      const imageName = fileName || `image-${Date.now()}.jpg`;
      const fileUri = `${FileSystem.cacheDirectory}${imageName}`;
      
      // Download the image from URL
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      console.log('✅ Image downloaded to:', downloadResult.uri);

      // Share the downloaded image
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Save Image',
        UTI: 'public.image',
      });
      
      console.log('✅ Image shared successfully');

    } catch (error) {
      console.error('❌ Error downloading/sharing image:', error);
      alert('Failed to download image. Please try again.');
    }
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
        alert('Sharing not available on this device');
        return;
      }

      // Create file path in cache directory
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Download the file from URL
      const downloadResult = await FileSystem.downloadAsync(fileUrl, fileUri);
      
      console.log('✅ File downloaded to:', downloadResult.uri);

      // Share the downloaded file
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/octet-stream',
        dialogTitle: fileName,
        UTI: 'public.item',
      });
      
      console.log('✅ File shared successfully');

    } catch (error) {
      console.error('❌ Error downloading/sharing file:', error);
      alert('Failed to download file. Please try again.');
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
        alert('Cannot open this file type');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      alert('Failed to open file');
    }
  };

  // --- Helper: Show Attachment Options (MCP Context 7) ---
  // Shows menu with options to pick image or document (WhatsApp-style)
  const handleShowAttachmentOptions = () => {
    setAttachmentMenuVisible(true);
  };

  // --- Helper: Pick Image from Gallery (MCP Context 7) ---
  // Business Rule: Allow users to select images from device gallery
  const handlePickImage = async () => {
    try {
      console.log('📸 Opening image picker...');
      setAttachmentMenuVisible(false);
      
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to send images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        
        // Prepare file object for upload
        const fileToUpload = {
          uri: image.uri,
          name: `image_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        };

        console.log('✅ Image selected:', fileToUpload.name);
        setSelectedFile(fileToUpload);
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // --- Helper: Pick Document (MCP Context 7) ---
  // Business Rule: Allow users to select documents (PDF, Word, Excel, etc.)
  const handlePickDocument = async () => {
    try {
      console.log('📄 Opening document picker...');
      setAttachmentMenuVisible(false);
      
      // Launch document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // All file types
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const document = result.assets[0];
        
        // Prepare file object for upload
        const fileToUpload = {
          uri: document.uri,
          name: document.name,
          mimeType: document.mimeType || 'application/octet-stream',
        };

        console.log('✅ Document selected:', fileToUpload.name);
        setSelectedFile(fileToUpload);
      }
    } catch (error) {
      console.error('❌ Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  // --- Helper: Remove Selected File (MCP Context 7) ---
  // Removes the selected file before sending
  const handleRemoveFile = () => {
    console.log('🗑️ Removing selected file');
    setSelectedFile(null);
  };

  // --- Typing Detection and Management (MCP Context 7) ---
  // Business Rule: Send typing status to server when user starts/stops typing
  // Uses debouncing to prevent excessive API calls (WhatsApp-style behavior)
  const handleTypingStatus = async (isTypingStatus) => {
    if (!conversationId) {
      console.log('No conversation ID, skipping typing status');
      return;
    }

    try {
      // Only send if status actually changed
      if (isTypingStatus !== isUserTyping) {
        console.log('📝 Sending typing status:', isTypingStatus ? 'started' : 'stopped');
        await isTyping(conversationId, isTypingStatus);
        setIsUserTyping(isTypingStatus);
      }
    } catch (error) {
      console.error('❌ Error sending typing status:', error);
      // Don't show error to user - typing is not critical functionality
    }
  };

  // --- Debounced Typing Handler (MCP Context 7) ---
  // Business Rule: Start typing immediately, stop typing after 2 seconds of inactivity
  // This prevents spam while providing responsive feedback
  const handleTextChange = (text) => {
    setInputText(text);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If user is typing and text is not empty, send "started typing"
    if (text.trim().length > 0 && !isUserTyping) {
      handleTypingStatus(true);
    }

    // Set timeout to send "stopped typing" after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isUserTyping) {
        handleTypingStatus(false);
      }
    }, 2000);
  };


  // --- Handle Send Message (MCP Context 7) ---
  // Business Rule: Send message to API with optimistic UI update
  // Supports text messages, file attachments, or both (WhatsApp-style)
  // Optimistic UI: Show message immediately, then wait for API confirmation
  const handleSendMessage = async () => {
    // Validation: Must have text content OR file attachment
    if (!inputText.trim() && !selectedFile) {
      console.log('Empty message and no file, not sending');
      return;
    }

    // Validation: Must have conversation ID
    if (!conversationId) {
      console.error('No conversation ID found');
      alert('Cannot send message: Conversation ID not found');
      return;
    }

    const messageText = inputText.trim();
    const fileToSend = selectedFile;
    
    console.log('=== Sending Message ===');
    console.log('Conversation ID:', conversationId);
    console.log('Message content:', messageText || '(no text)');
    console.log('File:', fileToSend ? fileToSend.name : '(no file)');

    // Clear input and file immediately for better UX
    setInputText('');
    setSelectedFile(null);
    Keyboard.dismiss();
    setIsSendingMessage(true);

    // Stop typing status when sending message
    if (isUserTyping) {
      handleTypingStatus(false);
    }

    // --- Step 1: Create Optimistic Message (MCP Context 7) ---
    // Business Rule: Show message immediately in chat before API responds
    // This provides instant feedback to user (like WhatsApp/iMessage)
    const optimisticMessage = {
      id: `temp-${Date.now()}`, // Temporary ID (will be replaced with real ID from API)
      content: messageText || '', // Empty string if only sending file
      fileUrl: fileToSend ? fileToSend.uri : null, // Show local URI temporarily
      fileName: fileToSend ? fileToSend.name : null,
      fileType: fileToSend ? fileToSend.mimeType : null,
      fileSize: null, // Size not available locally
      sender: {
        id: currentUserId,
        first_name: userInfo?.first_name || user?.first_name,
        last_name: userInfo?.last_name || user?.last_name,
      },
      createdAt: new Date().toISOString(), // Current timestamp
      status: 'sending', // Mark as sending (can be used to show loading indicator)
    };

    // Add optimistic message to chat immediately (sorted by timestamp)
    console.log('✨ Adding optimistic message to chat');
    setMessages(prev => sortMessagesByTime([...prev, optimisticMessage]));

    try {
      // --- Step 2: Call API to Send Message (MCP Context 7) ---
      // API: POST /chat/messages
      // Body: FormData (if file attached) or JSON (text only)
      const response = await sendMessage(conversationId, messageText, fileToSend);
      
      console.log('✅ Message sent successfully:', response);
      
      // --- Step 3: Replace Optimistic Message with Real API Response (MCP Context 7) ---
      // Business Rule: Remove temporary message, add real message from API with actual ID, then sort
      if (response) {
        setMessages(prev => {
          // Remove the optimistic message (with temp ID)
          const filtered = prev.filter(msg => msg.id !== optimisticMessage.id);
          // Add the real message from API and sort by timestamp
          const updatedMessages = [...filtered, response];
          return sortMessagesByTime(updatedMessages);
        });
        console.log('✅ Optimistic message replaced with real message from API');
      }
      
    } catch (err) {
      console.error('❌ Error sending message:', err);
      
      // --- Step 4: Remove Optimistic Message on Error (MCP Context 7) ---
      // Business Rule: If API fails, remove the optimistic message to avoid confusion
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      // Show error alert
      alert('Failed to send message. Please try again.');
      
      // Restore the text to input box so user can retry
      setInputText(messageText);
      
    } finally {
      setIsSendingMessage(false);
    }
  };


  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Loading State (MCP Context 7) */}
      {isLoadingMessages ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="text-base text-gray-500 mt-4">Loading messages...</Text>
        </View>
      ) : (
        /* 📨 Messages List */
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted={true}
          renderItem={({ item }) => {
            // --- Message Ownership Logic (MCP Context 7) ---
            // Business Rule: Compare sender.id with current logged-in user's id
            // Both are numbers: sender.id (number from API) and currentUserId (converted to number)
            const isMyMessage = item.sender?.id === currentUserId;
            
            // --- Signature Contract Rendering (MCP Context 7) ---
            // Business Rule: If message has no content but has signature object, show as contract form
            if (!item.content && item.signature) {
              return (
                <View className="mb-4 px-5">
                  <View 
                    className="bg-white rounded-xl p-6"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 5,
                      borderWidth: 1,
                      borderColor: '#e5e7eb'
                    }}
                  >
                    {/* Contract Header */}
                    <View className="flex-row items-center mb-4">
                      <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: 'black' }}>
                        <Ionicons name="document-text" size={24} color="white" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[18px] font-bold text-[#333]">Contract for Signature</Text>
                        <Text className="text-[14px] text-[#666]">
                          From: {item.sender.first_name} {item.sender.last_name}
                        </Text>
                      </View>
                    </View>

                    {/* Contract Title */}
                    <View className="mb-4">
                      <Text className="text-[16px] font-semibold text-[#333] mb-2">Document Title</Text>
                      <Text className="text-[15px] text-[#333] bg-[#f8f9fa] p-3 rounded-lg">
                        {item.signature.title}
                      </Text>
                    </View>

                    {/* Contract Notes */}
                    {item.signature.notes && (
                      <View className="mb-4">
                        <Text className="text-[16px] font-semibold text-[#333] mb-2">Instructions</Text>
                        <Text className="text-[14px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                          {item.signature.notes}
                        </Text>
                      </View>
                    )}

                    {/* Due Date */}
                    {item.signature.dueDate && (
                      <View className="mb-4">
                        <Text className="text-[16px] font-semibold text-[#333] mb-2">Due Date</Text>
                        <Text className="text-[14px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                          {new Date(item.signature.dueDate).toLocaleDateString()}
                        </Text>
                      </View>
                    )}

                    {/* Contract Actions */}
                    <View className="mt-4">
                      <TouchableOpacity
                        className="w-full bg-black rounded-lg py-3 items-center"
                        activeOpacity={0.7}
                        onPress={() => {
                          // Handle sign action
                          console.log('Contract signing');
                          Alert.alert('Sign', 'Contract signing functionality will be implemented');
                        }}
                      >
                        <Text className="text-white text-[16px] font-semibold">Sign Contract</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Contract Status */}
                    <View className="mt-4 pt-4 border-t border-[#e5e7eb]">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[12px] text-[#999]">
                          Created: {new Date(item.signature.createdAt).toLocaleDateString()}
                        </Text>
                        <View 
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: item.signature.status === 'pending' ? '#fef3c7' : '#d1fae5' }}
                        >
                          <Text 
                            className="text-[12px] font-semibold"
                            style={{ color: item.signature.status === 'pending' ? '#d97706' : '#059669' }}
                          >
                            {item.signature.status?.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }
            
            // Check file type (MCP Context 7)
            // Business Rule: Display images inline, show document cards for PDFs/docs/archives
            // Support both camelCase and snake_case field names from API
            const fileUrl = item.fileUrl || item.file_url;
            const fileType = item.fileType || item.file_type;
            
            const hasImage = fileUrl && fileType?.startsWith('image/');
            const hasDocument = fileUrl && !hasImage;
            const hasFile = hasImage || hasDocument;
            
            // Format timestamp to 12-hour format with AM/PM (MCP Context 7)
            // Convert UTC time from API to local timezone
            const formatTime = (utcString) => {
              if (!utcString) return '';
              
              const date = new Date(utcString);
              const hours = date.getHours();
              const minutes = date.getMinutes();
              
              // Convert to 12-hour format
              const hour12 = hours % 12 || 12;
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const minutesStr = minutes.toString().padStart(2, '0');
              
              return `${hour12}:${minutesStr} ${ampm}`;
            };

            // --- Get Sender Info for Display (MCP Context 7) ---
            // Business Rule: Show sender's name and avatar ONLY in group chats for messages from other users
            const senderFirstName = item.sender?.first_name || '';
            const senderLastName = item.sender?.last_name || '';
            const senderFullName = `${senderFirstName} ${senderLastName}`.trim() || 'Unknown';
            const showSenderInfo = !isMyMessage && isGroupChat; // Show avatar and name only in group chats
            
            return (
              <View
                className={`mb-3 px-5 ${
                  isMyMessage ? "items-end" : "items-start"
                }`}
              >
                {/* WhatsApp-Style Message Container with Avatar (MCP Context 7) */}
                {/* Business Rule: Messages from others in group chats show avatar on left side */}
                <View className={`flex-row ${isMyMessage ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                  {/* Avatar Circle (Only for group chat messages from others) */}
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
                  {/* Business Rule: Documents get more width (90%), images and text get standard width (75%) */}
                  <View className={`${isMyMessage ? 'mr-2' : ''}`} style={{ 
                    maxWidth: hasDocument ? '90%' : '75%', // Increased from 85% to 90% for documents
                    minWidth: hasDocument ? '70%' : 'auto' // Ensure minimum width for documents
                  }}>
                  {/* Display image if fileUrl exists and it's an image type */}
                  {/* Business Rule: Images are tappable to open in full-screen view */}
                  {/* WhatsApp-style: Download icon overlay on image */}
                  {hasImage && (
                    <View className="mb-1 relative">
                      <TouchableOpacity 
                        onPress={() => handleOpenImage(fileUrl)}
                        activeOpacity={0.9}
                      >
                        <Image
                          source={{ uri: fileUrl }}
                          style={{
                            width: 200,
                            height: 200,
                            borderRadius: 12,
                          }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      
                      {/* Download Icon Overlay (WhatsApp-style) */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDownloadAndShareImage(fileUrl, item.fileName || item.file_name);
                        }}
                        activeOpacity={0.7}
                        className="absolute bottom-2 right-2 bg-black/60 rounded-full p-2"
                        style={{ elevation: 3 }}
                      >
                        <MaterialIcons
                          name="file-download"
                          size={20}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {/* Display document card for PDFs, Word, Excel, etc. */}
                  {/* Business Rule: Tap card to open file, tap download icon to share/download */}
                  {hasDocument && (
                    (() => {
                      // --- Extract File Information (MCP Context 7) ---
                      // Try different possible field names (API might use camelCase or snake_case)
                      const displayFileName = item.fileName || 
                                             item.file_name || 
                                             item.name || 
                                             fileUrl?.split('/').pop()?.split('?')[0] || 
                                             'Document';
                      
                      const displayFileType = item.fileType || item.file_type;
                      const displayFileSize = item.fileSize || item.file_size;
                      
                      return (
                        <TouchableOpacity
                          onPress={() => handleOpenFile(fileUrl, displayFileName)}
                          activeOpacity={0.7}
                          className="flex-row items-center p-3 rounded-lg mb-1 bg-white shadow-sm shadow-gray-300/50"
                          style={{ 
                            minWidth: '100%', // Force full width
                            alignSelf: 'stretch', // Make it stretch to available space
                          }}
                        >
                          {/* File Icon */}
                          <View className="w-12 h-12 bg-gray-100 rounded-lg items-center justify-center mr-3 flex-shrink-0">
                            <MaterialIcons
                              name={getFileIcon(displayFileType)}
                              size={24}
                              color="#000000"
                            />
                          </View>
                          
                          {/* File Info - FIXED: Use proper React Native styles */}
                          <View 
                            className="flex-1 mr-3"
                            style={{ 
                              flex: 1,
                              minWidth: 0, // This is the React Native equivalent of min-w-0
                            }}
                          >
                            <Text 
                              className="text-sm font-semibold text-black"
                              numberOfLines={2}
                              ellipsizeMode="middle"
                            >
                              {displayFileName || "Test File Name - This Should Show"}
                            </Text>
                            <Text className="text-xs mt-1 text-gray-600">
                              {displayFileSize ? `${displayFileSize} MB` : 'File'}
                            </Text>
                          </View>
                          
                          {/* Download/Share Icon */}
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDownloadAndShareFile(fileUrl, displayFileName);
                            }}
                            activeOpacity={0.6}
                            className="p-2 flex-shrink-0"
                          >
                            <MaterialIcons
                              name="file-download"
                              size={20}
                              color="#000000"
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })()
                  )}
                  
                  {/* Display text content in bubble (only if text exists) */}
                  {/* WhatsApp-style bubble with dynamic rounded corners */}
                  {item.content && (
                    <View
                      className={`px-4 py-3 rounded-2xl shadow-sm ${
                        hasFile ? 'mt-1' : ''
                      } ${
                        isMyMessage 
                          ? 'bg-blue-500 rounded-br-sm shadow-blue-500/30' 
                          : 'bg-white rounded-bl-sm shadow-gray-500/20'
                      }`}
                      style={{ alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }}
                    >
                      {/* Show sender name ONLY in group chats for received messages (WhatsApp Style - inside bubble) */}
                      {/* Business Rule: Individual chats don't need sender names */}
                      {showSenderInfo && (
                        <Text className="text-xs font-semibold text-gray-900 mb-1">
                          {senderFullName}
                        </Text>
                      )}
                      
                      <Text
                        className={`text-base leading-6 ${
                          isMyMessage ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {item.content}
                      </Text>
                    </View>
                  )}
                  
                  {/* Message Time - Display below every message */}
                  <Text className={`text-xs text-gray-500 mt-1 ${
                    isMyMessage ? 'text-right mr-2' : 'text-left ml-2'
                  }`}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                </View>
              </View>
            );
          }}
          keyExtractor={(item) =>
            item.id?.toString() || Math.random().toString()
          }
          className="flex-1"
          contentContainerStyle={{
            paddingTop: 90 + (insets.bottom || 0), // For inverted list, paddingTop = visual bottom padding (clears input bar + safe area)
            paddingBottom: 16, // For inverted list, paddingBottom = visual top padding
            paddingHorizontal: 8,
            flexGrow: 1
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Typing Indicator (WhatsApp-style) */}
      {/* Business Rule: Show who is currently typing above the input bar */}
      {typingUsers.length > 0 && (
        <View 
          className="bg-white border-t border-gray-200 px-4 py-2"
          style={{ 
            position: "absolute",
            bottom: 80 + (insets.bottom || 0), // Position above input bar
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          <View className="flex-row items-center">
            <View className="flex-row items-center mr-2">
              {/* Typing Animation Dots */}
              <View className="flex-row items-center">
                <View 
                  className="w-2 h-2 bg-gray-400 rounded-full mr-1"
                  style={{
                    opacity: 0.4,
                    animationDelay: '0ms',
                  }}
                />
                <View 
                  className="w-2 h-2 bg-gray-400 rounded-full mr-1"
                  style={{
                    opacity: 0.7,
                    animationDelay: '150ms',
                  }}
                />
                <View 
                  className="w-2 h-2 bg-gray-400 rounded-full"
                  style={{
                    opacity: 1,
                    animationDelay: '300ms',
                  }}
                />
              </View>
            </View>
            
            {/* Typing Users Text */}
            <Text className="text-sm text-gray-600">
              {typingUsers.length === 1 
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.length} people are typing...`
              }
            </Text>
          </View>
        </View>
      )}

      {/* 🧭 Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <View 
          className="bg-white border-t border-gray-200 px-4 py-3"
          style={{ paddingBottom: insets.bottom || 0 }}
        >
          {/* File Preview (shown when file is selected) */}
          {selectedFile && (
            <View className="mb-2 flex-row items-center bg-gray-100 rounded-lg p-3">
              <MaterialIcons
                name={selectedFile.mimeType?.startsWith('image/') ? 'image' : 'insert-drive-file'}
                size={24}
                color="#000000"
              />
              <Text className="flex-1 ml-3 text-sm font-medium text-gray-900" numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <TouchableOpacity onPress={handleRemoveFile} className="p-1">
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
          
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            {/* Plus Icon Button (WhatsApp-style) */}
            <TouchableOpacity
              onPress={handleShowAttachmentOptions}
              disabled={isSendingMessage}
              className="mr-2"
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={28} color="#000000" />
            </TouchableOpacity>

            {/* Request Signature Button */}
            <TouchableOpacity
              onPress={() => setSignatureModalVisible(true)}
              disabled={isSendingMessage}
              className="mr-2"
              activeOpacity={0.7}
            >
              <Ionicons name="create" size={28} color="#3155A1" />
            </TouchableOpacity>

            <TextInput
              className="flex-1 text-base text-gray-900 max-h-24"
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              blurOnSubmit={false}
              editable={!isSendingMessage}
            />

            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={(!inputText.trim() && !selectedFile) || isSendingMessage}
              className={`ml-3 w-9 h-9 rounded-full items-center justify-center ${
                (inputText.trim() || selectedFile) && !isSendingMessage ? "bg-black" : "bg-gray-300"
              }`}
              activeOpacity={0.7}
            >
              {isSendingMessage ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Options Modal (WhatsApp-style) */}
      <Modal
        visible={attachmentMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAttachmentMenuVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setAttachmentMenuVisible(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">Send Attachment</Text>
            
            {/* Image Option */}
            <TouchableOpacity
              onPress={handlePickImage}
              className="flex-row items-center py-4 border-b border-gray-200"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                <Ionicons name="image" size={24} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-900">Photo & Video</Text>
                <Text className="text-sm text-gray-500">Send images from gallery</Text>
              </View>
            </TouchableOpacity>

            {/* Document Option */}
            <TouchableOpacity
              onPress={handlePickDocument}
              className="flex-row items-center py-4"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center mr-4">
                <MaterialIcons name="insert-drive-file" size={24} color="#8B5CF6" />
              </View>
              <View>
                <Text className="text-base font-semibold text-gray-900">Document</Text>
                <Text className="text-sm text-gray-500">Send PDF, Word, Excel, etc.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full-Screen Image Viewer Modal (MCP Context 7) */}
      {/* Business Rule: Allow users to view images in full screen with zoom capability */}
      {/* WhatsApp-style: Download button in full-screen viewer */}
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

          {/* Download Button (WhatsApp-style) */}
          <TouchableOpacity
            onPress={() => {
              handleDownloadAndShareImage(selectedImageUrl, 'image.jpg');
            }}
            style={styles.downloadButton}
            activeOpacity={0.8}
          >
            <MaterialIcons name="file-download" size={26} color="#FFFFFF" />
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

      {/* Full Page Files Modal (MCP Context 7) */}
      {/* Business Rule: Show full page view when All Files is tapped */}
      <Modal
        visible={filesModalVisible}
        animationType="slide"
        onRequestClose={() => {
          console.log('📁 Files modal closed');
          setFilesModalVisible(false);
        }}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity
              onPress={() => setFilesModalVisible(false)}
              className="p-2"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">All Files</Text>
            <View className="w-8" />
          </View>

          {/* Content */}
          <View className="flex-1">
            {isLoadingFiles ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#000000" />
                <Text className="text-base text-gray-500 mt-4">Loading files...</Text>
              </View>
            ) : conversationFiles.length > 0 ? (
              <FlatList
                data={conversationFiles}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={({ item }) => {
                  const fileUrl = item.fileUrl;
                  const fileName = item.fileName || 'Unknown File';
                  const fileSize = item.fileSize;
                  const uploadedAt = item.uploadedAt;
                  
                  // Determine if it's an image based on file extension
                  const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);

                  return (
                    <TouchableOpacity
                      onPress={() => {
                        if (isImage) {
                          handleOpenImage(fileUrl);
                          setFilesModalVisible(false);
                        } else {
                          handleOpenFile(fileUrl, fileName);
                        }
                      }}
                      className="flex-row items-center p-4 border-b border-gray-100"
                      activeOpacity={0.7}
                    >
                      {/* File Icon or Image Preview */}
                      <View className="w-12 h-12 bg-gray-100 rounded-lg items-center justify-center mr-3 flex-shrink-0">
                        {isImage ? (
                          <Image
                            source={{ uri: fileUrl }}
                            style={{ width: 48, height: 48, borderRadius: 8 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialIcons
                            name={getFileIcon(fileName)}
                            size={24}
                            color="#000000"
                          />
                        )}
                      </View>

                      {/* File Info */}
                      <View className="flex-1 mr-3">
                        <Text 
                          className="text-sm font-semibold text-gray-900"
                          numberOfLines={2}
                          ellipsizeMode="middle"
                        >
                          {fileName}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                          {fileSize ? `${fileSize} MB` : 'File'} • {isImage ? 'Image' : 'Document'}
                        </Text>
                        <Text className="text-xs text-gray-400 mt-1">
                          {new Date(uploadedAt).toLocaleDateString()}
                        </Text>
                      </View>

                      {/* Download Button */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          if (isImage) {
                            handleDownloadAndShareImage(fileUrl, fileName);
                          } else {
                            handleDownloadAndShareFile(fileUrl, fileName);
                          }
                        }}
                        className="p-2"
                        activeOpacity={0.6}
                      >
                        <MaterialIcons
                          name="file-download"
                          size={20}
                          color="#000000"
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
                className="flex-1"
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View className="flex-1 items-center justify-center px-4">
                <MaterialIcons name="folder-open" size={80} color="#9CA3AF" />
                <Text className="text-xl text-gray-500 mt-6 text-center font-medium">
                  No files shared yet
                </Text>
                <Text className="text-base text-gray-400 mt-4 text-center">
                  Files shared in this chat will appear here
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Request Signature Modal (MCP Context 7) */}
      <Modal
        visible={signatureModalVisible}
        animationType="slide"
        onRequestClose={() => setSignatureModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#e1e8ed]">
            <TouchableOpacity
              onPress={() => setSignatureModalVisible(false)}
              className="p-2"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text className="text-[18px] font-bold text-[#333]">Request Signature</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-1 p-5">
              <View className="mb-5">
                {/* Title Field */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="create" size={20} color="black" style={{ marginRight: 8 }} />
                    <Text className="text-[16px] font-semibold text-[#333]">Title *</Text>
                  </View>
                  <TextInput
                    className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                    placeholder="Enter signature request title..."
                    placeholderTextColor="#999"
                    value={signatureTitle}
                    onChangeText={setSignatureTitle}
                    returnKeyType="next"
                  />
                </View>

                {/* Notes Field */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="document-text" size={20} color="black" style={{ marginRight: 8 }} />
                    <Text className="text-[16px] font-semibold text-[#333]">Notes</Text>
                  </View>
                  <TextInput
                    className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                    placeholder="Add notes or instructions..."
                    placeholderTextColor="#999"
                    value={signatureNotes}
                    onChangeText={setSignatureNotes}
                    multiline
                    numberOfLines={4}
                    returnKeyType="next"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>

                {/* Due Date Field */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="calendar" size={20} color="black" style={{ marginRight: 8 }} />
                    <Text className="text-[16px] font-semibold text-[#333]">Due Date</Text>
                  </View>
                  <TouchableOpacity
                    className="flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text className="text-[16px] text-[#333] font-medium">
                      {signatureDueDate ? signatureDueDate.toLocaleDateString() : 'Select date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Action Buttons - Always positioned at bottom */}
          <View className="absolute bottom-0 left-0 right-0 flex-row justify-between gap-4 px-5 pt-5 pb-8 bg-white" style={{ zIndex: 1000 }}>
            <TouchableOpacity
              className="flex-1 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg p-4 items-center"
              onPress={() => setSignatureModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text className="text-[#6c757d] text-[16px] font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-black rounded-lg p-4 items-center justify-center"
              onPress={async () => {
                try {
                  // Validate required fields
                  if (!signatureTitle.trim()) {
                    Alert.alert('Error', 'Please enter a title for the signature request');
                    return;
                  }

                  // Prepare signature data
                  const signatureData = {
                    title: signatureTitle.trim(),
                    notes: signatureNotes.trim(),
                    dueDate: signatureDueDate ? signatureDueDate.toISOString().split('T')[0] : null
                  };

                  console.log('Creating signature request:', signatureData);
                  
                  // Call the API service
                  const result = await createSignature(conversationId, signatureData);
                  
                  console.log('Signature request created successfully:', result);
                  
                  Alert.alert('Success', 'Signature request sent successfully!');
                  setSignatureModalVisible(false);
                  
                  // Reset form
                  setSignatureTitle('');
                  setSignatureNotes('');
                  setSignatureDueDate('');
                  
                  // Refresh messages to show the new signature request
                  if (conversationId) {
                    fetchMessages();
                  }
                  
                } catch (error) {
                  console.error('Error creating signature request:', error);
                  Alert.alert('Error', error.message || 'Failed to create signature request');
                }
              }}
              activeOpacity={0.7}
            >
              <Text className="text-white text-[16px] font-semibold">Send Request</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={signatureDueDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </Modal>

    </SafeAreaView>
  );
};

// --- StyleSheet for Image Viewer (MCP Context 7) ---
// Used for full-screen image modal styling (WhatsApp-style with download button)
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
  downloadButton: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
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
