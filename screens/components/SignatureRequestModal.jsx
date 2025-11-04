import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import NetInfo from '@react-native-community/netinfo';
import { createSignature } from '../../services/chats/createSignature';

// --- Signature Request Modal Component (MCP Context 7) ---
// Business Rule: Reusable modal for requesting digital signatures in chat conversations
// This component handles signature request creation with title, notes, and due date
const SignatureRequestModal = ({ 
  visible, 
  onClose, 
  conversationId, 
  onSuccess,
  onOfflineRequest 
}) => {
  // --- State Management (MCP Context 7) ---
  // Business Rule: Track form data and loading states for signature request
  const [signatureTitle, setSignatureTitle] = useState('');
  const [signatureNotes, setSignatureNotes] = useState('');
  const [signatureDueDate, setSignatureDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSendingSignature, setIsSendingSignature] = useState(false);

  // --- Date Picker Handler (MCP Context 7) ---
  // Business Rule: Handle date selection for signature due date
  // On Android: System dialog auto-closes, so we just update the date
  // On iOS: Spinner stays open so users can adjust, close it manually by tapping date field again
  const handleDateChange = (event, selectedDate) => {
    if (selectedDate && selectedDate instanceof Date) {
      setSignatureDueDate(selectedDate);
      // Close picker on Android when date is selected (system dialog)
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
    } else if (Platform.OS === 'android') {
      // User cancelled on Android
      setShowDatePicker(false);
    }
  };

  // --- Handle Modal Close (MCP Context 7) ---
  // Business Rule: Reset form data when modal is closed
  const handleClose = () => {
    setSignatureTitle('');
    setSignatureNotes('');
    setSignatureDueDate(new Date());
    setIsSendingSignature(false);
    onClose();
  };

  // --- Handle Send Signature Request (MCP Context 7) ---
  // Business Rule: Check internet connectivity FIRST, then create signature request via API or store offline
  const handleSendRequest = async () => {
    try {
      // Validate required fields
      if (!signatureTitle.trim()) {
        Alert.alert('Error', 'Please enter a title for the signature request');
        return;
      }

      // Prevent multiple requests
      if (isSendingSignature) return;
      
      setIsSendingSignature(true);

      // Prepare signature data
      // Business Rule: Always provide a valid dueDate to avoid backend null constraint violations
      // Ensure dueDate is NEVER null/undefined by using multiple fallbacks
      const today = new Date();
      const selectedDate = signatureDueDate || today;
      const dueDateString = selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0] 
        : today.toISOString().split('T')[0];
      
      const signatureData = {
        title: signatureTitle.trim(),
        notes: signatureNotes.trim(),
        dueDate: dueDateString // Always a valid date string, never null
      };

      console.log('🔍 [DEBUG] SignatureRequestModal - signatureData being sent:', signatureData);
      console.log('🔍 [DEBUG] SignatureRequestModal - signatureDueDate value:', signatureDueDate);
      console.log('🔍 [DEBUG] SignatureRequestModal - selectedDate:', selectedDate);
      console.log('🔍 [DEBUG] SignatureRequestModal - dueDateString:', dueDateString);
      console.log('🔍 [DEBUG] SignatureRequestModal - dueDate is null?', dueDateString === null || dueDateString === undefined);
      
      // --- Console Log Signature Request Body (MCP Context 7) ---
      console.log('📝 [SIGNATURE] Creating signature request with body:', JSON.stringify(signatureData, null, 2));
      console.log('📝 [SIGNATURE] Conversation ID:', conversationId);
      console.log('📝 [SIGNATURE] Title:', signatureData.title);
      console.log('📝 [SIGNATURE] Notes:', signatureData.notes);
      console.log('📝 [SIGNATURE] Due Date:', signatureData.dueDate);
      
      // CHECK INTERNET CONNECTION FIRST (MCP Context 7)
      // Business Rule: Don't attempt API call if user is offline - go directly to offline storage
      const netInfo = await NetInfo.fetch();
      
      if (netInfo.isConnected === false) {
        console.log('📝 [OFFLINE] User is offline - storing signature request offline');
        
        // Store signature request offline
        if (onOfflineRequest) {
          onOfflineRequest(signatureData);
        }
        
        // Show offline message
        Toast.show({
          type: 'info',
          text1: 'Signature Request Saved',
          text2: 'Signature requests are stored offline only - not sent to server',
          position: 'top',
          visibilityTime: 3000,
        });
        
        // Close modal and reset form
        handleClose();
        return;
      }
      
      // ONLINE: Call the API service
      console.log('📡 [ONLINE] User is online - sending signature request to API');
      try {
        const result = await createSignature(conversationId, signatureData);
        
        console.log('Signature request created successfully:', result);
        
        // Show success message
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Signature request sent successfully!',
          position: 'top',
          visibilityTime: 3000,
        });

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result);
        }
        
        // Close modal and reset form
        handleClose();
        
      } catch (apiError) {
        console.error('API Error creating signature request:', apiError);
        
        // Show error message for API failures
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: apiError.message || 'Failed to create signature request',
          position: 'top',
          visibilityTime: 3000,
        });
      }
      
    } catch (error) {
      console.error('Error creating signature request:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to create signature request',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setIsSendingSignature(false);
    }
  };

  return (
    <>
      {/* Main Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#e1e8ed]">
            <TouchableOpacity
              onPress={handleClose}
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
                    onPress={() => setShowDatePicker(!showDatePicker)}
                  >
                    <Text className="text-[16px] text-[#333] font-medium">
                      {signatureDueDate ? signatureDueDate.toLocaleDateString() : 'Select date'}
                    </Text>
                    <Ionicons 
                      name={showDatePicker ? "chevron-up" : "calendar-outline"} 
                      size={16} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                  
                  {/* Calendar Picker - Shows inline in modal (MCP Context 7) --- */}
                  {/* Business Rule: Display calendar picker directly in the modal when date field is clicked */}
                  {showDatePicker && (
                    <View className="mt-3 border border-[#e1e8ed] rounded-lg bg-white p-3">
                      <DateTimePicker
                        value={signatureDueDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                        style={{ width: '100%' }}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Action Buttons - Always positioned at bottom */}
          <View className="absolute bottom-0 left-0 right-0 flex-row justify-between gap-4 px-5 pt-5 pb-8 bg-white" style={{ zIndex: 1000 }}>
            <TouchableOpacity
              className="flex-1 bg-[#f8f9fa] border border-[#dee2e6] rounded-lg p-4 items-center"
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text className="text-[#6c757d] text-[16px] font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 bg-black rounded-lg p-4 items-center justify-center ${
                isSendingSignature ? 'opacity-50' : ''
              }`}
              disabled={isSendingSignature}
              onPress={handleSendRequest}
              activeOpacity={0.7}
            >
              {isSendingSignature ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white text-[16px] font-semibold">Send Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </>
  );
};

export default SignatureRequestModal;
