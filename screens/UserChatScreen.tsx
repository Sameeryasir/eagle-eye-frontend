// @ts-nocheck
// What changed: Composer lifts with the keyboard via Keyboard height listeners (WhatsApp-style) while AppHeader stays fixed.
// Why: KeyboardAvoidingView alone was not reliably lifting the send bar above the keyboard on device.
// Dependencies: Brand colors, AppHeader in App.tsx (outside this screen), messages_<conversationId> SQLite helpers.
// MCP context 7: Use Keyboard show/hide events to pad only the chat screen bottom — do not pan the whole app.
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
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
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from "../context/AuthContext";
import { useSQLiteContext } from 'expo-sqlite';
import { 
  CHAT_MESSAGES_TABLE,
} from "../database/schema/messages.schema";
import {
  messageExistsInSQLite,
  saveMessageToSQLite,
  saveMessagesBatchToSQLite,
  getAllMessagesFromSQLite,
  getMessageCountFromSQLite,
  clearAllMessagesFromSQLite,
  initializeMessagesTable,
  messagesTableExists,
  updateMessageStatus,
  updateSignatureFields,
  updateSignatureFieldsBySignatureId,
  updateSignatureId,
  getLastInsertRowId,
  deletePendingMessage,
  insertOfflineMessage,
  getPendingSignatureIds,
  getPendingMessages,
  getAllMessagesAscending,
  getMessageFromSQLite,
  loadCachedMessagesPage,
} from "../database/messages";
import { getMessagesByConversationId } from "../services/chats/getMessagesByConversationId";
import { sendMessage } from "../services/chats/sendMessage";
import { getFilesForConversation } from "../services/chats/getFilesForConversation";
import { getSignaturesOfConversation } from "../services/chats/getSignaturesOfConversation";
import { createSignature } from "../services/chats/createSignature";
import submitSignature from "../services/chats/submitSignature";
import { getMessageAfterLastMessage } from "../services/chats/getMessageAfterLastMessage";
import { getSignedSignatures } from "../services/chats/getSignedSignatures";
import DateTimePicker from '@react-native-community/datetimepicker';
import appEmitter from "../utils/appEmitter";
import pusher from "../pusherClient";
import { createMessageNotification } from "../services/inAppNotification/createMessageNotification";
import SignatureRequestModal from "../components/SignatureRequestModal";
import AllFilesModal from "../components/AllFilesModal";
import AllSignaturesModal from "../components/AllSignaturesModal";
import SignatureDetailModal from "../components/SignatureDetailModal";
import { useChatKeyboard } from "../hooks/useChatKeyboard";
import { Brand } from "../constants/brandColors";

const emitVerticalLog = (heading, rows) => {
  Object.entries(rows || {}).forEach(([key, value]) => {
  });
};

