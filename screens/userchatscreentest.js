// --- Change Summary ---------------------------------------------------------
// What was changed: Offline message inserts now trust SQLite AUTOINCREMENT IDs, the folder shortcut pulls every cached message without pagination, that shortcut logs each cached message with every field in ascending date order, pending rows are updated in place with server data instead of delete-reinsert, fetchMessages returns immediately after a successful API hydrate to avoid double inserts, all bulk inserts now run inside one SQLite transaction per page to reduce per-message overhead, the batch helper now skips pages that are already cached without printing duplicate logs to keep the console clean, and signature resyncs now only touch rows still marked pending so fully-signed conversations are left untouched.
// Why it was changed: Prevent duplicate IDs when clocks collide or drift, let users inspect the full offline history on demand, surface the complete cached payload clearly in chronological order, avoid churn on SQLite rows, stop redundant API hydrations while keeping console noise low, speed up hydrations so large chat histories sync without hammering the database, avoid noisy duplicate-skip logs whenever the API returns a page we already saved, and ensure background signature refreshes only update outstanding forms.
// Dependencies or related files: Depends on the messages_<conversationId> table defined below with AUTOINCREMENT and the Toast utility for user confirmations.
// MCP Context 7: Implementation follows MCP context 7 best practices for data integrity, explicit logging, and discoverable offline diagnostics.
// ---------------------------------------------------------------------------
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { getMessagesByConversationId } from "../services/chats/getMessagesByConversationId";
import { sendMessage } from "../services/chats/sendMessage";
import { isTyping } from "../services/chats/isTyping";
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

// --- Structured Console Utilities (MCP Context 7) ---
// Inline Comment: Shared helper keeps verbose logs readable while avoiding duplicate formatting code.
const emitVerticalLog = (heading, rows) => {
  console.log(`\n${heading}`);
  Object.entries(rows || {}).forEach(([key, value]) => {
    console.log(`  • ${key}: ${value}`);
  });
  console.log('');
};

// --- Change Summary (MCP Context 7) ---
// What: Added signed-signature sync helper that reads server data via getSignedSignatures, updates SQLite rows, and refreshes UI state; removed entry loader so chat renders immediately while data hydrates; surfaced quick-access icons to reload from SQLite or clear stored chat rows; introduced request abortion so leaving the screen cancels in-flight message fetches and logs that workflow; restored WhatsApp-style pagination by only loading the newest 20 messages from SQLite and revealing older batches on scroll; pre-seeded current user ID from AuthContext so ownership alignment renders correctly from the first frame; removed obsolete refreshDatabaseMessageStats call to prevent runtime ReferenceError; added online bootstrap that automatically flushes pending offline messages as soon as a user lands on the chat with connectivity; reformatted diagnostic console logs into vertical bullet lists for easier reading.
// Why: Ensure signed signature forms fetched from the API overwrite stale local copies so users always see the latest signed contracts, improve first impression by skipping the blocking spinner, provide simple on-device maintenance controls for local chat storage, prevent wasted bandwidth (and confusing logs) when users back out mid-sync, stop ownership flicker by matching the legacy 20-at-a-time loader, remove the left/right jump caused by late-loading user IDs, avoid crashes triggered by missing helper functions, make sure any offline messages cached previously are sent immediately once a reliable connection is present, and keep debug output understandable for non-engineers.
// Dependencies: Relies on services/chats/getSignedSignatures, SQLite messages_<conversationId> schema, existing sortMessagesByTime utility, dedupeMessagesById to render safely during async hydration, existing fetchMessagesFromSQLite/clearDatabase helpers, new abort-aware signature in services/chats/getMessagesByConversationId, SQLite pagination helpers defined in this file, AuthContext-provided IDs as an initial ownership signal, sendOfflineMessages queue processing, NetInfo connectivity events, and the shared logging helpers declared below.

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
    type,
  } = route.params || {};

  // Log conversation type
  console.log('💬 Conversation Type:', type);

  // --- Determine if Group Chat (MCP Context 7) ---
  // Business Rule: Only show sender names in group chats, not in individual chats
  const isGroupChat = isGroupChatParam || conversation?.type === 'group' || type === 'group'; // NOTE: Honor navigation param so group chats hide signature actions.

  const { user, userInfo } = useAuth();
  const insets = useSafeAreaInsets(); // Get safe area insets for notch/navigation bar handling
  
  // --- Resolved Auth User ID (MCP Context 7) ---
  // Business Rule: Seed ownership with best-known ID immediately so messages render on the correct side before AsyncStorage hydrates.
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

  // --- Internet Connectivity Monitoring (MCP Context 7) ---
  // Business Rule: Monitor internet connection status for better UX
  const netInfo = NetInfo.useNetInfo();
  
  // --- SQLite Context (MCP Context 7) ---
  // Business Rule: Use SQLite context for database operations
  const db = useSQLiteContext();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // --- Pagination State (MCP Context 7) ---
  // Business Rule: Load messages in chunks for better performance
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
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
  
  // --- Request Signature Modal State (MCP Context 7) ---
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [activeSignatureId, setActiveSignatureId] = useState(null); // Track which signature is being signed

  // --- SQLite Pagination Settings (MCP Context 7) ---
  // Business Rule: Keep local paging aligned with server default so UI ownership stays stable.
  const SQLITE_MESSAGES_PAGE_SIZE = 20;

  // --- Typing State Management (MCP Context 7) ---
  // Business Rule: Track who is currently typing in the conversation
  // Used to show typing indicators below the input bar (WhatsApp-style)
  const [typingUsers, setTypingUsers] = useState([]); // Array of user objects who are typing
  const [isUserTyping, setIsUserTyping] = useState(false); // Whether current user is typing
  const typingTimeoutRef = useRef(null); // For debouncing typing status

  // --- API Request Cancellation State (MCP Context 7) ---
  // Business Rule: Track in-flight API calls so we can cancel them when user leaves the chat screen.
  const apiAbortControllersRef = useRef(new Set());
  const isScreenActiveRef = useRef(true);

  // --- Get Current User ID from AsyncStorage (MCP Context 7) ---
  // Business Rule: Retrieve user ID from local storage to compare with message sender
  // This ensures we're using the exact same ID that was stored during login
  // CRITICAL FIX: Initialize with loading state to prevent UI flicker
  const [currentUserId, setCurrentUserId] = useState(resolvedUserIdFromAuth);
  const [isLoadingUserId, setIsLoadingUserId] = useState(!resolvedUserIdFromAuth);
  const currentUserIdRef = useRef(currentUserId);

  // Update ref when currentUserId changes
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // --- Fetch User ID from AsyncStorage (MCP Context 7) ---
  // Business Rule: Load user ID BEFORE rendering messages to prevent left-side flicker
  useEffect(() => {
    // Inline Comment: If auth already knows the user ID we can skip storage lookup entirely.
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
            console.log('✅ Current user ID loaded:', userIdNumber);
          }
        } else {
          console.log('⚠️ No user ID found in AsyncStorage');
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

  // --- API Request Cancellation Helpers (MCP Context 7) ---
  // Inline Note: Bundle creation/removal so every fetch registers its AbortController for cleanup.
  const registerAbortController = (contextLabel) => {
    const entry = { controller: new AbortController(), contextLabel };
    apiAbortControllersRef.current.add(entry);
    console.log(`📡 [ABORT] Registered fetch controller for ${contextLabel}`);
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
        console.log(`🛑 [ABORT] Canceled fetching ${contextLabel} because user left chat`);
        return null;
      }
      throw error;
    } finally {
      releaseAbortController(controllerEntry);
    }
  };

  // --- Helper: Convert API Message to UI Format (MCP Context 7) ---
  // Business Rule: Standardize message format for display consistency
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

  // --- Screen Lifecycle Cleanup (MCP Context 7) ---
  // Business Rule: Abort any in-flight network calls when the user navigates away to save bandwidth and avoid stray state updates.
  useEffect(() => {
    isScreenActiveRef.current = true;
    return () => {
      console.log('🛑 [ABORT] User left UserChatScreen – aborting outstanding message fetches');
      isScreenActiveRef.current = false;
      const activeControllers = Array.from(apiAbortControllersRef.current);
      activeControllers.forEach(({ controller, contextLabel }) => {
        console.log(`🛑 [ABORT] Stopping request for ${contextLabel}`);
        controller.abort();
      });
      apiAbortControllersRef.current.clear();
    };
  }, []);


const messageExistsInSQLite = (messageId, conversationId) => {
  try {
    const existingMessage = db.getFirstSync(
      `SELECT id FROM messages_${conversationId} WHERE id = ?`,
      [messageId]
    );
    return Boolean(existingMessage);
  } catch (lookupError) {
    console.error('❌ Error checking message existence:', lookupError);
    return false;
  }
};

