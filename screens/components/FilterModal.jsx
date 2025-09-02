import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FilterModal = ({
  visible,
  onClose,
  selectedFilters,
  setSelectedFilters,
  onApplyFilters,
  userRole,
}) => {
  const handleClearFilters = () => {
    setSelectedFilters({
      createdAt: 'created-at',
      assignedTo: 'all',
      upcoming: 'all',
    });
  };

  const handleApplyFilters = () => {
    console.log('Applying filters:', selectedFilters);
    // Handle different sorting options
    if (selectedFilters.createdAt === 'created-at') {
      console.log('Sorting tasks by creation date (createdAt)');
    } else if (selectedFilters.createdAt === 'start-date') {
      console.log('Sorting tasks by start date (startTime)');
    } else if (selectedFilters.createdAt === 'due-date') {
      console.log('Sorting tasks by due date (endTime)');
    }
    onApplyFilters(selectedFilters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: '#000',
            paddingVertical: Math.min(16, screenHeight * 0.02),
            paddingHorizontal: Math.min(20, screenWidth * 0.05),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: Math.min(18, screenWidth * 0.045),
              fontWeight: '600',
            }}
          >
            Filter Tasks
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ padding: Math.min(8, screenWidth * 0.02) }}
          >
            <Ionicons
              name="close"
              size={Math.min(24, screenWidth * 0.06)}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* Filter Content */}
        <ScrollView
          style={{ flex: 1, padding: Math.min(20, screenWidth * 0.05) }}
        >
          {/* Created At Filter */}
          <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: '#374151',
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}
            >
              Date
            </Text>
            {['created-at', 'start-date', 'due-date'].map((createdAt) => (
              <TouchableOpacity
                key={createdAt}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Math.min(12, screenHeight * 0.015),
                  paddingHorizontal: Math.min(16, screenWidth * 0.04),
                  backgroundColor:
                    selectedFilters.createdAt === createdAt
                      ? '#F3F4F6'
                      : 'transparent',
                  borderRadius: Math.min(8, screenWidth * 0.02),
                  marginBottom: Math.min(8, screenHeight * 0.01),
                }}
                onPress={() =>
                  setSelectedFilters((prev) => ({ ...prev, createdAt }))
                }
              >
                <View
                  style={{
                    width: Math.min(20, screenWidth * 0.05),
                    height: Math.min(20, screenWidth * 0.05),
                    borderRadius: Math.min(10, screenWidth * 0.025),
                    borderWidth: 2,
                    borderColor:
                      selectedFilters.createdAt === createdAt
                        ? '#000'
                        : '#D1D5DB',
                    backgroundColor:
                      selectedFilters.createdAt === createdAt
                        ? '#000'
                        : 'transparent',
                    marginRight: Math.min(12, screenWidth * 0.03),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedFilters.createdAt === createdAt && (
                    <Ionicons
                      name="checkmark"
                      size={Math.min(12, screenWidth * 0.03)}
                      color="white"
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: '#374151',
                    textTransform: 'capitalize',
                  }}
                >
                  {createdAt === 'created-at'
                    ? 'Created At'
                    : createdAt === 'start-date'
                      ? 'Start Date'
                      : 'Due Date'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Assigned To Filter */}
          <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: '#374151',
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}
            >
              Assigned To
            </Text>
            {(userRole === 'Owner' || userRole === 'Manager'
              ? ['all', 'assigned-to-me', 'assigned-to-others', 'unassigned']
              : ['all', 'assigned-to-me', 'unassigned']
            ).map((assignedTo) => (
              <TouchableOpacity
                key={assignedTo}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Math.min(12, screenHeight * 0.015),
                  paddingHorizontal: Math.min(16, screenWidth * 0.04),
                  backgroundColor:
                    selectedFilters.assignedTo === assignedTo
                      ? '#F3F4F6'
                      : 'transparent',
                  borderRadius: Math.min(8, screenWidth * 0.02),
                  marginBottom: Math.min(8, screenHeight * 0.01),
                }}
                onPress={() =>
                  setSelectedFilters((prev) => ({ ...prev, assignedTo }))
                }
              >
                <View
                  style={{
                    width: Math.min(20, screenWidth * 0.05),
                    height: Math.min(20, screenWidth * 0.05),
                    borderRadius: Math.min(10, screenWidth * 0.025),
                    borderWidth: 2,
                    borderColor:
                      selectedFilters.assignedTo === assignedTo
                        ? '#000'
                        : '#D1D5DB',
                    backgroundColor:
                      selectedFilters.assignedTo === assignedTo
                        ? '#000'
                        : 'transparent',
                    marginRight: Math.min(12, screenWidth * 0.03),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedFilters.assignedTo === assignedTo && (
                    <Ionicons
                      name="checkmark"
                      size={Math.min(12, screenWidth * 0.03)}
                      color="white"
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: '#374151',
                    textTransform: 'capitalize',
                  }}
                >
                  {assignedTo === 'all'
                    ? 'All Users'
                    : assignedTo === 'assigned-to-me'
                      ? 'Assigned to Me'
                      : assignedTo === 'assigned-to-others'
                        ? 'Assigned to Others'
                        : 'Unassigned'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upcoming Tasks Filter */}
          <View style={{ marginBottom: Math.min(24, screenHeight * 0.03) }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
                color: '#374151',
                marginBottom: Math.min(12, screenHeight * 0.015),
              }}
            >
              Upcoming Tasks
            </Text>
            {['all', 'upcoming'].map((upcoming) => (
              <TouchableOpacity
                key={upcoming}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Math.min(12, screenHeight * 0.015),
                  paddingHorizontal: Math.min(16, screenWidth * 0.04),
                  backgroundColor:
                    selectedFilters.upcoming === upcoming
                      ? '#F3F4F6'
                      : 'transparent',
                  borderRadius: Math.min(8, screenWidth * 0.02),
                  marginBottom: Math.min(8, screenHeight * 0.01),
                }}
                onPress={() =>
                  setSelectedFilters((prev) => ({ ...prev, upcoming }))
                }
              >
                <View
                  style={{
                    width: Math.min(20, screenWidth * 0.05),
                    height: Math.min(20, screenWidth * 0.05),
                    borderRadius: Math.min(10, screenWidth * 0.025),
                    borderWidth: 2,
                    borderColor:
                      selectedFilters.upcoming === upcoming
                        ? '#000'
                        : '#D1D5DB',
                    backgroundColor:
                      selectedFilters.upcoming === upcoming
                        ? '#000'
                        : 'transparent',
                    marginRight: Math.min(12, screenWidth * 0.03),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedFilters.upcoming === upcoming && (
                    <Ionicons
                      name="checkmark"
                      size={Math.min(12, screenWidth * 0.03)}
                      color="white"
                    />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: '#374151',
                    textTransform: 'capitalize',
                  }}
                >
                  {upcoming === 'all' ? 'All Tasks' : 'Upcoming Tasks'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View
          style={{
            flexDirection: 'row',
            padding: Math.min(20, screenWidth * 0.05),
            backgroundColor: '#F9FAFB',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#F3F4F6',
              paddingVertical: Math.min(12, screenHeight * 0.015),
              borderRadius: Math.min(8, screenWidth * 0.02),
              alignItems: 'center',
              marginRight: Math.min(10, screenWidth * 0.025),
            }}
            onPress={handleClearFilters}
          >
            <Text
              style={{
                color: '#374151',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}
            >
              Clear
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#000',
              paddingVertical: Math.min(12, screenHeight * 0.015),
              borderRadius: Math.min(8, screenWidth * 0.02),
              alignItems: 'center',
              marginLeft: Math.min(10, screenWidth * 0.025),
            }}
            onPress={handleApplyFilters}
          >
            <Text
              style={{
                color: 'white',
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: '600',
              }}
            >
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default FilterModal;
