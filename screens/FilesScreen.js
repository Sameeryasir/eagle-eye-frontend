import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { getMyProjects } from '../services/projects/getProjectsByLoginUserId';
import CustomBottomNav from '../components/CustomBottomNav';

const FilesScreen = ({ navigation }) => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMyProjects = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching my projects...');
      const response = await getMyProjects();
      
      if (response && Array.isArray(response)) {
        setProjects(response);
        console.log('✅ Projects fetched successfully:', response.length, 'projects');
      } else {
        setProjects([]);
        console.log('📭 No projects found');
      }
    } catch (err) {
      console.error('❌ Error fetching projects:', err);
      setProjects([]);
      setError('Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const renderProjectItem = ({ item }) => {
    return (
      <TouchableOpacity
        className="bg-white rounded-lg p-4 mb-3 mx-4 shadow-sm border border-gray-100"
        activeOpacity={0.7}
        onPress={() => {
          console.log('Project tapped:', item.name, 'ID:', item.id);
          navigation.navigate('ProjectFiles', {
            projectId: item.id,
            projectName: item.name
          });
        }}
      >
        <View className="flex-row items-center">
          {/* Project Icon */}
          <View className="w-12 h-12 bg-gray-100 rounded-lg items-center justify-center mr-3">
            <MaterialIcons name="folder" size={24} color="#000000" />
          </View>
          
          {/* Project Info */}
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              {item.name || 'Unnamed Project'}
            </Text>
            <Text className="text-sm text-gray-500 mb-1">
              {item.description || 'No description available'}
            </Text>
            <Text className="text-xs text-gray-400">
              Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
          
          {/* Arrow Icon */}
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
            Failed to Load Projects
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6 mb-6">
            {error}
          </Text>
          <TouchableOpacity
            className="bg-black py-3 px-6 rounded-xl"
            onPress={fetchMyProjects}
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
          <Text className="text-base text-gray-500 mt-4">Loading projects...</Text>
        </View>
      ) : projects.length > 0 ? (
        /* Projects List */
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderProjectItem}
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
            <MaterialIcons name="folder-open" size={40} color="#9CA3AF" />
          </View>
          <Text className="text-xl font-semibold text-gray-900 mb-3 text-center">
            No Projects Found
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            You don't have any projects yet. Create your first project to get started.
          </Text>
        </View>
      )}
      
      <CustomBottomNav 
        navigation={navigation} 
        hideFAB={true}
      />
    </SafeAreaView>
  );
};

export default FilesScreen;
