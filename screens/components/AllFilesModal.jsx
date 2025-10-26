import React from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';

// --- All Files Modal Component (MCP Context 7) ---
// Business Rule: Reusable modal for displaying all files shared in a conversation
// This component shows file list with thumbnails, download/share functionality
const AllFilesModal = ({ 
  visible, 
  onClose, 
  files = [], 
  isLoading = false,
  onFilePress,
  onDownloadPress
}) => {
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

  // --- Render File Item (MCP Context 7) ---
  // Business Rule: Display each file with appropriate icon/thumbnail and actions
  const renderFileItem = ({ item }) => {
    const fileUrl = item.fileUrl;
    const fileName = item.fileName || 'Unknown File';
    const fileSize = item.fileSize;
    const uploadedAt = item.uploadedAt;
    
    // Determine if it's an image based on file extension
    const isImage = fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/);

    return (
      <TouchableOpacity
        onPress={() => {
          if (onFilePress) {
            onFilePress(item);
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
            if (onDownloadPress) {
              onDownloadPress(item);
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity
            onPress={onClose}
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
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#000000" />
              <Text className="text-base text-gray-500 mt-4">Loading files...</Text>
            </View>
          ) : files.length > 0 ? (
            <FlatList
              data={files}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              renderItem={renderFileItem}
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
  );
};

export default AllFilesModal;
