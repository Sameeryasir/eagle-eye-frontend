import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { getUserById } from '../services/user/getUserById';
import { updateUserById } from '../services/user/updateUserById';

export default function AccountInfoScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
  });
  const [originalUserInfo, setOriginalUserInfo] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get user ID from AsyncStorage
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        throw new Error('User ID not found');
      }
      
      setUserId(storedUserId);
      
      // Fetch user data from API
      const userData = await getUserById(storedUserId);
      
      // Format the API response to match our state structure
      const formattedData = {
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        company: userData.company?.name || '',
        role: userData.role?.name || '',
      };
      
      setUserInfo(formattedData);
      setOriginalUserInfo(formattedData); // Store original data for comparison
      
    } catch (error) {
      console.error('Error loading user data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load user information',
      });
      
      // Fallback to default data if API fails
      const defaultData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@company.com',
        phone: '',
        company: 'Eagle Eye Construction',
        role: 'Manager',
      };
      setUserInfo(defaultData);
      setOriginalUserInfo(defaultData);
    } finally {
      setLoading(false);
    }
  };

  const saveUserData = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        first_name: userInfo.first_name || '',
        last_name: userInfo.last_name || '',
        email: userInfo.email || '',
        phone: userInfo.phone || '',
      };
      
      console.log('Sending only changed fields:', updateData);
      console.log('Full update data being sent to API:', JSON.stringify(updateData, null, 2));
      console.log('Current userInfo state:', JSON.stringify(userInfo, null, 2));
      console.log('Original userInfo state:', JSON.stringify(originalUserInfo, null, 2));
      
      // Call update API with only changed fields
      await updateUserById(userId, updateData);
      
      setIsEditing(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Account information updated successfully',
      });
      
      // Update AsyncStorage with new name data for sidebar
      if (updateData.first_name) {
        await AsyncStorage.setItem('userFirstName', updateData.first_name);
      }
      if (updateData.last_name) {
        await AsyncStorage.setItem('userLastName', updateData.last_name);
      }
      
      // Reload data to get updated information from server
      await loadUserData();
      
    } catch (error) {
      console.error('Error saving user data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to save user information',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('access_token');
              await AsyncStorage.removeItem('refresh_token');
              await AsyncStorage.removeItem('userData');
              // Navigate to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'LogIn' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const renderInputField = (label, field, placeholder, keyboardType = 'default') => {
    const value = userInfo[field];
    const isEmpty = !value || value.trim() === '';
    const isReadOnly = !isEditing;
    
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 }}>{label}</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#e0e0e0',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            color: isReadOnly ? '#666' : '#1e1e1e',
            backgroundColor: isReadOnly ? '#f8f9fa' : '#ffffff',
          }}
          value={isReadOnly && isEmpty ? `Don't have ${label.toLowerCase()}` : value}
          onChangeText={(value) => handleInputChange(field, value)}
          placeholder={isReadOnly ? '' : placeholder}
          editable={isEditing}
          keyboardType={keyboardType}
          placeholderTextColor="#999"
        />
      </View>
    );
  };

  const renderReadOnlyField = (label, field) => {
    const value = userInfo[field];
    const isEmpty = !value || value.trim() === '';
    
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 }}>{label}</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#e0e0e0',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 12,
            fontSize: 16,
            color: '#666',
            backgroundColor: '#f8f9fa',
          }}
          value={isEmpty ? `Don't have ${label.toLowerCase()}` : value}
          editable={false}
          placeholderTextColor="#999"
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={{ backgroundColor: '#ffffff', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ marginBottom: 15 }}>
            <Ionicons name="person-circle" size={80} color="#000000" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e1e1e', marginBottom: 5 }}>
            {`${userInfo.first_name} ${userInfo.last_name}`.trim() || 'Unknown User'}
          </Text>
          <Text style={{ fontSize: 16, color: '#666' }}>{userInfo.role}</Text>
        </View>

        {/* Account Information Section */}
        <View style={{ backgroundColor: '#ffffff', marginHorizontal: 20, marginBottom: 20, borderRadius: 12, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1e1e1e' }}>Account Information</Text>
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f0f4ff' }}
            >
              <Ionicons
                name={isEditing ? 'close' : 'create-outline'}
                size={20}
                color="#3155A1"
              />
              <Text style={{ marginLeft: 5, fontSize: 14, color: '#3155A1', fontWeight: '500' }}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {renderInputField('First Name', 'first_name', 'Enter your first name')}
          {renderInputField('Last Name', 'last_name', 'Enter your last name')}
          {renderInputField('Email Address', 'email', 'Enter your email', 'email-address')}
          {renderInputField('Phone Number', 'phone', 'Enter your phone number', 'phone-pad')}
          {renderReadOnlyField('Company', 'company')}
          {renderReadOnlyField('Role', 'role')}
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#3155A1', borderRadius: 12, paddingVertical: 15, alignItems: 'center' }}
              onPress={saveUserData}
              disabled={saving}
            >
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings Section */}
        <View style={{ backgroundColor: '#ffffff', marginHorizontal: 20, marginBottom: 20, borderRadius: 12, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1e1e1e' }}>Settings</Text>
          
          <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={24} color="#666" />
              <Text style={{ marginLeft: 15, fontSize: 16, color: '#333' }}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="lock-closed-outline" size={24} color="#666" />
              <Text style={{ marginLeft: 15, fontSize: 16, color: '#333' }}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="help-circle-outline" size={24} color="#666" />
              <Text style={{ marginLeft: 15, fontSize: 16, color: '#333' }}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 15, borderWidth: 1, borderColor: '#DC2626' }}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#DC2626" />
            <Text style={{ marginLeft: 10, fontSize: 16, fontWeight: '600', color: '#DC2626' }}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

