import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { getUserConversations } from "../services/chats/getConversation";
import SelectUserModal from "../components/SelectUserModal";
import HomeBottomNav from "../components/HomeBottomNav";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import pusher from "../pusherClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getInitials = (name) => {
  if (!name) return "?";
  const nameParts = name.trim().split(" ");
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  return (
    nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
  ).toUpperCase();
};

const getAvatarColor = (name) => {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const ChatScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isSelectUserModalVisible, setIsSelectUserModalVisible] =
    useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});
  const searchInputRef = useRef(null);

  const subscribedChannelsRef = useRef(new Set());

  const { userInfo } = useAuth();
  const currentUserId = userInfo?.id;

  const saveMessageCount = async (conversationId, count) => {
    try {
      const counts = await AsyncStorage.getItem("messageCounts");
      const countsObj = counts ? JSON.parse(counts) : {};
      countsObj[conversationId] = count;
      await AsyncStorage.setItem("messageCounts", JSON.stringify(countsObj));
    } catch (error) {
      console.error("Error saving message count:", error);
    }
  };

  const getMessageCount = async (conversationId) => {
    try {
      const counts = await AsyncStorage.getItem("messageCounts");
      const countsObj = counts ? JSON.parse(counts) : {};
      return countsObj[conversationId] || 0;
    } catch (error) {
      console.error("Error getting message count:", error);
      return 0;
    }
  };

  const processConversations = (response) => {
    if (response && Array.isArray(response)) {
      const formattedConversations = response.map((conversation) => {
        let displayName = "Unknown User";

        if (conversation.type === "group" && conversation.project?.name) {
          displayName = conversation.project.name;
        } else {
          let otherParticipantUser = null;

          if (
            conversation.participants &&
            conversation.participants.length > 0
          ) {
            const otherParticipant = conversation.participants.find(
              (participant) =>
                participant.user?.id?.toString() !== currentUserId?.toString()
            );

            otherParticipantUser =
              otherParticipant?.user || conversation.participants[0]?.user;
          }

          const firstName = otherParticipantUser?.first_name || "";
          const lastName = otherParticipantUser?.last_name || "";
          const email = otherParticipantUser?.email || "";
          displayName =
            `${firstName} ${lastName}`.trim() || email || "Unknown User";
        }

        const lastMessage =
          conversation.messages?.[conversation.messages?.length - 1];
        const hasFile = lastMessage?.fileUrl ? true : false;
        const fileType = lastMessage?.fileType || "";
        const fileName = lastMessage?.fileName || "";

        let lastMessageText = lastMessage?.content || "";

        const isSignatureMessage =
          !lastMessage?.content && lastMessage?.signature;

        if (isSignatureMessage) {
          lastMessageText = "📄 ✍️";
        } else if (lastMessage?.fileUrl) {
          const hasImage = lastMessage.fileType?.startsWith("image/");

          if (hasImage) {
            lastMessageText = lastMessageText
              ? `📷 ${lastMessageText}`
              : "📷 Photo";
          } else {
            const fileNameToShow = lastMessage.fileName || "File";
            lastMessageText = lastMessageText
              ? `📎 ${lastMessageText}`
              : `📎 ${fileNameToShow}`;
          }
        } else if (!lastMessageText) {
          lastMessageText = "No message yet";
        }

        const timestamp = conversation.createdAt
          ? new Date(conversation.createdAt).toLocaleString()
          : "Just now";

        return {
          id: conversation.id?.toString(),
          name: displayName,
          lastMessage: lastMessageText,
          lastMessageHasFile: hasFile,
          lastMessageFileType: fileType,
          lastMessageFileName: fileName,
          timestamp: timestamp,
          unreadCount: 0,
          isOnline: false,
          isTyping: false,
          conversation: conversation,
        };
      });

      return formattedConversations;
    } else {
      return [];
    }
  };

  const sortConversationsByLatest = (conversationsList) => {
    return conversationsList.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  };

  const fetchConversations = async () => {
    setIsLoadingConversations(true);
    setConversationsError(null);

    try {
      const response = await getUserConversations();
      console.log("💬 Get Conversation by User ID Response:", response);
      const formattedConversations = processConversations(response);
      const sortedConversations = sortConversationsByLatest(
        formattedConversations
      );
      setConversations(sortedConversations);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setConversationsError("Failed to load conversations");

      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load conversations. Please try again.",
        visibilityTime: 3000,
        position: "top",
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchConversationsSilently = async () => {
    try {
      const response = await getUserConversations();
      console.log("💬 Get Conversation by User ID Response:", response);
      const formattedConversations = processConversations(response);
      const sortedConversations = sortConversationsByLatest(
        formattedConversations
      );
      setConversations(sortedConversations);
    } catch (err) {
      console.error("Error silently fetching conversations:", err);
    }
  };

  const handleNewMessage = async (conversationId, data) => {
    const newMessage = data.message || data;

    if (!newMessage) {
      console.warn("⚠️ No message data received");
      return;
    }

    const currentCount = await getMessageCount(conversationId);
    const newCount = currentCount + 1;
    await saveMessageCount(conversationId, newCount);

    setMessageCounts((prevCounts) => ({
      ...prevCounts,
      [conversationId]: newCount,
    }));

    setConversations((prevConversations) => {
      const conversationIndex = prevConversations.findIndex(
        (u) => u.conversation?.id?.toString() === conversationId?.toString()
      );

      if (conversationIndex === -1) {
        return prevConversations;
      }

      const updatedConversations = [...prevConversations];
      const conversationToUpdate = {
        ...updatedConversations[conversationIndex],
      };

      let lastMessageText = newMessage.content || "";

      const isSignatureMessage = !newMessage.content && newMessage.signature;

      if (isSignatureMessage) {
        lastMessageText = "⚫ ✍️";
      } else if (newMessage.fileUrl) {
        const hasImage = newMessage.fileType?.startsWith("image/");

        if (hasImage) {
          lastMessageText = lastMessageText
            ? `📷 ${lastMessageText}`
            : "📷 Photo";
        } else {
          const fileName = newMessage.fileName || "File";
          lastMessageText = lastMessageText
            ? `📎 ${lastMessageText}`
            : `📎 ${fileName}`;
        }
      } else if (!lastMessageText) {
        lastMessageText = "New message";
      }

      conversationToUpdate.lastMessage = lastMessageText;
      conversationToUpdate.lastMessageHasFile = newMessage.fileUrl
        ? true
        : false;
      conversationToUpdate.lastMessageFileType = newMessage.fileType || "";
      conversationToUpdate.lastMessageFileName = newMessage.fileName || "";
      conversationToUpdate.timestamp = new Date(
        newMessage.createdAt
      ).toLocaleString();

      updatedConversations.splice(conversationIndex, 1);
      const finalConversations = [
        conversationToUpdate,
        ...updatedConversations,
      ];

      return finalConversations;
    });
  };

  function handleSignatureMessage(conversationId, data) {
    const signatureMessage = data.message || data;

    if (!signatureMessage) {
      console.warn("⚠️ No signature message data received");
      return;
    }

    console.log(
      "📝 [PUSHER] Processing signature message for conversation:",
      conversationId
    );

    setConversations((prevConversations) => {
      const conversationIndex = prevConversations.findIndex(
        (u) => u.conversation?.id?.toString() === conversationId?.toString()
      );

      if (conversationIndex === -1) {
        return prevConversations;
      }

      const updatedConversations = [...prevConversations];
      const conversationToUpdate = {
        ...updatedConversations[conversationIndex],
      };

      const signatureTitle =
        signatureMessage.signature?.title ||
        signatureMessage.title ||
        "Contract for Signature";
      const hasSignatureFile =
        signatureMessage.signature?.fileUrl || signatureMessage.fileUrl;

      let lastMessageText;
      if (hasSignatureFile) {
        lastMessageText = `📁 ✍️ ${signatureTitle}`;
      } else {
        lastMessageText = "📄 ✍️";
      }

      conversationToUpdate.lastMessage = lastMessageText;
      conversationToUpdate.lastMessageHasFile = !!hasSignatureFile;
      conversationToUpdate.lastMessageFileType = hasSignatureFile
        ? "signature"
        : "";
      conversationToUpdate.lastMessageFileName = hasSignatureFile
        ? signatureMessage.signature?.fileName ||
          signatureMessage.fileName ||
          "signature"
        : "";
      conversationToUpdate.timestamp = new Date(
        signatureMessage.createdAt
      ).toLocaleString();

      updatedConversations.splice(conversationIndex, 1);
      const finalConversations = [
        conversationToUpdate,
        ...updatedConversations,
      ];

      return finalConversations;
    });
  }

  useEffect(() => {
    fetchConversationsSilently();

    const loadMessageCounts = async () => {
      try {
        const counts = await AsyncStorage.getItem("messageCounts");
        if (counts) {
          setMessageCounts(JSON.parse(counts));
        }
      } catch (error) {
        console.error("Error loading message counts:", error);
      }
    };

    loadMessageCounts();
  }, []);

  useEffect(() => {
    if (!conversations || conversations.length === 0) {
      return;
    }

    const conversationIds = conversations
      .map((item) => item.conversation?.id)
      .filter((id) => id != null);

    const newChannels = conversationIds.filter(
      (id) => !subscribedChannelsRef.current.has(id)
    );

    if (newChannels.length === 0) {
      console.log("✅ [PUSHER] Already subscribed to all channels");
      return;
    }

    console.log(
      "📡 [PUSHER] Subscribing to",
      newChannels.length,
      "new channels"
    );

    newChannels.forEach((id) => {
      const channelName = `conversation-${id}`;
      const signatureChannelName = `conversation-signature-${id}`;
      console.log("✅ [PUSHER] Subscribing to:", channelName);
      console.log(
        "✅ [PUSHER] Subscribing to signature channel:",
        signatureChannelName
      );

      const channel = pusher.subscribe(channelName);
      const signatureChannel = pusher.subscribe(signatureChannelName);

      channel.bind("new-message", (data) => {
        handleNewMessage(id, data);
      });

      signatureChannel.bind("message-with-signature", (data) => {
        console.log(
          "📝 [PUSHER] Signature message received for conversation:",
          id
        );
        handleSignatureMessage(id, data);
      });

      subscribedChannelsRef.current.add(id);
    });

    console.log(
      "📡 [PUSHER] Total subscribed channels:",
      subscribedChannelsRef.current.size
    );
  }, [conversations.length]);

  useEffect(() => {
    if (!currentUserId) {
      console.log("⚠️ [PUSHER] No user ID, skipping user channel subscription");
      return;
    }

    const userChannelName = `user-${currentUserId}`;
    console.log("📡 [PUSHER] Subscribing to user channel:", userChannelName);

    const userChannel = pusher.subscribe(userChannelName);

    userChannel.bind("new-conversation", (data) => {
      console.log("🆕 [PUSHER] New conversation created:", data);

      const newConversation = data.conversation || data;

      if (!newConversation || !newConversation.id) {
        console.warn("⚠️ [PUSHER] Invalid conversation data received");
        return;
      }

      const formattedConversations = processConversations([newConversation]);

      if (formattedConversations && formattedConversations.length > 0) {
        const formattedConversation = formattedConversations[0];

        setConversations((prevConversations) => {
          const exists = prevConversations.some(
            (c) =>
              c.conversation?.id?.toString() === newConversation.id?.toString()
          );

          if (exists) {
            console.log("⚠️ [PUSHER] Conversation already exists in list");
            return prevConversations;
          }

          console.log(
            "✅ [PUSHER] Adding new conversation to list:",
            formattedConversation.name
          );
          const finalConversations = [
            formattedConversation,
            ...prevConversations,
          ];

          return finalConversations;
        });

        const conversationId = newConversation.id;
        const conversationChannelName = `conversation-${conversationId}`;
        const signatureChannelName = `conversation-signature-${conversationId}`;

        if (!subscribedChannelsRef.current.has(conversationId)) {
          console.log(
            "📡 [PUSHER] Auto-subscribing to new conversation channels:",
            conversationChannelName,
            "and",
            signatureChannelName
          );

          const channel = pusher.subscribe(conversationChannelName);
          const signatureChannel = pusher.subscribe(signatureChannelName);

          channel.bind("new-message", (messageData) => {
            handleNewMessage(conversationId, messageData);
          });

          signatureChannel.bind("message-with-signature", (signatureData) => {
            console.log(
              "📝 [PUSHER] Signature message received for new conversation:",
              conversationId
            );
            handleSignatureMessage(conversationId, signatureData);
          });

          subscribedChannelsRef.current.add(conversationId);
          console.log("✅ [PUSHER] Subscribed to new conversation channel");
        }
      }
    });

    console.log(
      "✅ [PUSHER] Listening for new conversations on:",
      userChannelName
    );

    return () => {
      console.log(
        "🔴 [PUSHER] Unsubscribing from user channel:",
        userChannelName
      );
      userChannel.unbind("new-conversation");
      pusher.unsubscribe(userChannelName);
    };
  }, [currentUserId]);

  useEffect(() => {
    return () => {
      console.log(
        "🔴 [PUSHER] Component unmounting - Unsubscribing from all channels"
      );
      subscribedChannelsRef.current.forEach((id) => {
        const channelName = `conversation-${id}`;
        console.log("❌ [PUSHER] Unsubscribing from:", channelName);
        pusher.unsubscribe(channelName);
      });
      subscribedChannelsRef.current.clear();
      console.log("🔴 [PUSHER] All channels unsubscribed");
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("🟢 [CHAT SCREEN] Screen focused - refreshing conversations");
      fetchConversations();
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      console.log(
        "🔴 [CHAT SCREEN] Screen blurred - Pusher still listening in background"
      );
      Keyboard.dismiss();
    });

    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  const filteredConversations = React.useMemo(() => {
    if (searchQuery.trim() === "") {
      return conversations;
    }
    return conversations.filter(
      (user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, conversations]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleUserPress = (user) => {
    const conversationId = user.conversation?.id;

    if (!conversationId) {
      console.warn("⚠️ No conversation ID found for user:", user.name);
    }

    navigation.navigate("UserChatScreen", {
      userId: user.id,
      userName: user.name,
      userData: user,
      conversationId: conversationId,
      conversation: user.conversation,
      messages: user.conversation?.messages || [],
      type: user.conversation?.type,
    });
  };

  const handleOpenSelectUserModal = () => {
    Keyboard.dismiss();
    setIsSelectUserModalVisible(true);
  };

  const handleCloseSelectUserModal = () => {
    setIsSelectUserModalVisible(false);
  };

  const handleUserSelectFromModal = (data) => {
    const { employee, conversation, isGroupChat, project } = data;

    if (isGroupChat) {
      const groupData = {
        id: conversation?.id?.toString(),
        name: project?.name || "Project Group Chat",
        lastMessage: "No message yet",
        timestamp: "Just now",
        unreadCount: 0,
        isOnline: false,
        isTyping: false,
      };

      navigation.navigate("UserChatScreen", {
        userId: conversation?.id?.toString(),
        userName: groupData.name,
        userData: groupData,
        messages: [],
        conversationId: conversation?.id,
        conversation: conversation,
        isGroupChat: true,
        project: project,
        type: conversation?.type,
      });
    } else {
      const firstName = employee.first_name || "";
      const lastName = employee.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim() || "Unknown User";

      const userData = {
        id: employee.id?.toString(),
        name: fullName,
        email: employee.email,
        lastMessage: "No message yet",
        timestamp: "Just now",
        unreadCount: 0,
        isOnline: false,
        isTyping: false,
      };

      navigation.navigate("UserChatScreen", {
        userId: userData.id,
        userName: userData.name,
        userData: userData,
        messages: [],
        conversationId: conversation?.id,
        conversation: conversation,
        type: conversation?.type,
      });
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100"
      onPress={() => {
        Keyboard.dismiss();
        handleUserPress(item);
      }}
      activeOpacity={0.7}
      delayPressIn={0}
    >
      <View className="relative">
        <View
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{ backgroundColor: getAvatarColor(item.name) }}
        >
          <Text className="text-xl font-bold text-white">
            {getInitials(item.name)}
          </Text>
        </View>
        {item.isOnline && (
          <View className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
        )}
      </View>

      <View className="flex-1 ml-4">
        <View className="flex-row items-center mb-2">
          <Text
            className="text-lg font-semibold text-black flex-1"
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            {item.isTyping ? (
              <View className="flex-row items-center">
                <Text className="text-base text-blue-500 italic">
                  typing...
                </Text>
                <View className="flex-row items-center ml-2">
                  <View className="w-2 h-2 rounded-full bg-blue-500 mx-1 opacity-40" />
                  <View className="w-2 h-2 rounded-full bg-blue-500 mx-1 opacity-70" />
                  <View className="w-2 h-2 rounded-full bg-blue-500 mx-1 opacity-100" />
                </View>
              </View>
            ) : (
              <View className="flex-1 flex-row items-center">
                {item.lastMessage === "📄 ✍️" ? (
                  <>
                    <MaterialIcons
                      name="description"
                      size={16}
                      color="#000000"
                    />
                    <MaterialIcons
                      name="edit"
                      size={16}
                      color="#000000"
                      style={{ marginLeft: 4 }}
                    />
                  </>
                ) : (
                  <Text
                    className="text-base text-gray-600 flex-1"
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          onSubmitEditing={() => {}}
          onFocus={() => {
            setIsKeyboardVisible(true);
          }}
          onBlur={() => {
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
              setSearchQuery("");
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

  const renderEmptyState = () => {
    const hasNoConversations = conversations.length === 0;
    const hasNoSearchResults =
      conversations.length > 0 && filteredConversations.length === 0;

    if (hasNoConversations) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="chatbubbles-outline" size={100} color="#C7C7CC" />
          <Text className="text-2xl font-bold text-gray-700 mt-6 text-center">
            No conversations yet
          </Text>
          <Text className="text-base text-gray-400 mt-3 text-center">
            Tap the + button in the bottom navigation to start chatting
          </Text>
        </View>
      );
    }

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
    <View className="flex-1 bg-white">
      {isLoadingConversations ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="text-base text-gray-500 mt-4">
            Loading conversations...
          </Text>
        </View>
      ) : filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          refreshing={isLoadingConversations}
          onRefresh={fetchConversations}
          ListHeaderComponent={renderSearchBar()}
        />
      ) : (
        <View className="flex-1">{renderEmptyState()}</View>
      )}

      <SelectUserModal
        visible={isSelectUserModalVisible}
        onClose={handleCloseSelectUserModal}
        onUserSelect={handleUserSelectFromModal}
      />

      <HomeBottomNav
        keyboardVisible={isKeyboardVisible}
        onAddPress={handleOpenSelectUserModal}
      />
    </View>
  );
};

export default ChatScreen;
