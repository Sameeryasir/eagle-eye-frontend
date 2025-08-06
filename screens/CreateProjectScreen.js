import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProject } from '../services/projects/createProject';

function CreateProjectScreen({ navigation }) {
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    // Add keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    // Cleanup listeners
    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleInputChange = (field, value) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateProject = async () => {
    // Validate required fields
    if (!projectData.name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }

    if (!projectData.description.trim()) {
      Alert.alert('Error', 'Project description is required');
      return;
    }

    // Validate and format dates
    let startDate = null;
    let endDate = null;

    if (projectData.startDate.trim()) {
      try {
        // Convert MM/DD/YYYY to ISO 8601 format
        const [month, day, year] = projectData.startDate.split('/');
        startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
      } catch (error) {
        Alert.alert('Error', 'Please enter a valid start date in MM/DD/YYYY format');
        return;
      }
    }

    if (projectData.endDate.trim()) {
      try {
        // Convert MM/DD/YYYY to ISO 8601 format
        const [month, day, year] = projectData.endDate.split('/');
        endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
      } catch (error) {
        Alert.alert('Error', 'Please enter a valid end date in MM/DD/YYYY format');
        return;
      }
    }

    // Validate that end date is after start date if both are provided
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare the data for API call
      const projectPayload = {
        name: projectData.name.trim(),
        description: projectData.description.trim(),
        startDate: startDate,
        endDate: endDate,
      };

      const response = await createProject(projectPayload);
      
      Alert.alert(
        'Success',
        'Project created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error creating project:', error);
      
      let errorMessage = 'Failed to create project. Please try again.';
      
      // Handle different types of error responses
      if (error.response?.data?.message) {
        // If message is an array, join it, otherwise use as string
        if (Array.isArray(error.response.data.message)) {
          errorMessage = error.response.data.message.join(', ');
        } else {
          errorMessage = String(error.response.data.message);
        }
      } else if (error.message) {
        errorMessage = String(error.message);
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? All data will be lost.',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.mainContainer}>
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={dismissKeyboard}
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create New Project</Text>
              <Text style={styles.headerSubtitle}>Fill in the details below to create your project</Text>
            </View>

            <View style={styles.formContainer}>
              {/* Project Name */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="folder" size={20} color="black" style={styles.labelIcon} />
                  <Text style={styles.label}>Project Name *</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter project name"
                  value={projectData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>

              {/* Project Description */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="document-text" size={20} color="black" style={styles.labelIcon} />
                  <Text style={styles.label}>Description *</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe your project"
                  value={projectData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>

              {/* Start Date */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="calendar" size={20} color="black" style={styles.labelIcon} />
                  <Text style={styles.label}>Start Date</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="MM/DD/YYYY"
                  value={projectData.startDate}
                  onChangeText={(value) => handleInputChange('startDate', value)}
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />
              </View>

              {/* End Date */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Ionicons name="calendar" size={20} color="black" style={styles.labelIcon} />
                  <Text style={styles.label}>End Date</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="MM/DD/YYYY"
                  value={projectData.endDate}
                  onChangeText={(value) => handleInputChange('endDate', value)}
                  placeholderTextColor="#999"
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons - Only show when keyboard is not visible */}
          {!keyboardVisible && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.cancelButton, isLoading && styles.disabledButton]} 
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.createButton, isLoading && styles.disabledButton]} 
                onPress={handleCreateProject}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create Project</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for buttons when keyboard is not visible
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#333333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default CreateProjectScreen;