const saveMessageToSQLite = (msg, conversationId, logLabel = 'DEFAULT', logSkips = true) => {
  try {
    // Check if message already exists to avoid duplicates
    const isDuplicate = messageExistsInSQLite(msg.id, conversationId);

    if (isDuplicate) {
      if (logSkips) {
        console.log(`ℹ️ [${logLabel}] Message ${msg.id} already exists - skipping insert`);
      }
      return;
    }

    // Save message to SQLite
    db.runSync(`
      INSERT OR REPLACE INTO messages_${conversationId} (
        id, conversation_id, content, file_uri, file_name, file_type, file_size,
        sender_id, sender_first_name, sender_last_name, created_at, status,
        signature_id, signature_title, signature_notes, signature_due_date, 
        signature_status, signature_file_url, signature_file_name, signature_file_size,
        signed_by_id, signed_by_name, signed_by_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      msg.id,
      conversationId,
      msg.content || null,
      msg.fileUrl || null,
      msg.fileName || null,
      msg.fileType || null,
      msg.fileSize || null,
      msg.sender?.id || null,
      msg.sender?.first_name || null,
      msg.sender?.last_name || null,
      msg.createdAt || new Date().toISOString(),
      msg.status || 'sent',
      msg.signature?.id || null,
      msg.signature?.title || null,
      msg.signature?.notes || null,
      msg.signature?.dueDate || null,
      msg.signature?.status || null,
      msg.signature?.fileUrl || null,
      msg.signature?.fileName || null,
      msg.signature?.fileSize || null,
      msg.signature?.signedBy?.id || null,
      msg.signature?.signedBy?.name || null,
      msg.signature?.signedBy?.email || null
    ]);
  } catch (dbError) {
    console.error('❌ Error saving message to database:', dbError);
  }
};

// --- Batch Persistence Helper (MCP Context 7) ---
// Business Rule: Process entire API pages inside a single transaction so large syncs finish faster without sacrificing duplicate protection.
const saveMessagesBatchToSQLite = (messages, conversationId, logLabel = 'BATCH') => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  try {
    // Inline Comment: Filter out messages that are already cached so we only touch SQLite when there is new data.
    const messagesToInsert = messages.filter((message) => !messageExistsInSQLite(message.id, conversationId));

    if (messagesToInsert.length === 0) {
      return; // NOTE: Entire batch already cached; no transaction needed so console stays quiet.
    }

    db.execSync('BEGIN TRANSACTION'); // Inline Comment: Group all inserts so SQLite only commits once, dramatically reducing IO.
    messagesToInsert.forEach((message) => {
      saveMessageToSQLite(message, conversationId, logLabel, false);
    });
    db.execSync('COMMIT');
  } catch (transactionError) {
    console.error(`❌ [${logLabel}] Failed to persist message batch:`, transactionError);
    try {
      db.execSync('ROLLBACK'); // Inline Comment: Roll back the whole batch if anything fails so the cache stays consistent.
    } catch (rollbackError) {
      console.error(`❌ [${logLabel}] Failed to rollback batch transaction:`, rollbackError);
    }
  }
};

  // --- Helper: Fetch All Messages from API and Save to SQLite (MCP Context 7) ---
  // Business Rule: When SQLite is empty, fetch all messages from API and cache locally
  // This ensures fast subsequent loads and offline access
  // Change Summary: Simplified version without one-by-one delays, loads all pages efficiently
  const fetchAllMessagesFromAPI = async (conversationId) => {
    console.log('📡 Fetching all messages from API...');
    setIsUsingAPI(true);
    setCurrentPage(1);
    
    let allMessages = [];
    let currentPageNum = 1;
    let hasMorePages = true;
    let wasCancelled = false; // Inline Note: Track cancellation so we can skip post-processing safely.
    
    // Load all pages from API
    while (hasMorePages) {
      console.log(`📡 Loading page ${currentPageNum} from API...`);
      
      const apiResponse = await fetchMessagesPageSafely(currentPageNum, `initial-sync-page-${currentPageNum}`);
      if (!apiResponse) {
        console.log('🛑 [ABORT] Initial sync stopped mid-loop because request was canceled');
        wasCancelled = true;
        break;
      }
      const apiMessages = apiResponse?.messages || [];
      
      if (apiMessages && apiMessages.length > 0) {
        allMessages = [...allMessages, ...apiMessages];
        currentPageNum++;
        hasMorePages = apiResponse?.page < apiResponse?.totalPages;
      } else {
        hasMorePages = false;
      }
    }
    
    if (wasCancelled) {
      console.log('🛑 [ABORT] Skipping initial sync post-processing because the user left the screen');
      return [];
    }

    console.log(`✅ Loaded ${allMessages.length} messages from API`);
    
    // Convert all messages to UI format
    const uiMessages = allMessages.map(msg => convertMessageToUI(msg));
    
    // Display all messages at once
    setMessages(prevMessages => {
      const combinedMessages = [...prevMessages, ...uiMessages];
      return sortMessagesByTime(combinedMessages);
    });
    
    // Save all messages to SQLite
    console.log('💾 Saving messages to SQLite...');
    saveMessagesBatchToSQLite(allMessages, conversationId, 'INITIAL-API-BATCH');
    console.log('✅ All messages saved to SQLite');
    
    // Update pagination state
    setCurrentOffset(0);
    setHasMoreMessages(false);
    setCurrentPage(currentPageNum - 1);
    
    // Store last message ID
    const sortedMessages = sortMessagesByTime([...uiMessages]);
    storeLastMessageId(sortedMessages);
    
    console.log('✅ All messages loaded and saved');
    return uiMessages;
  };

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

  // --- Dedupe Messages By ID (Simple UI Safeguard - MCP Context 7) ---
  // What: Ensures we never render duplicate messages in the list even if multiple fetchers run
  // Why: If two sources append the same server message, UI should still show it once
  // NOTE: Non-destructive; does not change DB or fetching logic
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

  // --- Fetch Messages from SQLite Database or API (MCP Context 7) ---
  // Business Rule: Load messages from SQLite database first, fallback to API if empty
  // Loader only shown for API calls (SQLite is fast)
  // CRITICAL: Disable input immediately if we need to fetch from API (no SQLite data)
  const fetchMessages = async () => {
    console.log('🚀 fetchMessages called - loading from SQLite database or API');
    console.log('🔍 conversationId:', conversationId);
    
    if (!conversationId) {
      console.log('❌ No conversation ID provided, skipping message fetch');
      return;
    }

    console.log('✅ Conversation ID found, starting to fetch messages from SQLite');
    
    try {
      // Check if messages table exists before querying
      console.log('🔍 Checking if messages table exists for conversation:', conversationId);
      
      try {
        const tableCheck = db.getAllSync(`SELECT name FROM sqlite_master WHERE type='table' AND name='messages_${conversationId}'`);
        if (tableCheck.length === 0) {
          console.log('⚠️ Messages table does not exist yet - skipping SQLite query');
          console.log('📭 No messages found in SQLite database - fetching from API');
          
          // CRITICAL: Disable input IMMEDIATELY before API call starts
          console.log('🔒 Disabling input - will fetch from API');
          Keyboard.dismiss(); // Dismiss keyboard during API call
          setIsLoadingMessages(true); // Disable input during API call - SET BEFORE API CALL
          
          // No table exists - fetch from API with pagination
          try {
            console.log('📡 Fetching from API...');
            setIsUsingAPI(true); // We're using API for this conversation
            setCurrentPage(1); // Start from page 1
            
            // Load pages progressively - show each page as it loads
            let allMessages = [];
            let currentPageNum = 1;
            let hasMorePages = true;
            
            while (hasMorePages) {
              console.log(`📡 Loading page ${currentPageNum} from API...`);
              const apiResponse = await getMessagesByConversationId(conversationId, currentPageNum, 20);
              console.log(`📡 API Response for page ${currentPageNum}:`, apiResponse);
              
              const apiMessages = apiResponse?.messages || [];
              console.log(`📋 Found ${apiMessages.length} messages in page ${currentPageNum} (Total: ${apiResponse?.total || 0})`);
              
              if (apiMessages && apiMessages.length > 0) {
                allMessages = [...allMessages, ...apiMessages];
                
                // Convert current page messages to UI format
                const currentPageMessages = apiMessages.map(msg => ({
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
                  // Add signature data if it exists
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
                }));

                // Show all messages from this page at once for faster loading
                setMessages(prevMessages => {
                  const combinedMessages = [...prevMessages, ...currentPageMessages];
                  return sortMessagesByTime(combinedMessages);
                });

                // CRITICAL: Enable input immediately after first page loads (user can type while remaining pages load)
                if (currentPageNum === 1) {
                  console.log('✅ First page loaded - enabling input immediately');
                  setIsLoadingMessages(false);
                }

                currentPageNum++;
                hasMorePages = apiResponse?.page < apiResponse?.totalPages;
                
                // No delay between pages for faster loading
              } else {
                hasMorePages = false;
              }
            }
            
            console.log(`✅ Loaded all pages progressively. Total messages: ${allMessages.length}`);
            
            // Store all messages in SQLite database
            console.log('💾 Storing all API messages in SQLite database...');
            saveMessagesBatchToSQLite(allMessages, conversationId, 'API-PROGRESSIVE-BATCH');
            console.log('✅ All API messages stored in SQLite database');

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
            
            console.log('✅ All messages loaded progressively from API');
            return; // Inline Comment: Exit after successful API hydration to prevent the fallback branch from rerunning the same inserts.
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

      // --- Load All Messages from SQLite (MCP Context 7) ---
      // Business Rule: Load all messages at once to ensure signature forms appear immediately
      // This prevents delay in showing signature forms that might be beyond first 20 messages
      console.log('📡 Loading all messages from SQLite database for conversation:', conversationId);
      
      const totalMessageCountRow = db.getFirstSync(`SELECT COUNT(*) as count FROM messages_${conversationId}`);
      const totalMessageCount = totalMessageCountRow?.count || 0;

      const dbMessages = db.getAllSync(
        `SELECT * FROM messages_${conversationId} ORDER BY datetime(created_at) DESC LIMIT ${SQLITE_MESSAGES_PAGE_SIZE}`
      );
      
      console.log('📨 SQLite Response received:', dbMessages);
      console.log(`📋 Found ${dbMessages.length} messages in SQLite database (total stored: ${totalMessageCount})`);
      
      if (dbMessages && dbMessages.length > 0) {
        // Convert database messages to UI format
        const uiMessages = dbMessages.map(msg => ({
          id: msg.id?.toString() || `db_${msg.created_at}`,
          content: msg.content,
          fileUrl: msg.file_uri,
          fileName: msg.file_name,
          fileType: msg.file_type,
          fileSize: msg.file_size,
          sender: {
            id: msg.sender_id,
            first_name: msg.sender_first_name,
            last_name: msg.sender_last_name
          },
          createdAt: msg.created_at,
          status: msg.status || 'sent',
          // Add signature data if it exists
          signature: msg.signature_id ? {
            id: msg.signature_id,
            title: msg.signature_title,
            notes: msg.signature_notes,
            dueDate: msg.signature_due_date,
            status: msg.signature_status,
            fileUrl: msg.signature_file_url,
            fileName: msg.signature_file_name,
            fileSize: msg.signature_file_size,
            signedBy: msg.signed_by_id ? {
              id: msg.signed_by_id,
              name: msg.signed_by_name,
              email: msg.signed_by_email
            } : null
          } : null
        }));
        
        // Sort messages to ensure chronological order
        const sortedMessages = sortMessagesByTime([...uiMessages]);
        setMessages(sortedMessages);
        
        // Reset pagination state
        setCurrentOffset(dbMessages.length); // Inline Comment: Offset tracks how many rows are already rendered.
        setHasMoreMessages(totalMessageCount > dbMessages.length); // Inline Comment: If more than a page remains, enable scroll pagination.
        
        // Store the last message ID in AsyncStorage
        storeLastMessageId(sortedMessages);
        
        // Kick off background sync to replace any pending contracts with signed data from server
        syncSignedSignaturesFromAPI().catch((error) => {
          console.error('❌ [SIGNED SYNC] Background sync failed:', error);
        });
        
        console.log('✅ Messages loaded from SQLite and sorted, setMessages called');
      } else {
        console.log('📭 No messages found in SQLite database - fetching from API');
        
        // CRITICAL: Disable input IMMEDIATELY before API call starts
        console.log('🔒 Disabling input - will fetch from API');
        Keyboard.dismiss(); // Dismiss keyboard during API call
        setIsLoadingMessages(true); // Disable input during API call - SET BEFORE API CALL
        
        // No messages in SQLite - fetch from API with pagination
        try {
          console.log('📡 Fetching from API...');
          setIsUsingAPI(true); // We're using API for this conversation
          setCurrentPage(1); // Start from page 1
          
          // Load pages progressively like WhatsApp - show each page as it loads
          let allMessages = [];
          let currentPageNum = 1;
          let hasMorePages = true;
          
          while (hasMorePages) {
            console.log(`📡 Loading page ${currentPageNum} from API...`);
            const apiResponse = await getMessagesByConversationId(conversationId, currentPageNum, 20);
            console.log(`📡 API Response for page ${currentPageNum}:`, apiResponse);
            
            const apiMessages = apiResponse?.messages || [];
            console.log(`📋 Found ${apiMessages.length} messages in page ${currentPageNum} (Total: ${apiResponse?.total || 0})`);
            
            if (apiMessages && apiMessages.length > 0) {
              allMessages = [...allMessages, ...apiMessages];
              
              // Convert current page messages to UI format
              const currentPageMessages = apiMessages.map(msg => ({
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
                // Add signature data if it exists
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
              }));

              // Show messages one by one quickly like WhatsApp
              for (let i = 0; i < currentPageMessages.length; i++) {
                const message = currentPageMessages[i];
                setMessages(prevMessages => {
                  if (!isScreenActiveRef.current) {
                    console.log('🛑 [ABORT] Skipping per-message update because chat screen was closed');
                    return prevMessages;
                  }
                  const combinedMessages = [...prevMessages, message];
                  return sortMessagesByTime(combinedMessages);
                });
                
                // Fast delay between each message (50ms for WhatsApp-like speed)
                await new Promise(resolve => setTimeout(resolve, 50));
              }

              currentPageNum++;
              hasMorePages = apiResponse?.page < apiResponse?.totalPages;
              
              // Small delay between pages
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              hasMorePages = false;
            }
          }
          
          console.log(`✅ Loaded all pages progressively. Total messages: ${allMessages.length}`);
          
          // Store all messages in SQLite database
          console.log('💾 Storing all API messages in SQLite database...');
          saveMessagesBatchToSQLite(allMessages, conversationId, 'API-PROGRESSIVE-BATCH');
          console.log('✅ All API messages stored in SQLite database');

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
          
          console.log('✅ All messages loaded progressively from API and stored in SQLite');
          return; // Inline Comment: Exit early so we do not immediately fall through and refetch the same messages again.
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
      console.log('🏁 fetchMessages completed, setting loading to false');
      setIsLoadingMessages(false);
    }
  };

  // --- Load More Messages Function (MCP Context 7) ---
  // Business Rule: Load older messages in chunks when user scrolls up
  // Handles both SQLite pagination (offset) and API pagination (page)
  const loadMoreMessages = async () => {
    if (!hasMoreMessages) {
      console.log('ℹ️ No more messages to load');
      return;
    }

    console.log('📄 Loading more messages...');

    try {
      if (isUsingAPI) {
        // Load next page from API
        const nextPage = currentPage + 1;
        console.log(`📡 Loading page ${nextPage} from API...`);
        
        const apiResponse = await getMessagesByConversationId(conversationId, nextPage, 20);
        console.log(`📡 API Response for page ${nextPage}:`, apiResponse);
        
        const apiMessages = apiResponse?.messages || [];
        console.log(`📋 Found ${apiMessages.length} messages in API response (Total: ${apiResponse?.total || 0})`);

        if (apiMessages && apiMessages.length > 0) {
          // Convert API messages to UI format
          const uiMessages = apiMessages.map(msg => ({
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
            // Add signature data if it exists
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
          }));

          // Add older messages to existing messages (append to end)
          setMessages(prevMessages => {
            const combinedMessages = [...prevMessages, ...uiMessages];
            return sortMessagesByTime(combinedMessages);
          });

          // Update pagination state
          setCurrentPage(nextPage);
          setHasMoreMessages(apiResponse?.page < apiResponse?.totalPages); // Check if there are more pages

          console.log('✅ Older messages loaded successfully from API');
        } else {
          console.log('📭 No more older messages found in API');
          setHasMoreMessages(false);
        }
      } else {
        // Load next 20 messages from SQLite
        const totalMessageCountRow = db.getFirstSync(`SELECT COUNT(*) as count FROM messages_${conversationId}`);
        const totalMessageCount = totalMessageCountRow?.count || 0;
        const olderMessages = db.getAllSync(
          `SELECT * FROM messages_${conversationId} ORDER BY datetime(created_at) DESC LIMIT ${SQLITE_MESSAGES_PAGE_SIZE} OFFSET ${currentOffset}`
        );

        console.log(`📋 Found ${olderMessages.length} older messages (current offset: ${currentOffset}, total stored: ${totalMessageCount})`);

        if (olderMessages && olderMessages.length > 0) {
          // Convert database messages to UI format
          const uiMessages = olderMessages.map(msg => ({
          id: msg.id?.toString() || `db_${msg.created_at}`,
          content: msg.content,
          fileUrl: msg.file_uri,
          fileName: msg.file_name,
          fileType: msg.file_type,
          fileSize: msg.file_size,
          sender: {
            id: msg.sender_id,
            first_name: msg.sender_first_name,
            last_name: msg.sender_last_name
          },
          createdAt: msg.created_at,
          status: msg.status || 'sent',
          // Add signature data if it exists
          signature: msg.signature_id ? {
            id: msg.signature_id,
            title: msg.signature_title,
            notes: msg.signature_notes,
            dueDate: msg.signature_due_date,
            status: msg.signature_status,
            fileUrl: msg.signature_file_url,
            fileName: msg.signature_file_name,
            fileSize: msg.signature_file_size,
            signedBy: msg.signed_by_id ? {
              id: msg.signed_by_id,
              name: msg.signed_by_name,
              email: msg.signed_by_email
            } : null
          } : null
        }));

          // Add older messages to existing messages (append to end)
          setMessages(prevMessages => {
            const combinedMessages = [...prevMessages, ...uiMessages];
            return sortMessagesByTime(combinedMessages);
          });

          // Update pagination state
          const newOffset = currentOffset + olderMessages.length;
          setCurrentOffset(newOffset);
          setHasMoreMessages(newOffset < totalMessageCount);

          console.log('✅ Older messages loaded successfully from SQLite');
        } else {
          console.log('📭 No more older messages found in SQLite');
          setHasMoreMessages(false);
        }
      }
    } catch (error) {
      console.error('❌ Error loading more messages:', error);
    }
  };

  // --- Fetch Messages from SQLite Database (MCP Context 7) ---
  // Business Rule: Get all messages from local database when offline
  const fetchMessagesFromSQLite = () => {
    try {
      console.log('🔄 Fetching messages from SQLite database for conversation:', conversationId);
      
      // Get all messages from database (both sent and pending)
      const totalMessageCountRow = db.getFirstSync(`SELECT COUNT(*) as count FROM messages_${conversationId}`);
      const totalMessageCount = totalMessageCountRow?.count || 0;
      const dbMessages = db.getAllSync(
        `SELECT * FROM messages_${conversationId} ORDER BY datetime(created_at) DESC LIMIT ${SQLITE_MESSAGES_PAGE_SIZE}`
      );
      
      // Debug: Show what columns are available in the first message
      if (dbMessages.length > 0) {
        console.log('🔍 First message columns:', Object.keys(dbMessages[0]));
      }
      
      console.log('📋 Found', dbMessages.length, 'messages in SQLite database (total stored:', totalMessageCount, ')');
      
      if (dbMessages && dbMessages.length > 0) {
        // Convert database messages to UI format with signature fields
        const uiMessages = dbMessages.map(msg => ({
          id: msg.id?.toString() || `db_${msg.created_at}`,
          content: msg.content,
          fileUrl: msg.file_uri,
          fileName: msg.file_name,
          fileType: msg.file_type,
          fileSize: msg.file_size,
          sender: {
            id: msg.sender_id,
            first_name: msg.sender_first_name,
            last_name: msg.sender_last_name
          },
          createdAt: msg.created_at,
          status: msg.status || 'sent',
          // Add signature data if it exists
          signature: msg.signature_id ? {
            id: msg.signature_id,
            title: msg.signature_title,
            notes: msg.signature_notes,
            dueDate: msg.signature_due_date,
            status: msg.signature_status,
            fileUrl: msg.signature_file_url,
            fileName: msg.signature_file_name,
            fileSize: msg.signature_file_size,
            signedBy: msg.signed_by_id ? {
              id: msg.signed_by_id,
              name: msg.signed_by_name,
              email: msg.signed_by_email
            } : null
          } : null
        }));
        
        // Sort messages by timestamp
        const sortedMessages = sortMessagesByTime(uiMessages);
        setMessages(sortedMessages);
        setCurrentOffset(totalMessageCount); // Inline Comment: Mark all rows as loaded so the load-more control knows nothing remains.
        setHasMoreMessages(false); // Inline Comment: Folder-triggered fetch loads everything, so we disable further pagination requests.
        
        // Store last message ID when messages are loaded from SQLite
        storeLastMessageId(sortedMessages);
        
        console.log('✅ Messages loaded from SQLite database');
      } else {
        console.log('📭 No messages found in SQLite database');
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

  // --- Store Last Message ID in AsyncStorage (MCP Context 7) ---
  // Business Rule: Store the ID of the last CONFIRMED message (sent status, not pending/offline)
  // CRITICAL: Only store server message IDs (integers), not Date.now() or offline IDs
  const storeLastMessageId = async (messages) => {
    if (messages && messages.length > 0) {
      try {
        // Find the latest message that has been confirmed as sent (not pending/offline)
        const confirmedMessages = messages.filter(msg => 
          msg.status === 'sent' && 
          !msg.id.toString().startsWith('offline_') &&
          !msg.id.toString().startsWith('db_') &&
          // CRITICAL: Only store integer IDs (server IDs), not Date.now() values
          !isNaN(parseInt(msg.id)) && parseInt(msg.id) < 1000000 // Server IDs are usually small integers
        );
        
        if (confirmedMessages.length === 0) {
          console.log('ℹ️ [ASYNCSTORAGE] No confirmed server messages found - not storing any ID');
          return;
        }
        
        // Get the first confirmed message (which is the latest due to inverted FlatList)
        const lastConfirmedMessage = confirmedMessages[0];
        const messageId = lastConfirmedMessage.id;
        
        console.log('🔍 [ASYNCSTORAGE] Messages array length:', messages.length);
        console.log('🔍 [ASYNCSTORAGE] Confirmed server messages count:', confirmedMessages.length);
        console.log('🔍 [ASYNCSTORAGE] Last confirmed message details:', {
          id: messageId,
          idType: typeof messageId,
          isInteger: !isNaN(parseInt(messageId)),
          content: lastConfirmedMessage.content ? lastConfirmedMessage.content.substring(0, 50) + '...' : '(no content)',
          sender: lastConfirmedMessage.sender?.first_name || 'Unknown',
          status: lastConfirmedMessage.status,
          createdAt: lastConfirmedMessage.createdAt
        });
        
        if (messageId && !isNaN(parseInt(messageId)) && parseInt(messageId) < 1000000) {
          await AsyncStorage.setItem('latestMessageId', messageId.toString());
          console.log('💾 [ASYNCSTORAGE] ✅ Successfully stored latest CONFIRMED server message ID:', messageId);
          console.log('💾 [ASYNCSTORAGE] 📱 Stored in AsyncStorage with key: "latestMessageId"');
        } else {
          console.log('⚠️ [ASYNCSTORAGE] Skipping invalid message ID:', messageId, '(not a valid server ID)');
        }
      } catch (error) {
        console.error('❌ [ASYNCSTORAGE] Failed to store message ID:', error);
        console.error('❌ [ASYNCSTORAGE] Error details:', error.message);
      }
    } else {
      console.log('📭 [ASYNCSTORAGE] No messages to store ID from');
    }
  };

  // --- Sync Signed Signatures from API (MCP Context 7) ---
  // Business Rule: Pull the latest signed forms from the server and overwrite any outdated local records.
  const syncSignedSignaturesFromAPI = async () => {
    // Inline Note: The guard prevents unnecessary work when the screen is initialising without a valid conversation.
    if (!conversationId) {
      console.log('⚠️ [SIGNED SYNC] No conversation ID available, skipping signed signatures sync');
      return;
    }

    let pendingSignatureIds = new Set();

    try {
      const pendingSignatureRows = db.getAllSync(
        `SELECT signature_id FROM messages_${conversationId} WHERE signature_status = 'pending' AND signature_id IS NOT NULL`
      );

      pendingSignatureIds = new Set(
        (pendingSignatureRows || [])
          .map((row) => row?.signature_id)
          .filter((id) => id !== null && id !== undefined)
          .map((id) => String(id))
      );
    } catch (pendingLookupError) {
      console.error('❌ [SIGNED SYNC] Unable to inspect pending signatures:', pendingLookupError);
      pendingSignatureIds = new Set();
    }

    if (pendingSignatureIds.size === 0) {
      console.log('ℹ️ [SIGNED SYNC] No pending signatures found locally – skipping server sync');
      return;
    }

    try {
      console.log('🔄 [SIGNED SYNC] Fetching signed signatures via getSignedSignatures()');
      
      // Inline Note: We rely on the shared service so the logic stays in one place per MCP context 7 guidelines.
      const signedSignatures = await getSignedSignatures();

      if (!Array.isArray(signedSignatures) || signedSignatures.length === 0) {
        console.log('ℹ️ [SIGNED SYNC] No signed signatures returned by API - nothing to update');
        return;
      }

      // Inline Note: Keep a map so we can update React state after SQLite writes complete.
      const signatureUpdatesMap = new Map();

      signedSignatures.forEach((signature) => {
        const signatureId = signature.id ?? signature.signatureId ?? null;

        if (!signatureId) {
          console.log('⚠️ [SIGNED SYNC] Signature entry missing ID, skipping update');
          return;
        }

        const signatureIdAsString = String(signatureId);

        if (!pendingSignatureIds.has(signatureIdAsString)) {
          return; // NOTE: Only reconcile forms we still expect to be pending locally.
        }

        // Inline Note: Only skip when a signature explicitly belongs to another conversation.
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
          console.log('ℹ️ [SIGNED SYNC] Signature', signatureId, 'belongs to conversation', signatureConversationId, '→ skipping for', conversationId);
          return;
        }

        const status = (signature.status ?? signature.signatureStatus ?? 'pending').toLowerCase();

        if (status !== 'signed') {
          console.log(`ℹ️ [SIGNED SYNC] Signature ${signatureIdAsString} is still ${status} on server – keeping local pending state`);
          return;
        }

        const fileUrl = signature.fileUrl ?? signature.file_url ?? null;
        const fileName = signature.fileName ?? signature.file_name ?? null;
        const fileSize = signature.fileSize ?? signature.file_size ?? null;

        // Inline Note: Normalise signer info so UI/components only handle one shape.
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

        // Inline Note: Persist the update for quick lookup during UI refresh.
        signatureUpdatesMap.set(String(signatureId), {
          status,
          fileUrl,
          fileName,
          fileSize,
          signedBy,
        });

        try {
          console.log('📝 [SIGNED SYNC] Updating SQLite record for signature:', signatureId);
          db.runSync(
            `
              UPDATE messages_${conversationId}
              SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
              WHERE signature_id = ?
            `,
            [
              status,
              fileUrl,
              fileName,
              fileSize,
              signedBy?.id ?? null,
              signedBy?.name ?? null,
              signedBy?.email ?? null,
              signatureId,
            ]
          );
        } catch (dbError) {
          console.error('❌ [SIGNED SYNC] Failed to update SQLite for signature:', signatureId, dbError);
        }
      });

      if (signatureUpdatesMap.size === 0) {
        console.log('ℹ️ [SIGNED SYNC] No valid signature updates were collected, skipping UI refresh');
        return;
      }

      // Inline Note: Refresh local state so the UI reflects the latest signed form metadata.
      setMessages((prevMessages) => {
        if (!prevMessages || prevMessages.length === 0) {
          console.log('ℹ️ [SIGNED SYNC] No messages in state to reconcile, skipping state update');
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

          console.log('🔁 [SIGNED SYNC] Applying signed updates to message:', message.id);

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

      console.log('✅ [SIGNED SYNC] Signed signatures synced successfully for conversation:', conversationId);
    } catch (error) {
      console.error('❌ [SIGNED SYNC] Unable to fetch signed signatures:', error);
    }
  };

  // --- Fetch New Messages After Last Message (MCP Context 7) ---
  // Business Rule: Get ALL new messages and add them to chat list one by one (WhatsApp-style)
  const fetchNewMessagesAfterLast = async () => {
    try {
      console.log('🔄 [NEW MESSAGES] Checking for new messages...');

      Keyboard.dismiss(); // NOTE: Avoid keyboard overlap while new messages sync runs (MCP Context 7 UX guard).
      
      // Get the last message ID from AsyncStorage
      const lastMessageId = await AsyncStorage.getItem('latestMessageId');
      
      if (!lastMessageId) {
        console.log('📭 [NEW MESSAGES] No last message ID found in AsyncStorage');
        return;
      }
      
      console.log('🔍 [NEW MESSAGES] Last message ID from AsyncStorage:', lastMessageId);
      console.log('🔍 [NEW MESSAGES] Conversation ID:', conversationId);
      
      // Fetch all pages automatically and add to chat list one by one
      let currentPage = 1;
      let totalPages = 1;
      let totalMessages = 0;
      
      console.log('📡 [NEW MESSAGES] Starting to fetch all pages automatically...');
      
      // Keep fetching until all pages are loaded
      while (currentPage <= totalPages) {
        console.log(`📄 [NEW MESSAGES] Fetching page ${currentPage}...`);
        
        // Call the API to get new messages for current page
        const response = await getMessageAfterLastMessage(conversationId, lastMessageId, currentPage, 20);
        
        console.log(`📨 [NEW MESSAGES] Page ${currentPage} response:`, response);
        
        // Extract messages from response object
        const pageMessages = response?.messages || [];
        totalPages = response?.totalPages || 1;
        totalMessages = response?.total || 0;
        
        console.log(`📊 [NEW MESSAGES] Page ${currentPage} info:`, {
          messagesInPage: pageMessages.length,
          totalPages: totalPages,
          totalMessages: totalMessages
        });
        
        // Add messages from this page to the chat list immediately (WhatsApp-style)
        if (pageMessages.length > 0) {
          console.log(`💬 [NEW MESSAGES] Adding ${pageMessages.length} messages from page ${currentPage} to chat list...`);
          
          // Store new messages in SQLite database first
          try {
            console.log(`💾 [NEW MESSAGES] Storing ${pageMessages.length} messages from page ${currentPage} in SQLite database...`);
            
            pageMessages.forEach(msg => {
              try {
                // Check if message already exists in database
                const existingMessage = db.getFirstSync(
                  `SELECT id FROM messages_${conversationId} WHERE id = ?`,
                  [msg.id]
                );
                
                if (!existingMessage) {
                  // Store message in SQLite database
                  // Use INSERT OR IGNORE to handle race condition
                  db.runSync(`
                    INSERT OR IGNORE INTO messages_${conversationId} (
                      id, conversation_id, content, file_uri, file_name, file_type, file_size,
                      sender_id, sender_first_name, sender_last_name, created_at, status,
                      signature_id, signature_title, signature_notes, signature_due_date, 
                      signature_status, signature_file_url, signature_file_name, signature_file_size,
                      signed_by_id, signed_by_name, signed_by_email
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    msg.id,
                    conversationId,
                    msg.content || null,
                    msg.fileUrl || null,
                    msg.fileName || null,
                    msg.fileType || null,
                    msg.fileSize || null,
                    msg.sender?.id || null,
                    msg.sender?.first_name || null,
                    msg.sender?.last_name || null,
                    msg.createdAt || new Date().toISOString(),
                    msg.status || 'sent',
                    msg.signature?.id || null,
                    msg.signature?.title || null,
                    msg.signature?.notes || null,
                    msg.signature?.dueDate || null,
                    msg.signature?.status || null,
                    msg.signature?.fileUrl || null,
                    msg.signature?.fileName || null,
                    msg.signature?.fileSize || null,
                    msg.signature?.signedBy?.id || null,
                    msg.signature?.signedBy?.name || null,
                    msg.signature?.signedBy?.email || null
                  ]);
                  
                  console.log(`✅ [NEW MESSAGES] Stored message ${msg.id} in database`);
                } else {
                  console.log(`ℹ️ [NEW MESSAGES] Message ${msg.id} already exists in database`);
                }
              } catch (error) {
                console.error(`❌ [NEW MESSAGES] Error storing message ${msg.id} in database:`, error);
              }
            });
            
            console.log(`✅ [NEW MESSAGES] Completed storing messages from page ${currentPage} in database`);
          } catch (error) {
            console.error(`❌ [NEW MESSAGES] Error storing messages from page ${currentPage} in database:`, error);
          }
          
          // Add new messages to the existing messages list (with duplicate checking)
          setMessages(prevMessages => {
            // Filter out messages that already exist (by ID)
            const existingMessageIds = new Set(prevMessages.map(msg => msg.id));
            const newUniqueMessages = pageMessages.filter(msg => !existingMessageIds.has(msg.id));
            
            console.log(`🔍 [NEW MESSAGES] Page ${currentPage} - Found ${pageMessages.length} messages, ${newUniqueMessages.length} are new (unique)`);
            
            if (newUniqueMessages.length > 0) {
              // Combine only new unique messages with existing messages and sort by time
              const combinedMessages = [...newUniqueMessages, ...prevMessages];
              const sortedMessages = sortMessagesByTime(combinedMessages);
              
              console.log(`✅ [NEW MESSAGES] Page ${currentPage} - Added ${newUniqueMessages.length} new messages to chat. Total messages in chat: ${sortedMessages.length}`);
              
              // Store the latest message ID from this page
              const latestMessageFromPage = newUniqueMessages[0]; // First message is latest due to sorting
              storeLastMessageId([latestMessageFromPage]);
              
              return sortedMessages;
            } else {
              console.log(`ℹ️ [NEW MESSAGES] Page ${currentPage} - No new unique messages to add (all already exist)`);
              return prevMessages; // No changes needed
            }
          });
          
          console.log(`📋 [NEW MESSAGES] Page ${currentPage} messages details:`, pageMessages.map(msg => ({
            id: msg.id,
            content: msg.content ? msg.content.substring(0, 30) + '...' : '(no content)',
            sender: msg.sender?.first_name || 'Unknown',
            createdAt: msg.createdAt,
            status: msg.status
          })));
        }
        
        console.log(`✅ [NEW MESSAGES] Page ${currentPage} loaded and added to chat list`);
        
        // Move to next page
        currentPage++;
        
        // Add a small delay between requests to avoid overwhelming the server
        if (currentPage <= totalPages) {
          console.log(`⏳ [NEW MESSAGES] Waiting 500ms before fetching page ${currentPage}...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('🎉 [NEW MESSAGES] All pages fetched and added to chat list successfully!');
      console.log('📊 [NEW MESSAGES] Final summary:', {
        totalPagesFetched: currentPage - 1,
        totalMessagesFromAPI: totalMessages
      });
      
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

  // --- Load Messages on Mount (MCP Context 7) ---
  // Fetch messages when component mounts and when conversationId changes
  useEffect(() => {
    console.log('🔄 UserChatScreen mounted or conversationId changed - calling API');
    
    // Reset initial load flag when conversationId changes
    setIsInitialLoadComplete(false);
    
    // First, try to load messages from SQLite database
    // Only fetch new messages if we already have messages in the database
    const loadMessagesAndCheckForNew = async () => {
      try {
        // Check if messages table exists and has data
        const tableCheck = db.getAllSync(`SELECT name FROM sqlite_master WHERE type='table' AND name='messages_${conversationId}'`);
        
        if (tableCheck.length > 0) {
          // Table exists - check if it has messages
          const messageCount = db.getFirstSync(`SELECT COUNT(*) as count FROM messages_${conversationId}`);
          
          if (messageCount && messageCount.count > 0) {
            console.log('📱 Database has messages - loading from SQLite and checking for new messages');
            // Load existing messages from SQLite
            await fetchMessages();
            // Then check for new messages after the last one
            await fetchNewMessagesAfterLast();
          } else {
            console.log('📱 Database exists but is empty - fetching all messages from API');
            // Database exists but is empty - fetch all messages from API
            await fetchMessages();
          }
        } else {
          console.log('📱 No database table - fetching all messages from API');
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

  // --- Load Messages on Focus (MCP Context 7) ---
  // REMOVED: Navigation focus listener to prevent automatic refresh when signature modal closes
  // The app already handles message updates via:
  // 1. Internet connectivity monitoring (sendOfflineMessages)
  // 2. Pusher real-time updates
  // 3. Manual message sending
  // This prevents unnecessary API calls and app refresh
  // useEffect(() => {
  //   const unsubscribe = navigation.addListener('focus', () => {
  //     console.log('📱 UserChatScreen focused - calling API to refresh messages');
  //     console.log('🔍 Current conversationId:', conversationId);
  //     if (conversationId) {
  //       fetchMessages();
  //       
  //       // Also check for new messages after the last stored message ID
  //       fetchNewMessagesAfterLast();
  //     } else {
  //       console.log('⚠️ No conversationId available on focus');
  //     }
  //   });

  //   return unsubscribe;
  // }, [navigation, conversationId]);


  // --- Send Pending Offline Messages When Internet Restored (MCP Context 7) ---
  const [isInternetRestored, setIsInternetRestored] = useState(false);
  const [isSendingOfflineMessages, setIsSendingOfflineMessages] = useState(false);

  // --- Signature Notification Targeting (MCP Context 7) ---
  // Business Rule: Mirror message notification logic so signature alerts reach the correct recipient.
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

  // --- Signature Conversation Type (MCP Context 7) ---
  // Business Rule: Pass explicit conversation type to downstream components for consistent notification payloads.
  const signatureConversationType = useMemo(() => {
    if (type) return type;
    if (conversation?.type) return conversation.type;
    return isGroupChat ? 'group' : 'private';
  }, [type, conversation, isGroupChat]);
  
  const sendOfflineMessages = async () => {
    // Prevent multiple calls
    if (isSendingOfflineMessages) {
      console.log('⚠️ Already sending offline messages, skipping...');
      return;
    }
    
    Keyboard.dismiss(); // NOTE: Close keyboard while queued offline messages sync to keep UI stable (MCP Context 7).
    messageInputRef.current?.blur(); // Ensure composer can't regain focus during sync.

    console.log('📡 Internet restored - checking for pending messages to send');
    setIsSendingOfflineMessages(true);
    setIsInternetRestored(true); // Set flag to indicate internet restoration
    
    try {
      // Get all pending messages from database
      const pendingMessages = db.getAllSync(
        `SELECT * FROM messages_${conversationId} WHERE status = 'pending' ORDER BY created_at ASC`
      );
      
      if (pendingMessages && pendingMessages.length > 0) {
        console.log(`📤 Found ${pendingMessages.length} pending messages to send`);
        
        // Debug: Show the order of messages being sent
        console.log('📋 Messages will be sent in this order:');
        pendingMessages.forEach((msg, index) => {
          console.log(`${index + 1}. Message: "${msg.content}" - Created: ${msg.created_at}`);
        });
        
        // Send messages one by one (sequentially)
        for (const msg of pendingMessages) {
          try {
            // Handle signature requests - send them to API when internet is restored
            if (msg.signature_id) {
              console.log(`📝 [${pendingMessages.indexOf(msg) + 1}/${pendingMessages.length}] Sending signature request: "${msg.signature_title}" to server...`);
              console.log(`📝 [DEBUG] Offline signature ID: ${msg.signature_id}, Title: "${msg.signature_title}", Notes: "${msg.signature_notes}"`);
              
              // Prepare signature data for API
              const signatureData = {
                title: msg.signature_title,
                notes: msg.signature_notes,
                dueDate: msg.signature_due_date
              };
              
              // Send signature request to API
              const signatureResponse = await createSignature(conversationId, signatureData);
              console.log('✅ Signature request sent successfully, server response:', JSON.stringify(signatureResponse, null, 2));
              
              // Extract data from server response
              const serverMessageId = signatureResponse?.id;
              const serverSignatureId = signatureResponse?.signature?.id;
              const serverSignature = signatureResponse?.signature;
              const serverSender = signatureResponse?.sender;
              
              console.log('🆔 Server Message ID:', serverMessageId);
              console.log('🆔 Server Signature ID:', serverSignatureId);
              
              if (serverMessageId && serverSignatureId) {
                // Replace offline message with complete server response data
                // CRITICAL FIX: Use the message ID (primary key) to ensure we update the exact offline record
                const offlineMessageId = msg.id; // The temporary offline message ID
                
                console.log(`🔄 [UPDATE] Updating offline signature record with ID: ${offlineMessageId} to server ID: ${serverMessageId}`);
                console.log(`🔄 [UPDATE] Offline signature_id: ${msg.signature_id} → Server signature_id: ${serverSignatureId}`);
                console.log(`🔄 [UPDATE] Server response signature data:`, JSON.stringify(serverSignature, null, 2));
                
                // First, verify the offline record exists before updating
                const offlineRecord = db.getFirstSync(
                  `SELECT id, status, signature_id FROM messages_${conversationId} WHERE id = ?`,
                  [offlineMessageId]
                );
                
                if (!offlineRecord) {
                  console.error(`❌ [UPDATE] Offline record with ID ${offlineMessageId} not found in database!`);
                  continue; // Skip this message if record not found
                } else {
                  console.log(`✅ [UPDATE] Found offline record:`, {
                    id: offlineRecord.id,
                    status: offlineRecord.status,
                    signature_id: offlineRecord.signature_id
                  });
                }
                
                // CRITICAL FIX: Update pending record in place so we preserve AUTOINCREMENT linkage while swapping to server IDs.
                const preservedTitle = serverSignature?.title || msg.signature_title || 'Contract for Signature';
                const preservedNotes = serverSignature?.notes || msg.signature_notes || null;
                const preservedDueDate = serverSignature?.dueDate || msg.signature_due_date || null;
                
                // Inline Comment: If Pusher already inserted the server row, remove that duplicate so this UPDATE can claim the ID cleanly.
                const existingServerRecord = db.getFirstSync(
                  `SELECT id FROM messages_${conversationId} WHERE id = ?`,
                  [serverMessageId]
                );
                
                if (existingServerRecord) {
                  console.log(`ℹ️ [UPDATE] Removing duplicate server row ${serverMessageId} before in-place update`);
                  db.runSync(
                    `DELETE FROM messages_${conversationId} WHERE id = ? AND id != ?`,
                    [serverMessageId, offlineMessageId]
                  );
                }
                
                db.runSync(
                  `UPDATE messages_${conversationId} SET
                    id = ?,
                    conversation_id = ?,
                    content = ?,
                    file_uri = ?,
                    file_name = ?,
                    file_type = ?,
                    file_size = ?,
                    sender_id = ?,
                    sender_first_name = ?,
                    sender_last_name = ?,
                    created_at = ?,
                    status = ?,
                    signature_id = ?,
                    signature_title = ?,
                    signature_notes = ?,
                    signature_due_date = ?,
                    signature_status = ?,
                    signature_file_url = ?,
                    signature_file_name = ?,
                    signature_file_size = ?,
                    signed_by_id = ?,
                    signed_by_name = ?,
                    signed_by_email = ?
                  WHERE id = ?`,
                  [
                    serverMessageId,
                    conversationId,
                    signatureResponse?.content || null,
                    signatureResponse?.fileUrl || null,
                    signatureResponse?.fileName || null,
                    signatureResponse?.fileType || null,
                    signatureResponse?.fileSize || null,
                    serverSender?.id || null,
                    serverSender?.first_name || null,
                    serverSender?.last_name || null,
                    signatureResponse?.createdAt || new Date().toISOString(),
                    signatureResponse?.status || 'sent',
                    serverSignatureId,
                    preservedTitle,
                    preservedNotes,
                    preservedDueDate,
                    serverSignature?.status || 'pending',
                    serverSignature?.fileUrl || null,
                    serverSignature?.fileName || null,
                    serverSignature?.fileSize || null,
                    null,
                    null,
                    null,
                    offlineMessageId
                  ]
                );
                
                const updatedRecord = db.getFirstSync(
                  `SELECT id, status, signature_id, signature_title FROM messages_${conversationId} WHERE id = ?`,
                  [serverMessageId]
                );
                
                if (updatedRecord) {
                  console.log(`✅ [UPDATE] Pending signature row updated in place:`, {
                    id: updatedRecord.id,
                    status: updatedRecord.status,
                    signature_id: updatedRecord.signature_id,
                    signature_title: updatedRecord.signature_title
                  });
                } else {
                  console.error(`❌ [UPDATE] Failed to locate updated signature row for server ID ${serverMessageId}`);
                }
                
                console.log(`🔄 [${pendingMessages.indexOf(msg) + 1}/${pendingMessages.length}] In-place updated offline signature with server response`);
                console.log(`🔄 [DEBUG] Updated signature: ${msg.signature_id} → ${serverSignatureId}`);
                
                // CRITICAL FIX: Preserve signature data from server response OR offline message
                // Use server data first, fallback to offline message data if server doesn't have it
                console.log(`📝 [UI UPDATE] Preserved signature data:`, {
                  title: preservedTitle,
                  notes: preservedNotes,
                  dueDate: preservedDueDate,
                  serverTitle: serverSignature?.title,
                  offlineTitle: msg.signature_title,
                  serverNotes: serverSignature?.notes,
                  offlineNotes: msg.signature_notes
                });
                
                // Update message in UI with complete server response
                // CRITICAL FIX: Match by offline message ID (not signature_id) to find the exact pending record
                setMessages(prevMessages => 
                  prevMessages.map(prevMsg => {
                    // Match by offline message ID - this is the exact record we just updated in database
                    const isOfflineSignature = (
                      String(prevMsg.id) === String(offlineMessageId) && 
                      prevMsg.status === 'pending' &&
                      prevMsg.signature // Ensure it's a signature message
                    );
                    
                    if (isOfflineSignature) {
                      console.log(`🔄 [UI] Replacing offline signature UI message ID ${offlineMessageId} with server ID ${serverMessageId}`);
                      console.log(`🔄 [UI] Preserving signature data - Title: "${preservedTitle}", Notes: "${preservedNotes}", DueDate: "${preservedDueDate}"`);
                      return { 
                        ...prevMsg, 
                        id: serverMessageId,
                        content: signatureResponse?.content || null,
                        fileUrl: signatureResponse?.fileUrl || null,
                        fileName: signatureResponse?.fileName || null,
                        fileType: signatureResponse?.fileType || null,
                        fileSize: signatureResponse?.fileSize || null,
                        sender: {
                          id: serverSender?.id,
                          first_name: serverSender?.first_name,
                          last_name: serverSender?.last_name,
                          name: `${serverSender?.first_name || ''} ${serverSender?.last_name || ''}`.trim(),
                          email: serverSender?.email
                        },
                        createdAt: signatureResponse?.createdAt,
                        status: signatureResponse?.status || 'sent',
                        signature: {
                          id: serverSignatureId,
                          title: preservedTitle, // Use preserved title (server or offline)
                          notes: preservedNotes, // Use preserved notes (server or offline)
                          dueDate: preservedDueDate, // Use preserved dueDate (server or offline)
                          status: serverSignature?.status || 'pending',
                          fileUrl: serverSignature?.fileUrl,
                          fileName: serverSignature?.fileName,
                          fileSize: serverSignature?.fileSize
                        },
                        serverResponse: signatureResponse
                      };
                    }
                    return prevMsg;
                  })
                );
                
                console.log('✅ Signature request updated in UI with complete server data');
              } else {
                console.log('⚠️ Missing server IDs in response, keeping as pending');
              }
              
              // Continue to next message (message already sent, no need for fixed delay)
              continue;
            }
            
            // Regular message (not signature request)
            console.log(`📤 Sending message: "${msg.content}" to server...`);
            
            // Prepare file object if exists
            let fileToSend = null;
            if (msg.file_uri) {
              fileToSend = {
                uri: msg.file_uri,
                name: msg.file_name,
                mimeType: msg.file_type,
                size: msg.file_size
              };
            }
            
            // Send message to API and wait for response
            const response = await sendMessage(conversationId, msg.content, fileToSend);
            console.log('✅ Message sent successfully, server response:', response);
            
            // Extract message ID from server response
            const serverMessageId = response?.id || response?.data?.id || response?.message?.id;
            console.log('🆔 Server message ID:', serverMessageId);
            console.log('📋 Full server response:', JSON.stringify(response, null, 2));
            
            if (serverMessageId) {
              const offlineMessageId = msg.id; // The temporary offline message ID
              
              console.log(`🔄 [UPDATE] Updating offline message in place - Old ID: ${offlineMessageId}, New ID: ${serverMessageId}`);
              
              const existingServerMessage = db.getFirstSync(
                `SELECT id FROM messages_${conversationId} WHERE id = ?`,
                [serverMessageId]
              );
              
              if (existingServerMessage) {
                console.log(`ℹ️ [UPDATE] Removing duplicate server row ${serverMessageId} before in-place update`);
                db.runSync(
                  `DELETE FROM messages_${conversationId} WHERE id = ? AND id != ?`,
                  [serverMessageId, offlineMessageId]
                );
              }
              
              db.runSync(
                `UPDATE messages_${conversationId} SET
                  id = ?,
                  conversation_id = ?,
                  content = ?,
                  file_uri = ?,
                  file_name = ?,
                  file_type = ?,
                  file_size = ?,
                  sender_id = ?,
                  sender_first_name = ?,
                  sender_last_name = ?,
                  created_at = ?,
                  status = ?,
                  signature_id = NULL,
                  signature_title = NULL,
                  signature_notes = NULL,
                  signature_due_date = NULL,
                  signature_status = NULL,
                  signature_file_url = NULL,
                  signature_file_name = NULL,
                  signature_file_size = NULL,
                  signed_by_id = NULL,
                  signed_by_name = NULL,
                  signed_by_email = NULL
                WHERE id = ?`,
                [
                  serverMessageId, 
                  conversationId,
                  response?.content || msg.content,
                  response?.fileUrl || msg.file_uri,
                  response?.fileName || msg.file_name,
                  response?.fileType || msg.file_type,
                  response?.fileSize || msg.file_size,
                  response?.sender?.id || msg.sender_id,
                  response?.sender?.first_name || msg.sender_first_name,
                  response?.sender?.last_name || msg.sender_last_name,
                  response?.createdAt || msg.created_at,
                  'sent',
                  offlineMessageId
                ]
              );
              
              console.log('🔄 Replaced SQLite message with server response in place');
              
              // Update message in UI with server response
              // Business Rule: Use server timestamp from API response
              // Match by offline message ID (more reliable than content + timestamp)
              // Extract server timestamp from response
              // Note: offlineMessageId is already declared above, reusing it here
              const serverCreatedAt = response?.createdAt; // Get server timestamp from response
              setMessages(prevMessages => {
                const updatedMessages = prevMessages.map(prevMsg => {
                  // Match by offline message ID first (most reliable)
                  const isOfflineMessage = (
                    String(prevMsg.id) === String(offlineMessageId) && 
                    prevMsg.status === 'pending'
                  );
                  
                  // Fallback: Match by content and timestamp if ID doesn't match
                  const isMatchingMessage = (
                    prevMsg.content === msg.content && 
                    prevMsg.createdAt === msg.created_at && 
                    prevMsg.status === 'pending'
                  );
                  
                  if (isOfflineMessage || isMatchingMessage) {
                    console.log(`🔄 [UI] Updating message - Offline ID: ${offlineMessageId}, Server ID: ${serverMessageId}, Content: "${msg.content}"`);
                    return { 
                      ...prevMsg, 
                      id: serverMessageId,
                      content: response?.content || prevMsg.content,
                      fileUrl: response?.fileUrl || prevMsg.fileUrl,
                      fileName: response?.fileName || prevMsg.fileName,
                      fileType: response?.fileType || prevMsg.fileType,
                      fileSize: response?.fileSize || prevMsg.fileSize,
                      createdAt: serverCreatedAt || prevMsg.createdAt, // Use server timestamp
                      status: 'sent',
                      serverResponse: response
                    };
                  }
                  
                  return prevMsg;
                });
                
                // Re-sort messages after update to ensure correct order
                return sortMessagesByTime(updatedMessages);
              });
              
              console.log('✅ Message updated in UI with server ID:', serverMessageId);
            } else {
              console.log('⚠️ No message ID in server response, keeping as pending');
            }
            
            // --- Notify Recipient (MCP Context 7) ---
            // Business Rule: Mirror the online send path so recipients still get alerts when offline messages flush.
            try {
              const conversationType = type || conversation?.type || 'private';
              const isGroup = conversationType === 'group' || isGroupChat;
              const messageTextForNotification =
                response?.content ||
                msg.content ||
                (response?.fileName || msg.file_name
                  ? `Sent a file: ${response?.fileName || msg.file_name}`
                  : 'Sent a message');

              if (isGroup) {
                const groupChatName = userName || conversation?.project?.name || 'Group Chat';
                const notificationData = {
                  title: 'New message',
                  message: messageTextForNotification,
                  conversationId,
                  fromUserName: groupChatName,
                  conversationType: 'group',
                };

                console.log('🔔 Offline group notification payload:', notificationData);
                console.log('🔔 createMessageNotification payload (offline/group):', JSON.stringify(notificationData));
                await createMessageNotification(notificationData);
                console.log('✅ Offline group message notification sent successfully');
              } else {
                let recipientUserId = null;

                if (conversation?.participants && conversation.participants.length > 0) {
                  const otherParticipant = conversation.participants.find(
                    participant => participant.user?.id?.toString() !== currentUserId?.toString()
                  );
                  recipientUserId = otherParticipant?.user?.id;
                }

                if (!recipientUserId && userId) {
                  recipientUserId = userId;
                }

                if (recipientUserId) {
                  const fromUserName = `${userInfo?.firstName || ''} ${userInfo?.lastName || ''}`.trim() || 'Unknown User';
                  const notificationData = {
                    title: 'New message',
                    message: messageTextForNotification,
                    conversationId,
                    assignedToUserId: Number(recipientUserId),
                    fromUserName,
                    conversationType: 'private',
                  };

                  console.log('🔔 Offline private notification payload:', notificationData);
                  console.log('🔔 createMessageNotification payload (offline/private):', JSON.stringify(notificationData));
                  await createMessageNotification(notificationData);
                  console.log('✅ Offline private message notification sent successfully');
                }
              }
            } catch (notificationError) {
              console.error('❌ Error sending offline message notification:', notificationError);
              // Do not interrupt the offline loop; message already synced.
            }

            // Message already sent (await sendMessage() waits for completion)
            // No fixed delay needed - will proceed to next message immediately

          } catch (error) {
            console.error('❌ Failed to send pending message:', error);
            console.error('❌ Error details:', error.message);
            // Keep message as pending for retry later
          }
        }
        
        // Count only regular messages (not signature requests)
        const regularMessagesCount = pendingMessages.filter(msg => !msg.signature_id).length;
        const signatureRequestsCount = pendingMessages.filter(msg => msg.signature_id).length;
        
        Toast.show({
          type: 'success',
          text1: 'Messages Sent',
          text2: `${regularMessagesCount} messages sent successfully${signatureRequestsCount > 0 ? `, ${signatureRequestsCount} signature requests kept offline` : ''}`,
          position: 'top',
          visibilityTime: 3000,
        });
      } else {
        console.log('📭 No pending messages found');
      }
      
      // Check SQLite database for pending messages and reset flag when none remain
      const checkAndResetFlag = () => {
        try {
          const remainingPendingMessages = db.getAllSync(
            `SELECT * FROM messages_${conversationId} WHERE status = 'pending'`
          );
          
          if (remainingPendingMessages.length === 0) {
            // No pending messages left, reset flag
            setIsInternetRestored(false);
            console.log('🔄 Internet restoration flag reset - no pending messages in database');
          } else {
            // Still have pending messages, check again in 2 seconds
            console.log(`📋 Still have ${remainingPendingMessages.length} pending messages, checking again...`);
            setTimeout(checkAndResetFlag, 2000);
          }
        } catch (error) {
          console.error('❌ Error checking pending messages:', error);
          // Reset flag anyway to prevent infinite checking
          setIsInternetRestored(false);
        }
      };
      
      // Start checking after a short delay
      setTimeout(checkAndResetFlag, 3000);
      
    } catch (error) {
      console.error('❌ Error handling pending messages:', error);
    } finally {
      // Reset the sending flag
      setIsSendingOfflineMessages(false);
    }
  };

  // --- Reload Messages When Internet Connection Changes (MCP Context 7) ---
  // Business Rule: Only send pending messages when internet is restored, don't reload all messages
  // Removed fetchMessages() call to prevent unnecessary API calls when navigating between screens

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

  // --- Fetch Conversation Signatures (MCP Context 7) ---
  // Business Rule: Fetch all signatures for the current conversation
  const fetchConversationSignatures = async () => {
    const currentConversationId = route.params?.conversationId;
    
    if (!currentConversationId) {
      console.log('❌ No conversation ID found');
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
      console.log('🔄 Fetching signatures for conversation:', currentConversationId);
      const response = await getSignaturesOfConversation(currentConversationId);
      
      if (response && Array.isArray(response)) {
        setConversationSignatures(response);
        console.log('✅ Signatures fetched successfully:', response.length, 'signatures');
        console.log('📝 First signature data:', response[0]);
      } else {
        setConversationSignatures([]);
        console.log('📭 No signatures found in conversation');
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

  // --- Handle Signature Card Tap (MCP Context 7) ---
  // Business Rule: Open signature detail view when card is tapped
  const handleSignatureCardTap = (signature) => {
    console.log('📝 Signature card tapped:', signature);
    console.log('📝 Requested by:', signature.requestedBy);
    console.log('📝 Signature from:', signature.signatureFrom);
    setSelectedSignature(signature);
    setSignatureDetailModalVisible(true);
  };

  // --- Handle Fetch All Files Event (MCP Context 7) ---
  // Business Rule: Listen for fetchAllFiles event from App.js header
  const handleFetchAllFiles = () => {
    console.log('📁 Received fetchAllFiles event in UserChatScreen');
    console.log('📁 Setting filesModalVisible to true');
    setFilesModalVisible(true);
    fetchConversationFiles();
  };

  const handleReloadFromSQLite = () => {
    try {
      const cachedMessages = db.getAllSync(
        `SELECT * FROM messages_${conversationId} ORDER BY datetime(created_at) ASC`
      );
      cachedMessages.forEach((msg, index) => {
        // Inline Comment: Print every field so troubleshooting can compare SQLite rows with API responses.
        console.log(`📁 [OFFLINE CACHE] Message ${index + 1} (full payload below):`);
        console.log(JSON.stringify(msg, null, 2));
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

  // --- Handle Fetch All Signatures Event (MCP Context 7) ---
  // Business Rule: Listen for fetchSignatures event from App.js header
  // Added guard to prevent automatic fetching during offline-to-online transition
  const handleFetchAllSignatures = () => {
    console.log('📝 Received fetchSignatures event in UserChatScreen');
    
    // Guard: Don't fetch signatures if we're currently processing offline messages
    // This prevents automatic signature fetching when internet comes back online
    if (isSendingOfflineMessages) {
      console.log('⚠️ [SIGNATURES] Skipping signature fetch - currently processing offline messages');
      return;
    }
    
    console.log('📝 Setting signaturesModalVisible to true');
    setSignaturesModalVisible(true);
    fetchConversationSignatures();
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

  // --- Event Listener for fetchSignatures (MCP Context 7) ---
  useEffect(() => {
    console.log('🔌 Setting up fetchSignatures event listener');
    // Listen for fetchSignatures event
    appEmitter.on('fetchSignatures', handleFetchAllSignatures);
    console.log('✅ Signatures event listener set up successfully');
    
    // Cleanup listener on unmount
    return () => {
      console.log('🔌 Cleaning up fetchSignatures event listener');
      appEmitter.off('fetchSignatures', handleFetchAllSignatures);
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
    const signatureChannelName = `conversation-signature-${conversationId}`;
    console.log('📡 [PUSHER] Setting up listener for:', channelName);
    console.log('📡 [PUSHER] Setting up signature listener for:', signatureChannelName);
    
    // Always try to get or create the channel
    let channel = pusher.channel(channelName);
    let signatureChannel = pusher.channel(signatureChannelName);
    
    if (!channel) {
      console.log('🆕 [PUSHER] Channel not found, subscribing now');
      channel = pusher.subscribe(channelName);
    } else {
      console.log('✅ [PUSHER] Using existing channel');
    }

    if (!signatureChannel) {
      console.log('🆕 [PUSHER] Signature channel not found, subscribing now');
      signatureChannel = pusher.subscribe(signatureChannelName);
    } else {
      console.log('✅ [PUSHER] Using existing signature channel');
    }

    // Define message handler
    const handleNewMessage = async (data) => {
      console.log('📨 [PUSHER] New message event received');
      const newMessage = data.message || data;

      // Basic validation
      if (!newMessage || !newMessage.id) {
        console.log('❌ [PUSHER] Invalid message - missing ID');
        return;
      }

      // Store latest message ID in AsyncStorage
      try {
        const messageId = newMessage.id;
        await AsyncStorage.setItem('latestMessageId', messageId.toString());
        console.log('💾 [ASYNCSTORAGE] Stored latest message ID:', messageId);
      } catch (error) {
        console.error('❌ [ASYNCSTORAGE] Failed to store message ID:', error);
      }

      // Check if it's a signature message
      const isSignatureMessage = !newMessage.content && newMessage.signature;
      
      // 🔍 COMPREHENSIVE SIGNATURE LOGGING
      console.log('========================================');
      console.log('📝 [PUSHER] FULL MESSAGE RESPONSE:');
      console.log('========================================');
      console.log('📨 Complete Message Object:', JSON.stringify(newMessage, null, 2));
      console.log('----------------------------------------');
      console.log('📝 Signature Data:', JSON.stringify(newMessage.signature, null, 2));
      console.log('----------------------------------------');
      console.log('📝 Signed By Info:', JSON.stringify(newMessage.signature?.signedBy, null, 2));
      console.log('========================================');
      
      console.log('📬 [PUSHER] Message details:', {
        id: newMessage.id,
        senderId: newMessage.sender?.id,
        senderName: `${newMessage.sender?.first_name} ${newMessage.sender?.last_name}`.trim(),
        content: newMessage.content ? `"${newMessage.content.substring(0, 30)}..."` : '(no content)',
        hasFile: !!newMessage.fileUrl,
        isSignatureMessage: isSignatureMessage,
        signatureTitle: isSignatureMessage ? newMessage.signature?.title : 'N/A',
        signatureStatus: isSignatureMessage ? newMessage.signature?.status : 'N/A',
        signatureId: newMessage.signature?.id,
        signatureFileUrl: newMessage.signature?.fileUrl,
        signatureFileName: newMessage.signature?.fileName,
        signatureFileSize: newMessage.signature?.fileSize,
        signedById: newMessage.signature?.signedBy?.id,
        signedByName: newMessage.signature?.signedBy?.name,
        signedByEmail: newMessage.signature?.signedBy?.email
      });

      // Add message to state
      setMessages((prevMessages) => {
        // Check if message already exists (by ID) - prevent duplicates
        const exists = prevMessages.some(msg => msg.id === newMessage.id);
        
        if (exists) {
          console.log('⚠️ [PUSHER] Message already exists in chat - updating signature data if needed');
          
          // Check if this is a signature update and update the database
          if (newMessage.signature?.id) {
            try {
              console.log('🔄 [PUSHER] Updating signature data in database for existing message');
              console.log('🔍 [PUSHER] Updating signature ID:', newMessage.signature.id);
              
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
              
              console.log('📊 [PUSHER] Values to be stored in database:', JSON.stringify(updateValues, null, 2));
              
              // Update by message ID first
              db.runSync(`
                UPDATE messages_${conversationId} 
                SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, 
                    signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
                WHERE id = ?
              `, [
                updateValues.signature_status,
                updateValues.signature_file_url,
                updateValues.signature_file_name,
                updateValues.signature_file_size,
                updateValues.signed_by_id,
                updateValues.signed_by_name,
                updateValues.signed_by_email,
                newMessage.id
              ]);
              
              console.log('✅ [PUSHER] Updated message with ID:', newMessage.id);
              
              // Also update by signature_id to catch any messages with the same signature
              db.runSync(`
                UPDATE messages_${conversationId} 
                SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, 
                    signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
                WHERE signature_id = ?
              `, [
                updateValues.signature_status,
                updateValues.signature_file_url,
                updateValues.signature_file_name,
                updateValues.signature_file_size,
                updateValues.signed_by_id,
                updateValues.signed_by_name,
                updateValues.signed_by_email,
                newMessage.signature.id
              ]);
              
              console.log('✅ [PUSHER] Updated signature with ID:', newMessage.signature.id);
              console.log('✅ [PUSHER] Signature data updated in database for existing message');
            } catch (error) {
              console.error('❌ [PUSHER] Error updating signature in database:', error);
            }
          }
          
          // Update the message in state with new signature data
          return prevMessages.map(msg => 
            (msg.id === newMessage.id || msg.signature?.id === newMessage.signature?.id) && newMessage.signature
              ? { ...msg, signature: newMessage.signature }
              : msg
          );
        }

        // --- Replace Pending Messages with Real Pusher Response (MCP Context 7) ---
        // Business Rule: If this is a message from current user, check if we have a pending message to replace
        const isMyMessage = String(newMessage.sender?.id) === String(currentUserIdRef.current);
        
        if (isMyMessage) {
          console.log('🔄 [PUSHER] This is my message - checking for pending message to replace');
          
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
            console.log('✅ [PUSHER] Found pending message to replace at index:', pendingMessageIndex);
            
            // Replace pending message with real message from Pusher
            const updatedMessages = [...prevMessages];
            updatedMessages[pendingMessageIndex] = newMessage;
            
            console.log('🔄 [PUSHER] Replaced pending message with real message from server');
            return sortMessagesByTime(updatedMessages);
          } else {
            console.log('ℹ️ [PUSHER] No matching pending message found - adding as new message');
          }
        }

        // Show message to all users (including current user's own messages)
        console.log('✅ [PUSHER] Adding message to chat from:', newMessage.sender?.first_name || 'Unknown');
        console.log('👤 [PUSHER] Message sender ID:', newMessage.sender?.id, 'Current user ID:', currentUserIdRef.current);

        // Add new message from other user and sort by timestamp
        if (isSignatureMessage) {
          console.log('✅ [PUSHER] Adding signature contract to chat from:', newMessage.sender?.first_name || 'Unknown');
        } else {
          console.log('✅ [PUSHER] Adding message to chat from:', newMessage.sender?.first_name || 'Unknown');
        }
        
        // --- Store Pusher Messages in Database (MCP Context 7) ---
        // Business Rule: Only store messages from OTHER users in database
        // Messages from current user are already stored when sent offline
        const isMyOwnMessage = String(newMessage.sender?.id) === String(currentUserIdRef.current);
        
        console.log('🔍 [PUSHER] Message ownership check:', {
          messageSenderId: newMessage.sender?.id,
          currentUserId: currentUserIdRef.current,
          messageSenderIdString: String(newMessage.sender?.id),
          currentUserIdString: String(currentUserIdRef.current),
          isMyOwnMessage: isMyOwnMessage
        });
        
        if (!isMyOwnMessage) {
          // Only store messages from other users
          try {
            console.log('✅ [PUSHER] Saving message from other user to database');
            console.log('🔍 [PUSHER] Signature data from newMessage:', newMessage.signature);
            console.log('🔍 [PUSHER] Full newMessage:', JSON.stringify(newMessage, null, 2));
            
            // Debug: Check if signature columns exist in database
            try {
              const tableInfo = db.getAllSync(`PRAGMA table_info(messages_${conversationId})`);
              const signatureColumns = tableInfo.filter(col => col.name.startsWith('signature_'));
              console.log('🔍 [PUSHER] Signature columns in database:', signatureColumns.map(col => col.name));
            } catch (e) {
              console.log('❌ [PUSHER] Could not check table structure:', e);
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
            
            console.log('🔍 [PUSHER] Data to store:', {
              conversation_id: dataToStore.conversation_id,
              content: dataToStore.content,
              sender_id: dataToStore.sender_id,
              status: dataToStore.status,
              signature_id: dataToStore.signature_id,
              signature_status: dataToStore.signature_status,
              signed_by_id: dataToStore.signed_by_id,
              signed_by_name: dataToStore.signed_by_name
            });
            
            // Check if message already exists (by ID or by signature_id)
            const existingMessage = db.getFirstSync(
              `SELECT id FROM messages_${conversationId} WHERE id = ?`,
              [newMessage.id]
            );
            
            // Also check if signature exists in database by signature_id
            let existingSignatureMessage = null;
            if (dataToStore.signature_id) {
              existingSignatureMessage = db.getFirstSync(
                `SELECT id FROM messages_${conversationId} WHERE signature_id = ?`,
                [dataToStore.signature_id]
              );
            }
            
            if (existingMessage || existingSignatureMessage) {
              // Message exists - UPDATE signature data if it's a signature message
              if (dataToStore.signature_id) {
                console.log('🔄 [PUSHER] Message exists, updating signature data');
                console.log('🔍 [PUSHER] Updating by message ID:', newMessage.id);
                console.log('🔍 [PUSHER] Updating by signature ID:', dataToStore.signature_id);
                
                // Update by message ID
                db.runSync(`
                  UPDATE messages_${conversationId} 
                  SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, 
                      signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
                  WHERE id = ?
                `, [
                  dataToStore.signature_status,
                  dataToStore.signature_file_url,
                  dataToStore.signature_file_name,
                  dataToStore.signature_file_size,
                  dataToStore.signed_by_id,
                  dataToStore.signed_by_name,
                  dataToStore.signed_by_email,
                  newMessage.id
                ]);
                
                // Also update by signature_id to catch any messages with the same signature
                db.runSync(`
                  UPDATE messages_${conversationId} 
                  SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, 
                      signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
                  WHERE signature_id = ?
                `, [
                  dataToStore.signature_status,
                  dataToStore.signature_file_url,
                  dataToStore.signature_file_name,
                  dataToStore.signature_file_size,
                  dataToStore.signed_by_id,
                  dataToStore.signed_by_name,
                  dataToStore.signed_by_email,
                  dataToStore.signature_id
                ]);
                
                console.log('✅ [PUSHER] Signature data updated in database by both message ID and signature ID');
              }
            } else {
              // Message doesn't exist - INSERT new message
              console.log('📝 [PUSHER] Inserting new message to database');
              db.runSync(`
                INSERT INTO messages_${conversationId} (
                  conversation_id, content, file_uri, file_name, file_type, file_size,
                  sender_id, sender_first_name, sender_last_name, created_at, status,
                  signature_id, signature_title, signature_notes, signature_due_date, 
                  signature_status, signature_file_url, signature_file_name, signature_file_size,
                  signed_by_id, signed_by_name, signed_by_email
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                dataToStore.conversation_id,
                dataToStore.content,
                dataToStore.file_uri,
                dataToStore.file_name,
                dataToStore.file_type,
                dataToStore.file_size,
                dataToStore.sender_id,
                dataToStore.sender_first_name,
                dataToStore.sender_last_name,
                dataToStore.created_at,
                dataToStore.status,
                dataToStore.signature_id,
                dataToStore.signature_title,
                dataToStore.signature_notes,
                dataToStore.signature_due_date,
                dataToStore.signature_status,
                dataToStore.signature_file_url,
                dataToStore.signature_file_name,
                dataToStore.signature_file_size,
                dataToStore.signed_by_id,
                dataToStore.signed_by_name,
                dataToStore.signed_by_email
              ]);
              console.log('✅ Pusher message from other user saved to database');
            }
          } catch (e) {
            console.log('❌ Database save failed for Pusher message:', e);
          }
        } else {
          // CRITICAL FIX: Update pending messages from current user when Pusher delivers them
          // Business Rule: When Pusher delivers our own message, update the database to replace pending with sent
          try {
            console.log('🔄 [PUSHER] This is my own message - checking for pending message to update in database');
            
            // Find any pending message with matching content and sender
            // We'll check timestamp difference in JavaScript for better reliability
            const allPendingMessages = db.getAllSync(
              `SELECT * FROM messages_${conversationId} 
               WHERE status = 'pending' 
               AND sender_id = ? 
               AND content = ?`,
              [currentUserIdRef.current, newMessage.content || '']
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
              
              console.log(`🔄 [PUSHER] Found pending message with ID ${offlineMessageId} - replacing with server ID ${newMessage.id}`);
              
              // Delete old pending message
              db.runSync(
                `DELETE FROM messages_${conversationId} WHERE id = ? AND status = 'pending'`,
                [offlineMessageId]
              );
              
              // Insert server message (with sent status)
              // Use INSERT OR IGNORE to handle race condition
              db.runSync(`
                INSERT OR IGNORE INTO messages_${conversationId} (
                  id, conversation_id, content, file_uri, file_name, file_type, file_size,
                  sender_id, sender_first_name, sender_last_name, created_at, status,
                  signature_id, signature_title, signature_notes, signature_due_date, 
                  signature_status, signature_file_url, signature_file_name, signature_file_size,
                  signed_by_id, signed_by_name, signed_by_email
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                newMessage.id,
                conversationId,
                newMessage.content || null,
                newMessage.fileUrl || null,
                newMessage.fileName || null,
                newMessage.fileType || null,
                newMessage.fileSize || null,
                newMessage.sender?.id || null,
                newMessage.sender?.first_name || null,
                newMessage.sender?.last_name || null,
                newMessage.createdAt || new Date().toISOString(),
                'sent',
                newMessage.signature?.id || null,
                newMessage.signature?.title || null,
                newMessage.signature?.notes || null,
                newMessage.signature?.dueDate || null,
                newMessage.signature?.status || null,
                newMessage.signature?.fileUrl || null,
                newMessage.signature?.fileName || null,
                newMessage.signature?.fileSize || null,
                newMessage.signature?.signedBy?.id || null,
                newMessage.signature?.signedBy?.name || null,
                newMessage.signature?.signedBy?.email || null
              ]);
              
              console.log(`✅ [PUSHER] Replaced pending message (ID: ${offlineMessageId}) with server message (ID: ${newMessage.id})`);
            } else {
              // Check if server message already exists (might have been inserted by sendOfflineMessages)
              const existingMessage = db.getFirstSync(
                `SELECT id, status FROM messages_${conversationId} WHERE id = ?`,
                [newMessage.id]
              );
              
              if (existingMessage) {
                // Just update status to 'sent' if it's not already
                if (existingMessage.status !== 'sent') {
                  db.runSync(
                    `UPDATE messages_${conversationId} SET status = 'sent' WHERE id = ?`,
                    [newMessage.id]
                  );
                  console.log(`✅ [PUSHER] Updated message status to 'sent' for ID: ${newMessage.id}`);
                }
              } else {
                // No pending message found and no server message - insert it
                console.log('📝 [PUSHER] No pending message found - inserting new server message');
                // Use INSERT OR IGNORE to handle race condition
                db.runSync(`
                  INSERT OR IGNORE INTO messages_${conversationId} (
                    id, conversation_id, content, file_uri, file_name, file_type, file_size,
                    sender_id, sender_first_name, sender_last_name, created_at, status,
                    signature_id, signature_title, signature_notes, signature_due_date, 
                    signature_status, signature_file_url, signature_file_name, signature_file_size,
                    signed_by_id, signed_by_name, signed_by_email
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  newMessage.id,
                  conversationId,
                  newMessage.content || null,
                  newMessage.fileUrl || null,
                  newMessage.fileName || null,
                  newMessage.fileType || null,
                  newMessage.fileSize || null,
                  newMessage.sender?.id || null,
                  newMessage.sender?.first_name || null,
                  newMessage.sender?.last_name || null,
                  newMessage.createdAt || new Date().toISOString(),
                  'sent',
                  newMessage.signature?.id || null,
                  newMessage.signature?.title || null,
                  newMessage.signature?.notes || null,
                  newMessage.signature?.dueDate || null,
                  newMessage.signature?.status || null,
                  newMessage.signature?.fileUrl || null,
                  newMessage.signature?.fileName || null,
                  newMessage.signature?.fileSize || null,
                  newMessage.signature?.signedBy?.id || null,
                  newMessage.signature?.signedBy?.name || null,
                  newMessage.signature?.signedBy?.email || null
                ]);
                console.log(`✅ [PUSHER] Inserted new server message with ID: ${newMessage.id}`);
              }
            }
          } catch (error) {
            console.error('❌ [PUSHER] Error updating database for my own message:', error);
          }
        }
        
        // Check for duplicates before adding
        const isDuplicate = prevMessages.some(msg => 
          String(msg.id) === String(newMessage.id) ||
          (msg.content === newMessage.content && 
           msg.createdAt === newMessage.createdAt && 
           String(msg.senderId) === String(newMessage.senderId))
        );

        // If duplicate, don't add
        if (isDuplicate) {
          console.log('⚠️ [PUSHER] Duplicate message detected - not adding to list');
          return prevMessages;
        }

        const updatedMessages = [...prevMessages, newMessage];
        const sortedMessages = sortMessagesByTime(updatedMessages);
        
        // Store the last message ID in AsyncStorage
        storeLastMessageId(sortedMessages);
        
        return sortedMessages;
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

    // Define signature message handler
    const handleSignatureMessage = async (data) => {
      console.log('📝 [PUSHER] Signature message event received');
      const rawSignatureMessage = data.message || data;

      // Basic validation
      if (!rawSignatureMessage || !rawSignatureMessage.id) {
        console.log('❌ [PUSHER] Invalid signature message - missing ID');
        return;
      }

      // Store latest message ID in AsyncStorage
      try {
        const messageId = rawSignatureMessage.id;
        await AsyncStorage.setItem('latestMessageId', messageId.toString());
        console.log('💾 [ASYNCSTORAGE] Stored latest signature message ID:', messageId);
      } catch (error) {
        console.error('❌ [ASYNCSTORAGE] Failed to store signature message ID:', error);
      }

      // --- Normalize Signature Message Structure (MCP Context 7) ---
      // Business Rule: Pusher sends flat structure, but UI expects nested structure
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
      
      console.log('📬 [PUSHER] Signature message details:', {
        id: signatureMessage.id,
        senderId: signatureMessage.sender?.id,
        senderName: `${signatureMessage.sender?.first_name} ${signatureMessage.sender?.last_name}`.trim(),
        hasSignature: !!signatureMessage.signature,
        signatureTitle: signatureMessage.signature?.title,
        signatureStatus: signatureMessage.signature?.status
      });

      // Add message to state
      setMessages((prevMessages) => {
        // CRITICAL FIX: Check if message already exists (by ID) - prevent duplicates
        const messageId = signatureMessage.messageId || signatureMessage.id;
        const exists = prevMessages.some(msg => String(msg.id) === String(messageId));
        
        if (exists) {
          console.log('⚠️ [PUSHER] Signature message already exists in chat - skipping duplicate (ID:', messageId, ')');
          return prevMessages;
        }

        // Get current user ID from ref
        const myUserId = currentUserIdRef.current;
        const messageSenderId = signatureMessage.sender?.id;

        // --- Replace Pending Signature Messages with Real Pusher Response (MCP Context 7) ---
        // Business Rule: If this is a signature from current user, check if we have a pending signature to replace
        // Also check if this message was already updated from offline (by checking server message ID)
        const isMySignature = String(messageSenderId) === String(myUserId);
        
        if (isMySignature) {
          console.log('🔄 [PUSHER] This is my signature - checking for pending signature to replace');
          
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
            console.log('✅ [PUSHER] Found pending signature to replace at index:', pendingSignatureIndex);
            console.log(`🔄 [PUSHER] Replacing message ID ${prevMessages[pendingSignatureIndex].id} with server ID ${messageId}`);
            
            // Replace pending signature with real signature from Pusher
            const updatedMessages = [...prevMessages];
            updatedMessages[pendingSignatureIndex] = signatureMessage;
            
            console.log('🔄 [PUSHER] Replaced pending signature with real signature from server');
            return sortMessagesByTime(updatedMessages);
          } else {
            console.log('ℹ️ [PUSHER] No matching pending signature found - adding as new signature');
          }
        }

        // Show signature contract to everyone (including the creator)
        console.log('✅ [PUSHER] Adding signature contract to chat from:', signatureMessage.sender?.first_name || 'Unknown');
        console.log('👤 [PUSHER] Message sender ID:', messageSenderId, 'Current user ID:', myUserId);
        console.log('📋 [PUSHER] Normalized signature message structure:', JSON.stringify(signatureMessage, null, 2));
        
        // --- Store Signature Message in Database (MCP Context 7) ---
        // Business Rule: Store signature requests in database for offline access
        try {
          console.log('📝 [PUSHER] Storing signature message in database');
          
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
          
          console.log('📝 [PUSHER] Signature data to store:', {
            conversation_id: signatureDataToStore.conversation_id,
            signature_id: signatureDataToStore.signature_id,
            signature_title: signatureDataToStore.signature_title,
            signature_status: signatureDataToStore.signature_status
          });
          
          // Use INSERT OR IGNORE to handle race condition
          db.runSync(`
            INSERT OR IGNORE INTO messages_${conversationId} (
              id, conversation_id, content, file_uri, file_name, file_type, file_size,
              sender_id, sender_first_name, sender_last_name, created_at, status,
              signature_id, signature_title, signature_notes, signature_due_date, 
              signature_status, signature_file_url, signature_file_name, signature_file_size,
              signed_by_id, signed_by_name, signed_by_email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            signatureMessage.messageId || signatureMessage.id, // Use messageId from Pusher response
            signatureDataToStore.conversation_id,
            signatureDataToStore.content,
            signatureDataToStore.file_uri,
            signatureDataToStore.file_name,
            signatureDataToStore.file_type,
            signatureDataToStore.file_size,
            signatureDataToStore.sender_id,
            signatureDataToStore.sender_first_name,
            signatureDataToStore.sender_last_name,
            signatureDataToStore.created_at,
            signatureDataToStore.status,
            signatureDataToStore.signature_id,
            signatureDataToStore.signature_title,
            signatureDataToStore.signature_notes,
            signatureDataToStore.signature_due_date,
            signatureDataToStore.signature_status,
            signatureDataToStore.signature_file_url,
            signatureDataToStore.signature_file_name,
            signatureDataToStore.signature_file_size,
            signatureDataToStore.signed_by_id,
            signatureDataToStore.signed_by_name,
            signatureDataToStore.signed_by_email
          ]);
          
          console.log('✅ [PUSHER] Signature message stored in database');
          
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
      console.log('📁 [PUSHER] Signature file upload event received:');
      console.log('📁 [PUSHER] Full response data:', JSON.stringify(data, null, 2));
      
      const { signatureId, fileUrl, status, fileName, fileSize, signedBy, createdAt } = data;
      
      if (!signatureId || !fileUrl) {
        console.log('❌ [PUSHER] Invalid signature file upload - missing signatureId or fileUrl');
        return;
      }

      console.log('📬 [PUSHER] Signature file upload details:', {
        signatureId,
        fileUrl,
        status,
        fileName,
        fileSize,
        signedBy: signedBy?.name || signedBy,
        createdAt,
        fullSignedBy: signedBy
      });

      // Extract signedBy information
      const signedById = signedBy?.id || null;
      const signedByName = signedBy?.name || null;
      const signedByEmail = signedBy?.email || null;

      // Update the signature in messages with the uploaded file
      setMessages((prevMessages) => {
        return prevMessages.map(msg => {
          if (msg.signature && msg.signature.id === signatureId) {
            console.log('✅ [PUSHER] Updating signature with file URL for signature ID:', signatureId);
            
            // --- Update Signature in Database (MCP Context 7) ---
            // Business Rule: Update signature status, file info, and signedBy info in database
            try {
              console.log('📝 [PUSHER] Updating signature in database for ID:', signatureId);
              
              db.runSync(`
                UPDATE messages_${conversationId} 
                SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, 
                    signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
                WHERE signature_id = ?
              `, [
                status || 'signed',
                fileUrl,
                fileName,
                fileSize || null,
                signedById,
                signedByName,
                signedByEmail,
                signatureId
              ]);
              
              console.log('✅ [PUSHER] Signature updated in database with all fields');
              
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
    channel.bind('typing', handleTypingEvent);
    signatureChannel.bind('message-with-signature', handleSignatureMessage);
    signatureChannel.bind('signature-file-uploaded', handleSignatureFileUpload);
    console.log('✅ [PUSHER] Listening for new messages and typing events on:', channelName);
    console.log('✅ [PUSHER] Listening for signature messages on:', signatureChannelName);
    console.log('✅ [PUSHER] Listening for signature file uploads on:', signatureChannelName);

    // Cleanup: Only unbind our listeners, don't unsubscribe
    // Let ChatScreen manage subscriptions
    return () => {
      console.log('🔌 [PUSHER] Unbinding listeners from:', channelName);
      console.log('🔌 [PUSHER] Unbinding signature listeners from:', signatureChannelName);
      channel.unbind('new-message', handleNewMessage);
      channel.unbind('typing', handleTypingEvent);
      signatureChannel.unbind('message-with-signature', handleSignatureMessage);
      signatureChannel.unbind('signature-file-uploaded', handleSignatureFileUpload);
      // Note: We do NOT unsubscribe - ChatScreen manages subscriptions
    };
  }, [conversationId]);


  // --- Simple Database Setup with Error Handling ---
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log('🔄 Initializing database for conversation:', conversationId);
        console.log('✅ Database connection established via context');
        
        // Create the messages table ONLY if it doesn't exist
        console.log('🔨 Checking if messages table exists for conversation:', conversationId);
        db.execSync(`
          CREATE TABLE IF NOT EXISTS messages_${conversationId} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT,
            content TEXT,
            file_uri TEXT,
            file_name TEXT,
            file_type TEXT,
            file_size INTEGER,
            sender_id TEXT,
            sender_first_name TEXT,
            sender_last_name TEXT,
            created_at TEXT,
            status TEXT DEFAULT 'sent',
            signature_id INTEGER,
            signature_title TEXT,
            signature_notes TEXT,
            signature_due_date TEXT,
            signature_status TEXT,
            signature_file_url TEXT,
            signature_file_name TEXT,
            signature_file_size INTEGER,
            signed_by_id TEXT,
            signed_by_name TEXT,
            signed_by_email TEXT
          )
        `);
        
        // Add missing columns if they don't exist (for existing tables)
        try {
          db.execSync(`ALTER TABLE messages_${conversationId} ADD COLUMN status TEXT DEFAULT 'sent'`);
          console.log('✅ Added status column to existing table');
        } catch (e) {
          // Column already exists, ignore error
          console.log('ℹ️ status column already exists');
        }
        
        try {
          db.execSync(`ALTER TABLE messages_${conversationId} ADD COLUMN conversation_id TEXT`);
          console.log('✅ Added conversation_id column to existing table');
        } catch (e) {
          // Column already exists, ignore error
          console.log('ℹ️ conversation_id column already exists');
        }
        
        // Add signature columns if they don't exist
        const signatureColumns = [
          'signature_id INTEGER',
          'signature_title TEXT', 
          'signature_notes TEXT',
          'signature_due_date TEXT',
          'signature_status TEXT',
          'signature_file_url TEXT',
          'signature_file_name TEXT',
          'signature_file_size INTEGER',
          'signed_by_id TEXT',
          'signed_by_name TEXT',
          'signed_by_email TEXT'
        ];
        
        signatureColumns.forEach(column => {
          try {
            db.execSync(`ALTER TABLE messages_${conversationId} ADD COLUMN ${column}`);
            console.log(`✅ Added ${column} column to existing table`);
          } catch (e) {
            // Column already exists, ignore error
            console.log(`ℹ️ ${column} column already exists`);
          }
        });
        
        
        
        console.log('✅ Messages table ready (created once only)');
        
        // Debug: Check table structure
        try {
          const tableInfo = db.getAllSync(`PRAGMA table_info(messages_${conversationId})`);
          console.log('🔍 Table structure for messages_${conversationId}:', tableInfo);
          console.log('📋 Available columns:', tableInfo.map(col => col.name));
        } catch (e) {
          console.log('❌ Could not get table info:', e);
        }

        // Delete entire database file and create fresh new one
        console.log('🗑️ Deleting old database file...');
        try {
          const dbName = `chat_${conversationId}.db`;
          const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
          await FileSystem.deleteAsync(dbPath, { idempotent: true });
          console.log(`✅ Deleted database file: ${dbName}`);
        } catch (error) {
          console.log('ℹ️ No database file to delete');
        }
      
        console.log('✅ Database setup completed for conversation', conversationId);
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
        console.error('❌ Error details:', error.message);
      }
    };

    initializeDatabase();
  }, [db, conversationId]);

  // --- Check What Tables Exist in SQLite Database ---
  const checkTablesInDatabase = () => {
    try {
      console.log('🔍 Checking what tables exist in SQLite database...');
      
      // Query to get all table names
      const tables = db.getAllSync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      console.log('=== TABLES IN DATABASE ===');
      console.log('Total tables found:', tables.length);
      
      if (tables.length === 0) {
        console.log('📭 No user tables found in database');
      } else {
        tables.forEach((table, index) => {
          console.log(`Table ${index + 1}:`, table.name);
          
          // Check how many records are in each table
          try {
            const count = db.getFirstSync(`SELECT COUNT(*) as count FROM ${table.name}`);
            console.log(`  └─ Records in ${table.name}:`, count.count);
          } catch (error) {
            console.log(`  └─ Error counting records in ${table.name}:`, error.message);
          }
        });
      }
      
      // Show database file location
      console.log('📁 Database Location:');
      console.log('  └─ File System Path:', FileSystem.documentDirectory + 'SQLite/');
      console.log('  └─ Database Name: chat_*.db files');
      console.log('=========================');
      
      return tables;
    } catch (error) {
      console.error('❌ Error checking tables:', error);
      return [];
    }
  };

  // --- Delete All Tables from SQLite Database ---
  const deleteAllTables = () => {
    try {
      console.log('🗑️ Deleting all tables from SQLite database...');
      
      // Get all table names first
      const tables = db.getAllSync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      console.log('=== DELETING TABLES ===');
      console.log('Tables to delete:', tables.length);
      
      if (tables.length === 0) {
        console.log('📭 No tables to delete');
      } else {
        tables.forEach((table, index) => {
          try {
            db.execSync(`DROP TABLE IF EXISTS ${table.name}`);
            console.log(`✅ Deleted table ${index + 1}: ${table.name}`);
          } catch (error) {
            console.log(`❌ Error deleting table ${table.name}:`, error.message);
          }
        });
      }
      
      console.log('✅ All tables deleted successfully');
      console.log('=========================');
      
    } catch (error) {
      console.error('❌ Error deleting tables:', error);
    }
  };

  // --- Get All Messages from Database with Better Error Handling ---
  const getAllMessagesFromDB = () => {
    try {
      console.log('🔄 Getting all messages from database...');
      console.log('✅ Database connection successful via context');
      
      // Get messages from database without clearing
      
      const messages = db.getAllSync(`SELECT * FROM messages_${conversationId} ORDER BY created_at DESC`);
      console.log('✅ Query executed successfully');
      
      console.log('=== ALL MESSAGES FROM DATABASE ===');
      console.log('Total messages:', messages.length);
      console.log('Table name:', `messages_${conversationId}`);
      
      if (messages.length === 0) {
        console.log('📭 No messages found in database');
      } else {
        messages.forEach((msg, index) => {
            console.log(`📨 Message ${index + 1}:`);
            console.log('  └─ ID:', msg.id);
            console.log('  └─ Content:', msg.content);
            console.log('  └─ File Name:', msg.file_name);
            console.log('  └─ File Type:', msg.file_type);
            console.log('  └─ File URL:', msg.file_uri);
            console.log('  └─ File Size:', msg.file_size);
            console.log('  └─ Sender ID:', msg.sender_id);
            console.log('  └─ Sender Name:', `${msg.sender_first_name} ${msg.sender_last_name}`);
            console.log('  └─ Created At:', msg.created_at);
            console.log('  └─ Status:', msg.status);
            console.log('  └─ Signature ID:', msg.signature_id);
            console.log('  └─ Signature Title:', msg.signature_title);
            console.log('  └─ Signature Notes:', msg.signature_notes);
            console.log('  └─ Signature Status:', msg.signature_status);
            console.log('  └─ Signature File URL:', msg.signature_file_url);
            console.log('  └─ Signature File Name:', msg.signature_file_name);
            console.log('  └─ Signature File Size:', msg.signature_file_size);
            console.log('  └─ Signed By ID:', msg.signed_by_id);
            console.log('  └─ Signed By Name:', msg.signed_by_name);
            console.log('  └─ Signed By Email:', msg.signed_by_email);
            console.log('  └─ ---');
        });
      }
      console.log('================================');
      
      return messages;
    } catch (error) {
      console.error('❌ Error getting messages from database:', error);
      console.error('❌ Error type:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      return [];
    }
  };

  // --- Internet Connectivity Monitoring Effect (MCP Context 7) ---
  // Business Rule: Send pending messages and fetch new messages when internet is restored
  useEffect(() => {
    if (netInfo.isConnected === true) {
      console.log('📡 Internet connection restored');
      
      // Send any pending offline messages only
      sendOfflineMessages();
      
      // Load messages from SQLite database (fast loading)
      console.log('📡 Loading messages from SQLite database after internet restoration');
      fetchMessages();
      
      // Also fetch new messages from API (after last stored message ID)
      console.log('📡 Fetching new messages from API after internet restoration');
      fetchNewMessagesAfterLast();
    }
  }, [netInfo.isConnected, conversationId]);

  // --- Test Function to Get All Messages ---
  // Call this function to see all messages in database
  useEffect(() => {
    // Uncomment the line below to automatically get all messages when component loads
    // getAllMessagesFromDB();
  }, []);

  // --- Test Button Handler ---
  const handleTestGetMessages = () => {
    console.log('🧪 Test button pressed - getting all messages from database');
    getAllMessagesFromDB();
  };

  // --- Test Offline Messages Handler ---
  const handleTestOfflineMessages = () => {
    console.log('🧪 Test offline messages button pressed');
    if (netInfo.isConnected === false) {
      console.log('📱 Currently offline - loading messages from SQLite');
      fetchMessages();
    } else {
      console.log('📡 Currently online - would load from API');
      Toast.show({
        type: 'info',
        text1: 'Online Mode',
        text2: 'Currently online - messages load from API. Turn off internet to test offline mode.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  // --- Clear Database Function ---
  // --- Cache Maintenance Controls (MCP Context 7) ---
  // Inline Note: Exposes manual purge so frontline staff can refresh stale chats while respecting existing clearDatabase helper.
  const clearDatabase = () => {
    try {
      console.log('🗑️ Clearing database...');
      
        // Delete all messages from the table
        db.runSync(`DELETE FROM messages_${conversationId}`);
      console.log('✅ Database cleared successfully');
      
      // --- Local State Reset (MCP Context 7) ---
      // Inline Comment: Also reset React state so UI matches the empty table immediately.
      setMessages([]);

      // Clear AsyncStorage message ID as well
      AsyncStorage.removeItem('latestMessageId');
      console.log('✅ AsyncStorage message ID cleared');
      
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
        { text: "Delete", style: "destructive", onPress: () => clearDatabase() }, // Inline Note: Calls existing wipe logic so behavior stays centralized.
      ]
    );
  };

  // --- Cleanup Typing Timeout on Unmount (MCP Context 7) ---
  // Business Rule: Clear typing timeout when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);


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


  // --- Handle Offline Signature Request (MCP Context 7) ---
  // Business Rule: Store signature requests in SQLite when offline, send when internet is restored
  // This ensures signature requests work offline just like regular messages
  const handleOfflineSignatureRequest = async (signatureData) => {
    console.log('📝 [OFFLINE] Storing signature request in database');
    console.log('🔍 [DEBUG] handleOfflineSignatureRequest - received signatureData:', signatureData);
    console.log('🔍 [DEBUG] handleOfflineSignatureRequest - dueDate value:', signatureData.dueDate);
    console.log('🔍 [DEBUG] handleOfflineSignatureRequest - dueDate type:', typeof signatureData.dueDate);
    console.log('🔍 [DEBUG] handleOfflineSignatureRequest - dueDate is null?', signatureData.dueDate === null || signatureData.dueDate === undefined);
    
    try {
      // Create signature request data matching Pusher response format
      // NOTE: ID is omitted so SQLite AUTOINCREMENT can provide the same numbering strategy as regular messages.
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
      
      // Store signature request in SQLite database
      console.log('📝 [OFFLINE] Inserting signature request with data:', {
        conversationId: signatureRequestData.conversation_id,
        title: signatureRequestData.signature_title,
        notes: signatureRequestData.signature_notes,
        dueDate: signatureRequestData.signature_due_date,
        status: signatureRequestData.signature_status,
        fileUrl: signatureRequestData.signature_file_url,
        fileName: signatureRequestData.signature_file_name,
        sender: {
          id: signatureRequestData.sender_id,
          name: `${signatureRequestData.sender_first_name} ${signatureRequestData.sender_last_name}`,
          email: userInfo?.email || 'unknown@email.com'
        },
        createdAt: signatureRequestData.created_at
      });
      
      db.runSync(`
        INSERT INTO messages_${conversationId} (
          conversation_id, content, file_uri, file_name, file_type, file_size,
          sender_id, sender_first_name, sender_last_name, created_at, status,
          signature_id, signature_title, signature_notes, signature_due_date, 
          signature_status, signature_file_url, signature_file_name, signature_file_size,
          signed_by_id, signed_by_name, signed_by_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        signatureRequestData.conversation_id,
        signatureRequestData.content,
        signatureRequestData.file_uri,
        signatureRequestData.file_name,
        signatureRequestData.file_type,
        signatureRequestData.file_size,
        signatureRequestData.sender_id,
        signatureRequestData.sender_first_name,
        signatureRequestData.sender_last_name,
        signatureRequestData.created_at,
        signatureRequestData.status,
        signatureRequestData.signature_id,
        signatureRequestData.signature_title,
        signatureRequestData.signature_notes,
        signatureRequestData.signature_due_date,
        signatureRequestData.signature_status,
        signatureRequestData.signature_file_url,
        signatureRequestData.signature_file_name,
        signatureRequestData.signature_file_size,
        signatureRequestData.signed_by_id,
        signatureRequestData.signed_by_name,
        signatureRequestData.signed_by_email
      ]);
      
      console.log('✅ [OFFLINE] Signature request stored in database');

      // Retrieve AUTOINCREMENT id to align with standard offline message handling
      const offlineInsertRow = db.getFirstSync(`SELECT last_insert_rowid() AS id`);
      let offlineMessageId = Number(offlineInsertRow?.id);
      if (!Number.isFinite(offlineMessageId) || offlineMessageId <= 0) {
        console.warn('⚠️ [OFFLINE] Could not read AUTOINCREMENT id for signature request; defaulting to 0');
        offlineMessageId = 0;
      }

      // Use a stable negative placeholder so later sync logic can identify this signature request.
      const offlineSignatureId = offlineMessageId === 0 ? null : -offlineMessageId;

      if (offlineSignatureId !== null) {
        db.runSync(
          `UPDATE messages_${conversationId} SET signature_id = ? WHERE id = ?`,
          [offlineSignatureId, offlineMessageId]
        );
      }
      
      // Create UI message object
      
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
      
      // Add signature request to UI immediately (with duplicate checking)
      setMessages(prevMessages => {
        // Check if message already exists (by ID) - prevent duplicates
        const exists = prevMessages.some(msg => msg.id === uiMessage.id);
        
        if (exists) {
          console.log('⚠️ [OFFLINE] Signature request already exists in chat - skipping duplicate (ID:', uiMessage.id, ')');
          return prevMessages;
        }
        
        const updatedMessages = [...prevMessages, uiMessage];
        const sortedMessages = sortMessagesByTime(updatedMessages);
        
        // DON'T store offline signature request ID in AsyncStorage - it hasn't been created on server yet
        console.log('ℹ️ [OFFLINE] Not storing offline signature request ID in AsyncStorage - request not created on server yet');
        
        console.log('✅ [OFFLINE] Signature request added to UI. Total messages:', sortedMessages.length);
        return sortedMessages;
      });
      
      // Show success message
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
        
        // Try to get table info to debug
        try {
          const tableInfo = db.getAllSync(`PRAGMA table_info(messages_${conversationId})`);
          console.log('🔍 [OFFLINE] Table structure:', tableInfo);
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

  // --- Simple Handle Send Message (MCP Context 7) ---
  // Business Rule: Store messages in SQLite when offline, send to API when online
  // This ensures message persistence and better offline/online synchronization
  const handleSendMessage = async () => {
    if (isSendingOfflineMessages) {
      console.log('⚠️ Offline sync in progress; disabling new sends until queue finishes');
      return;
    }
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
    console.log('Internet connected:', netInfo.isConnected);
    console.log('Current user ID:', currentUserId);
    console.log('User info:', userInfo);

    // Clear input and file immediately for better UX
    setInputText('');
    setSelectedFile(null);
    Keyboard.dismiss();
    setIsSendingMessage(true);

    // Stop typing status when sending message
    if (isUserTyping) {
      handleTypingStatus(false);
    }

    // CHECK INTERNET CONNECTION
    if (netInfo.isConnected === false) {
      // OFFLINE: Store message in SQLite database
      console.log('📡 No internet - storing message in SQLite database');
      console.log('🔍 [OFFLINE] Message data:', {
        conversationId: conversationId,
        messageText: messageText,
        hasFile: !!fileToSend,
        fileName: fileToSend?.name,
        currentUserId: currentUserId
      });
      
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
        
        // --- Offline Insert (MCP Context 7) ---
        // Inline Comment: Save the offline message immediately so the chat UI stays responsive even without connectivity.
        db.runSync(`
          INSERT INTO messages_${conversationId} (
            conversation_id, content, file_uri, file_name, file_type, file_size,
            sender_id, sender_first_name, sender_last_name, created_at, status,
            signature_id, signature_title, signature_notes, signature_due_date, 
            signature_status, signature_file_url, signature_file_name, signature_file_size,
            signed_by_id, signed_by_name, signed_by_email
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          messageData.conversation_id,
          messageData.content,
          messageData.file_uri,
          messageData.file_name,
          messageData.file_type,
          messageData.file_size,
          messageData.sender_id,
          messageData.sender_first_name,
          messageData.sender_last_name,
          messageData.created_at,
          messageData.status,
          messageData.signature_id || null,
          messageData.signature_title || null,
          messageData.signature_notes || null,
          messageData.signature_due_date || null,
          messageData.signature_status || null,
          messageData.signature_file_url || null,
          messageData.signature_file_name || null,
          messageData.signature_file_size || null,
          messageData.signed_by_id || null,
          messageData.signed_by_name || null,
          messageData.signed_by_email || null
        ]);
        
        console.log('✅ Message stored in SQLite database');
        // Inline Comment: Fetch the AUTOINCREMENT value so we never depend on device clocks for uniqueness.
        const offlineInsertRow = db.getFirstSync(`SELECT last_insert_rowid() AS id`);
        // Inline Comment: Coerce the SQLite response into a Number to align with the schema's INTEGER PRIMARY KEY type.
        let offlineMessageId = Number(offlineInsertRow?.id);
        if (!Number.isFinite(offlineMessageId)) {
          // NOTE: This should never happen; fallback keeps UI stable while we investigate.
          console.warn('⚠️ [OFFLINE] Could not read SQLite AUTOINCREMENT ID, falling back to 0');
          offlineMessageId = 0;
        }
        
        console.log('✅ [OFFLINE] Message successfully saved with DB-managed ID:', {
          id: offlineMessageId,
          idType: typeof offlineMessageId,
          content: messageText,
          status: 'pending',
          conversationId: conversationId
        });
        
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
            console.log('⚠️ [OFFLINE] Message already exists in chat - skipping duplicate (ID:', uiMessage.id, ')');
            return prevMessages;
          }
          
          const updatedMessages = [...prevMessages, uiMessage];
          const sortedMessages = sortMessagesByTime(updatedMessages);
          
          // DON'T store offline message ID in AsyncStorage - it hasn't been created on server yet
          console.log('ℹ️ [OFFLINE] Not storing offline message ID in AsyncStorage - message not created on server yet');
          
          console.log('✅ [OFFLINE] Message added to UI. Total messages:', sortedMessages.length);
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
    console.log('📡 Internet connected - sending to API and storing in database');
    console.log('🔍 [ONLINE] About to send message:', {
      conversationId: conversationId,
      messageText: messageText,
      hasFile: !!fileToSend,
      fileName: fileToSend?.name
    });

    try {
      console.log('📡 Sending message to API');
      const response = await sendMessage(conversationId, messageText, fileToSend);
      console.log('✅ Message sent successfully:', response);
      console.log('🔍 [ONLINE] API Response details:', {
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : 'No response',
        hasSignature: !!response?.signature,
        signatureData: response?.signature
      });
      
      // Extract data from server response
      const serverMessageId = response?.id; // 1006
      const serverContent = response?.content; // "hello shah this is me "
      const serverFileUrl = response?.fileUrl; // "https://eagle-eye.tor1.digitaloceanspaces.com/..."
      const serverFileName = response?.fileName; // "SameerYasirCV.pdf"
      const serverFileSize = response?.fileSize; // 0.04
      const serverFileType = response?.fileType; // "application/pdf"
      const serverCreatedAt = response?.createdAt; // "2025-10-24T17:11:56.996Z"
      const serverSender = response?.sender; // { id: 3, first_name: "Shah", last_name: "Malik s" }
      
      console.log('🆔 Server message ID:', serverMessageId);
      console.log('🆔 Server message ID type:', typeof serverMessageId);
      console.log('📋 Server content:', serverContent);
      console.log('📁 Server file:', serverFileName);
      console.log('📋 Full server response:', JSON.stringify(response, null, 2));
      
      // Debug: Check if message ID is being extracted correctly
      console.log('🔍 Debug - response.id:', response?.id);
      console.log('🔍 Debug - response.data?.id:', response?.data?.id);
      console.log('🔍 Debug - response.message?.id:', response?.message?.id);
      
      // Store message in SQLite database with server response
      // Business Rule: Use server timestamp from API response
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
        created_at: serverCreatedAt || new Date().toISOString(), // Use server timestamp
        status: 'sent'
      };
      
      // Store message in SQLite database with server message ID as primary ID
      // Use INSERT OR IGNORE to handle race condition with Pusher
      db.runSync(`
        INSERT OR IGNORE INTO messages_${conversationId} (
          id, conversation_id, content, file_uri, file_name, file_type, file_size,
          sender_id, sender_first_name, sender_last_name, created_at, status,
          signature_id, signature_title, signature_notes, signature_due_date, 
          signature_status, signature_file_url, signature_file_name, signature_file_size,
          signed_by_id, signed_by_name, signed_by_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        serverMessageId, // Use server message ID as primary ID
        messageData.conversation_id,
        messageData.content,
        messageData.file_uri,
        messageData.file_name,
        messageData.file_type,
        messageData.file_size,
        messageData.sender_id,
        messageData.sender_first_name,
        messageData.sender_last_name,
        messageData.created_at,
        messageData.status,
        messageData.signature_id || null,
        messageData.signature_title || null,
        messageData.signature_notes || null,
        messageData.signature_due_date || null,
        messageData.signature_status || null,
        messageData.signature_file_url || null,
        messageData.signature_file_name || null,
        messageData.signature_file_size || null,
        messageData.signed_by_id || null,
        messageData.signed_by_name || null,
        messageData.signed_by_email || null
      ]);
      
      console.log('✅ Message stored in SQLite database with server ID:', serverMessageId);
      console.log('🔍 Debug - Stored messageData.server_message_id:', messageData.server_message_id);
      console.log('🔍 Debug - Stored messageData.id (should be same):', messageData.id);
      
      // Update message status in UI to 'sent'
      setMessages(prevMessages => {
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
            console.log('🔄 Updating message status to sent:', {
              content: prevMsg.content,
              fileName: prevMsg.fileName,
              oldStatus: prevMsg.status,
              newStatus: 'sent',
              serverId: serverMessageId
            });
            
            return { 
              ...prevMsg, 
              id: serverMessageId,                    // 1006
              content: serverContent || prevMsg.content,           // "hello shah this is me "
              fileUrl: serverFileUrl || prevMsg.fileUrl,          // "https://eagle-eye.tor1.digitaloceanspaces.com/..."
              fileName: serverFileName || prevMsg.fileName,       // "SameerYasirCV.pdf"
              fileType: serverFileType || prevMsg.fileType,       // "application/pdf"
              fileSize: serverFileSize || prevMsg.fileSize,       // 0.04
              createdAt: serverCreatedAt || prevMsg.createdAt,    // Use server timestamp
              status: 'sent',                                     // "sent"
              serverResponse: response                            // Full server response
            };
          }
          
          return prevMsg;
        });
        
        // Store the last message ID in AsyncStorage
        storeLastMessageId(updatedMessages);
        
        return updatedMessages;
      });
      
      console.log('✅ Message status updated to sent in UI');
      // --- Send Message Notification (MCP Context 7) ---
      // Business Rule: Send notification for both group and private chats based on conversation type
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
          
          console.log('🔔 Notification Body (Group):', JSON.stringify(notificationData, null, 2));
          await createMessageNotification(notificationData);
          console.log('✅ Group message notification sent successfully');
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
            
            console.log('🔔 Sending private message notification:', notificationData);
            await createMessageNotification(notificationData);
            console.log('✅ Private message notification sent successfully');
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


  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Loading State (MCP Context 7) --- */}
      {/* NOTE: Spinner removed per UX request; we still hydrate data in background while rendering the list immediately. */}
      {/* 📨 Messages List */}
      {/* --- Local Cache Action Bar (MCP Context 7) --- */}
      <View className="px-5 pb-2 items-end">
        <TouchableOpacity
          onPress={handleClearMessagesPress}
          activeOpacity={0.7}
          className="p-2 rounded-full bg-white shadow-sm border border-gray-200"
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={dedupeMessagesById(messages)}
        inverted={true}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.1}
        renderItem={({ item }) => {
            // --- Message Ownership Logic (MCP Context 7) ---
            // Business Rule: Compare sender.id with current logged-in user's id
            // Convert both to string for comparison to handle data type mismatch
            // FIXED: Now currentUserId is guaranteed to be loaded, preventing left-side flicker
            const isMyMessage = String(item.sender?.id) === String(currentUserId);
            
            // NOTE: Verbose ownership logging removed to reduce console noise (MCP Context 7 logging hygiene).
            
            // --- Signature Contract Rendering (MCP Context 7) ---
            // Business Rule: Only show as contract form if it has signature data, NOT for regular file uploads
            // Handle both nested (item.signature) and flat (item.title, item.notes, etc.) structures
            
            // Check if it's a real signature contract (not null, not undefined)
            const hasRealSignature = item.signature && item.signature !== null && item.signature !== undefined;
            
            // Check if it has signature-related fields (title, notes, status) but NO file
            const hasSignatureFields = !item.content && (item.title || item.notes || item.status);
            const isFileUpload = item.fileUrl || item.file_name || item.fileType || item.file_url || item.file_type;
            
            // Only consider it signature data if it has REAL signature OR signature fields WITHOUT file
            const hasSignatureData = hasRealSignature || (hasSignatureFields && !isFileUpload);
            
            // NOTE: Removed verbose signature diagnostic log to keep console output lean (MCP Context 7 logging hygiene).
            
            // CRITICAL FIX: If it has file data, it's NOT a signature contract
            // Only show contract form if it has signature data AND is not a regular file upload
            // Additional check: If any file field exists, it's definitely not a signature contract
            if (!item.content && hasSignatureData && !isFileUpload && item && !item.fileUrl && !item.file_name && !item.fileType && !item.file_url && !item.file_type) {
              
              // --- Subscribe ALL Users to Signature Upload Channel (MCP Context 7) ---
              // Business Rule: Only subscribe to signature uploads for pending contracts
              const signatureId = item.signature?.id || item.signatureId || item.id;
              const signatureStatus = item.signature?.status || item.status;
              const signatureUploadChannelName = `signature-${signatureId}`;
              
              console.log('📡 [CONTRACT] Contract form displayed - Signature ID:', signatureId);
              console.log('📡 [CONTRACT] Contract status:', signatureStatus);
              
              // Only subscribe to signature upload events for pending contracts
              if (signatureId && signatureStatus !== 'signed') {
                console.log('📡 [CONTRACT] Contract is pending - subscribing to signature channel:', signatureUploadChannelName);
                
                const contractChannel = pusher.subscribe(signatureUploadChannelName);
                contractChannel.bind('signature-file-uploaded', (data) => {
                  console.log('🎯 [CONTRACT] Signature uploaded - updating contract for all users');
                  console.log('🎯 [CONTRACT] Upload data:', JSON.stringify(data, null, 2));
                  
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
                console.log('📡 [CONTRACT] Contract already signed - skipping signature channel subscription');
              }
              return (
                <View>
                <View className={`mb-4 px-5 ${isMyMessage ? 'items-end' : 'items-start'}`}>
                  <View 
                    className="bg-white rounded-xl p-4"
                    style={{
                      width: '70%', // Reduced width from 85% to 70%
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
                        <Text className="text-[14px] font-bold text-[#333]">Contract for Signature</Text>
                      </View>
                    </View>

                    {/* Contract Title */}
                    <View className="mb-4">
                      <Text className="text-[12px] font-semibold text-[#333] mb-2">Document Title</Text>
                      <Text className="text-[11px] text-[#333] bg-[#f8f9fa] p-3 rounded-lg">
                        {item.signature?.title || item.title || 'Contract for Signature'}
                      </Text>
                    </View>

                    {/* Contract Notes */}
                    {(item.signature?.notes || item.notes) && (
                      <View className="mb-4">
                        <Text className="text-[12px] font-semibold text-[#333] mb-2">Instructions</Text>
                        <Text className="text-[11px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                          {item.signature?.notes || item.notes}
                        </Text>
                      </View>
                    )}

                    {/* Due Date */}
                    {(item.signature?.dueDate || item.dueDate) && (
                      <View className="mb-4">
                        <Text className="text-[12px] font-semibold text-[#333] mb-2">Due Date</Text>
                        <Text className="text-[11px] text-[#666] bg-[#f8f9fa] p-3 rounded-lg">
                          {(() => {
                            // Fix timezone issue: Parse date string as local date, not UTC
                            const dateString = item.signature?.dueDate || item.dueDate;
                            if (!dateString) return '';
                            
                            // If date is in YYYY-MM-DD format, parse as local date
                            if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                              const [year, month, day] = dateString.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day); // month is 0-indexed
                              return localDate.toLocaleDateString();
                            }
                            
                            // Otherwise, use standard Date parsing
                            return new Date(dateString).toLocaleDateString();
                          })()}
                        </Text>
                      </View>
                    )}

                    {/* Contract Actions */}
                    <View className="mt-4">
                      {/* Sign Contract Button - Only show for receiver when not signed */}
                      {!isMyMessage && (item.signature?.status || item.status) !== 'signed' ? (
                        <TouchableOpacity
                          className="w-full bg-black rounded-lg py-3 items-center"
                          activeOpacity={0.7}
                          onPress={() => {
                            // Get signature ID from the message
                            const signatureId = item.signature?.id || item.signatureId || item.id;
                            console.log('🔍 [SIGNATURE] Signature ID for upload channel:', signatureId);
                            
                            // Subscribe to the signature-specific channel for file uploads
                            const signatureUploadChannelName = `signature-${signatureId}`;
                            console.log('📡 [PUSHER] Subscribing to signature upload channel:', signatureUploadChannelName);
                            
                            const signatureUploadChannel = pusher.subscribe(signatureUploadChannelName);
                            
                            // Listen for signature file upload events
                            signatureUploadChannel.bind('signature-file-uploaded', (data) => {
                              console.log('🎯 [PUSHER] Signature file uploaded for ID:', signatureId);
                              console.log('🎯 [PUSHER] Upload data:', JSON.stringify(data, null, 2));
                              
                              // Update the message with the uploaded signature file
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
                            
                            // Navigate to signature screen
                            console.log('Navigating to signature screen for contract:', item.signature?.title || item.title);
                            navigation.navigate('SignatureScreen', {
                              signatureData: {
                                title: item.signature?.title || item.title,
                                notes: item.signature?.notes || item.notes,
                                dueDate: item.signature?.dueDate || item.dueDate,
                                contractId: item.id
                              },
                              onSignatureComplete: async (signatureData) => {
                                try {
                                  console.log('Signature completed:', signatureData);
                                  console.log('Signature image name:', signatureData?.fileName || signatureData?.name || 'Unknown');
                                  console.log('Signature image type:', signatureData?.type || signatureData?.mimeType || 'Unknown');
                                  console.log('Signature image size:', signatureData?.size || 'Unknown');
                                  
                                  // Call submitSignature API with contract ID
                                  const contractId = item.signature?.id || item.signatureId || item.id; // Use signature ID as contract ID
                                  console.log('Submitting signature for contract ID:', contractId);
                                  
                                  const result = await submitSignature(contractId, signatureData);
                                  console.log('✅ Signature submitted successfully:', result);
                                  
                                  // Update database with signature data from API response
                                  try {
                                    console.log('🔄 [SIGNATURE] Updating database with API response');
                                    console.log('🔍 [SIGNATURE] Original signature ID:', contractId);
                                    console.log('🔍 [SIGNATURE] API response signature ID:', result.id);
                                    console.log('🔍 [SIGNATURE] API response data:', JSON.stringify(result, null, 2));
                                    
                                    // Extract data from API response
                                    const apiSignatureData = {
                                      signature_status: result.status || 'signed',
                                      signature_file_url: result.fileUrl || null,
                                      signature_file_name: result.fileName || null,
                                      signature_file_size: result.fileSize || null,
                                      signed_by_id: result.signatureFrom?.id || null,
                                      signed_by_name: result.signatureFrom?.name || null,
                                      signed_by_email: result.signatureFrom?.email || null
                                    };
                                    
                                    console.log('📊 [SIGNATURE] Data to update in database:', JSON.stringify(apiSignatureData, null, 2));
                                    
                                    // Update by original signature ID (contractId)
                                    db.runSync(`
                                      UPDATE messages_${conversationId} 
                                      SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, 
                                          signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
                                      WHERE signature_id = ?
                                    `, [
                                      apiSignatureData.signature_status,
                                      apiSignatureData.signature_file_url,
                                      apiSignatureData.signature_file_name,
                                      apiSignatureData.signature_file_size,
                                      apiSignatureData.signed_by_id,
                                      apiSignatureData.signed_by_name,
                                      apiSignatureData.signed_by_email,
                                      contractId // Update by original signature ID
                                    ]);
                                    
                                    console.log('✅ [SIGNATURE] Database updated successfully');
                                  } catch (dbError) {
                                    console.error('❌ [SIGNATURE] Error updating database:', dbError);
                                  }
                                  
                                  // Update the message status to signed
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
                                              signedBy: result.signatureFrom
                                            }
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
                              }
                            });
                          }}
                        >
                          <Text className="text-white text-sm font-semibold">Sign Contract</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Signature Display - Show when signed */}
                    {(item.signature?.status || item.status) === 'signed' && (item.signature?.fileUrl || item.fileUrl) && (
                      <View className="mt-4 pt-4 border-t border-[#e5e7eb]">
                        <Text className="text-[12px] font-semibold text-[#333] mb-3">Digital Signature</Text>
                         <TouchableOpacity 
                           onPress={() => handleOpenImage(item.signature?.fileUrl || item.fileUrl)}
                           activeOpacity={0.9}
                         >
                           <View className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                             <Image
                               source={{ uri: item.signature?.fileUrl || item.fileUrl }}
                               style={{
                                 width: '100%',
                                 height: 120,
                                 resizeMode: 'contain',
                               }}
                             />
                           </View>
                         </TouchableOpacity>
                      </View>
                    )}

                    {/* Contract Status */}
                    <View className="mt-4 pt-3 border-t border-gray-200">
                      <View className="flex-row items-center justify-between">
                        {/* Time and Tick Icon - Inside the card */}
                        <View className="flex-row items-center">
                          <Text className="text-[10px] text-gray-500">
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
                          
                          {/* Show tick icon for my messages inside the card */}
                          {isMyMessage && (
                            <View className="ml-1">
                              {item.status === 'pending' ? (
                                <Ionicons name="time-outline" size={10} color="#F59E0B" />
                              ) : item.status === 'offline' ? (
                                <Ionicons name="time-outline" size={10} color="#F59E0B" />
                              ) : item.status === 'sending' ? (
                                <Ionicons name="time-outline" size={10} color="#6B7280" />
                              ) : item.status === 'failed' ? (
                                <Ionicons name="close-circle" size={10} color="#EF4444" />
                              ) : (
                                <Ionicons name="checkmark-done" size={10} color="#10B981" />
                              )}
                            </View>
                          )}
                        </View>
                        
                        {/* Status Badge */}
                        <View 
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: (item.signature?.status || item.status) === 'signed' ? '#d1fae5' : '#fef3c7' }}
                        >
                          <Text 
                            className="text-[10px] font-semibold"
                            style={{ color: (item.signature?.status || item.status) === 'signed' ? '#059669' : '#d97706' }}
                          >
                            {(item.signature?.status || item.status) === 'signed' ? 'SIGNED' : 'PENDING'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
                
                {/* REMOVED: Time display below card - now shown inside the card itself */}
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
                  
                  {/* Message Time and Status - Display below every message */}
                  <View className={`flex-row items-center mt-1 ${
                    isMyMessage ? 'justify-end mr-2' : 'justify-start ml-2'
                  }`}>
                    <Text className="text-xs text-gray-500">
                      {formatTime(item.createdAt)}
                    </Text>
                    
                    {/* Message Status Indicator for my messages (MCP Context 7) */}
                    {/* Business Rule: Show different icons for different message states */}
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
          className="flex-1"
          contentContainerStyle={{
            paddingTop: 90 + (insets.bottom || 0), // For inverted list, paddingTop = visual bottom padding (clears input bar + safe area)
            paddingBottom: 16, // For inverted list, paddingBottom = visual top padding
            paddingHorizontal: 8,
            flexGrow: 1
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={() => (
            // Loading indicator for pagination (appears at top due to inverted FlatList)
            isLoadingMoreMessages ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#000000" />
                <Text className="text-xs text-gray-500 mt-2">Loading older messages...</Text>
              </View>
            ) : null
          )}
      />


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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
              disabled={isSendingMessage || isLoadingMessages}
              className="mr-2"
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={28} color="#000000" />
            </TouchableOpacity>

            {/* Request Signature Button - Only show in individual chats */}
            {!isGroupChat && (
              <TouchableOpacity
                onPress={() => setSignatureModalVisible(true)}
                disabled={isSendingMessage || isLoadingMessages}
                className="mr-2"
                activeOpacity={0.7}
              >
                <Ionicons name="create" size={28} color="#3155A1" />
              </TouchableOpacity>
            )}

            {/* View Local Messages Shortcut */}
            <TouchableOpacity
              onPress={handleReloadFromSQLite}
              disabled={isSendingMessage || isLoadingMessages}
              className="mr-2"
              activeOpacity={0.7}
            >
              <Ionicons name="folder-open-outline" size={24} color="#3155A1" />
            </TouchableOpacity>

            {/* Clear Cached Messages Shortcut */}
            <TouchableOpacity
              onPress={handleClearMessagesPress}
              disabled={isSendingMessage || isLoadingMessages}
              className="mr-2"
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>

            <TextInput
              ref={messageInputRef}
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
              editable={!isSendingMessage && !isLoadingMessages && !isSendingOfflineMessages}
              onFocus={() => {
                if (isSendingOfflineMessages) {
                  messageInputRef.current?.blur();
                }
              }}
            />

            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={(!inputText.trim() && !selectedFile) || isSendingMessage || isLoadingMessages || isSendingOfflineMessages}
              className={`ml-3 w-9 h-9 rounded-full items-center justify-center ${
                (inputText.trim() || selectedFile) && !isSendingMessage && !isLoadingMessages && !isSendingOfflineMessages ? "bg-black" : "bg-gray-300"
              }`}
              activeOpacity={0.7}
            >
              {isSendingMessage || isSendingOfflineMessages ? (
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

      {/* All Files Modal (MCP Context 7) */}
      <AllFilesModal
        visible={filesModalVisible}
        onClose={() => {
          console.log('📁 Files modal closed');
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

      {/* All Signatures Modal (MCP Context 7) */}
      <AllSignaturesModal
        visible={signaturesModalVisible}
        onClose={() => {
          console.log('📝 Signatures modal closed');
          setSignaturesModalVisible(false);
        }}
        signatures={conversationSignatures}
        isLoading={isLoadingSignatures}
        onSignaturePress={(signature) => handleSignatureCardTap(signature)}
      />

      {/* Signature Detail Modal (MCP Context 7) */}
      <SignatureDetailModal
        visible={signatureDetailModalVisible}
        onClose={() => {
          console.log('📝 Signature detail modal closed');
          setSignatureDetailModalVisible(false);
          setSelectedSignature(null);
        }}
        signature={selectedSignature}
        onImagePress={(imageUrl) => handleOpenImage(imageUrl)}
      />

      {/* Request Signature Modal (MCP Context 7) */}
      {/* Business Rule: Handle both online and offline signature requests */}
      <SignatureRequestModal
        visible={signatureModalVisible}
        onClose={() => setSignatureModalVisible(false)}
        conversationId={conversationId}
        onSuccess={(result) => {
          console.log('✅ Signature request created successfully:', result);
          
          // Note: Database storage is handled by Pusher handler (handleSignatureMessage)
          // This callback only provides immediate feedback to user
          // The actual message will appear in chat via Pusher real-time update
          
          console.log('📝 Signature request sent to server - waiting for Pusher update...');
        }}
        onOfflineRequest={handleOfflineSignatureRequest}
        recipientUserId={signatureRecipientUserId}
        conversationType={signatureConversationType}
      />

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