// Extract first letter of first name and first letter of last name
const getInitials = (firstName, lastName) => {
  if (!firstName && !lastName) return '?';
  if (!lastName) return firstName?.charAt(0).toUpperCase() || '?';
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
};

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
    type,
  } = route.params || {};

  // Log conversation type

  const isGroupChat = isGroupChatParam || conversation?.type === 'group' || type === 'group';

  const { user, userInfo } = useAuth();
  const insets = useSafeAreaInsets(); // Get safe area insets for notch/navigation bar handling
  
  const resolvedUserIdFromAuth = useMemo(() => {
    try {
      const candidates = [user?.id, userInfo?.id, userId];
      for (const candidate of candidates) {
        if (candidate === undefined || candidate === null) {
          continue;
        }
        const numericId = Number(candidate);
        if (!Number.isNaN(numericId) && numericId > 0) {
          return numericId;
        }
      }
    } catch (resolveError) {
      console.error('❌ [USER ID] Failed to resolve initial user id from auth context:', resolveError);
    }
    return null;
  }, [user?.id, userInfo?.id, userId]);

  const netInfo = NetInfo.useNetInfo();
  
  const db = useSQLiteContext();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(1); // Track current API page
  const [isUsingAPI, setIsUsingAPI] = useState(false); // Track if we're using API or SQLite
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // For file uploads
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false); // For attachment options
  const [filesModalVisible, setFilesModalVisible] = useState(false); // For viewing all files
  const [conversationFiles, setConversationFiles] = useState([]); // Store files from conversation
  const [isLoadingFiles, setIsLoadingFiles] = useState(false); // Loading state for files
  const [signaturesModalVisible, setSignaturesModalVisible] = useState(false); // For viewing all signatures
  const [conversationSignatures, setConversationSignatures] = useState([]); // Store signatures from conversation
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false); // Loading state for signatures
  const [signatureDetailModalVisible, setSignatureDetailModalVisible] = useState(false); // For signature detail view
  const [selectedSignature, setSelectedSignature] = useState(null); // Selected signature for detail view
  const flatListRef = useRef(null);
  const messageInputRef = useRef(null);
  
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [activeSignatureId, setActiveSignatureId] = useState(null); // Track which signature is being signed

  const SQLITE_MESSAGES_PAGE_SIZE = 20;

  // Used to show typing indicators below the input bar (WhatsApp-style)
  const [typingUsers, setTypingUsers] = useState([]); // Array of user objects who are typing

  // WhatsApp-style composer lift — header stays fixed in App.tsx
  const keyboardHeight = useChatKeyboard();

  const apiAbortControllersRef = useRef(new Set());
  const isScreenActiveRef = useRef(true);

  // This ensures we're using the exact same ID that was stored during login
  // CRITICAL FIX: Initialize with loading state to prevent UI flicker
  const [currentUserId, setCurrentUserId] = useState(resolvedUserIdFromAuth);
  const [isLoadingUserId, setIsLoadingUserId] = useState(!resolvedUserIdFromAuth);
  const currentUserIdRef = useRef(currentUserId);

  // Update ref when currentUserId changes
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (resolvedUserIdFromAuth) {
      setCurrentUserId(resolvedUserIdFromAuth);
      setIsLoadingUserId(false);
      return;
    }

    let isCancelled = false;

    const getUserIdFromStorage = async () => {
      try {
        setIsLoadingUserId(true);
        const storedUserId = await AsyncStorage.getItem('userId');
        
        if (storedUserId) {
          // Convert to number since sender.id comes as number from API
          const userIdNumber = parseInt(storedUserId, 10);
          if (!isCancelled) {
            setCurrentUserId(userIdNumber);
          }
        } else {
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('❌ Error reading userId from AsyncStorage:', error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingUserId(false);
        }
      }
    };

    getUserIdFromStorage();

    return () => {
      isCancelled = true;
    };
  }, [resolvedUserIdFromAuth]);

  const registerAbortController = (contextLabel) => {
    const entry = { controller: new AbortController(), contextLabel };
    apiAbortControllersRef.current.add(entry);
    return entry;
  };

  const releaseAbortController = (entry) => {
    if (!entry) {
      return;
    }
    apiAbortControllersRef.current.delete(entry);
  };

  const wasRequestCancelled = (error) => {
    if (!error) {
      return false;
    }
    const message = error.message?.toLowerCase?.() || '';
    return (
      error.name === 'AbortError' ||
      error.code === 'ERR_CANCELED' ||
      message.includes('aborted') ||
      message.includes('canceled')
    );
  };

  const fetchMessagesPageSafely = async (pageNumber, contextLabel) => {
    const controllerEntry = registerAbortController(contextLabel);
    try {
      if (!conversationId) {
        return null;
      }
      const response = await getMessagesByConversationId(
        conversationId,
        pageNumber,
        20,
        { signal: controllerEntry.controller.signal }
      );
      return response;
    } catch (error) {
      if (wasRequestCancelled(error)) {
        return null;
      }
      throw error;
    } finally {
      releaseAbortController(controllerEntry);
    }
  };

  // This ensures all messages have the same structure regardless of source (API or SQLite)
  const convertMessageToUI = (msg) => ({
    id: msg.id?.toString(),
    content: msg.content,
    fileUrl: msg.fileUrl,
    fileName: msg.fileName,
    fileType: msg.fileType,
    fileSize: msg.fileSize,
    sender: {
      id: msg.sender?.id,
      first_name: msg.sender?.first_name,
      last_name: msg.sender?.last_name
    },
    createdAt: msg.createdAt,
    status: msg.status || 'sent',
    signature: msg.signature ? {
      id: msg.signature.id,
      title: msg.signature.title,
      notes: msg.signature.notes,
      dueDate: msg.signature.dueDate,
      status: msg.signature.status,
      fileUrl: msg.signature.fileUrl,
      fileName: msg.signature.fileName,
      fileSize: msg.signature.fileSize,
      signedBy: msg.signature.signedBy
    } : null
  });

  useEffect(() => {
    isScreenActiveRef.current = true;
    return () => {
      isScreenActiveRef.current = false;
      const activeControllers = Array.from(apiAbortControllersRef.current);
      activeControllers.forEach(({ controller, contextLabel }) => {
        controller.abort();
      });
      apiAbortControllersRef.current.clear();
    };
  }, []);

  // This ensures fast subsequent loads and offline access
  const fetchAllMessagesFromAPI = async (conversationId) => {
    setIsUsingAPI(true);
    setCurrentPage(1);
    
    let allMessages = [];
    let currentPageNum = 1;
    let hasMorePages = true;
    let wasCancelled = false;
    
    // Load all pages from API
    while (hasMorePages) {
      
      const apiResponse = await fetchMessagesPageSafely(currentPageNum, `initial-sync-page-${currentPageNum}`);
      if (!apiResponse) {
        wasCancelled = true;
        break;
      }
      const apiMessages = normalizeMessagesResponse(apiResponse);
      
      if (apiMessages && apiMessages.length > 0) {
        allMessages = [...allMessages, ...apiMessages];
        currentPageNum++;
        hasMorePages = apiMessages.length >= 20;
      } else {
        hasMorePages = false;
      }
    }
    
    if (wasCancelled) {
      return [];
    }

    
    // Convert all messages to UI format
    const uiMessages = allMessages.map(msg => convertMessageToUI(msg));
    
    // Display all messages at once
    setMessages(prevMessages => {
      const combinedMessages = [...prevMessages, ...uiMessages];
      return sortMessagesByTime(combinedMessages);
    });
    
    // Save all messages to SQLite
    saveMessagesBatchToSQLite(db, allMessages, conversationId, 'INITIAL-API-BATCH');
    
    // Update pagination state
    setCurrentOffset(0);
    setHasMoreMessages(false);
    setCurrentPage(currentPageNum - 1);
    
    // Store last message ID
    const sortedMessages = sortMessagesByTime([...uiMessages]);
    storeLastMessageId(sortedMessages);
    
    return uiMessages;
  };

  // When FlatList is inverted, newest-first data displays as oldest-first visually (like WhatsApp)
  // Uses local timestamp (created_at from database) and ID as tiebreaker for messages with same timestamp
  const sortMessagesByTime = (messages) => {
    return messages.sort((a, b) => {
      // Use local timestamp (created_at from database), not server timestamp
      const timeA = new Date(a.createdAt || a.created_at).getTime();
      const timeB = new Date(b.createdAt || b.created_at).getTime();
      
      // If timestamps are the same, differentiate by ID (higher ID = newer message)
      if (timeA === timeB) {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idB - idA; // Higher ID first (newer message)
      }
      
      return timeB - timeA; // Newest first (descending order) - will be inverted visually
    });
  };

  const dedupeMessagesById = (items) => {
    try {
      if (!Array.isArray(items) || items.length === 0) return items || [];
      const seen = new Set();
      const unique = [];
      for (const item of items) {
        const key = String(item?.id ?? '');
        if (key && !seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }
      return unique;
    } catch {
      return items || [];
    }
  };

  const normalizeMessagesResponse = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.messages)) return response.messages;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  const listMessages = useMemo(
    () => dedupeMessagesById(messages),
    [messages]
  );

  // Loader only shown for API calls (SQLite is fast)
  const fetchMessages = async () => {
    
    if (!conversationId) {
      return;
    }

    
    try {
      // Check if messages table exists before querying
      
      try {
        const tableExists = messagesTableExists(db, conversationId);
        if (!tableExists) {
          
          Keyboard.dismiss(); // Dismiss keyboard during API call
          setIsLoadingMessages(true); // Disable input during API call - SET BEFORE API CALL
          
          // No table exists - fetch from API with pagination
          try {
            setIsUsingAPI(true); // We're using API for this conversation
            setCurrentPage(1); // Start from page 1
            
            // Load pages progressively - show each page as it loads
            let allMessages = [];
            let currentPageNum = 1;
            let hasMorePages = true;
            
            while (hasMorePages) {
              const apiResponse = await getMessagesByConversationId(
                conversationId,
                currentPageNum,
                20
              );
              const apiMessages = normalizeMessagesResponse(apiResponse);

              if (apiMessages && apiMessages.length > 0) {
                allMessages = [...allMessages, ...apiMessages];
                const currentPageMessages = apiMessages.map((msg) =>
                  convertMessageToUI(msg)
                );

                setMessages((prevMessages) => {
                  const combinedMessages = [
                    ...prevMessages,
                    ...currentPageMessages,
                  ];
                  return sortMessagesByTime(combinedMessages);
                });

                if (currentPageNum === 1) {
                  setIsLoadingMessages(false);
                }

                currentPageNum++;
                hasMorePages = apiMessages.length >= 20;
              } else {
                hasMorePages = false;
              }
            }
            
            
            // Store all messages in SQLite database
            saveMessagesBatchToSQLite(db, allMessages, conversationId, 'API-PROGRESSIVE-BATCH');

            // Reset pagination state - no more pages to load
            setCurrentOffset(0);
            setHasMoreMessages(false); // All messages loaded
            setCurrentPage(currentPageNum - 1); // Set to last loaded page
            
            // Store the last message ID in AsyncStorage
            const finalMessages = sortMessagesByTime(allMessages.map(msg => ({
              id: msg.id?.toString(),
              content: msg.content,
              fileUrl: msg.fileUrl,
              fileName: msg.fileName,
              fileType: msg.fileType,
              fileSize: msg.fileSize,
              sender: {
                id: msg.sender?.id,
                first_name: msg.sender?.first_name,
                last_name: msg.sender?.last_name
              },
              createdAt: msg.createdAt,
              status: msg.status || 'sent',
              signature: msg.signature ? {
                id: msg.signature.id,
                title: msg.signature.title,
                notes: msg.signature.notes,
                dueDate: msg.signature.dueDate,
                status: msg.signature.status,
                fileUrl: msg.signature.fileUrl,
                fileName: msg.signature.fileName,
                fileSize: msg.signature.fileSize,
                signedBy: msg.signature.signedBy
              } : null
            })));
            storeLastMessageId(finalMessages);
            
            return;
          } catch (error) {
            console.error('❌ Error fetching messages from API:', error);
            setMessages([]);
            setHasMoreMessages(false);
            // Reset loading state on error
            setIsLoadingMessages(false);
          }
        }
      } catch (tableError) {
        console.error('❌ Error checking table existence:', tableError);
        // Continue with API fallback
      }

      
      // Shared chat_messages table — load newest page via cache service
      const totalMessageCount = getMessageCountFromSQLite(db, conversationId);
      const uiMessages = loadCachedMessagesPage(
        db,
        conversationId,
        SQLITE_MESSAGES_PAGE_SIZE,
        0
      ).map((msg) => ({
        ...msg,
        id: msg.id?.toString() || `db_${msg.createdAt}`,
      }));
      
      if (uiMessages && uiMessages.length > 0) {
        setMessages(uiMessages);
        
        // Set pagination state - enable pagination if more messages exist
        setCurrentOffset(SQLITE_MESSAGES_PAGE_SIZE);
        setHasMoreMessages(totalMessageCount > SQLITE_MESSAGES_PAGE_SIZE);
        
        storeLastMessageId(uiMessages);
        
        syncSignedSignaturesFromAPI().catch((error) => {
          console.error('❌ [SIGNED SYNC] Background sync failed:', error);
        });
        
      } else {
        
        Keyboard.dismiss(); // Dismiss keyboard during API call
        setIsLoadingMessages(true); // Disable input during API call - SET BEFORE API CALL
        
        // No messages in SQLite - fetch from API with pagination
        try {
          setIsUsingAPI(true); // We're using API for this conversation
          setCurrentPage(1); // Start from page 1
          
          // Load pages progressively like WhatsApp - show each page as it loads
          let allMessages = [];
          let currentPageNum = 1;
          let hasMorePages = true;
          
          while (hasMorePages) {
            const apiResponse = await getMessagesByConversationId(conversationId, currentPageNum, 20);
            
            const apiMessages = normalizeMessagesResponse(apiResponse);
            
            if (apiMessages && apiMessages.length > 0) {
              allMessages = [...allMessages, ...apiMessages];
              
              const currentPageMessages = apiMessages.map((msg) =>
                convertMessageToUI(msg)
              );

              setMessages((prevMessages) => {
                if (!isScreenActiveRef.current) {
                  return prevMessages;
                }
                const combinedMessages = [
                  ...prevMessages,
                  ...currentPageMessages,
                ];
                return sortMessagesByTime(combinedMessages);
              });

              currentPageNum++;
              hasMorePages = apiMessages.length >= 20;
              
              // Small delay between pages
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              hasMorePages = false;
            }
          }
          
          
          // Store all messages in SQLite database
          saveMessagesBatchToSQLite(allMessages, conversationId, 'API-PROGRESSIVE-BATCH');

          // Reset pagination state - no more pages to load
          setCurrentOffset(0);
          setHasMoreMessages(false); // All messages loaded
          setCurrentPage(currentPageNum - 1); // Set to last loaded page
          
          // Store the last message ID in AsyncStorage
          const finalMessages = sortMessagesByTime(allMessages.map(msg => ({
            id: msg.id?.toString(),
            content: msg.content,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileType: msg.fileType,
            fileSize: msg.fileSize,
            sender: {
              id: msg.sender?.id,
              first_name: msg.sender?.first_name,
              last_name: msg.sender?.last_name
            },
            createdAt: msg.createdAt,
            status: msg.status || 'sent',
            signature: msg.signature ? {
              id: msg.signature.id,
              title: msg.signature.title,
              notes: msg.signature.notes,
              dueDate: msg.signature.dueDate,
              status: msg.signature.status,
              fileUrl: msg.signature.fileUrl,
              fileName: msg.signature.fileName,
              fileSize: msg.signature.fileSize,
              signedBy: msg.signature.signedBy
            } : null
          })));
          storeLastMessageId(finalMessages);
          
          return;
        } catch (apiError) {
          console.error('❌ Error fetching messages from API:', apiError);
          setMessages([]);
          setHasMoreMessages(false);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching messages from SQLite:', err);
      console.error('❌ Error details:', err.message);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Handles both SQLite pagination (offset) and API pagination (page)
  const loadMoreMessages = async () => {
    if (
      !hasMoreMessages ||
      !isInitialLoadComplete ||
      isLoadingMoreMessages ||
      isLoadingMoreRef.current ||
      !conversationId
    ) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMoreMessages(true);

    try {
      if (isUsingAPI) {
        const nextPage = currentPage + 1;
        const apiResponse = await getMessagesByConversationId(
          conversationId,
          nextPage,
          20
        );
        const apiMessages = Array.isArray(apiResponse)
          ? apiResponse
          : apiResponse?.messages || [];

        if (apiMessages && apiMessages.length > 0) {
          const uiMessages = apiMessages.map((msg) => convertMessageToUI(msg));
          setMessages((prevMessages) => {
            const combinedMessages = [...prevMessages, ...uiMessages];
            return sortMessagesByTime(combinedMessages);
          });
          setCurrentPage(nextPage);
          setHasMoreMessages(apiMessages.length >= 20);
        } else {
          setHasMoreMessages(false);
        }
      } else {
        const totalMessageCount = getMessageCountFromSQLite(db, conversationId);
        const uiMessages = loadCachedMessagesPage(
          db,
          conversationId,
          SQLITE_MESSAGES_PAGE_SIZE,
          currentOffset
        ).map((msg) => ({
          ...msg,
          id: msg.id?.toString() || `db_${msg.createdAt}`,
        }));

        if (uiMessages && uiMessages.length > 0) {
          setMessages((prevMessages) => {
            const combinedMessages = [...prevMessages, ...uiMessages];
            return sortMessagesByTime(combinedMessages);
          });

          const newOffset = currentOffset + uiMessages.length;
          setCurrentOffset(newOffset);
          setHasMoreMessages(newOffset < totalMessageCount);
        } else {
          setHasMoreMessages(false);
        }
      }
    } catch (error) {
      console.error('❌ Error loading more messages:', error);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMoreMessages(false);
    }
  };

  const fetchMessagesFromSQLite = () => {
    try {
      const totalMessageCount = getMessageCountFromSQLite(db, conversationId);
      const uiMessages = loadCachedMessagesPage(
        db,
        conversationId,
        SQLITE_MESSAGES_PAGE_SIZE,
        0
      ).map((msg) => ({
        ...msg,
        id: msg.id?.toString() || `db_${msg.createdAt}`,
      }));

      if (uiMessages.length > 0) {
        setMessages(uiMessages);
        setCurrentOffset(uiMessages.length);
        setHasMoreMessages(uiMessages.length < totalMessageCount);
        storeLastMessageId(uiMessages);
      } else {
        setMessages([]);
        setCurrentOffset(0);
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('❌ Error fetching messages from SQLite:', error);
      setMessages([]);
      setCurrentOffset(0);
      setHasMoreMessages(false);
    }
  };

  const storeLastMessageId = async (messages) => {
    if (messages && messages.length > 0) {
      try {
        // Find the latest message that has been confirmed as sent (not pending/offline)
        const confirmedMessages = messages.filter(msg => 
          msg.status === 'sent' && 
          !msg.id.toString().startsWith('offline_') &&
          !msg.id.toString().startsWith('db_') &&
          !isNaN(parseInt(msg.id)) && parseInt(msg.id) < 1000000 // Server IDs are usually small integers
        );
        
        if (confirmedMessages.length === 0) {
          return;
        }
        
        // Get the first confirmed message (which is the latest due to inverted FlatList)
        const lastConfirmedMessage = confirmedMessages[0];
        const messageId = lastConfirmedMessage.id;
        
        
        if (messageId && !isNaN(parseInt(messageId)) && parseInt(messageId) < 1000000) {
          await AsyncStorage.setItem('latestMessageId', messageId.toString());
        } else {
        }
      } catch (error) {
        console.error('❌ [ASYNCSTORAGE] Failed to store message ID:', error);
        console.error('❌ [ASYNCSTORAGE] Error details:', error.message);
      }
    } else {
    }
  };

  const syncSignedSignaturesFromAPI = async () => {
    if (!conversationId) {
      return;
    }

    let pendingSignatureIds = new Set();

    try {
      const pendingIds = getPendingSignatureIds(db, conversationId);
      pendingSignatureIds = new Set(pendingIds);
    } catch (pendingLookupError) {
      console.error('❌ [SIGNED SYNC] Unable to inspect pending signatures:', pendingLookupError);
      pendingSignatureIds = new Set();
    }

    if (pendingSignatureIds.size === 0) {
      return;
    }

    try {
      
      const signedSignatures = await getSignedSignatures();

      if (!Array.isArray(signedSignatures) || signedSignatures.length === 0) {
        return;
      }

      const signatureUpdatesMap = new Map();

      signedSignatures.forEach((signature) => {
        const signatureId = signature.id ?? signature.signatureId ?? null;

        if (!signatureId) {
          return;
        }

        const signatureIdAsString = String(signatureId);

        if (!pendingSignatureIds.has(signatureIdAsString)) {
          return;
        }

        const signatureConversationId =
          signature.conversationId ??
          signature.conversation_id ??
          signature.conversation?.id ??
          signature.conversation?.conversationId ??
          null;

        if (
          signatureConversationId &&
          String(signatureConversationId) !== String(conversationId)
        ) {
          return;
        }

        const status = (signature.status ?? signature.signatureStatus ?? 'pending').toLowerCase();

        if (status !== 'signed') {
          return;
        }

        const fileUrl = signature.fileUrl ?? signature.file_url ?? null;
        const fileName = signature.fileName ?? signature.file_name ?? null;
        const fileSize = signature.fileSize ?? signature.file_size ?? null;

        const signedByFromApi =
          signature.signedBy ??
          signature.signatureFrom ??
          signature.signature_from ??
          null;

        const signedBy = signedByFromApi
          ? {
              id: signedByFromApi.id ?? signedByFromApi.userId ?? null,
              name: signedByFromApi.name ?? signedByFromApi.fullName ?? null,
              email: signedByFromApi.email ?? null,
            }
          : {
              id: signature.signedById ?? null,
              name: signature.signedByName ?? null,
              email: signature.signedByEmail ?? null,
            };

        signatureUpdatesMap.set(String(signatureId), {
          status,
          fileUrl,
          fileName,
          fileSize,
          signedBy,
        });

        try {
          updateSignatureFieldsBySignatureId(db, signatureId, conversationId, {
            status: status || undefined,
            fileUrl: fileUrl || null,
            fileName: fileName || null,
            fileSize: fileSize || null,
            signedById: signedBy?.id ?? null,
            signedByName: signedBy?.name ?? null,
            signedByEmail: signedBy?.email ?? null,
          });
        } catch (dbError) {
          console.error('❌ [SIGNED SYNC] Failed to update SQLite for signature:', signatureId, dbError);
        }
      });

      if (signatureUpdatesMap.size === 0) {
        return;
      }

      setMessages((prevMessages) => {
        if (!prevMessages || prevMessages.length === 0) {
          return prevMessages;
        }

        const updatedMessages = prevMessages.map((message) => {
          const signatureId = message.signature?.id ?? message.signatureId ?? null;

          if (!signatureId) {
            return message;
          }

          const updates = signatureUpdatesMap.get(String(signatureId));

          if (!updates) {
            return message;
          }

          return {
            ...message,
            signature: {
              ...(message.signature || {}),
              status: updates.status,
              fileUrl: updates.fileUrl,
              fileName: updates.fileName,
              fileSize: updates.fileSize,
              signedBy: updates.signedBy,
            },
          };
        });

        return sortMessagesByTime(updatedMessages);
      });

    } catch (error) {
      console.error('❌ [SIGNED SYNC] Unable to fetch signed signatures:', error);
    }
  };

  const fetchNewMessagesAfterLast = async () => {
    try {

      Keyboard.dismiss();
      
      // Get the last message ID from AsyncStorage
      const lastMessageId = await AsyncStorage.getItem('latestMessageId');
      
      if (!lastMessageId) {
        return;
      }
      
      
      // Fetch all pages automatically and add to chat list one by one
      let currentPage = 1;
      let totalPages = 1;
      let totalMessages = 0;
      
      
      // Keep fetching until all pages are loaded
      while (currentPage <= totalPages) {
        
        // Call the API to get new messages for current page
        const response = await getMessageAfterLastMessage(conversationId, lastMessageId, currentPage, 20);
        
        
        // Extract messages from response object
        const pageMessages = response?.messages || [];
        totalPages = response?.totalPages || 1;
        totalMessages = response?.total || 0;
        
        
        // Add messages from this page to the chat list immediately (WhatsApp-style)
        if (pageMessages.length > 0) {
          
          // Store new messages in SQLite database first
          try {
            
            pageMessages.forEach(msg => {
              try {
                // Check if message already exists in database
                const existingMessage = messageExistsInSQLite(db, msg.id, conversationId);
                
                if (!existingMessage) {
                  // Store message in SQLite database
                  saveMessageToSQLite(db, msg, conversationId, 'NEW-MESSAGES', false);
                  
                } else {
                }
              } catch (error) {
                console.error(`❌ [NEW MESSAGES] Error storing message ${msg.id} in database:`, error);
              }
            });
            
          } catch (error) {
            console.error(`❌ [NEW MESSAGES] Error storing messages from page ${currentPage} in database:`, error);
          }
          
          // Add new messages to the existing messages list (with duplicate checking)
          setMessages(prevMessages => {
            // Filter out messages that already exist (by ID)
            const existingMessageIds = new Set(prevMessages.map(msg => msg.id));
            const newUniqueMessages = pageMessages.filter(msg => !existingMessageIds.has(msg.id));
            
            
            if (newUniqueMessages.length > 0) {
              // Combine only new unique messages with existing messages and sort by time
              const combinedMessages = [...newUniqueMessages, ...prevMessages];
              const sortedMessages = sortMessagesByTime(combinedMessages);
              
              
              // Store the latest message ID from this page
              const latestMessageFromPage = newUniqueMessages[0]; // First message is latest due to sorting
              storeLastMessageId([latestMessageFromPage]);
              
              return sortedMessages;
            } else {
              return prevMessages; // No changes needed
            }
          });
          
        }
        
        
        // Move to next page
        currentPage++;
        
        // Add a small delay between requests to avoid overwhelming the server
        if (currentPage <= totalPages) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      
    } catch (error) {
      console.error('❌ [NEW MESSAGES] Error fetching new messages:', error);
      console.error('❌ [NEW MESSAGES] Error details:', error.message);
      
      // Handle specific error types
      if (error.response?.status === 500) {
        console.error('🚨 [NEW MESSAGES] 500 Internal Server Error');
        console.error('🚨 [NEW MESSAGES] Server is having issues. Skipping new message fetch.');
        
        // Show user-friendly message
        Toast.show({
          type: 'error',
          text1: 'Server Error',
          text2: 'Unable to fetch new messages. Please try again later.',
          position: 'top',
          visibilityTime: 3000,
        });
      } else if (error.response?.status === 404) {
        console.error('🚨 [NEW MESSAGES] 404 Not Found - API endpoint not found');
      } else if (error.response?.status === 401) {
        console.error('🚨 [NEW MESSAGES] 401 Unauthorized - Token issue');
      } else {
        console.error('🚨 [NEW MESSAGES] Unknown error:', error.response?.status);
      }
    }
  };

  // Fetch messages when component mounts and when conversationId changes
  useEffect(() => {
    
    // Reset initial load flag when conversationId changes
    setIsInitialLoadComplete(false);
    
    // First, try to load messages from SQLite database
    // Only fetch new messages if we already have messages in the database
    const loadMessagesAndCheckForNew = async () => {
      try {
        // Check if messages table exists and has data
        const tableExists = messagesTableExists(db, conversationId);
        
        if (tableExists) {
          // Table exists - check if it has messages
          const messageCount = getMessageCountFromSQLite(db, conversationId);
          
          if (messageCount > 0) {
            // Load existing messages from SQLite
            await fetchMessages();
            // Then check for new messages after the last one
            await fetchNewMessagesAfterLast();
          } else {
            // Database exists but is empty - fetch all messages from API
            await fetchMessages();
          }
        } else {
          // No table exists - fetch all messages from API
          await fetchMessages();
        }
        
        // Mark initial load as complete
        setIsInitialLoadComplete(true);
      } catch (error) {
        console.error('❌ Error in loadMessagesAndCheckForNew:', error);
        // Fallback to just fetching messages
        await fetchMessages();
        setIsInitialLoadComplete(true);
      }
    };
    
    loadMessagesAndCheckForNew();
  }, [conversationId]);

  // REMOVED: Navigation focus listener to prevent automatic refresh when signature modal closes
  // The app already handles message updates via:
  // 1. Pusher real-time updates
  // 2. Manual message sending
  // This prevents unnecessary API calls and app refresh
  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('focus', () => {
  //       //       //     if (conversationId) {
  //       fetchMessages();
  //       
  //       // Also check for new messages after the last stored message ID
  //       fetchNewMessagesAfterLast();
  //     } else {
  //         //     }
  //   });

  //   return unsubscribe;
  // }, [navigation, conversationId]);

  const signatureRecipientUserId = useMemo(() => {
    try {
      if (conversation?.participants && conversation.participants.length > 0) {
        const otherParticipant = conversation.participants.find(
          (participant) => participant.user?.id?.toString() !== currentUserId?.toString()
        );
        if (otherParticipant?.user?.id) {
          return Number(otherParticipant.user.id);
        }
      }

      if (userId) {
        return Number(userId);
      }
    } catch (notificationError) {
      console.error('❌ [SIGNATURE NOTIFICATION] Failed to resolve recipient user ID:', notificationError);
    }

    return null;
  }, [conversation, currentUserId, userId]);

  const signatureConversationType = useMemo(() => {
    if (type) return type;
    if (conversation?.type) return conversation.type;
    return isGroupChat ? 'group' : 'private';
  }, [type, conversation, isGroupChat]);
  

  // Removed fetchMessages() call to prevent unnecessary API calls when navigating between screens

  const fetchConversationFiles = async () => {
    const currentConversationId = route.params?.conversationId;
    
    if (!currentConversationId) {
      Alert.alert('Error', 'No conversation ID found');
      return;
    }

    setIsLoadingFiles(true);
    
    try {
      const response = await getFilesForConversation(currentConversationId);
      
      if (response && Array.isArray(response)) {
        setConversationFiles(response);
      } else {
        setConversationFiles([]);
      }
    } catch (err) {
      console.error('❌ Error fetching conversation files:', err);
      setConversationFiles([]);
      Alert.alert('Error', 'Failed to load files. Please try again.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const fetchConversationSignatures = async () => {
    const currentConversationId = route.params?.conversationId;
    
    if (!currentConversationId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No conversation ID found',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    setIsLoadingSignatures(true);
    
    try {
      const response = await getSignaturesOfConversation(currentConversationId);
      
      if (response && Array.isArray(response)) {
        setConversationSignatures(response);
      } else {
        setConversationSignatures([]);
      }
    } catch (err) {
      console.error('❌ Error fetching conversation signatures:', err);
      setConversationSignatures([]);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load signatures. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsLoadingSignatures(false);
    }
  };

  const handleSignatureCardTap = (signature) => {
    setSelectedSignature(signature);
    setSignatureDetailModalVisible(true);
  };

  const handleFetchAllFiles = () => {
    setFilesModalVisible(true);
    fetchConversationFiles();
  };

  const handleReloadFromSQLite = () => {
    try {
      const cachedMessages = getAllMessagesAscending(db, conversationId);
      cachedMessages.forEach((msg, index) => {
      });

      fetchMessagesFromSQLite();
      Toast.show({
        type: 'info',
        text1: 'Local Messages Loaded',
        text2: 'Showing cached messages from this device.',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (reloadError) {
      console.error('❌ Error loading messages from SQLite:', reloadError);
      Toast.show({
        type: 'error',
        text1: 'Unable to load local messages',
        text2: 'Please try again later.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  // Added guard to prevent automatic fetching during offline-to-online transition
  const handleFetchAllSignatures = () => {
    setSignaturesModalVisible(true);
    fetchConversationSignatures();
  };

  useEffect(() => {
    // Listen for fetchAllFiles event
    appEmitter.on('fetchAllFiles', handleFetchAllFiles);
    
    // Cleanup listener on unmount
    return () => {
      appEmitter.off('fetchAllFiles', handleFetchAllFiles);
    };
  }, []);

  useEffect(() => {
    // Listen for fetchSignatures event
    appEmitter.on('fetchSignatures', handleFetchAllSignatures);
    
    // Cleanup listener on unmount
    return () => {
      appEmitter.off('fetchSignatures', handleFetchAllSignatures);
    };
  }, []);

  // For new conversations: subscribe and listen
  // For existing conversations: use existing subscription or create new one
  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channelName = `conversation-${conversationId}`;
    const signatureChannelName = `conversation-signature-${conversationId}`;
    
    // Always try to get or create the channel
    let channel = pusher.channel(channelName);
    let signatureChannel = pusher.channel(signatureChannelName);
    
    if (!channel) {
      channel = pusher.subscribe(channelName);
    } else {
    }

    if (!signatureChannel) {
      signatureChannel = pusher.subscribe(signatureChannelName);
    } else {
    }

    // Define message handler
    const handleNewMessage = async (data) => {
      const newMessage = data.message || data;

      // Basic validation
      if (!newMessage || !newMessage.id) {
        return;
      }

      // Store latest message ID in AsyncStorage
      try {
        const messageId = newMessage.id;
        await AsyncStorage.setItem('latestMessageId', messageId.toString());
      } catch (error) {
        console.error('❌ [ASYNCSTORAGE] Failed to store message ID:', error);
      }

      // Check if it's a signature message
      const isSignatureMessage = !newMessage.content && newMessage.signature;
      
      // 🔍 COMPREHENSIVE SIGNATURE LOGGING
      

      // Add message to state
      setMessages((prevMessages) => {
        // Use Set for O(1) lookup instead of O(n) array search - more scalable for large message lists
        const messageIds = new Set(prevMessages.map(msg => String(msg.id)));
        const existsById = messageIds.has(String(newMessage.id));
        
        if (existsById) {
          
          // Check if this is a signature update and update the database
          if (newMessage.signature?.id) {
            try {
              
              // Log the values being stored
              const updateValues = {
                signature_status: newMessage.signature?.status || null,
                signature_file_url: newMessage.signature?.fileUrl || null,
                signature_file_name: newMessage.signature?.fileName || null,
                signature_file_size: newMessage.signature?.fileSize || null,
                signed_by_id: newMessage.signature?.signedBy?.id || null,
                signed_by_name: newMessage.signature?.signedBy?.name || null,
                signed_by_email: newMessage.signature?.signedBy?.email || null
              };
              
              
              // Update by message ID first
              updateSignatureFields(db, newMessage.id, conversationId, {
                status: updateValues.signature_status || undefined,
                fileUrl: updateValues.signature_file_url || null,
                fileName: updateValues.signature_file_name || null,
                fileSize: updateValues.signature_file_size || null,
                signedById: updateValues.signed_by_id || null,
                signedByName: updateValues.signed_by_name || null,
                signedByEmail: updateValues.signed_by_email || null,
              });
              
              
              // Also update by signature_id to catch any messages with the same signature
              if (newMessage.signature?.id) {
                updateSignatureFieldsBySignatureId(db, newMessage.signature.id, conversationId, {
                  status: updateValues.signature_status || undefined,
                  fileUrl: updateValues.signature_file_url || null,
                  fileName: updateValues.signature_file_name || null,
                  fileSize: updateValues.signature_file_size || null,
                  signedById: updateValues.signed_by_id || null,
                  signedByName: updateValues.signed_by_name || null,
                  signedByEmail: updateValues.signed_by_email || null,
                });
              }
              
            } catch (error) {
              console.error('❌ [PUSHER] Error updating signature in database:', error);
          }
          
            // Update the message in state with new signature data and return early
          return prevMessages.map(msg => 
            (msg.id === newMessage.id || msg.signature?.id === newMessage.signature?.id) && newMessage.signature
              ? { ...msg, signature: newMessage.signature }
              : msg
          );
          }
          
          // Message exists but no signature update - return early to prevent duplicate
          return prevMessages;
        }

        const isMyMessage = String(newMessage.sender?.id) === String(currentUserIdRef.current);
        
        if (isMyMessage) {
          
          // Find pending message with same content and timestamp (within 30 seconds)
          const messageTime = new Date(newMessage.createdAt).getTime();
          const pendingMessageIndex = prevMessages.findIndex(msg => {
            if (msg.status !== 'pending') return false;
            if (String(msg.sender?.id) !== String(currentUserIdRef.current)) return false;
            
            // Check if content matches
            const contentMatches = msg.content === newMessage.content;
            
            // Check if timestamp is close (within 30 seconds)
            const msgTime = new Date(msg.createdAt).getTime();
            const timeDiff = Math.abs(messageTime - msgTime);
            const timeMatches = timeDiff < 30000; // 30 seconds
            
            return contentMatches && timeMatches;
          });
          
          if (pendingMessageIndex !== -1) {
            
            // Replace pending message with real message from Pusher
            const updatedMessages = [...prevMessages];
            const pendingMessage = updatedMessages[pendingMessageIndex];
            updatedMessages[pendingMessageIndex] = {
              ...newMessage,
              createdAt: pendingMessage.createdAt, // Keep local timestamp (when message was created offline)
            };
            
            
            // Store the last message ID in AsyncStorage
            const sortedMessages = sortMessagesByTime(updatedMessages);
            storeLastMessageId(sortedMessages);
            
            return sortedMessages; // Return early to prevent duplicate addition
          } else {
          }
        }

        // Show message to all users (including current user's own messages)

        // Add new message from other user and sort by timestamp
        if (isSignatureMessage) {
        } else {
        }
        
        // Messages from current user are already stored when sent offline
        const isMyOwnMessage = String(newMessage.sender?.id) === String(currentUserIdRef.current);
        
        
        if (!isMyOwnMessage) {
          // Only store messages from other users
          try {
            
            // Debug: Check if signature columns exist in database
            try {
              // schema check skipped — shared chat_messages table is ensured by repository
            } catch (e) {
            }
            
            const dataToStore = {
              conversation_id: conversationId,
              content: newMessage.content || null,
              file_uri: newMessage.fileUrl || null,
              file_name: newMessage.fileName || null,
              file_type: newMessage.fileType || null,
              file_size: newMessage.fileSize || null,
              sender_id: newMessage.sender?.id || null,
              sender_first_name: newMessage.sender?.first_name || null,
              sender_last_name: newMessage.sender?.last_name || null,
              created_at: newMessage.createdAt || new Date().toISOString(),
              status: 'sent', // Pusher messages are already sent
              signature_id: newMessage.signature?.id || null,
              signature_title: newMessage.signature?.title || null,
              signature_notes: newMessage.signature?.notes || null,
              signature_due_date: newMessage.signature?.dueDate || null,
              signature_status: newMessage.signature?.status || null,
              signature_file_url: newMessage.signature?.fileUrl || null,
              signature_file_name: newMessage.signature?.fileName || null,
              signature_file_size: newMessage.signature?.fileSize || null,
              signed_by_id: newMessage.signature?.signedBy?.id || null,
              signed_by_name: newMessage.signature?.signedBy?.name || null,
              signed_by_email: newMessage.signature?.signedBy?.email || null
            };
            
            
            // Check if message already exists (by ID or by signature_id)
            const existingMessage = messageExistsInSQLite(db, newMessage.id, conversationId);
            
            // Also check if signature exists in database by signature_id

            let existingSignatureMessage = false;
            if (dataToStore.signature_id) {
              const sigCheck = db.getFirstSync(
                `SELECT id FROM ${CHAT_MESSAGES_TABLE} WHERE conversation_id = ? AND signature_id = ?`,
                [String(conversationId).replace(/[^0-9]/g, ''), dataToStore.signature_id]
              );
              existingSignatureMessage = Boolean(sigCheck);
            }
            
            if (existingMessage || existingSignatureMessage) {
              // Message exists in database - UPDATE signature data if it's a signature message
              if (dataToStore.signature_id) {
                
                // Update by message ID
                updateSignatureFields(db, newMessage.id, conversationId, {
                  status: dataToStore.signature_status || undefined,
                  fileUrl: dataToStore.signature_file_url || null,
                  fileName: dataToStore.signature_file_name || null,
                  fileSize: dataToStore.signature_file_size || null,
                  signedById: dataToStore.signed_by_id || null,
                  signedByName: dataToStore.signed_by_name || null,
                  signedByEmail: dataToStore.signed_by_email || null,
                });
                
                // Also update by signature_id to catch any messages with the same signature
                if (dataToStore.signature_id) {
                  updateSignatureFieldsBySignatureId(db, dataToStore.signature_id, conversationId, {
                    status: dataToStore.signature_status || undefined,
                    fileUrl: dataToStore.signature_file_url || null,
                    fileName: dataToStore.signature_file_name || null,
                    fileSize: dataToStore.signature_file_size || null,
                    signedById: dataToStore.signed_by_id || null,
                    signedByName: dataToStore.signed_by_name || null,
                    signedByEmail: dataToStore.signed_by_email || null,
                  });
                }
                
              }
            } else {
              // Message doesn't exist in database - INSERT new message
              // Convert dataToStore to MessageData format
              const messageData = {
                id: newMessage.id,
                content: dataToStore.content || null,
                fileUrl: dataToStore.file_uri || null,
                fileName: dataToStore.file_name || null,
                fileType: dataToStore.file_type || null,
                fileSize: dataToStore.file_size || null,
                sender: {
                  id: dataToStore.sender_id || null,
                  first_name: dataToStore.sender_first_name || null,
                  last_name: dataToStore.sender_last_name || null,
                },
                createdAt: dataToStore.created_at || new Date().toISOString(),
                status: dataToStore.status || 'sent',
                signature: dataToStore.signature_id ? {
                  id: dataToStore.signature_id,
                  title: dataToStore.signature_title || null,
                  notes: dataToStore.signature_notes || null,
                  dueDate: dataToStore.signature_due_date || null,
                  status: dataToStore.signature_status || null,
                  fileUrl: dataToStore.signature_file_url || null,
                  fileName: dataToStore.signature_file_name || null,
                  fileSize: dataToStore.signature_file_size || null,
                  signedBy: dataToStore.signed_by_id ? {
                    id: dataToStore.signed_by_id,
                    name: dataToStore.signed_by_name || null,
                    email: dataToStore.signed_by_email || null,
                  } : null,
                } : null,
              };
              saveMessageToSQLite(db, messageData, conversationId, 'PUSHER-MESSAGE', true);
            }
            
            // This prevents duplicates when message was already loaded from database or API
            const messageIdsSet = new Set(prevMessages.map(msg => String(msg.id)));
            if (messageIdsSet.has(String(newMessage.id))) {
              return prevMessages; // Return early to prevent duplicate in UI
            }
          } catch (e) {
          }
        } else {
          // CRITICAL FIX: Update pending messages from current user when Pusher delivers them
          try {
            
            // Find any pending message with matching content and sender
            // We'll check timestamp difference in JavaScript for better reliability
            const allPendingMessages = getPendingMessages(
              db, 
              conversationId, 
              currentUserIdRef.current, 
              newMessage.content || ''
            );
            
            // Filter by timestamp difference (within 30 seconds)
            const pendingMessages = allPendingMessages.filter(pendingMsg => {
              const pendingTime = new Date(pendingMsg.created_at).getTime();
              const serverTime = new Date(newMessage.createdAt).getTime();
              const timeDiff = Math.abs(serverTime - pendingTime);
              return timeDiff < 30000; // 30 seconds
            });
            
            if (pendingMessages.length > 0) {
              // Found pending message - replace it with server message
              const pendingMsg = pendingMessages[0];
              const offlineMessageId = pendingMsg.id;
              
              
              // Delete old pending message
              deletePendingMessage(db, offlineMessageId, conversationId);
              
              // Insert server message (with sent status)
              const serverMessageData = {
                id: newMessage.id,
                content: newMessage.content || null,
                fileUrl: newMessage.fileUrl || null,
                fileName: newMessage.fileName || null,
                fileType: newMessage.fileType || null,
                fileSize: newMessage.fileSize || null,
                sender: {
                  id: newMessage.sender?.id || null,
                  first_name: newMessage.sender?.first_name || null,
                  last_name: newMessage.sender?.last_name || null,
                },
                createdAt: pendingMsg.created_at || new Date().toISOString(), // Keep local timestamp (when message was created offline)
                status: 'sent',
                signature: newMessage.signature ? {
                  id: newMessage.signature.id || null,
                  title: newMessage.signature.title || null,
                  notes: newMessage.signature.notes || null,
                  dueDate: newMessage.signature.dueDate || null,
                  status: newMessage.signature.status || null,
                  fileUrl: newMessage.signature.fileUrl || null,
                  fileName: newMessage.signature.fileName || null,
                  fileSize: newMessage.signature.fileSize || null,
                  signedBy: newMessage.signature.signedBy || null,
                } : null,
              };
              saveMessageToSQLite(db, serverMessageData, conversationId, 'PUSHER-OWN-MESSAGE', false);
              
            } else {
              // Check if server message already exists
              const existingMessage = getMessageFromSQLite(db, newMessage.id, conversationId);
              
              if (existingMessage) {
                // Just update status to 'sent' if it's not already
                if (existingMessage.status !== 'sent') {
                  updateMessageStatus(db, newMessage.id, conversationId, 'sent');
                }
              } else {
                // No pending message found and no server message - insert it
                const serverMessageData2 = {
                  id: newMessage.id,
                  content: newMessage.content || null,
                  fileUrl: newMessage.fileUrl || null,
                  fileName: newMessage.fileName || null,
                  fileType: newMessage.fileType || null,
                  fileSize: newMessage.fileSize || null,
                  sender: {
                    id: newMessage.sender?.id || null,
                    first_name: newMessage.sender?.first_name || null,
                    last_name: newMessage.sender?.last_name || null,
                  },
                  createdAt: newMessage.createdAt || new Date().toISOString(),
                  status: 'sent',
                  signature: newMessage.signature ? {
                    id: newMessage.signature.id || null,
                    title: newMessage.signature.title || null,
                    notes: newMessage.signature.notes || null,
                    dueDate: newMessage.signature.dueDate || null,
                    status: newMessage.signature.status || null,
                    fileUrl: newMessage.signature.fileUrl || null,
                    fileName: newMessage.signature.fileName || null,
                    fileSize: newMessage.signature.fileSize || null,
                    signedBy: newMessage.signature.signedBy || null,
                  } : null,
                };
                saveMessageToSQLite(db, serverMessageData2, conversationId, 'PUSHER-OWN-MESSAGE-2', false);
              }
            }
          } catch (error) {
            console.error('❌ [PUSHER] Error updating database for my own message:', error);
          }
        }
        
        // Final duplicate check before adding (using Set for O(1) lookup - scalable)
        const messageIdsSet = new Set(prevMessages.map(msg => String(msg.id)));
        const isDuplicate = messageIdsSet.has(String(newMessage.id));

        // If duplicate, don't add
        if (isDuplicate) {
          return prevMessages;
        }

        const updatedMessages = [...prevMessages, newMessage];
        const sortedMessages = sortMessagesByTime(updatedMessages);
        
        // Store the last message ID in AsyncStorage
        storeLastMessageId(sortedMessages);
        
        return sortedMessages;
      });
    };

    // Define signature message handler
    const handleSignatureMessage = async (data) => {
      const rawSignatureMessage = data.message || data;

      // Basic validation
      if (!rawSignatureMessage || !rawSignatureMessage.id) {
        return;
      }

      // Store latest message ID in AsyncStorage
      try {
        const messageId = rawSignatureMessage.id;
        await AsyncStorage.setItem('latestMessageId', messageId.toString());
      } catch (error) {
        console.error('❌ [ASYNCSTORAGE] Failed to store signature message ID:', error);
      }

      // Transform flat signature data into the expected nested format
      const signatureMessage = {
        ...rawSignatureMessage,
        status: 'sent', // Pusher messages are already sent - this ensures tick icon shows
        signature: {
          id: rawSignatureMessage.signatureId || rawSignatureMessage.id,
          title: rawSignatureMessage.title,
          notes: rawSignatureMessage.notes,
          status: rawSignatureMessage.status,
          dueDate: rawSignatureMessage.dueDate,
          // Preserve any existing nested signature data
          ...rawSignatureMessage.signature
        }
      };

      // Check if it's a signature message
      const isSignatureMessage = !signatureMessage.content && signatureMessage.signature;
      

      // Add message to state
      setMessages((prevMessages) => {
        // CRITICAL FIX: Check if message already exists (by ID) - prevent duplicates
        const messageId = signatureMessage.messageId || signatureMessage.id;
        const exists = prevMessages.some(msg => String(msg.id) === String(messageId));
        
        if (exists) {
          return prevMessages;
        }

        // Get current user ID from ref
        const myUserId = currentUserIdRef.current;
        const messageSenderId = signatureMessage.sender?.id;

        // Also check if this message was already updated from offline (by checking server message ID)
        const isMySignature = String(messageSenderId) === String(myUserId);
        
        if (isMySignature) {
          
          // Find pending signature with same title and timestamp (within 60 seconds)
          // Also check if any message with this server ID already exists (was updated from offline)
          const signatureTime = new Date(signatureMessage.createdAt).getTime();
          const pendingSignatureIndex = prevMessages.findIndex(msg => {
            // Check if this is the exact message we just updated from offline (by server ID)
            if (String(msg.id) === String(messageId) && msg.status === 'sent') {
              return true; // This message was already updated from offline, replace it
            }
            
            // Otherwise, check for pending signature with matching title
            if (msg.status !== 'pending') return false;
            if (String(msg.sender?.id) !== String(myUserId)) return false;
            if (!msg.signature) return false;
            
            // Check if signature title matches
            const titleMatches = msg.signature.title === (signatureMessage.signature?.title || signatureMessage.title);
            
            // Check if timestamp is within 60 seconds (increased from 30)
            const msgTime = new Date(msg.createdAt).getTime();
            const timeMatches = Math.abs(signatureTime - msgTime) < 60000; // 60 seconds
            
            return titleMatches && timeMatches;
          });
          
          if (pendingSignatureIndex !== -1) {
            
            // Replace pending signature with real signature from Pusher
            const updatedMessages = [...prevMessages];
            updatedMessages[pendingSignatureIndex] = signatureMessage;
            
            return sortMessagesByTime(updatedMessages);
          } else {
          }
        }

        // Show signature contract to everyone (including the creator)
        
        try {
          
          const signatureDataToStore = {
            conversation_id: signatureMessage.conversationId || conversationId,
            content: null, // Signature requests have no text content
            file_uri: signatureMessage.fileUrl || null,
            file_name: signatureMessage.fileName || null,
            file_type: null, // Signature requests don't have file types initially
            file_size: signatureMessage.fileSize || null,
            sender_id: signatureMessage.sender?.id || null,
            sender_first_name: signatureMessage.sender?.name?.split(' ')[0] || null,
            sender_last_name: signatureMessage.sender?.name?.split(' ').slice(1).join(' ') || null,
            created_at: signatureMessage.createdAt || new Date().toISOString(),
            status: 'sent', // Pusher messages are already sent (MESSAGE status, not signature status)
            signature_id: signatureMessage.signatureId || signatureMessage.id || null,
            signature_title: signatureMessage.title || null,
            signature_notes: signatureMessage.notes || null,
            signature_due_date: signatureMessage.dueDate || null,
            signature_status: signatureMessage.signature?.status || 'pending', // Use signature status, not message status
            signature_file_url: signatureMessage.fileUrl || null,
            signature_file_name: signatureMessage.fileName || null,
            signature_file_size: signatureMessage.fileSize || null,
            signed_by_id: signatureMessage.signedBy?.id || null,
            signed_by_name: signatureMessage.signedBy?.name || null,
            signed_by_email: signatureMessage.signedBy?.email || null
          };
          
          
          const signatureMessageData = {
            id: signatureMessage.messageId || signatureMessage.id,
            content: signatureDataToStore.content || null,
            fileUrl: signatureDataToStore.file_uri || null,
            fileName: signatureDataToStore.file_name || null,
            fileType: signatureDataToStore.file_type || null,
            fileSize: signatureDataToStore.file_size || null,
            sender: {
              id: signatureDataToStore.sender_id || null,
              first_name: signatureDataToStore.sender_first_name || null,
              last_name: signatureDataToStore.sender_last_name || null,
            },
            createdAt: signatureDataToStore.created_at || new Date().toISOString(),
            status: signatureDataToStore.status || 'sent',
            signature: signatureDataToStore.signature_id ? {
              id: signatureDataToStore.signature_id,
              title: signatureDataToStore.signature_title || null,
              notes: signatureDataToStore.signature_notes || null,
              dueDate: signatureDataToStore.signature_due_date || null,
              status: signatureDataToStore.signature_status || null,
              fileUrl: signatureDataToStore.signature_file_url || null,
              fileName: signatureDataToStore.signature_file_name || null,
              fileSize: signatureDataToStore.signature_file_size || null,
              signedBy: signatureDataToStore.signed_by_id ? {
                id: signatureDataToStore.signed_by_id,
                name: signatureDataToStore.signed_by_name || null,
                email: signatureDataToStore.signed_by_email || null,
              } : null,
            } : null,
          };
          saveMessageToSQLite(db, signatureMessageData, conversationId, 'PUSHER-SIGNATURE', false);
          
          
        } catch (error) {
          console.error('❌ [PUSHER] Error storing signature message in database:', error);
        }
        
        const updatedMessages = [...prevMessages, signatureMessage];
        const sortedMessages = sortMessagesByTime(updatedMessages);
        
        // Store the last message ID in AsyncStorage
        storeLastMessageId(sortedMessages);
        
        return sortedMessages;
      });
    };

    // Define signature file upload handler
    const handleSignatureFileUpload = (data) => {
      
      const { signatureId, fileUrl, status, fileName, fileSize, signedBy, createdAt } = data;
      
      if (!signatureId || !fileUrl) {
        return;
      }

      // Extract signedBy information
      const signedById = signedBy?.id || null;
      const signedByName = signedBy?.name || null;
      const signedByEmail = signedBy?.email || null;

      // Update the signature in messages with the uploaded file
      setMessages((prevMessages) => {
        return prevMessages.map(msg => {
          if (msg.signature && msg.signature.id === signatureId) {
            
            try {
              
              updateSignatureFieldsBySignatureId(db, signatureId, conversationId, {
                status: status || 'signed',
                fileUrl: fileUrl || null,
                fileName: fileName || null,
                fileSize: fileSize || null,
                signedById: signedById || null,
                signedByName: signedByName || null,
                signedByEmail: signedByEmail || null,
              });
              
              
            } catch (error) {
              console.error('❌ [PUSHER] Error updating signature in database:', error);
            }
            
            return {
              ...msg,
              signature: {
                ...msg.signature,
                status: status || 'signed',
                fileUrl: fileUrl,
                fileName: fileName,
                fileSize: fileSize,
                signedBy: signedBy
              }
            };
          }
          return msg;
        });
      });
    };

    // Bind the listeners
    channel.bind('new-message', handleNewMessage);
    signatureChannel.bind('message-with-signature', handleSignatureMessage);
    signatureChannel.bind('signature-file-uploaded', handleSignatureFileUpload);

    // Cleanup: Only unbind our listeners, don't unsubscribe
    // Let ChatScreen manage subscriptions
    return () => {
      channel.unbind('new-message', handleNewMessage);
      signatureChannel.unbind('message-with-signature', handleSignatureMessage);
      signatureChannel.unbind('signature-file-uploaded', handleSignatureFileUpload);
      // Note: We do NOT unsubscribe - ChatScreen manages subscriptions
    };
  }, [conversationId]);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await initializeMessagesTable(db, conversationId);
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
        console.error('❌ Error details:', error.message);
      }
    };

    initializeDatabase();
  }, [db, conversationId]);

  const checkTablesInDatabase = () => {
    try {
      
      // Query to get all table names
      const tables = db.getAllSync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      
      if (tables.length === 0) {
      } else {
        tables.forEach((table, index) => {
          
          // Check how many records are in each table
          try {
            const count = db.getFirstSync(`SELECT COUNT(*) as count FROM ${table.name}`);
          } catch (error) {
          }
        });
      }
      
      // Show database file location
      
      return tables;
    } catch (error) {
      console.error('❌ Error checking tables:', error);
      return [];
    }
  };

  const deleteAllTables = () => {
    try {
      
      // Get all table names first
      const tables = db.getAllSync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      
      if (tables.length === 0) {
      } else {
        tables.forEach((table, index) => {
          try {
            db.execSync(`DROP TABLE IF EXISTS ${table.name}`);
          } catch (error) {
          }
        });
      }
      
      
    } catch (error) {
      console.error('❌ Error deleting tables:', error);
    }
  };

  const getAllMessagesFromDB = () => {
    try {
      
      // Get messages from database without clearing
      const messages = getAllMessagesFromSQLite(db, conversationId);
      
      
      if (messages.length === 0) {
      } else {
        messages.forEach((msg, index) => {
        });
      }
      
      return messages;
    } catch (error) {
      console.error('❌ Error getting messages from database:', error);
      console.error('❌ Error type:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      return [];
    }
  };

  const sendPendingMessagesQueue = async () => {
    if (!conversationId) {
      return;
    }

    try {
      
      // Get all pending messages from database (only from current user)
      const allPendingMessages = getPendingMessages(db, conversationId, currentUserId);
      
      // Filter out signature messages (they need to be sent via createSignature, not sendMessage)
      const pendingMessages = allPendingMessages.filter(msg => !msg.signature_id);
      
      if (pendingMessages.length === 0) {
        return;
      }

      // Send messages one at a time
      for (let i = 0; i < pendingMessages.length; i++) {
        const pendingMsg = pendingMessages[i];

        try {
          // Prepare file object if message has a file
          let fileToSend = null;
          if (pendingMsg.file_uri) {
            // Check if it's a local file path (starts with file:// or is a local path)
            const isLocalFile = pendingMsg.file_uri.startsWith('file://') || 
                               pendingMsg.file_uri.startsWith('/') ||
                               !pendingMsg.file_uri.startsWith('http');
            
            if (isLocalFile) {
              // Create file object from local file
              fileToSend = {
                uri: pendingMsg.file_uri,
                name: pendingMsg.file_name || 'file',
                type: pendingMsg.file_type || 'application/octet-stream',
                mimeType: pendingMsg.file_type || 'application/octet-stream',
              };
            } else {
              // File is already a URL (might have been uploaded), skip file attachment
            }
          }

          // Send message to server
          const serverResponse = await sendMessage(
            conversationId,
            pendingMsg.content || '',
            fileToSend,
            null // messageId - let server generate new ID
          );

          // Replace local message with server response
          // Delete the old pending message
          deletePendingMessage(db, pendingMsg.id, conversationId);

          // Insert server message with server data (ID, but keep local timestamp)
          const serverMessageData = {
            id: serverResponse?.id || pendingMsg.id,
            content: serverResponse?.content || pendingMsg.content || null,
            fileUrl: serverResponse?.fileUrl || pendingMsg.file_uri || null,
            fileName: serverResponse?.fileName || pendingMsg.file_name || null,
            fileType: serverResponse?.fileType || pendingMsg.file_type || null,
            fileSize: serverResponse?.fileSize || pendingMsg.file_size || null,
            sender: {
              id: serverResponse?.sender?.id || pendingMsg.sender_id || null,
              first_name: serverResponse?.sender?.first_name || pendingMsg.sender_first_name || null,
              last_name: serverResponse?.sender?.last_name || pendingMsg.sender_last_name || null,
            },
            createdAt: pendingMsg.created_at || new Date().toISOString(), // Keep local timestamp (when message was created offline)
            status: 'sent', // Update status to sent
          };

          // Save server message to database
          saveMessageToSQLite(db, serverMessageData, conversationId, 'PENDING-QUEUE', false);

          // Update UI state to replace pending message with server message
          setMessages(prevMessages => {
            // Find the index of the pending message to maintain its position
            const pendingIndex = prevMessages.findIndex(msg => 
              String(msg.id) === String(pendingMsg.id) && msg.status === 'pending'
            );
            
            if (pendingIndex === -1) {
              // Message not found in UI, add it as new message
              const newMessage = {
                id: serverResponse?.id || pendingMsg.id,
                content: serverResponse?.content || pendingMsg.content || null,
                fileUrl: serverResponse?.fileUrl || pendingMsg.file_uri || null,
                fileName: serverResponse?.fileName || pendingMsg.file_name || null,
                fileType: serverResponse?.fileType || pendingMsg.file_type || null,
                fileSize: serverResponse?.fileSize || pendingMsg.file_size || null,
                sender: {
                  id: serverResponse?.sender?.id || pendingMsg.sender_id || null,
                  first_name: serverResponse?.sender?.first_name || pendingMsg.sender_first_name || null,
                  last_name: serverResponse?.sender?.last_name || pendingMsg.sender_last_name || null,
                },
                createdAt: pendingMsg.created_at || new Date().toISOString(), // Keep local timestamp
                status: 'sent',
              };
              
              // Add and sort to maintain correct order
              const combinedMessages = [...prevMessages, newMessage];
              const sortedMessages = sortMessagesByTime(combinedMessages);
              storeLastMessageId(sortedMessages);
              return sortedMessages;
            }
            
            // Replace the pending message in place to maintain its position
            const updatedMessages = [...prevMessages];
            updatedMessages[pendingIndex] = {
              ...updatedMessages[pendingIndex],
              id: serverResponse?.id || pendingMsg.id,
              content: serverResponse?.content || updatedMessages[pendingIndex].content,
              fileUrl: serverResponse?.fileUrl || updatedMessages[pendingIndex].fileUrl,
              fileName: serverResponse?.fileName || updatedMessages[pendingIndex].fileName,
              fileType: serverResponse?.fileType || updatedMessages[pendingIndex].fileType,
              fileSize: serverResponse?.fileSize || updatedMessages[pendingIndex].fileSize,
              createdAt: updatedMessages[pendingIndex].createdAt, // Keep original local timestamp to maintain order
              status: 'sent',
            };
            
            // Only sort if timestamps might have changed (they shouldn't, but just in case)
            // Since we're keeping the same timestamp, the order should remain the same
            const sortedMessages = sortMessagesByTime(updatedMessages);
            storeLastMessageId(sortedMessages);
            
            return sortedMessages;
          });

          // Small delay between messages to avoid overwhelming the server
          if (i < pendingMessages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          console.error(`❌ [PENDING QUEUE] Failed to send message ${i + 1}:`, error);
          // Continue with next message even if one fails
          continue;
        }
      }

    } catch (error) {
      console.error('❌ [PENDING QUEUE] Error in sendPendingMessagesQueue:', error);
    }
  };

  useEffect(() => {
    if (netInfo.isConnected === true && isInitialLoadComplete) {
      sendPendingMessagesQueue();
      fetchNewMessagesAfterLast();
    }
  }, [netInfo.isConnected, conversationId, isInitialLoadComplete]);

  // Call this function to see all messages in database
  useEffect(() => {
    // Uncomment the line below to automatically get all messages when component loads
    // getAllMessagesFromDB();
  }, []);

  const handleTestGetMessages = () => {
    getAllMessagesFromDB();
  };

  const handleTestOfflineMessages = () => {
    if (netInfo.isConnected === false) {
      fetchMessages();
    } else {
      Toast.show({
        type: 'info',
        text1: 'Online Mode',
        text2: 'Currently online - messages load from API. Turn off internet to test offline mode.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const clearDatabase = () => {
    try {
      
      const success = clearAllMessagesFromSQLite(db, conversationId);
      if (success) {
      } else {
        throw new Error('Failed to clear database');
      }
      
      setMessages([]);

      // Clear AsyncStorage message ID as well
      AsyncStorage.removeItem('latestMessageId');
      
      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Database Cleared',
        text2: 'All messages and message ID removed from local storage',
        position: 'top',
        visibilityTime: 2000,
      });
      
    } catch (error) {
      console.error('❌ Error clearing database:', error);
      console.error('❌ Error type:', error.name);
      console.error('❌ Error message:', error.message);
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to clear database',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleClearMessagesPress = () => {
    Alert.alert(
      "Clear Local Messages",
      "This removes the cached messages for this chat from this device. Live history will reload from the server.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => clearDatabase() },
      ]
    );
  };

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

  // Opens image in full-screen modal viewer
  const handleOpenImage = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setImageViewerVisible(true);
  };

  // Closes the full-screen image viewer modal
  const handleCloseImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageUrl(null);
  };

  // Downloads image to device and opens share dialog (WhatsApp-style)
  const handleDownloadAndShareImage = async (imageUrl, fileName) => {
    try {

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
      

      // Share the downloaded image
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Save Image',
        UTI: 'public.image',
      });
      

    } catch (error) {
      console.error('❌ Error downloading/sharing image:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  // Downloads file to device and opens share dialog using expo-sharing
  const handleDownloadAndShareFile = async (fileUrl, fileName) => {
    try {

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
      

      // Share the downloaded file
      await Sharing.shareAsync(downloadResult.uri, {
        mimeType: 'application/octet-stream',
        dialogTitle: fileName,
        UTI: 'public.item',
      });
      

    } catch (error) {
      console.error('❌ Error downloading/sharing file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  // Opens file URL in browser or appropriate app
  const handleOpenFile = async (fileUrl, fileName) => {
    try {
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

  // Shows menu with options to pick image or document (WhatsApp-style)
  const handleShowAttachmentOptions = () => {
    setAttachmentMenuVisible(true);
  };

  const handlePickImage = async () => {
    try {
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

        setSelectedFile(fileToUpload);
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handlePickDocument = async () => {
    try {
      setAttachmentMenuVisible(false);
      
      // Launch document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // All file types
        copyToCacheDirectory: true,
      });

 
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const document = result.assets[0];
        
        // Prepare file object for upload
        const fileToUpload = {
          uri: document.uri,
          name: document.name,
          mimeType: document.mimeType || 'application/octet-stream',
        };

        setSelectedFile(fileToUpload);
      }
    } catch (error) {
      console.error('❌ Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  // Removes the selected file before sending
  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleTextChange = (text) => {
    setInputText(text);
  };

  const handleOfflineSignatureRequest = async (signatureData) => {
    
    try {
      const signatureRequestData = {
        conversation_id: conversationId,
        content: null, // Signature requests have no text content
        file_uri: null,
        file_name: null,
        file_type: null,
        file_size: null,
        sender_id: currentUserId ? parseInt(currentUserId) : 0,
        sender_first_name: userInfo?.firstName || 'Unknown',
        sender_last_name: userInfo?.lastName || 'User',
        created_at: new Date().toISOString(),
        status: 'pending',
        signature_id: null, // Placeholder until AUTOINCREMENT value is known
        signature_title: signatureData.title || 'Contract for Signature',
        signature_notes: signatureData.notes || null,
        signature_due_date: signatureData.dueDate && signatureData.dueDate.trim() 
          ? signatureData.dueDate.trim() 
          : new Date().toISOString().split('T')[0], // Always provide valid date, never null
        signature_status: 'pending',
        signature_file_url: signatureData.fileUrl || null,
        signature_file_name: signatureData.fileName || null,
        signature_file_size: signatureData.fileSize || null,
        signed_by_id: signatureData.signedBy?.id || null,
        signed_by_name: signatureData.signedBy?.name || null,
        signed_by_email: signatureData.signedBy?.email || null
      };
      
      
      const offlineMessageData = {
        content: signatureRequestData.content || null,
        fileUrl: signatureRequestData.file_uri || null,
        fileName: signatureRequestData.file_name || null,
        fileType: signatureRequestData.file_type || null,
        fileSize: signatureRequestData.file_size || null,
        sender: {
          id: signatureRequestData.sender_id || null,
          first_name: signatureRequestData.sender_first_name || null,
          last_name: signatureRequestData.sender_last_name || null,
        },
        createdAt: signatureRequestData.created_at || new Date().toISOString(),
        status: signatureRequestData.status || 'pending',
        signature: signatureRequestData.signature_title ? {
          id: signatureRequestData.signature_id || null,
          title: signatureRequestData.signature_title || null,
          notes: signatureRequestData.signature_notes || null,
          dueDate: signatureRequestData.signature_due_date || null,
          status: signatureRequestData.signature_status || null,
          fileUrl: signatureRequestData.signature_file_url || null,
          fileName: signatureRequestData.signature_file_name || null,
          fileSize: signatureRequestData.signature_file_size || null,
          signedBy: signatureRequestData.signed_by_id ? {
            id: signatureRequestData.signed_by_id || null,
            name: signatureRequestData.signed_by_name || null,
            email: signatureRequestData.signed_by_email || null,
          } : null,
        } : null,
      };
      
      const offlineInsertRowId = insertOfflineMessage(db, offlineMessageData, conversationId);
      let offlineMessageId = offlineInsertRowId ? Number(offlineInsertRowId) : 0;
      if (!Number.isFinite(offlineMessageId) || offlineMessageId <= 0) {
        console.warn('⚠️ [OFFLINE] Could not read AUTOINCREMENT id for signature request; defaulting to 0');
        offlineMessageId = 0;
      }

      const offlineSignatureId = offlineMessageId === 0 ? null : -offlineMessageId;

      if (offlineSignatureId !== null) {
        updateSignatureId(db, offlineMessageId, conversationId, offlineSignatureId);
      }
      
      
      const uiMessage = {
        id: offlineMessageId,
        content: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        fileSize: null,
        sender: {
          id: currentUserId,
          first_name: userInfo?.firstName || 'Unknown',
          last_name: userInfo?.lastName || 'User'
        },
        createdAt: signatureRequestData.created_at,
        status: 'pending',
        signature: {
          id: offlineSignatureId,
          title: signatureRequestData.signature_title,
          notes: signatureRequestData.signature_notes,
          dueDate: signatureRequestData.signature_due_date,
          status: signatureRequestData.signature_status,
          fileUrl: null,
          fileName: null
        }
      };
      
      setMessages(prevMessages => {
        const exists = prevMessages.some(msg => msg.id === uiMessage.id);
        
        if (exists) {
          return prevMessages;
        }
        
        const updatedMessages = [...prevMessages, uiMessage];
        const sortedMessages = sortMessagesByTime(updatedMessages);
        
        // DON'T store offline signature request ID in AsyncStorage - it hasn't been created on server yet
        
        return sortedMessages;
      });
      
      Toast.show({
        type: 'info',
        text1: 'Signature Request Saved',
        text2: 'Signature request will be sent when internet connection is restored',
        position: 'top',
        visibilityTime: 3000,
      });
      
    } catch (error) {
      console.error('❌ [OFFLINE] Failed to store signature request in database:', error);
      console.error('❌ [OFFLINE] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      
      // Check if it's a data type mismatch error
      if (error.message?.includes('datatype mismatch') || error.message?.includes('type mismatch')) {
        console.error('❌ [OFFLINE] Data type mismatch - checking database schema');
        console.error('❌ [OFFLINE] Data being inserted:', {
          messageId: typeof messageId,
          signatureId: typeof signatureId,
          conversationId: typeof signatureRequestData.conversation_id,
          senderId: typeof signatureRequestData.sender_id,
          createdAt: typeof signatureRequestData.created_at
        });
        
        try {
          // shared chat_messages table — no per-conversation pragma needed
        } catch (schemaError) {
          console.error('❌ [OFFLINE] Could not get table info:', schemaError);
        }
      }
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save signature request. Please try again.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !selectedFile) {
      return;
    }

    if (!conversationId) {
      console.error('No conversation ID found');
      alert('Cannot send message: Conversation ID not found');
      return;
    }

    const messageText = inputText.trim();
    const fileToSend = selectedFile;
    

    // Clear input and file immediately for better UX
    setInputText('');
    setSelectedFile(null);
    Keyboard.dismiss();
    setIsSendingMessage(true);

    // CHECK INTERNET CONNECTION
    if (netInfo.isConnected === false) {
      // OFFLINE: Store message in SQLite database
      
      try {
        // Create message object for database storage
        const messageData = {
          conversation_id: conversationId,
          content: messageText || null,
          file_uri: fileToSend ? fileToSend.uri : null,
          file_name: fileToSend ? fileToSend.name : null,
          file_type: fileToSend ? fileToSend.mimeType : null,
          file_size: fileToSend ? fileToSend.size : null,
          sender_id: currentUserId,
          sender_first_name: userInfo?.firstName || 'Unknown',
          sender_last_name: userInfo?.lastName || 'User',
          created_at: new Date().toISOString(),
          status: 'pending',
          signature_id: null,
          signature_title: null,
          signature_notes: null,
          signature_due_date: null,
          signature_status: null,
          signature_file_url: null,
          signature_file_name: null
        };
        
        const offlineMessageData = {
          content: messageData.content || null,
          fileUrl: messageData.file_uri || null,
          fileName: messageData.file_name || null,
          fileType: messageData.file_type || null,
          fileSize: messageData.file_size || null,
          sender: {
            id: messageData.sender_id || null,
            first_name: messageData.sender_first_name || null,
            last_name: messageData.sender_last_name || null,
          },
          createdAt: messageData.created_at || new Date().toISOString(),
          status: messageData.status || 'pending',
        };
        
        const offlineInsertRowId = insertOfflineMessage(db, offlineMessageData, conversationId);
        let offlineMessageId = offlineInsertRowId ? Number(offlineInsertRowId) : 0;
        if (!Number.isFinite(offlineMessageId)) {

          console.warn('⚠️ [OFFLINE] Could not read SQLite AUTOINCREMENT ID, falling back to 0');
          offlineMessageId = 0;
        }
        
        
        // Create message object for UI display
        const uiMessage = {
          id: offlineMessageId, // Use the unique ID directly
          content: messageText,
          fileUrl: fileToSend ? fileToSend.uri : null,
          fileName: fileToSend ? fileToSend.name : null,
          fileType: fileToSend ? fileToSend.mimeType : null,
          fileSize: fileToSend ? fileToSend.size : null,
          sender: {
            id: currentUserId,
            first_name: userInfo?.firstName || 'Unknown',
            last_name: userInfo?.lastName || 'User'
          },
          createdAt: messageData.created_at,
          status: 'pending'
        };
        
        // Add message to UI immediately (with duplicate checking)
        setMessages(prevMessages => {
          // Check if message already exists (by ID) - prevent duplicates
          const exists = prevMessages.some(msg => msg.id === uiMessage.id);
          
          if (exists) {
            return prevMessages;
          }
          
          const updatedMessages = [...prevMessages, uiMessage];
          const sortedMessages = sortMessagesByTime(updatedMessages);
          
          // DON'T store offline message ID in AsyncStorage - it hasn't been created on server yet
          
          return sortedMessages;
        });
        
        // Show success message
        Toast.show({
          type: 'info',
          text1: 'Message Saved',
          text2: 'Message will be sent when internet connection is restored',
          position: 'top',
          visibilityTime: 3000,
        });
        
      } catch (error) {
        console.error('❌ Failed to store message in database:', error);
        alert('Failed to save message. Please try again.');
        setInputText(messageText);
        setSelectedFile(fileToSend);
      }
      
      setIsSendingMessage(false);
      return;
    }
    
    // ONLINE: Send to API and store in database

    try {
      const response = await sendMessage(conversationId, messageText, fileToSend);
      
      // Extract data from server response
      const serverMessageId = response?.id; // 1006
      const serverContent = response?.content; // "hello shah this is me "
      const serverFileUrl = response?.fileUrl; // "https://eagle-eye.tor1.digitaloceanspaces.com/..."
      const serverFileName = response?.fileName; // "SameerYasirCV.pdf"
      const serverFileSize = response?.fileSize; // 0.04
      const serverFileType = response?.fileType; // "application/pdf"
      const serverCreatedAt = response?.createdAt; // "2025-10-24T17:11:56.996Z"
      const serverSender = response?.sender; // { id: 3, first_name: "Shah", last_name: "Malik s" }
      
      
      // Debug: Check if message ID is being extracted correctly
      
      // Store message in SQLite database with server response
      const localTimestamp = new Date().toISOString(); // Use local timestamp when message is sent
      const messageData = {
        conversation_id: conversationId,
        content: serverContent || messageText || null,
        file_uri: serverFileUrl || (fileToSend ? fileToSend.uri : null),
        file_name: serverFileName || (fileToSend ? fileToSend.name : null),
        file_type: serverFileType || (fileToSend ? fileToSend.mimeType : null),
        file_size: serverFileSize || (fileToSend ? fileToSend.size : null),
        sender_id: serverSender?.id || currentUserId,
        sender_first_name: serverSender?.first_name || userInfo?.firstName || 'Unknown',
        sender_last_name: serverSender?.last_name || userInfo?.lastName || 'User',
        created_at: localTimestamp, // Use local timestamp (when message was created)
        status: 'sent'
      };
      
      // Store message in SQLite database with server message ID as primary ID
      const serverMessageDataForStorage = {
        id: serverMessageId,
        content: messageData.content || null,
        fileUrl: messageData.file_uri || null,
        fileName: messageData.file_name || null,
        fileType: messageData.file_type || null,
        fileSize: messageData.file_size || null,
        sender: {
          id: messageData.sender_id || null,
          first_name: messageData.sender_first_name || null,
          last_name: messageData.sender_last_name || null,
        },
        createdAt: localTimestamp, // Use local timestamp (when message was created)
        status: messageData.status || 'sent',
      };
      saveMessageToSQLite(db, serverMessageDataForStorage, conversationId, 'ONLINE-SEND', false);
      
      
      // Add or update message in UI with 'sent' status
      setMessages(prevMessages => {
        // First, try to find and update existing pending message (if any)
        let foundPending = false;
        const updatedMessages = prevMessages.map(prevMsg => {
          // Check if this is the message we just sent
          const isSameMessage = (
            prevMsg.content === messageText && 
            prevMsg.createdAt === messageData.created_at && 
            prevMsg.status === 'pending'
          ) || (
            // For file messages, check by file name and timestamp
            !messageText && fileToSend && 
            prevMsg.fileName === fileToSend.name &&
            prevMsg.createdAt === messageData.created_at && 
            prevMsg.status === 'pending'
          );
          
          if (isSameMessage) {
            foundPending = true;
            
            return { 
              ...prevMsg, 
              id: serverMessageId,                    // 1006
              content: serverContent || prevMsg.content,           // "hello shah this is me "
              fileUrl: serverFileUrl || prevMsg.fileUrl,          // "https://eagle-eye.tor1.digitaloceanspaces.com/..."
              fileName: serverFileName || prevMsg.fileName,       // "SameerYasirCV.pdf"
              fileType: serverFileType || prevMsg.fileType,       // "application/pdf"
              fileSize: serverFileSize || prevMsg.fileSize,       // 0.04
              createdAt: prevMsg.createdAt,    // Keep local timestamp (when message was created)
              status: 'sent',                                     // "sent"
              serverResponse: response                            // Full server response
            };
          }
          
          return prevMsg;
        });
        
        // If no pending message was found, add the new message directly with 'sent' status
        // This ensures the message appears immediately when sent online
        if (!foundPending) {
          const newMessage = {
            id: serverMessageId,
            content: serverContent || messageText || null,
            fileUrl: serverFileUrl || (fileToSend ? fileToSend.uri : null),
            fileName: serverFileName || (fileToSend ? fileToSend.name : null),
            fileType: serverFileType || (fileToSend ? fileToSend.mimeType : null),
            fileSize: serverFileSize || (fileToSend ? fileToSend.size : null),
            sender: {
              id: serverSender?.id || currentUserId,
              first_name: serverSender?.first_name || userInfo?.firstName || 'Unknown',
              last_name: serverSender?.last_name || userInfo?.lastName || 'User'
            },
            createdAt: localTimestamp, // Use local timestamp (when message was created)
            status: 'sent',
            serverResponse: response
          };
          
          // Add new message and sort to maintain correct order
          const combinedMessages = [...updatedMessages, newMessage];
          const sortedMessages = sortMessagesByTime(combinedMessages);
        
        // Store the last message ID in AsyncStorage
          storeLastMessageId(sortedMessages);
          
          return sortedMessages;
        }
        
        // If we updated an existing message, sort to maintain correct order
        const sortedMessages = sortMessagesByTime(updatedMessages);
        
        // Store the last message ID in AsyncStorage
        storeLastMessageId(sortedMessages);
        
        return sortedMessages;
      });
      
      try {
        const conversationType = type || conversation?.type || "private";
        const isGroup = conversationType === 'group' || isGroupChat;
        
        if (isGroup) {
          // Group chat: Send ONE notification (backend will handle distribution to all participants)
          // Use group chat name as fromUserName
          const groupChatName = userName || conversation?.project?.name || 'Group Chat';
          
          const notificationData = {
            title: "New message",
            message: messageText || (fileToSend ? `Sent a file: ${fileToSend.name}` : "Sent a message"),
            conversationId: conversationId,
            fromUserName: groupChatName,
            conversationType: "group"
          };
          
          await createMessageNotification(notificationData);
        } else {
          // Private chat: Send notification to the other participant
          // Use sender name as fromUserName
          let recipientUserId = null;
          
          if (conversation?.participants && conversation.participants.length > 0) {
            const otherParticipant = conversation.participants.find(
              participant => participant.user?.id?.toString() !== currentUserId?.toString()
            );
            recipientUserId = otherParticipant?.user?.id;
          }
          
          // Fallback: Use userId from route params if participants not available
          if (!recipientUserId && userId) {
            recipientUserId = userId;
          }
          
          if (recipientUserId) {
            const fromUserName = `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`.trim() || 'Unknown User';
            
            const notificationData = {
              title: "New message",
              message: messageText || (fileToSend ? `Sent a file: ${fileToSend.name}` : "Sent a message"),
              conversationId: conversationId,
              assignedToUserId: Number(recipientUserId),
              fromUserName: fromUserName,
              conversationType: "private"
            };
            
            await createMessageNotification(notificationData);
          }
        }
      } catch (notificationError) {
        console.error('❌ Error sending message notification:', notificationError);
        // Don't throw error - message was already sent successfully
      }
      
    } catch (err) {
      console.error('❌ Error sending message:', err);
      alert('Failed to send message. Please try again.');
      setInputText(messageText);
      setSelectedFile(fileToSend);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // When keyboard is open, drop home-indicator padding so the bar sits flush above keys
  const composerBottomPad = keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 10);

  return (
    // --- Chat Shell ---
    // Bottom padding = keyboard height → composer lifts; AppHeader above Stack stays put.
    <View
      style={{
        flex: 1,
        backgroundColor: Brand.paperSoft,
        paddingBottom: keyboardHeight,
      }}
    >
      {/* 📨 Messages List */}
      <FlatList
        ref={flatListRef}
        data={listMessages}
        inverted={true}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.2}
        renderItem={({ item }) => {
            // Convert both to string for comparison to handle data type mismatch
            // FIXED: Now currentUserId is guaranteed to be loaded, preventing left-side flicker
            const isMyMessage = String(item.sender?.id) === String(currentUserId);
            
            
            // Handle both nested (item.signature) and flat (item.title, item.notes, etc.) structures
            
            // Check if it's a real signature contract (not null, not undefined)
            const hasRealSignature = item.signature && item.signature !== null && item.signature !== undefined;
            
            // Check if it has signature-related fields (title, notes, status) but NO file
            const hasSignatureFields = !item.content && (item.title || item.notes || item.status);
            const isFileUpload = item.fileUrl || item.file_name || item.fileType || item.file_url || item.file_type;
            
            // Only consider it signature data if it has REAL signature OR signature fields WITHOUT file
            const hasSignatureData = hasRealSignature || (hasSignatureFields && !isFileUpload);
            
            
            // CRITICAL FIX: If it has file data, it's NOT a signature contract
            // Only show contract form if it has signature data AND is not a regular file upload
            // Additional check: If any file field exists, it's definitely not a signature contract
            if (!item.content && hasSignatureData && !isFileUpload && item && !item.fileUrl && !item.file_name && !item.fileType && !item.file_url && !item.file_type) {
              
              const signatureId = item.signature?.id || item.signatureId || item.id;
              const signatureStatus = item.signature?.status || item.status;
              const signatureUploadChannelName = `signature-${signatureId}`;
              
              
              // Only subscribe to signature upload events for pending contracts
              if (signatureId && signatureStatus !== 'signed') {
                
                const contractChannel = pusher.subscribe(signatureUploadChannelName);
                contractChannel.bind('signature-file-uploaded', (data) => {
                  
                  // Update the message for everyone
                  setMessages(prevMessages => 
                    prevMessages.map(msg => 
                      msg.id === item.id 
                        ? {
                            ...msg,
                            signature: {
                              ...msg.signature,
                              status: data.status,
                              fileUrl: data.fileUrl,
                              fileName: data.fileName,
                              signedBy: data.signedBy
                            }
                          }
                        : msg
                    )
                  );
                });
              } else if (signatureStatus === 'signed') {
              }
              return (
                <View
                  className={`mb-3 px-4 ${isMyMessage ? 'items-end' : 'items-start'}`}
                >
                  <View
                    style={{
                      width: '78%',
                      maxWidth: 320,
                      backgroundColor: Brand.paper,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: Brand.line,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 10,
                      elevation: 3,
                    }}
                  >
                    {/* Top accent bar */}
                    <View style={{ height: 4, backgroundColor: Brand.ink }} />

                    <View style={{ padding: 14 }}>
                      {/* Header */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 14,
                        }}
                      >
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            backgroundColor: Brand.ink,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}
                        >
                          <Ionicons name="create" size={20} color={Brand.onInk} />
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: Brand.inkMuted,
                              letterSpacing: 0.3,
                              textTransform: 'uppercase',
                            }}
                          >
                            Signature request
                          </Text>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '700',
                              color: Brand.ink,
                              marginTop: 2,
                            }}
                            numberOfLines={2}
                          >
                            {item.signature?.title || item.title || 'Contract for Signature'}
                          </Text>
                        </View>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                            backgroundColor:
                              (item.signature?.status || item.status) === 'signed'
                                ? '#E8F6EE'
                                : '#FFF6E5',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color:
                                (item.signature?.status || item.status) === 'signed'
                                  ? '#1B7A45'
                                  : '#B76A0A',
                            }}
                          >
                            {(item.signature?.status || item.status) === 'signed'
                              ? 'Signed'
                              : 'Pending'}
                          </Text>
                        </View>
                      </View>

                      {/* Notes */}
                      {(item.signature?.notes || item.notes) ? (
                        <View style={{ marginBottom: 12 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: Brand.inkMuted,
                              marginBottom: 4,
                            }}
                          >
                            Instructions
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              lineHeight: 18,
                              color: Brand.inkSoft,
                            }}
                          >
                            {item.signature?.notes || item.notes}
                          </Text>
                        </View>
                      ) : null}

                      {/* Due date chip */}
                      {(item.signature?.dueDate || item.dueDate) ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'flex-start',
                            backgroundColor: Brand.paperSoft,
                            borderWidth: 1,
                            borderColor: Brand.line,
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            marginBottom: 14,
                          }}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color={Brand.inkMuted}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: Brand.inkSoft,
                            }}
                          >
                            Due{' '}
                            {(() => {
                              const dateString = item.signature?.dueDate || item.dueDate;
                              if (!dateString) return '';
                              if (
                                typeof dateString === 'string' &&
                                dateString.match(/^\d{4}-\d{2}-\d{2}$/)
                              ) {
                                const [year, month, day] = dateString.split('-').map(Number);
                                return new Date(year, month - 1, day).toLocaleDateString(
                                  undefined,
                                  { month: 'short', day: 'numeric', year: 'numeric' }
                                );
                              }
                              return new Date(dateString).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              });
                            })()}
                          </Text>
                        </View>
                      ) : null}

                      {/* Sign action — receiver only while pending */}
                      {!isMyMessage && (item.signature?.status || item.status) !== 'signed' ? (
                        <TouchableOpacity
                          style={{
                            width: '100%',
                            backgroundColor: Brand.ink,
                            borderRadius: 12,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 12,
                          }}
                          activeOpacity={0.8}
                          onPress={() => {
                            const signatureId = item.signature?.id || item.signatureId || item.id;
                            const signatureUploadChannelName = `signature-${signatureId}`;
                            const signatureUploadChannel = pusher.subscribe(signatureUploadChannelName);

                            signatureUploadChannel.bind('signature-file-uploaded', (data) => {
                              setMessages(prevMessages =>
                                prevMessages.map(msg =>
                                  msg.id === item.id
                                    ? {
                                        ...msg,
                                        signature: {
                                          ...msg.signature,
                                          status: data.status,
                                          fileUrl: data.fileUrl,
                                          fileName: data.fileName,
                                          signedBy: data.signedBy,
                                        },
                                      }
                                    : msg
                                )
                              );
                            });

                            navigation.navigate('SignatureScreen', {
                              signatureData: {
                                title: item.signature?.title || item.title,
                                notes: item.signature?.notes || item.notes,
                                dueDate: item.signature?.dueDate || item.dueDate,
                                contractId: item.id,
                              },
                              onSignatureComplete: async (signatureData) => {
                                try {
                                  const contractId = item.signature?.id || item.signatureId || item.id;
                                  const result = await submitSignature(contractId, signatureData);

                                  try {
                                    const apiSignatureData = {
                                      signature_status: result.status || 'signed',
                                      signature_file_url: result.fileUrl || null,
                                      signature_file_name: result.fileName || null,
                                      signature_file_size: result.fileSize || null,
                                      signed_by_id: result.signatureFrom?.id || null,
                                      signed_by_name: result.signatureFrom?.name || null,
                                      signed_by_email: result.signatureFrom?.email || null,
                                    };

                                    updateSignatureFieldsBySignatureId(db, contractId, conversationId, {
                                      status: apiSignatureData.signature_status || undefined,
                                      fileUrl: apiSignatureData.signature_file_url || null,
                                      fileName: apiSignatureData.signature_file_name || null,
                                      fileSize: apiSignatureData.signature_file_size || null,
                                      signedById: apiSignatureData.signed_by_id || null,
                                      signedByName: apiSignatureData.signed_by_name || null,
                                      signedByEmail: apiSignatureData.signed_by_email || null,
                                    });
                                  } catch (dbError) {
                                    console.error('❌ [SIGNATURE] Error updating database:', dbError);
                                  }

                                  setMessages(prevMessages =>
                                    prevMessages.map(msg =>
                                      msg.id === item.id
                                        ? {
                                            ...msg,
                                            signature: {
                                              ...msg.signature,
                                              status: 'signed',
                                              fileUrl: result.fileUrl,
                                              fileName: result.fileName,
                                              fileSize: result.fileSize,
                                              signedBy: result.signatureFrom,
                                            },
                                          }
                                        : msg
                                    )
                                  );

                                  Toast.show({
                                    type: 'success',
                                    text1: 'Success',
                                    text2: 'Contract signed successfully!',
                                    position: 'top',
                                    visibilityTime: 3000,
                                  });
                                } catch (error) {
                                  console.error('❌ Error submitting signature:', error);
                                  Toast.show({
                                    type: 'error',
                                    text1: 'Error',
                                    text2: 'Failed to submit signature. Please try again.',
                                    position: 'top',
                                    visibilityTime: 3000,
                                  });
                                }
                              },
                            });
                          }}
                        >
                          <Ionicons
                            name="pencil"
                            size={15}
                            color={Brand.onInk}
                            style={{ marginRight: 8 }}
                          />
                          <Text
                            style={{
                              color: Brand.onInk,
                              fontSize: 14,
                              fontWeight: '700',
                            }}
                          >
                            Sign document
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {/* Signed preview */}
                      {(item.signature?.status || item.status) === 'signed' &&
                      (item.signature?.fileUrl || item.fileUrl) ? (
                        <View style={{ marginBottom: 12 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: Brand.inkMuted,
                              marginBottom: 8,
                            }}
                          >
                            Digital signature
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleOpenImage(item.signature?.fileUrl || item.fileUrl)}
                            activeOpacity={0.9}
                            style={{
                              backgroundColor: Brand.paperSoft,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: Brand.line,
                              padding: 10,
                            }}
                          >
                            <Image
                              source={{ uri: item.signature?.fileUrl || item.fileUrl }}
                              style={{
                                width: '100%',
                                height: 110,
                                resizeMode: 'contain',
                              }}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {/* Footer meta */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTopWidth: StyleSheet.hairlineWidth,
                          borderTopColor: Brand.line,
                          paddingTop: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, color: Brand.inkFaint }}>
                            {(() => {
                              const date = new Date(item.createdAt);
                              const hours = date.getHours();
                              const minutes = date.getMinutes();
                              const hour12 = hours % 12 || 12;
                              const ampm = hours >= 12 ? 'PM' : 'AM';
                              const minutesStr = minutes.toString().padStart(2, '0');
                              return `${hour12}:${minutesStr} ${ampm}`;
                            })()}
                          </Text>
                          {isMyMessage ? (
                            <View style={{ marginLeft: 4 }}>
                              {item.status === 'pending' ||
                              item.status === 'offline' ||
                              item.status === 'sending' ? (
                                <Ionicons name="time-outline" size={11} color={Brand.inkFaint} />
                              ) : item.status === 'failed' ? (
                                <Ionicons name="close-circle" size={11} color={Brand.danger} />
                              ) : (
                                <Ionicons name="checkmark-done" size={11} color="#1B7A45" />
                              )}
                            </View>
                          ) : null}
                        </View>
                        {(item.signature?.status || item.status) === 'signed' ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="shield-checkmark" size={12} color="#1B7A45" />
                            <Text
                              style={{
                                marginLeft: 4,
                                fontSize: 11,
                                fontWeight: '600',
                                color: '#1B7A45',
                              }}
                            >
                              Complete
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 11, color: Brand.inkFaint }}>Awaiting signature</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              );
            }
            
            // Support both camelCase and snake_case field names from API
            const fileUrl = item.fileUrl || item.file_url;
            const fileType = item.fileType || item.file_type;
            
            const hasImage = fileUrl && fileType?.startsWith('image/');
            const hasDocument = fileUrl && !hasImage;
            const hasFile = hasImage || hasDocument;
            
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
                  <View className={`${isMyMessage ? 'mr-2' : ''}`} style={{ 
                    maxWidth: hasDocument ? '90%' : '75%', // Increased from 85% to 90% for documents
                    minWidth: hasDocument ? '70%' : 'auto' // Ensure minimum width for documents
                  }}>
                  {/* Display image if fileUrl exists and it's an image type */}
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
                  {hasDocument && (
                    (() => {
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
                  {item.content && (
                    <View
                      className={`px-3.5 py-2.5 ${hasFile ? 'mt-1' : ''}`}
                      style={{
                        alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                        // Brand-aligned bubbles: ink for mine, soft paper for theirs
                        backgroundColor: isMyMessage ? Brand.ink : Brand.paper,
                        borderRadius: 18,
                        borderBottomRightRadius: isMyMessage ? 6 : 18,
                        borderBottomLeftRadius: isMyMessage ? 18 : 6,
                        borderWidth: isMyMessage ? 0 : 1,
                        borderColor: Brand.line,
                      }}
                    >
                      {/* Show sender name ONLY in group chats for received messages */}
                      {showSenderInfo && (
                        <Text
                          className="text-xs font-semibold mb-1"
                          style={{ color: Brand.inkSoft }}
                        >
                          {senderFullName}
                        </Text>
                      )}
                      
                      <Text
                        className="text-[15px] leading-5"
                        style={{ color: isMyMessage ? Brand.onInk : Brand.ink }}
                      >
                        {item.content}
                      </Text>
                    </View>
                  )}
                  
                  {/* Message Time and Status - Display below every message */}
                  <View className={`flex-row items-center mt-1 ${
                    isMyMessage ? 'justify-end mr-2' : 'justify-start ml-2'
                  }`}>
                    <Text className="text-xs text-gray-500">
                      {formatTime(item.createdAt)}
                    </Text>
                    
                    {isMyMessage && (
                      <View className="ml-1">
                        {item.status === 'pending' ? (
                          <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={12} color="#F59E0B" />
                          </View>
                        ) : item.status === 'offline' ? (
                          <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={12} color="#F59E0B" />
                          </View>
                        ) : item.status === 'sending' ? (
                          <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={12} color="#6B7280" />
                          </View>
                        ) : item.status === 'failed' ? (
                          <View className="flex-row items-center">
                            <Ionicons name="close-circle" size={12} color="#EF4444" />
                          </View>
                        ) : (
                          <View className="flex-row items-center">
                            <Ionicons name="checkmark-done" size={12} color="#10B981" />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
                </View>
              </View>
            );
          }}
          keyExtractor={(item, index) => {
            // Create unique key combining ID, timestamp, and index to prevent duplicates
            const baseKey = item.id?.toString() || `msg_${index}`;
            const timestamp = item.createdAt || new Date().toISOString();
            const uniqueKey = `${baseKey}_${timestamp}_${index}`;
            return uniqueKey;
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{
            // Inverted list: paddingTop = visual bottom gap above the composer
            paddingTop: 12,
            paddingBottom: 12,
            paddingHorizontal: 4,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListHeaderComponent={() => (
            // Loading indicator for pagination (appears at top due to inverted FlatList)
            isLoadingMoreMessages ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={Brand.ink} />
                <Text className="text-xs mt-2" style={{ color: Brand.inkMuted }}>
                  Loading older messages...
                </Text>
              </View>
            ) : null
          )}
      />

      {/* Typing sits above composer so it never overlays messages with absolute positioning */}
      {typingUsers.length > 0 && (
        <View
          style={{
            backgroundColor: Brand.paper,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: Brand.line,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ fontSize: 13, color: Brand.inkMuted }}>
            {typingUsers.length === 1
              ? `${typingUsers[0].name} is typing...`
              : `${typingUsers.length} people are typing...`}
          </Text>
        </View>
      )}

      {/* --- Composer --- */}
      {/* Attractive WhatsApp-style send bar; lifts with keyboard via parent paddingBottom */}
      <View
        style={{
          backgroundColor: Brand.paper,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Brand.line,
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: composerBottomPad,
          // Soft lift so the bar feels anchored above the keyboard
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        {selectedFile && (
          <View
            style={{
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: Brand.paperSoft,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: Brand.line,
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: Brand.ink,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name={selectedFile.mimeType?.startsWith("image/") ? "image" : "insert-drive-file"}
                size={18}
                color={Brand.onInk}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: Brand.inkMuted }}>
                Attachment
              </Text>
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: Brand.ink, marginTop: 1 }}
                numberOfLines={1}
              >
                {selectedFile.name}
              </Text>
            </View>
            <TouchableOpacity onPress={handleRemoveFile} hitSlop={10} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={22} color={Brand.inkMuted} />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          {/* Attach */}
          <TouchableOpacity
            onPress={handleShowAttachmentOptions}
            disabled={isSendingMessage || isLoadingMessages}
            activeOpacity={0.75}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Brand.paperSoft,
              borderWidth: 1,
              borderColor: Brand.line,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
              marginBottom: 1,
              opacity: isSendingMessage || isLoadingMessages ? 0.5 : 1,
            }}
          >
            <Ionicons name="add" size={24} color={Brand.ink} />
          </TouchableOpacity>

          {/* Signature — 1:1 chats only */}
          {!isGroupChat && (
            <TouchableOpacity
              onPress={() => setSignatureModalVisible(true)}
              disabled={isSendingMessage || isLoadingMessages}
              activeOpacity={0.75}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: Brand.paperSoft,
                borderWidth: 1,
                borderColor: Brand.line,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
                marginBottom: 1,
                opacity: isSendingMessage || isLoadingMessages ? 0.5 : 1,
              }}
            >
              <Ionicons name="create-outline" size={20} color={Brand.inkSoft} />
            </TouchableOpacity>
          )}

          {/* Message field */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "flex-end",
              backgroundColor: Brand.paperSoft,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: Brand.line,
              paddingLeft: 16,
              paddingRight: 10,
              paddingVertical: Platform.OS === "ios" ? 8 : 4,
              minHeight: 44,
              maxHeight: 120,
            }}
          >
            <TextInput
              ref={messageInputRef}
              style={{
                flex: 1,
                fontSize: 16,
                lineHeight: 22,
                color: Brand.ink,
                maxHeight: 100,
                paddingTop: Platform.OS === "ios" ? 4 : 8,
                paddingBottom: Platform.OS === "ios" ? 4 : 8,
              }}
              placeholder="Type a message"
              placeholderTextColor={Brand.inkFaint}
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
              returnKeyType="default"
              blurOnSubmit={false}
              editable={!isSendingMessage && !isLoadingMessages}
            />
          </View>

          {/* Send */}
          {(() => {
            const canSend =
              !!(inputText.trim() || selectedFile) && !isSendingMessage && !isLoadingMessages;
            return (
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!canSend}
                activeOpacity={0.8}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  marginLeft: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: canSend ? Brand.ink : Brand.line,
                  // Subtle pop when ready to send
                  shadowColor: Brand.ink,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: canSend ? 0.22 : 0,
                  shadowRadius: 4,
                  elevation: canSend ? 3 : 0,
                }}
              >
                {isSendingMessage ? (
                  <ActivityIndicator color={Brand.onInk} size="small" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={canSend ? Brand.onInk : Brand.inkFaint}
                    style={{ marginLeft: 2 }}
                  />
                )}
              </TouchableOpacity>
            );
          })()}
        </View>
      </View>

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

          {selectedImageUrl && (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      <AllFilesModal
        visible={filesModalVisible}
        onClose={() => {
          setFilesModalVisible(false);
        }}
        files={conversationFiles}
        isLoading={isLoadingFiles}
        onFilePress={(item) => {
          const fileUrl = item.fileUrl;
          const fileName = item.fileName || 'Unknown File';
          const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);
          
          if (isImage) {
            handleOpenImage(fileUrl);
          } else {
            handleOpenFile(fileUrl, fileName);
          }
        }}
        onDownloadPress={(item) => {
          const fileUrl = item.fileUrl;
          const fileName = item.fileName || 'Unknown File';
          const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);
          
          if (isImage) {
            handleDownloadAndShareImage(fileUrl, fileName);
          } else {
            handleDownloadAndShareFile(fileUrl, fileName);
          }
        }}
      />

      <AllSignaturesModal
        visible={signaturesModalVisible}
        onClose={() => {
          setSignaturesModalVisible(false);
        }}
        signatures={conversationSignatures}
        isLoading={isLoadingSignatures}
        onSignaturePress={(signature) => handleSignatureCardTap(signature)}
      />

      <SignatureDetailModal
        visible={signatureDetailModalVisible}
        onClose={() => {
          setSignatureDetailModalVisible(false);
          setSelectedSignature(null);
        }}
        signature={selectedSignature}
        onImagePress={(imageUrl) => handleOpenImage(imageUrl)}
      />

      <SignatureRequestModal
        visible={signatureModalVisible}
        onClose={() => setSignatureModalVisible(false)}
        conversationId={conversationId}
        onSuccess={(result) => {
          // API returned the created signature message — show it immediately (no Pusher required)
          const message = result?.data || result;
          if (!message?.id) return;

          try {
            saveMessageToSQLite(db, message, conversationId, 'SIGNATURE-CREATE', false);
          } catch (storageError) {
            console.error('Failed to cache signature message locally:', storageError);
          }

          setMessages((prevMessages) => {
            const exists = prevMessages.some(
              (msg) => String(msg.id) === String(message.id)
            );
            if (exists) return prevMessages;
            return [message, ...prevMessages];
          });
        }}
        onOfflineRequest={handleOfflineSignatureRequest}
        recipientUserId={signatureRecipientUserId}
        conversationType={signatureConversationType}
      />

    </View>
  );
};

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
