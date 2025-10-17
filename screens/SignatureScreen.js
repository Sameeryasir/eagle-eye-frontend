import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

// --- Signature Screen Component (MCP Context 7) ---
// Business Rule: Allow users to sign contracts by drawing their signature
// Features: White background, signature drawing area, clear/reset, save/cancel actions
const SignatureScreen = ({ navigation, route }) => {
  const { signatureData, onSignatureComplete } = route.params || {};
  
  // --- Signature Drawing State (MCP Context 7) ---
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef(null);
  const viewShotRef = useRef(null);

  // --- Handle Touch Start (MCP Context 7) ---
  // Business Rule: Start new signature path when user touches the screen
  const handleTouchStart = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    const newPath = `M${locationX},${locationY}`;
    setCurrentPath(newPath);
    setIsDrawing(true);
  };

  // --- Handle Touch Move (MCP Context 7) ---
  // Business Rule: Continue drawing signature path as user moves finger
  const handleTouchMove = (event) => {
    if (!isDrawing) return;
    
    const { locationX, locationY } = event.nativeEvent;
    const newPath = `${currentPath} L${locationX},${locationY}`;
    setCurrentPath(newPath);
  };

  // --- Handle Touch End (MCP Context 7) ---
  // Business Rule: Complete current signature path when user lifts finger
  const handleTouchEnd = () => {
    if (isDrawing && currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath('');
      setIsDrawing(false);
    }
  };

  // --- Clear Signature (MCP Context 7) ---
  // Business Rule: Allow users to clear their signature and start over
  const handleClearSignature = () => {
    Alert.alert(
      'Clear Signature',
      'Are you sure you want to clear your signature?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setPaths([]);
            setCurrentPath('');
            setIsDrawing(false);
          }
        }
      ]
    );
  };

  // --- Save Signature (MCP Context 7) ---
  // Business Rule: Save signature and return to previous screen
  const handleSaveSignature = async () => {
    if (paths.length === 0 && !currentPath) {
      Alert.alert('No Signature', 'Please draw your signature before saving.');
      return;
    }

    Alert.alert(
      'Save Signature',
      'Are you sure you want to save this signature?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: async () => {
            try {
              // Capture the signature area as an image with higher quality
              const signatureImageUri = await viewShotRef.current.capture({
                format: 'png',
                quality: 1.0,
                width: 1200,
                height: 400,
              });
              
              // Generate a unique filename
              const timestamp = Date.now();
              const fileName = `signature_${timestamp}.png`;
              const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

              // Copy the captured image to cache directory
              await FileSystem.copyAsync({
                from: signatureImageUri,
                to: fileUri
              });

              // Get file info
              const fileInfo = await FileSystem.getInfoAsync(fileUri);
              
              // Prepare signature data with image file
              const signatureData = {
                fileName: fileName,
                type: 'image/png',
                size: fileInfo.size,
                uri: fileUri,
                timestamp: new Date().toISOString(),
                ...signatureData
              };

              console.log('✅ Signature converted to image:', signatureData);
              
              // Call the completion callback if provided
              if (onSignatureComplete) {
                onSignatureComplete(signatureData);
              }
              
              // Show success toast
              Toast.show({
                type: 'success',
                text1: 'Signature Saved',
                text2: 'Your signature has been saved successfully!',
                position: 'top',
                visibilityTime: 3000,
              });
              
              // Navigate back after a short delay
              setTimeout(() => {
                navigation.goBack();
              }, 1500);
              
            } catch (error) {
              console.error('❌ Error converting signature to image:', error);
              Alert.alert('Error', 'Failed to save signature. Please try again.');
            }
          }
        }
      ]
    );
  };

  // --- Cancel Signature (MCP Context 7) ---
  // Business Rule: Allow users to cancel without saving
  const handleCancel = () => {
    if (paths.length > 0 || currentPath) {
      Alert.alert(
        'Cancel Signature',
        'Are you sure you want to cancel? Your signature will be lost.',
        [
          { text: 'Keep Drawing', style: 'cancel' },
          { 
            text: 'Cancel', 
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#000000" />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>Sign Contract</Text>
          {signatureData?.title && (
            <Text style={styles.headerSubtitle}>{signatureData.title}</Text>
          )}
        </View>
        
        <TouchableOpacity onPress={handleSaveSignature} style={styles.headerButton}>
          <Ionicons name="checkmark" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Please sign your name in the area below
        </Text>
      </View>

      {/* Signature Area */}
      <View style={styles.signatureContainer}>
        <ViewShot
          ref={viewShotRef}
          options={{
            format: 'png',
            quality: 1.0,
          }}
          style={styles.signatureArea}
        >
          <Svg
            ref={svgRef}
            height="100%"
            width="100%"
            style={styles.svg}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Render all completed paths */}
            {paths.map((path, index) => (
              <Path
                key={index}
                d={path}
                stroke="#000000"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            
            {/* Render current path being drawn */}
            {currentPath && (
              <Path
                d={currentPath}
                stroke="#000000"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
          </Svg>
        </ViewShot>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          onPress={handleClearSignature}
          style={styles.clearButton}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color="#666666" />
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleSaveSignature}
          style={styles.saveButton}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Signature</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- Styles (MCP Context 7) ---
// Clean, professional styling for signature screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
  },
  instructionsText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  signatureContainer: {
    flex: 1,
    padding: 20,
  },
  signatureArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  svg: {
    backgroundColor: 'transparent',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginLeft: 8,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default SignatureScreen;
