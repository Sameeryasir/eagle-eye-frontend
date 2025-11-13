import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const PastDateDialog = ({ 
  visible, 
  onClose 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {}
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
          {}
          <View 
            className="px-6 py-5"
            style={{
              backgroundColor: 'black',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <View className="flex-row items-center justify-center">
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                  <Ionicons name="calendar" size={20} color="black" />
                </View>
                <Text className="text-lg font-bold text-white">Cannot Create Event</Text>
              </View>
            </View>
          </View>
          
          {}
          <View className="p-6 bg-gray-50">
            <View className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
              <View className="flex-row items-center justify-center mb-3">
                <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center">
                  <Ionicons name="alert-circle" size={24} color="#EF4444" />
                </View>
              </View>
              <Text className="text-base text-gray-700 text-center leading-6">
                You cannot create the event in the past
              </Text>
            </View>
            
            {}
            <TouchableOpacity
              onPress={onClose}
              className="bg-black py-4 rounded-xl"
            >
              <Text className="text-white text-center font-semibold text-lg">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PastDateDialog;
