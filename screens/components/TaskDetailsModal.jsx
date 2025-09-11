import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const TaskDetailsModal = ({ 
  visible, 
  onClose, 
  task, 
  onViewTask 
}) => {
  const handleViewTask = () => {
    onClose();
    if (onViewTask) {
      onViewTask(task);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* --- Transparent backdrop --- */}
      <View className="flex-1 bg-transparent justify-center items-center px-6">
        <View 
          className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
          style={{
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* --- Gradient Header --- */}
          <View 
            className="px-6 py-5"
            style={{
              backgroundColor: 'black',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-black rounded-full items-center justify-center mr-3">
                  <Ionicons name="calendar" size={20} color="#FFFFFF" />
                </View>
                <Text className="text-lg font-bold text-white">Task Preview</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 bg-black rounded-full items-center justify-center"
                style={{ backgroundColor: '#4B5563' }}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* --- Dialog Content --- */}
          <View className="p-6 bg-gray-50">
          
          {task && (
            <>
              {/* --- Task Title Section --- */}
              <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="document-text" size={16} color="#3B82F6" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Task Title</Text>
                </View>
                <Text className="text-lg font-bold text-gray-800 leading-6 ml-11">
                  {task.title}
                </Text>
              </View>
              
              {/* --- Task Description Section --- */}
              <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
                <View className="flex-row items-center mb-3">
                  <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="list" size={16} color="#10B981" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">Description</Text>
                </View>
                <Text className="text-base text-gray-700 leading-6 ml-11">
                  {task.description || 'No description available'}
                </Text>
              </View>
              
              {/* --- Action Buttons --- */}
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 bg-gray-200 py-3 rounded-xl"
                >
                  <Text className="text-gray-700 text-center font-semibold text-base">Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleViewTask}
                  className="flex-1 bg-black py-3 rounded-xl"
                >
                  <Text className="text-white text-center font-semibold text-base">View Task</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default TaskDetailsModal;
