// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Toast from "react-native-toast-message";
import NetInfo from "@react-native-community/netinfo";
import { createSignature } from "../services/chats/createSignature";
import { createMessageNotification } from "../services/inAppNotification/createMessageNotification";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../constants/brandColors";

const SignatureRequestModal = ({
  visible,
  onClose,
  conversationId,
  onSuccess,
  onOfflineRequest,
  recipientUserId,
  conversationType,
}) => {
  const { userInfo } = useAuth();

  const [signatureTitle, setSignatureTitle] = useState("");
  const [signatureNotes, setSignatureNotes] = useState("");
  const [signatureDueDate, setSignatureDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSendingSignature, setIsSendingSignature] = useState(false);

  const titleTrimmed = signatureTitle.trim();
  const canSend = titleTrimmed.length > 0 && !isSendingSignature;

  const formatDueDate = (date) => {
    if (!(date instanceof Date)) return "Select date";
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (selectedDate && selectedDate instanceof Date) {
      setSignatureDueDate(selectedDate);

      if (Platform.OS === "android") {
        setShowDatePicker(false);
      }
    } else if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
  };

  const handleClose = () => {
    setSignatureTitle("");
    setSignatureNotes("");
    setSignatureDueDate(new Date());
    setShowDatePicker(false);
    setIsSendingSignature(false);
    onClose();
  };

  const handleSendRequest = async () => {
    try {
      if (!signatureTitle.trim()) {
        Alert.alert("Error", "Please enter a title for the signature request");
        return;
      }

      if (isSendingSignature) return;

      setIsSendingSignature(true);

      const today = new Date();
      const selectedDate = signatureDueDate || today;
      const dueDateString =
        selectedDate instanceof Date
          ? selectedDate.toISOString().split("T")[0]
          : today.toISOString().split("T")[0];

      const signatureData = {
        title: signatureTitle.trim(),
        notes: signatureNotes.trim(),
        dueDate: dueDateString,
      };

      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected === false) {
        if (onOfflineRequest) {
          onOfflineRequest(signatureData);
        }

        Toast.show({
          type: "info",
          text1: "Signature Request Saved",
          text2:
            "Signature requests are stored offline only - not sent to server",
          position: "top",
          visibilityTime: 3000,
        });

        handleClose();
        return;
      }

      try {
        const result = await createSignature(conversationId, signatureData);

        try {
          if (recipientUserId) {
            const fromUserName =
              `${userInfo?.firstName || ""} ${userInfo?.lastName || ""}`.trim() ||
              "Unknown User";
            const signatureTitleText =
              signatureData.title || "Contract for Signature";

            const notificationData = {
              title: "New signature request",
              message: `Signature request: ${signatureTitleText}`,
              conversationId: Number(conversationId),
              fromUserName,
              assignedToUserId: Number(recipientUserId),
              conversationType: "private",
            };

            await createMessageNotification(notificationData);
          }
        } catch (notificationError) {
          console.error(
            "❌ [SIGNATURE] Error sending signature notification:",
            notificationError
          );
        }

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Signature request sent successfully!",
          position: "top",
          visibilityTime: 3000,
        });

        if (onSuccess) {
          onSuccess(result);
        }

        handleClose();
      } catch (apiError) {
        console.error("API Error creating signature request:", apiError);

        Toast.show({
          type: "error",
          text1: "Error",
          text2: apiError.message || "Failed to create signature request",
          position: "top",
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error("Error creating signature request:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to create signature request",
        position: "top",
        visibilityTime: 3000,
      });
    } finally {
      setIsSendingSignature(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Request signature</Text>
                <Text style={styles.headerSubtitle}>
                  Send a document for the other person to review and sign
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
                activeOpacity={0.8}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={Brand.ink} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heroCard}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="create" size={26} color={Brand.onInk} />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Contract for signature</Text>
                <Text style={styles.heroText}>
                  Add a clear title, optional notes, and a due date before sending.
                </Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.fieldLabelRow}>
                <Ionicons name="text-outline" size={16} color={Brand.inkMuted} />
                <Text style={styles.fieldLabel}>Document title</Text>
                <Text style={styles.requiredMark}>Required</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Subcontractor agreement"
                placeholderTextColor={Brand.inkFaint}
                value={signatureTitle}
                onChangeText={setSignatureTitle}
                returnKeyType="next"
                maxLength={120}
              />
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.fieldLabelRow}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={Brand.inkMuted}
                />
                <Text style={styles.fieldLabel}>Notes</Text>
                <Text style={styles.optionalMark}>Optional</Text>
              </View>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add signing instructions or context…"
                placeholderTextColor={Brand.inkFaint}
                value={signatureNotes}
                onChangeText={setSignatureNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            <View style={styles.fieldBlock}>
              <View style={styles.fieldLabelRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={Brand.inkMuted}
                />
                <Text style={styles.fieldLabel}>Complete by</Text>
              </View>

              <TouchableOpacity
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(!showDatePicker)}
                activeOpacity={0.85}
              >
                <View style={styles.dateBtnLeft}>
                  <View style={styles.dateIconChip}>
                    <Ionicons name="calendar" size={16} color={Brand.ink} />
                  </View>
                  <Text style={styles.dateBtnText}>
                    {formatDueDate(signatureDueDate)}
                  </Text>
                </View>
                <Ionicons
                  name={showDatePicker ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Brand.inkMuted}
                />
              </TouchableOpacity>

              {showDatePicker && (
                <View style={styles.datePickerWrap}>
                  <DateTimePicker
                    value={signatureDueDate || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    style={{ width: "100%" }}
                    themeVariant="light"
                  />
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              activeOpacity={0.85}
              disabled={isSendingSignature}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              disabled={!canSend}
              onPress={handleSendRequest}
              activeOpacity={0.85}
            >
              {isSendingSignature ? (
                <ActivityIndicator color={Brand.onInk} size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={Brand.onInk} />
                  <Text style={styles.sendBtnText}>Send request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.paper,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: Brand.paper,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Brand.ink,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Brand.inkMuted,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: Brand.paper,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 14,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Brand.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    marginLeft: 12,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Brand.ink,
  },
  heroText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: Brand.inkMuted,
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Brand.inkSoft,
  },
  requiredMark: {
    fontSize: 11,
    fontWeight: "700",
    color: Brand.ink,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  optionalMark: {
    fontSize: 11,
    fontWeight: "600",
    color: Brand.inkMuted,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  input: {
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: Brand.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
  },
  notesInput: {
    minHeight: 110,
    paddingTop: 12,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Brand.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  dateIconChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dateBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Brand.ink,
  },
  datePickerWrap: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Brand.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: Brand.inkSoft,
  },
  sendBtn: {
    flex: 1.35,
    height: 50,
    borderRadius: 14,
    backgroundColor: Brand.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Brand.onInk,
  },
});

export default SignatureRequestModal;
