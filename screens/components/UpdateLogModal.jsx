import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Image,
} from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
import { Ionicons } from "@expo/vector-icons";
import { uploadImage } from "../../services/images/uploadImage";
import * as ImagePicker from "expo-image-picker";

// --- Update Log Modal Component ---
// Purpose: Allows users to update existing logs with modified notes and images
// Business Logic: Follows MCP context 7 best practices for clean, maintainable code
const UpdateLogModal = ({ 
  visible, 
  onClose, 
  log, 
  onUpdate, 
  userRole 
}) => {
  // --- State Management ---
  const [logNote, setLogNote] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  // --- Initialize Modal Data ---
  useEffect(() => {
    if (visible && log) {
      console.log("UpdateLogModal - Initializing with log:", log);
      // Pre-fill existing data
      setLogNote(log.description || log.note || "");
      setExistingImages(log.images || []);
      setSelectedImages([]);
    }
  }, [visible, log]);

  // --- Image Picker Function ---
  const pickImages = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to select images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        // Add new images to existing ones
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          id: Date.now() + Math.random(), // Unique ID for each image
          name: asset.fileName || `image_${Date.now()}.jpg`,
          isNew: true, // Mark as new image
        }));
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  // --- Remove New Image Function ---
  const removeNewImage = (imageId) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // --- Remove Existing Image Function ---
  const removeExistingImage = (imageId) => {
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
  };

  // --- Handle Update Submission ---
  const handleUpdateLog = async () => {
    // --- Validation Step ---
    if (!logNote.trim()) {
      Alert.alert("Error", "Please enter a note for the log");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // --- Step 1: Prepare Update Data ---
      const updateData = {
        id: log.id,
        note: logNote.trim(),
        // Include existing images that weren't removed
        existingImages: existingImages.map(img => img.id),
      };
      
      console.log("Update data prepared:", updateData);
      
      // --- Step 2: Call Update Function ---
      await onUpdate(updateData);
      
      // --- Step 3: Upload New Images (if any) ---
      if (selectedImages.length > 0) {
        await uploadNewImages(log.id);
      }
      
      Alert.alert('Success', 'Log updated successfully!');
      onClose();

    } catch (err) {
      console.error("UpdateLogModal - Error updating log:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to update log. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Helper Function for New Image Upload ---
  const uploadNewImages = async (logId) => {
    setIsUploadingImages(true);
    
    try {
      const formData = new FormData();
      
      // Add only new images to the 'images' field
      selectedImages.forEach(image => {
        formData.append('images', {
          uri: image.uri,
          type: 'image/jpeg',
          name: image.name,
        });
      });
      
      formData.append('logId', logId);
      
      console.log(`UpdateLogModal - Uploading ${selectedImages.length} new images`);
      
      const uploadResponse = await uploadImage(formData);
      
      // Handle response from backend
      if (uploadResponse.images?.length > 0) {
        const successful = uploadResponse.images.filter(img => !img.error);
        const failed = uploadResponse.images.filter(img => img.error);
        
        console.log(`UpdateLogModal - Upload result: ${successful.length} successful, ${failed.length} failed`);
        
        if (failed.length > 0) {
          Alert.alert("Partial Success", `Uploaded ${successful.length} image(s), ${failed.length} failed.`);
        }
      }
      
    } catch (error) {
      console.error("UpdateLogModal - Image upload error:", error);
      Alert.alert("Warning", "Log updated but new image upload failed.");
    } finally {
      setIsUploadingImages(false);
    }
  };

  // --- Render Image Preview ---
  const renderImagePreview = (image, index, isExisting = false) => (
    <View key={image.id || index} style={{ marginRight: 12, marginBottom: 12 }}>
      <View style={{
        width: Math.min(80, screenWidth * 0.2),
        height: Math.min(80, screenWidth * 0.2),
        borderRadius: Math.min(8, screenWidth * 0.02),
        backgroundColor: '#f0f0f0',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <Image
          source={{ uri: image.imageUrl || image.uri }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        
        {/* Remove Button */}
        <TouchableOpacity
          onPress={() => isExisting ? removeExistingImage(image.id) : removeNewImage(image.id)}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            backgroundColor: 'rgba(220, 53, 69, 0.9)',
            borderRadius: 12,
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={16} color="white" />
        </TouchableOpacity>
      </View>
      
      <Text style={{
        fontSize: Math.min(10, screenWidth * 0.025),
        color: "#666",
        textAlign: 'center',
        marginTop: 4,
      }}>
        {isExisting ? `Existing ${index + 1}` : `New ${index + 1}`}
      </Text>
    </View>
  );

  // Debug logging
  console.log("UpdateLogModal render - visible:", visible);
  console.log("UpdateLogModal render - log:", log);
  console.log("UpdateLogModal render - userRole:", userRole);
  
  if (!log) {
    console.log("UpdateLogModal - no log provided, returning null");
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* --- Black Navbar/Header --- */}
        <View style={{
          backgroundColor: 'black',
          paddingHorizontal: Math.min(16, screenWidth * 0.04),
          paddingVertical: Math.min(12, screenHeight * 0.015),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Text style={{
            color: 'white',
            fontSize: Math.min(18, screenWidth * 0.045),
            fontWeight: '600',
          }}>
            Update Log
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: 8 }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* --- Content Section --- */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: Math.min(24, screenWidth * 0.06) }}
          showsVerticalScrollIndicator={false}
        >
          {/* --- Note Section --- */}
          <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
            <Text style={{
              fontSize: Math.min(16, screenWidth * 0.04),
              fontWeight: "600",
              color: "#333",
              marginBottom: Math.min(8, screenHeight * 0.01),
            }}>
              Note *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#e1e8ed",
                borderRadius: Math.min(8, screenWidth * 0.02),
                padding: Math.min(12, screenWidth * 0.03),
                fontSize: Math.min(16, screenWidth * 0.04),
                backgroundColor: "#f8f9fa",
                color: "#333",
                height: Math.min(96, screenHeight * 0.12),
                textAlignVertical: 'top',
              }}
              placeholder="Enter updated note for the log..."
              value={logNote}
              onChangeText={setLogNote}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>

          {/* --- Existing Images Section --- */}
          {existingImages.length > 0 && (
            <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
              <Text style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: "600",
                color: "#333",
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}>
                Current Images ({existingImages.length})
              </Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={{ flexDirection: 'row' }}
              >
                {existingImages.map((image, index) => 
                  renderImagePreview(image, index, true)
                )}
              </ScrollView>
            </View>
          )}

          {/* --- New Images Section --- */}
          <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
            <Text style={{
              fontSize: Math.min(16, screenWidth * 0.04),
              fontWeight: "600",
              color: "#333",
              marginBottom: Math.min(12, screenHeight * 0.015),
            }}>
              Add New Images
            </Text>
            
            {/* Image Picker Button */}
            <TouchableOpacity
              style={{
                borderWidth: 2,
                borderStyle: 'dashed',
                borderColor: "#e1e8ed",
                borderRadius: Math.min(8, screenWidth * 0.02),
                padding: Math.min(16, screenWidth * 0.04),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa',
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}
              onPress={pickImages}
            >
              <Ionicons 
                name="camera-outline" 
                size={24} 
                color="#666" 
                style={{ marginBottom: 8 }} 
              />
              <Text style={{
                fontSize: Math.min(14, screenWidth * 0.035),
                color: "#666",
                textAlign: 'center',
              }}>
                {selectedImages.length > 0 
                  ? `Add More Images (${selectedImages.length} selected)`
                  : 'Select New Images'
                }
              </Text>
            </TouchableOpacity>

            {/* New Images Preview */}
            {selectedImages.length > 0 && (
              <View>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: Math.min(8, screenHeight * 0.01),
                }}>
                  <Text style={{
                    fontSize: Math.min(14, screenWidth * 0.035),
                    color: "#666",
                  }}>
                    New Images to Upload:
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedImages([])}
                    style={{
                      backgroundColor: '#dc3545',
                      paddingHorizontal: Math.min(12, screenWidth * 0.03),
                      paddingVertical: Math.min(6, screenHeight * 0.0075),
                      borderRadius: Math.min(6, screenWidth * 0.015),
                    }}
                  >
                    <Text style={{
                      color: 'white',
                      fontSize: Math.min(12, screenWidth * 0.03),
                      fontWeight: '500',
                    }}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={{ flexDirection: 'row' }}
                >
                  {selectedImages.map((image, index) => 
                    renderImagePreview(image, index, false)
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>

        {/* --- Fixed Action Button --- */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: Math.min(24, screenWidth * 0.06),
          paddingTop: Math.min(20, screenHeight * 0.025),
          paddingBottom: Math.min(20, screenHeight * 0.025),
          backgroundColor: 'white',
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: '#e9ecef',
        }}>
          <TouchableOpacity
            style={{
              width: Math.min(280, screenWidth * 0.7),
              backgroundColor: 'black',
              borderRadius: Math.min(12, screenWidth * 0.03),
              paddingVertical: Math.min(16, screenHeight * 0.02),
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (isSubmitting || isUploadingImages) ? 0.6 : 1,
            }}
            onPress={handleUpdateLog}
            disabled={isSubmitting || isUploadingImages}
            activeOpacity={0.8}
          >
            {(isSubmitting || isUploadingImages) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                <Text style={{
                  color: 'white',
                  fontSize: Math.min(16, screenWidth * 0.04),
                  fontWeight: '600',
                }}>
                  Updating Log...
                </Text>
              </View>
            ) : (
              <Text style={{
                color: 'white',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}>
                Update Log
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default UpdateLogModal;
