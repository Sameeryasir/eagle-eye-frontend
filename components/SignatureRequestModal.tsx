// @ts-nocheck
/**
 * Change summary:
 * - What: Redesigned signature request modal with a more polished, premium layout.
 * - Why: User asked for an impressive signature form UI (clear hierarchy, soft surfaces, stronger CTA).
 * - Related: UserChatScreen opens this modal; createSignature API unchanged.
 * - Note: MCP Context 7 — keep form logic simple; UI-only polish.
 */
import React, { useEffect, useRef, useState } from "react";
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
  Animated,
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
  const [focusedField, setFocusedField] = useState(null);

  // Soft entrance so the sheet feels intentional, not abrupt
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const titleTrimmed = signatureTitle.trim();
  const canSend = titleTrimmed.length > 0 && !isSendingSignature;

  useEffect(() => {
    if (!visible) return;

    fadeAnim.setValue(0);
    slideAnim.setValue(18);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, fadeAnim, slideAnim]);

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
    setFocusedField(null);
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
          {/* --- Header --- */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>SIGNATURE</Text>
                <Text style={styles.headerTitle}>Request a signature</Text>
                <Text style={styles.headerSubtitle}>
                  Send a clear contract request the other person can review and sign.
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
                activeOpacity={0.8}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={Brand.inkSoft} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {/* --- Seal hero (visual anchor, not a field card) --- */}
              <View style={styles.hero}>
                <View style={styles.sealOuter}>
                  <View style={styles.sealMid}>
                    <View style={styles.sealInner}>
                      <Ionicons name="create" size={28} color={Brand.inkSoft} />
                    </View>
                  </View>
                </View>
                <Text style={styles.heroTitle}>Contract for signature</Text>
                <Text style={styles.heroText}>
                  Add a title, optional notes, and when it should be completed.
                </Text>
                <View style={styles.heroMetaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={Brand.inkMuted} />
                    <Text style={styles.metaChipText}>Secure request</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Ionicons name="flash-outline" size={13} color={Brand.inkMuted} />
                    <Text style={styles.metaChipText}>Sent instantly</Text>
                  </View>
                </View>
              </View>

              {/* --- Document title --- */}
              <View style={styles.fieldBlock}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Document title</Text>
                  <Text style={styles.requiredMark}>Required</Text>
                </View>
                <View
                  style={[
                    styles.inputShell,
                    focusedField === "title" && styles.inputShellFocused,
                  ]}
                >
                  <Ionicons
                    name="text-outline"
                    size={18}
                    color={focusedField === "title" ? Brand.ink : Brand.inkFaint}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Subcontractor agreement"
                    placeholderTextColor={Brand.inkFaint}
                    value={signatureTitle}
                    onChangeText={setSignatureTitle}
                    onFocus={() => setFocusedField("title")}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                    maxLength={120}
                  />
                </View>
                <Text style={styles.counter}>{signatureTitle.length}/120</Text>
              </View>

              {/* --- Notes --- */}
              <View style={styles.fieldBlock}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Notes for the signer</Text>
                  <Text style={styles.optionalMark}>Optional</Text>
                </View>
                <View
                  style={[
                    styles.inputShell,
                    styles.notesShell,
                    focusedField === "notes" && styles.inputShellFocused,
                  ]}
                >
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    placeholder="Add signing instructions or context…"
                    placeholderTextColor={Brand.inkFaint}
                    value={signatureNotes}
                    onChangeText={setSignatureNotes}
                    onFocus={() => setFocusedField("notes")}
                    onBlur={() => setFocusedField(null)}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>
                <Text style={styles.counter}>{signatureNotes.length}/500</Text>
              </View>

              {/* --- Due date --- */}
              <View style={styles.fieldBlock}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Complete by</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.dateBtn,
                    showDatePicker && styles.dateBtnActive,
                  ]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                  activeOpacity={0.85}
                >
                  <View style={styles.dateBtnLeft}>
                    <View style={styles.dateIconChip}>
                      <Ionicons name="calendar" size={18} color={Brand.inkSoft} />
                    </View>
                    <View>
                      <Text style={styles.dateBtnLabel}>Due date</Text>
                      <Text style={styles.dateBtnText}>
                        {formatDueDate(signatureDueDate)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.dateChevron}>
                    <Ionicons
                      name={showDatePicker ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={Brand.inkMuted}
                    />
                  </View>
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
            </Animated.View>
          </ScrollView>

          {/* --- Footer actions --- */}
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
    backgroundColor: Brand.paperSoft,
  },
  flex: {
    flex: 1,
  },
  header: {
    backgroundColor: Brand.paper,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
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
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: Brand.inkFaint,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: Brand.ink,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: Brand.inkMuted,
    lineHeight: 20,
    paddingRight: 8,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 22,
    backgroundColor: Brand.paper,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  // Nested rings give a “wax seal” feel without heavy black fills
  sealOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    borderColor: Brand.lineStrong,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  sealMid: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: Brand.line,
    backgroundColor: Brand.paperSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sealInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Brand.ink,
    letterSpacing: -0.2,
  },
  heroText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: Brand.inkMuted,
    textAlign: "center",
    maxWidth: 280,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Brand.inkMuted,
  },
  fieldBlock: {
    marginBottom: 18,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: Brand.inkSoft,
    letterSpacing: 0.1,
  },
  requiredMark: {
    fontSize: 10,
    fontWeight: "700",
    color: Brand.inkSoft,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.lineStrong,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  optionalMark: {
    fontSize: 10,
    fontWeight: "600",
    color: Brand.inkFaint,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.paper,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  inputShellFocused: {
    borderColor: Brand.inkSoft,
    backgroundColor: Brand.paper,
  },
  notesShell: {
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Brand.ink,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  notesInput: {
    minHeight: 112,
    paddingTop: 12,
    paddingBottom: 12,
    width: "100%",
  },
  counter: {
    marginTop: 6,
    fontSize: 11,
    color: Brand.inkFaint,
    textAlign: "right",
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Brand.paper,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateBtnActive: {
    borderColor: Brand.inkSoft,
  },
  dateBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  dateIconChip: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dateBtnLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Brand.inkFaint,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  dateBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Brand.ink,
  },
  dateChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.paperSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerWrap: {
    marginTop: 12,
    borderRadius: 16,
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
    height: 52,
    borderRadius: 16,
    backgroundColor: Brand.paperSoft,
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
    flex: 1.45,
    height: 52,
    borderRadius: 16,
    backgroundColor: Brand.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: Brand.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.38,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Brand.onInk,
  },
});

export default SignatureRequestModal;
