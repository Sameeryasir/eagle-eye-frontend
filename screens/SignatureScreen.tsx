// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

// Features: White background, signature drawing area, clear/reset, save/cancel actions
const SignatureScreen = ({ navigation, route }) => {
  const { signatureData, onSignatureComplete } = route.params || {};
  
  // Handle clear action from header
  useEffect(() => {
    if (route.params?.action === 'clear') {
      handleClearSignature();
      // Reset the action
      navigation.setParams({ action: undefined });
    }
  }, [route.params?.action]);
  
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const svgRef = useRef(null);
  const viewShotRef = useRef(null);

  const handleTouchStart = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    const newPath = `M${locationX},${locationY}`;
    setCurrentPath(newPath);
    setIsDrawing(true);
  };

  const handleTouchMove = (event) => {
    if (!isDrawing) return;
    
    const { locationX, locationY } = event.nativeEvent;
    const newPath = `${currentPath} L${locationX},${locationY}`;
    setCurrentPath(newPath);
  };

  const handleTouchEnd = () => {
    if (isDrawing && currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath('');
      setIsDrawing(false);
    }
  };

  const handleClearSignature = () => {
    // Check if there's any signature to clear
    if (paths.length === 0 && !currentPath) {
      Toast.show({
        type: 'error',
        text1: 'No Signature',
        text2: 'Please draw a signature first.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    // Show custom dialog
    setShowClearDialog(true);
  };

  const handleClearConfirm = () => {
    setPaths([]);
    setCurrentPath('');
    setIsDrawing(false);
    setShowClearDialog(false);
  };

  const handleClearCancel = () => {
    setShowClearDialog(false);
  };

  const handleSaveSignature = async () => {
    if (paths.length === 0 && !currentPath) {
      Toast.show({
        type: 'error',
        text1: 'No Signature',
        text2: 'Please draw your signature before saving.',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

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
  };

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
    <View style={styles.container}>

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
          onPress={handleSaveSignature}
          style={styles.saveButton}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>Save Signature</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Clear Dialog */}
      {showClearDialog && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            
            <Text style={styles.dialogTitle}>Clear Signature</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to clear your signature? This action cannot be undone.
            </Text>
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity 
                style={styles.dialogCancelButton}
                onPress={handleClearCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dialogConfirmButton}
                onPress={handleClearConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogConfirmText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Clean, professional styling for signature screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  saveButton: {
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
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialogContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 40,
    maxWidth: 300,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  dialogCancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dialogConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  dialogConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SignatureScreen;
