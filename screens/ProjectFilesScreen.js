import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getFilesByProjectId } from '../services/files/getFilesByProjectId';
import CustomBottomNav from './components/CustomBottomNav';

const ProjectFilesScreen = ({ navigation, route }) => {
  const { projectId, projectName } = route.params || {};
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadedFiles, setDownloadedFiles] = useState(new Set());

  // --- Fetch Files for Project (MCP Context 7) ---
  // Business Rule: Load project files when screen mounts
  const fetchProjectFiles = async () => {
    if (!projectId) {
      setError('Project ID not found');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching files for project:', projectId);
      const response = await getFilesByProjectId(projectId);
      
      if (response && Array.isArray(response)) {
        setFiles(response);
        console.log('✅ Files fetched successfully:', response.length, 'files');
      } else {
        setFiles([]);
        console.log('📭 No files found for this project');
      }
    } catch (err) {
      console.error('❌ Error fetching files:', err);
      setFiles([]);
      setError('Failed to load project files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Load Files on Mount (MCP Context 7) ---
  useEffect(() => {
    fetchProjectFiles();
  }, [projectId]);

  // --- Handle File Share/Download ---
  const handleFileShare = async (fileUrl, fileName) => {
    try {
      console.log('🔄 Sharing file:', fileName, 'URL:', fileUrl);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Create local file path
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Download file from internet to local storage
      console.log('📥 Downloading file to:', fileUri);
      const downloadResult = await FileSystem.downloadAsync(fileUrl, fileUri);
      
      if (downloadResult.status === 200) {
        console.log('✅ File downloaded successfully');
        
        // Mark file as downloaded
        setDownloadedFiles(prev => new Set([...prev, fileName]));
        
        // Now share the local file
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/octet-stream',
          dialogTitle: `Share ${fileName}`,
          UTI: 'public.item',
        });
        
        console.log('✅ File shared successfully');
      } else {
        throw new Error('Failed to download file');
      }
      
    } catch (error) {
      console.error('❌ Error sharing file:', error);
      Alert.alert('Error', 'Failed to download or share file');
    }
  };

  // --- Handle File View/Open ---
  const handleFilePress = async (fileUrl, fileName) => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Error', 'Cannot open this file type');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  // --- Format File Size ---
  const formatFileSize = (sizeInMB) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(1)} KB`;
    }
    return `${sizeInMB.toFixed(2)} MB`;
  };

  // --- Get File Icon Based on Type ---
  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) {
      return 'description';
    } else if (fileType.includes('image')) {
      return 'image';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return 'description';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return 'table-chart';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return 'slideshow';
    }
    return 'insert-drive-file';
  };

  // --- Render File Item (MCP Context 7) ---
  const renderFileItem = ({ item }) => {
    return (
      <TouchableOpacity
        className="bg-white rounded-lg p-4 mb-3 mx-4 shadow-sm border border-gray-100"
        activeOpacity={0.7}
        onPress={() => handleFileShare(item.fileUrl, item.fileName)}
      >
        <View className="flex-row items-center">
          {/* File Icon */}
          <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-3">
            <MaterialIcons name={getFileIcon(item.fileType)} size={24} color="#3B82F6" />
          </View>
          
          {/* File Info */}
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1" numberOfLines={2}>
              {item.fileName || 'Unnamed File'}
            </Text>
            <Text className="text-sm text-gray-500 mb-1">
              {formatFileSize(item.fileSize)}
            </Text>
            <Text className="text-xs text-gray-400">
              Uploaded: {item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
          
          {/* Share Icon */}
          <Ionicons name="share-outline" size={20} color="#3B82F6" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Error State */}
      {error ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-6">
            <Ionicons name="alert-circle" size={40} color="#EF4444" />
          </View>
          <Text className="text-xl font-semibold text-gray-900 mb-3 text-center">
            Failed to Load Files
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6 mb-6">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-black py-3 px-6 rounded-xl"
            onPress={fetchProjectFiles}
          >
            <Text className="text-white text-[16px] font-semibold">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        /* Loading State */
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#000000" />
          <Text className="text-base text-gray-500 mt-4">Loading files...</Text>
        </View>
      ) : files.length > 0 ? (
        /* Files List */
        <FlatList
          data={files}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderFileItem}
          className="flex-1"
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: 100, // Add bottom padding to avoid CustomBottomNav overlap
          }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        /* Empty State */
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-6">
            <MaterialIcons name="insert-drive-file" size={40} color="#9CA3AF" />
          </View>
          <Text className="text-xl font-semibold text-gray-900 mb-3 text-center">
            No Files Found
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            This project doesn't have any files yet.
          </Text>
        </View>
      )}
      
      {/* Custom Bottom Navigation (MCP Context 7) */}
      {/* Business Rule: Show bottom nav without FAB icon */}
      <CustomBottomNav 
        navigation={navigation} 
        hideFAB={true}
      />
    </SafeAreaView>
  );
};

export default ProjectFilesScreen;
