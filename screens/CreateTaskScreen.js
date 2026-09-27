import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from "react-native-dropdown-picker";
import Toast from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDispatch, useSelector } from 'react-redux';
import {
  createNewTask,
  fetchEmployeesForTaskAssignment,
  selectTaskCreating,
  selectTaskCreateError,
  selectEmployeesForAssignment,
} from '../store/slices/taskSlice';
import { Brand } from '../constants/brandColors';

function CreateTaskScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const creating = useSelector(selectTaskCreating);
  const createError = useSelector(selectTaskCreateError);
  const employees = useSelector(selectEmployeesForAssignment);

  const projectId = route?.params?.projectId;
  const projectName = route?.params?.projectName;
  const [focusedField, setFocusedField] = useState(null);
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assignedTo: null,
    priority: 'medium',
  });
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(null);
  const [minStartTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  });
  
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [draftTaskId, setDraftTaskId] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [showAssignedDropdown, setShowAssignedDropdown] = useState(false);
  const [isDropdownInteracting, setIsDropdownInteracting] = useState(false);
  const [flatListRef, setFlatListRef] = useState(null);
  
  const buttonPositionAnim = useRef(new Animated.Value(0)).current;
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
  const [priorityOptions] = useState([
    { id: 'low', label: 'Low', color: '#1B7A4A', bg: '#E8F8EF' },
    { id: 'medium', label: 'Medium', color: '#2563EB', bg: '#E8F1FF' },
    { id: 'high', label: 'High', color: '#C05621', bg: '#FFF1E8' },
    { id: 'critical', label: 'Critical', color: '#B91C1C', bg: '#FEE2E2' },
  ]);

  const getEmployeeLabel = (emp) => {
    if (!emp) return '';
    const name =
      `${emp.first_name || emp.firstName || ''} ${
        emp.last_name || emp.lastName || ''
      }`.trim();
    return name || emp.email || `User ${emp.id}`;
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
        
        Animated.parallel([
          Animated.timing(buttonPositionAnim, {
            toValue: event.endCoordinates.height + 10,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(keyboardHeightAnim, {
            toValue: event.endCoordinates.height,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          })
        ]).start();
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
        
        Animated.parallel([
          Animated.timing(buttonPositionAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(keyboardHeightAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          })
        ]).start();
      }
    );

    dispatch(fetchEmployeesForTaskAssignment());

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (employees && Array.isArray(employees)) {
      setFilteredEmployees(employees);
    }
  }, [employees]);

  const createDraftTask = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const newDraftTask = {
      id: Math.floor(Math.random() * 1000000) + 1,
      title: taskData.title || "",
      description: taskData.description || "",
      startTime: startDateTime,
      minStartTime: minStartTime,
      endTime: endDateTime,
      assignedToUserId: taskData.assignedTo?.id || null,
      priority: taskData.priority || "low",
      isDraft: true,
    };
    
    setDraftTaskId(newDraftTask.id);
    setIsDraftMode(true);
    
    Toast.show({
      type: 'success',
      text1: 'Draft Saved!',
      text2: 'Your task has been saved as a draft',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 80,
    });
    
    return newDraftTask;
  };

  const handleEmployeeSearch = (text) => {
    if (text.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const searchLower = text.toLowerCase().trim();

      const filtered = employees.filter((employee) => {
        const firstName = (employee.first_name || "").toLowerCase();
        const lastName = (employee.last_name || "").toLowerCase();
        const email = (employee.email || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();

        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });

      setFilteredEmployees(filtered);
    }
  };

  const openDropdown = (dropdownType) => {
    Keyboard.dismiss();
    
    setIsDropdownInteracting(true);

    setShowAssignedDropdown(false);
    setPriorityOpen(false);

    if (dropdownType === 'priority') {
      setPriorityOpen(true);
    } else if (dropdownType === 'assigned') {
      setShowAssignedDropdown(true);
    }
  };

  const closeAllDropdowns = () => {
    setShowAssignedDropdown(false);
    setPriorityOpen(false);
    setIsDropdownInteracting(false);
  };

  const handleInputChange = (field, value) => {
    setTaskData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(startDateTime.getHours());
      newDate.setMinutes(startDateTime.getMinutes());
      newDate.setSeconds(startDateTime.getSeconds());
      setStartDateTime(newDate);

      if (endDateTime && newDate > endDateTime) {
      }
    }
  };

  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartTimePicker(false);
    if (event.type === 'set' && selectedDate) {
      const newDate = new Date(startDateTime);
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setStartDateTime(newDate);

      if (endDateTime && newDate > endDateTime) {
      }
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const newDate = new Date(selectedDate);
      if (endDateTime) {
        newDate.setHours(endDateTime.getHours());
        newDate.setMinutes(endDateTime.getMinutes());
        newDate.setSeconds(endDateTime.getSeconds());
      } else {
        newDate.setHours(23);
        newDate.setMinutes(59);
        newDate.setSeconds(0);
      }
      setEndDateTime(newDate);
    }
  };

  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndTimePicker(false);
    if (event.type === 'set' && selectedDate) {
      const newDate = endDateTime ? new Date(endDateTime) : new Date();
      newDate.setHours(selectedDate.getHours());
      newDate.setMinutes(selectedDate.getMinutes());
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);
      setEndDateTime(newDate);
    }
  };

  const handleCreateTask = async () => {
    if (!taskData.title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    if (minStartTime && startDateTime < minStartTime) {
      Alert.alert(
        "Error",
        "Start time cannot be before the draft creation time"
      );
      return;
    }

    if (endDateTime) {
      if (endDateTime <= startDateTime) {
        Alert.alert(
          "Error",
          "End date and time must be after start date and time"
        );
        return;
      }

      const timeDifference =
        endDateTime.getTime() - startDateTime.getTime();
      const minDuration = 15 * 60 * 1000;
      const maxDuration = 365 * 24 * 60 * 60 * 1000;

      if (timeDifference < minDuration) {
        Alert.alert("Error", "Task duration must be at least 15 minutes");
        return;
      }

      if (timeDifference > maxDuration) {
        Alert.alert("Error", "Task duration cannot exceed 1 year");
        return;
      }
    }

    if (!projectId) {
      Alert.alert('Error', 'Project ID is required to create a task');
      return;
    }

    try {
      
      const localStartDate = new Date(startDateTime);
      const localEndDate = endDateTime ? new Date(endDateTime) : null;
      
      const taskStartDate = localStartDate.getFullYear() + '-' + 
        String(localStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(localStartDate.getDate()).padStart(2, '0');
      
      const taskEndDate = localEndDate ? localEndDate.getFullYear() + '-' + 
        String(localEndDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(localEndDate.getDate()).padStart(2, '0') : null;

      const formatWithTimezone = (date) => {
        const timezoneOffset = date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
        const offsetMinutes = Math.abs(timezoneOffset) % 60;
        const offsetSign = timezoneOffset <= 0 ? '+' : '-';
        const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
        
        const isoString = date.toLocaleString('sv-SE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3
        }).replace(' ', 'T');
        
        return `${isoString}${timezoneString}`;
      };

      const taskPayload = {
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        assignedToUserId: taskData.assignedTo?.id || null,
        priority: taskData.priority || null,
        startTime: formatWithTimezone(startDateTime),
        minStartTime: formatWithTimezone(minStartTime),
        endTime: endDateTime ? formatWithTimezone(endDateTime) : null,
        projectId: projectId,
      };

      console.log('=== CreateTaskScreen Task Creation Debug (Local Timezone Format) ===');
      console.log('Original Start Time:', startDateTime.toLocaleString());
      console.log('Local Start Date:', localStartDate.toLocaleDateString());
      console.log('Task Start Date (YYYY-MM-DD):', taskStartDate);
      console.log('Start Time Being Sent (Local):', taskPayload.startTime);
      if (endDateTime) {
        console.log('Original End Time:', endDateTime.toLocaleString());
        console.log('Local End Date:', localEndDate.toLocaleDateString());
        console.log('End Time Being Sent (Local):', taskPayload.endTime);
        console.log('Task End Date (YYYY-MM-DD):', taskEndDate);
      }
      console.log('Task Payload Being Sent:', taskPayload);
      console.log('=== End CreateTaskScreen Task Creation Debug ===');

      const result = await dispatch(createNewTask(taskPayload));
      
      if (createNewTask.fulfilled.match(result)) {
        Toast.show({
          type: 'success',
          text1: 'Task Created Successfully!',
          text2: 'Your task has been created and saved',
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });

        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        const errorMessage = result.payload || 'Failed to create task. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
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

  const formatDate = (value) =>
    value.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (value) =>
    value.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const canSubmit = !!taskData.title?.trim() && !creating;

  const renderSectionHeader = (icon, title, hint) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={15} color={Brand.ink} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: keyboardVisible
              ? keyboardHeight + 118
              : 118 + Math.max(insets.bottom, 8),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isDropdownInteracting}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="add-circle-outline" size={24} color={Brand.ink} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroEyebrow}>CREATE</Text>
              <Text style={styles.heroTitle}>New task</Text>
              <Text style={styles.heroSub} numberOfLines={2}>
                {projectName
                  ? `Assign work for ${projectName}`
                  : 'Add a title, priority, and schedule'}
              </Text>
            </View>
          </View>
        </View>

        
        <View style={styles.card}>
          {renderSectionHeader(
            'document-text-outline',
            'Details',
            'Title is required'
          )}

          <Text style={styles.label}>
            Title <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              focusedField === 'title' && styles.inputFocused,
            ]}
            placeholder="What needs to be done?"
            placeholderTextColor={Brand.inkFaint}
            value={taskData.title}
            onChangeText={(value) => handleInputChange('title', value)}
            onFocus={() => setFocusedField('title')}
            onBlur={() => setFocusedField(null)}
            returnKeyType="next"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[
              styles.input,
              styles.inputMultiline,
              focusedField === 'description' && styles.inputFocused,
            ]}
            placeholder="Notes for the crew (optional)"
            placeholderTextColor={Brand.inkFaint}
            value={taskData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField(null)}
            multiline
            textAlignVertical="top"
          />
        </View>

        
        <View style={styles.card}>
          {renderSectionHeader(
            'flag-outline',
            'Priority',
            'How urgent is this?'
          )}
          <View style={styles.priorityGrid}>
            {priorityOptions.map((priority) => {
              const selected = taskData.priority === priority.id;
              return (
                <TouchableOpacity
                  key={priority.id}
                  style={[
                    styles.priorityCell,
                    selected && {
                      borderColor: priority.color,
                      backgroundColor: priority.bg,
                    },
                  ]}
                  onPress={() => handleInputChange('priority', priority.id)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: priority.color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.priorityText,
                      selected && { color: priority.color, fontWeight: '700' },
                    ]}
                  >
                    {priority.label}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={priority.color}
                      style={{ marginLeft: 'auto' }}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        
        <View
          style={[
            styles.card,
            showAssignedDropdown && { zIndex: 5000, elevation: 8 },
          ]}
        >
          {renderSectionHeader(
            'people-outline',
            'Assignment',
            'Optional — leave unassigned'
          )}
          <Text style={styles.label}>Crew member</Text>
          <View style={styles.dropdownWrap}>
            <DropDownPicker
              open={showAssignedDropdown}
              value={taskData.assignedTo?.id || null}
              items={(filteredEmployees?.length
                ? filteredEmployees
                : employees || []
              ).map((emp) => ({
                label: getEmployeeLabel(emp),
                value: emp.id,
              }))}
              setOpen={(open) => {
                if (open) {
                  Keyboard.dismiss();
                  setPriorityOpen(false);
                  setIsDropdownInteracting(true);
                } else {
                  setIsDropdownInteracting(false);
                }
                setShowAssignedDropdown(open);
              }}
              setValue={(callback) => {
                const newId = callback(taskData.assignedTo?.id || null);
                const emp =
                  (employees || []).find((e) => e.id === newId) || null;
                handleInputChange('assignedTo', emp);
              }}
              searchable
              searchPlaceholder="Search by name or email..."
              onChangeSearchText={handleEmployeeSearch}
              placeholder="Unassigned"
              placeholderStyle={styles.dropdownPlaceholder}
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownList}
              searchContainerStyle={styles.dropdownSearch}
              searchTextInputStyle={styles.dropdownSearchInput}
              listItemLabelStyle={styles.dropdownText}
              selectedItemLabelStyle={styles.dropdownSelectedLabel}
              ArrowDownIconComponent={() => (
                <Ionicons name="chevron-down" size={16} color={Brand.inkMuted} />
              )}
              ArrowUpIconComponent={() => (
                <Ionicons name="chevron-up" size={16} color={Brand.inkMuted} />
              )}
              TickIconComponent={() => (
                <Ionicons name="checkmark" size={16} color={Brand.ink} />
              )}
              listMode="SCROLLVIEW"
              zIndex={4000}
              zIndexInverse={1000}
            />
          </View>

          {taskData.assignedTo ? (
            <View style={styles.assigneeChip}>
              <View style={styles.assigneeAvatar}>
                <Text style={styles.assigneeInitial}>
                  {getEmployeeLabel(taskData.assignedTo).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.assigneeCopy}>
                <Text style={styles.assigneeName} numberOfLines={1}>
                  {getEmployeeLabel(taskData.assignedTo)}
                </Text>
                {taskData.assignedTo.email ? (
                  <Text style={styles.assigneeEmail} numberOfLines={1}>
                    {taskData.assignedTo.email}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => handleInputChange('assignedTo', null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear assignee"
              >
                <Ionicons name="close-circle" size={20} color={Brand.inkFaint} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        
        <View style={styles.card}>
          {renderSectionHeader(
            'calendar-outline',
            'Schedule',
            'End time is optional'
          )}

          <Text style={styles.label}>Starts</Text>
          <View style={styles.scheduleGroup}>
            <TouchableOpacity
              style={styles.scheduleRow}
              onPress={() => setShowStartDatePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.scheduleIcon}>
                <Ionicons name="calendar-outline" size={16} color={Brand.ink} />
              </View>
              <View style={styles.scheduleCopy}>
                <Text style={styles.scheduleHint}>Date</Text>
                <Text style={styles.scheduleValue}>
                  {formatDate(startDateTime)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Brand.inkFaint} />
            </TouchableOpacity>
            <View style={styles.scheduleDivider} />
            <TouchableOpacity
              style={styles.scheduleRow}
              onPress={() => setShowStartTimePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.scheduleIcon}>
                <Ionicons name="time-outline" size={16} color={Brand.ink} />
              </View>
              <View style={styles.scheduleCopy}>
                <Text style={styles.scheduleHint}>Time</Text>
                <Text style={styles.scheduleValue}>
                  {formatTime(startDateTime)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Brand.inkFaint} />
            </TouchableOpacity>
          </View>

          <View style={styles.endsHeader}>
            <Text style={[styles.label, { marginBottom: 0 }]}>Ends</Text>
            {endDateTime ? (
              <TouchableOpacity
                onPress={() => setEndDateTime(null)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.clearLink}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.scheduleGroup}>
            <TouchableOpacity
              style={styles.scheduleRow}
              onPress={() => setShowEndDatePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.scheduleIcon}>
                <Ionicons name="calendar-outline" size={16} color={Brand.ink} />
              </View>
              <View style={styles.scheduleCopy}>
                <Text style={styles.scheduleHint}>Date</Text>
                <Text
                  style={[
                    styles.scheduleValue,
                    !endDateTime && styles.schedulePlaceholder,
                  ]}
                >
                  {endDateTime ? formatDate(endDateTime) : 'Optional'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Brand.inkFaint} />
            </TouchableOpacity>
            <View style={styles.scheduleDivider} />
            <TouchableOpacity
              style={styles.scheduleRow}
              onPress={() => setShowEndTimePicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.scheduleIcon}>
                <Ionicons name="time-outline" size={16} color={Brand.ink} />
              </View>
              <View style={styles.scheduleCopy}>
                <Text style={styles.scheduleHint}>Time</Text>
                <Text
                  style={[
                    styles.scheduleValue,
                    !endDateTime && styles.schedulePlaceholder,
                  ]}
                >
                  {endDateTime ? formatTime(endDateTime) : 'Optional'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Brand.inkFaint} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Animated.View
        style={[
          styles.footerBar,
          {
            bottom: buttonPositionAnim,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
          onPress={handleCreateTask}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {creating ? (
            <ActivityIndicator color={Brand.onInk} size="small" />
          ) : (
            <View style={styles.createBtnInner}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={Brand.onInk}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.createBtnText}>Create Task</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDateTime}
          mode="date"
          onChange={handleStartDateChange}
        />
      )}
      {showStartTimePicker && (
        <DateTimePicker
          value={startDateTime}
          mode="time"
          onChange={handleStartTimeChange}
          is24Hour={false}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDateTime || new Date()}
          mode="date"
          onChange={handleEndDateChange}
          minimumDate={startDateTime}
        />
      )}
      {showEndTimePicker && (
        <DateTimePicker
          value={endDateTime || new Date()}
          mode="time"
          onChange={handleEndTimeChange}
          is24Hour={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: Brand.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: Brand.ink,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  heroAccent: {
    height: 3,
    backgroundColor: Brand.ink,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroText: { flex: 1 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.inkFaint,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 4,
    fontSize: 13,
    color: Brand.inkMuted,
    fontWeight: '500',
    lineHeight: 18,
  },
  card: {
    backgroundColor: Brand.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    padding: 16,
    marginBottom: 12,
    shadowColor: Brand.ink,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.2,
  },
  sectionHint: {
    marginTop: 2,
    fontSize: 12,
    color: Brand.inkFaint,
    fontWeight: '500',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.inkMuted,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  requiredMark: {
    color: Brand.danger,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: Brand.ink,
    fontWeight: '500',
    marginBottom: 14,
  },
  inputFocused: {
    borderColor: Brand.ink,
    backgroundColor: Brand.paper,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: 13,
    marginBottom: 0,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityCell: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.line,
    backgroundColor: Brand.paperSoft,
  },
  priorityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.inkSoft,
  },
  dropdownWrap: {
    zIndex: 2000,
  },
  dropdown: {
    backgroundColor: Brand.paperSoft,
    borderColor: Brand.line,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  dropdownPlaceholder: {
    color: Brand.inkFaint,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownText: {
    fontSize: 14,
    color: Brand.ink,
    fontWeight: '500',
  },
  dropdownSelectedLabel: {
    fontWeight: '700',
    color: Brand.ink,
  },
  dropdownList: {
    backgroundColor: Brand.paper,
    borderColor: Brand.line,
    borderWidth: 1,
    borderRadius: 12,
    shadowColor: Brand.ink,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dropdownSearch: {
    borderBottomColor: Brand.line,
    paddingHorizontal: 10,
  },
  dropdownSearchInput: {
    borderColor: Brand.line,
    borderRadius: 10,
    backgroundColor: Brand.paperSoft,
    fontSize: 14,
    color: Brand.ink,
  },
  assigneeChip: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.paperSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  assigneeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  assigneeInitial: {
    color: Brand.onInk,
    fontSize: 14,
    fontWeight: '700',
  },
  assigneeCopy: { flex: 1 },
  assigneeName: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.ink,
  },
  assigneeEmail: {
    marginTop: 2,
    fontSize: 12,
    color: Brand.inkMuted,
    fontWeight: '500',
  },
  endsHeader: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.inkMuted,
  },
  scheduleGroup: {
    backgroundColor: Brand.paperSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: 'hidden',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  scheduleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Brand.paper,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scheduleCopy: { flex: 1 },
  scheduleHint: {
    fontSize: 11,
    fontWeight: '600',
    color: Brand.inkFaint,
    marginBottom: 2,
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.ink,
  },
  schedulePlaceholder: {
    color: Brand.inkFaint,
    fontWeight: '500',
  },
  scheduleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Brand.line,
    marginLeft: 56,
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Brand.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.line,
    shadowColor: Brand.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  createBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.ink,
    borderRadius: 14,
    paddingVertical: 16,
  },
  createBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    color: Brand.onInk,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default CreateTaskScreen;
