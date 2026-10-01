// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import DateTimePicker from "@react-native-community/datetimepicker";
import DropDownPicker from "react-native-dropdown-picker";
import * as Localization from "expo-localization";
import { getEmployeesToAssignTask } from "../services/employees/getEmployeesOfTheCompany";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import { createEvent } from "../services/event/createEvent";
import { eventAssignement } from "../services/inAppNotification/eventAssignement";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ErrorDialog from "./ErrorDialog";

const CreateEventModal = ({
  visible,
  onClose,
  selectedDate,
  onEventCreated,
}) => {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    isProject: false,
    assignedTo: [],
    projects: [],
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date());

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isDropdownInteracting, setIsDropdownInteracting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const scrollViewRef = useRef(null);
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  const [errorDialog, setErrorDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const [employees, setEmployees] = useState([]);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [selectedEmployeeValues, setSelectedEmployeeValues] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  const [projects, setProjects] = useState([]);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [selectedProjectValues, setSelectedProjectValues] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useEffect(() => {
    if (createError) {
      console.error("Create error:", createError);

      Toast.show({
        type: "error",
        text1: "Event Creation Failed",
        text2: createError,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });

      setCreateError(null);
    }
  }, [createError]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);

        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToOffset({ offset: 0, animated: true });
        }
      }
    );

    if (visible) {
      const now = new Date();
      const eventDate = selectedDate ? new Date(selectedDate) : new Date();

      const currentStartDateTime = new Date(eventDate);

      const today = new Date();
      const isToday = eventDate.toDateString() === today.toDateString();

      if (isToday) {
        currentStartDateTime.setHours(now.getHours());
        currentStartDateTime.setMinutes(now.getMinutes());
        currentStartDateTime.setSeconds(0);
        currentStartDateTime.setMilliseconds(0);
      } else {
        currentStartDateTime.setHours(9);
        currentStartDateTime.setMinutes(0);
        currentStartDateTime.setSeconds(0);
        currentStartDateTime.setMilliseconds(0);
      }

      const currentEndDateTime = new Date(currentStartDateTime);
      currentEndDateTime.setHours(currentEndDateTime.getHours() + 1);

      setStartDateTime(currentStartDateTime);
      setEndDateTime(currentEndDateTime);

      const startTimeString = currentStartDateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const endTimeString = currentEndDateTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      setEventForm((prev) => ({
        ...prev,
        startTime: startTimeString,
        endTime: endTimeString,
      }));

      fetchProjects();
    }

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [visible, selectedDate]);

  const handleEventFormChange = (field, value) => {
    setEventForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetEventForm = () => {

    setEventForm({
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      isProject: false,
      assignedTo: [],
      projects: [],
    });
    setStartDateTime(new Date());
    setEndDateTime(new Date());
    setSelectedEmployeeValues([]);
    setEmployeeDropdownOpen(false);
    setSelectedProjectValues([]);
    setProjectDropdownOpen(false);

  };

  const showErrorDialog = (title, message) => {
    setErrorDialog({
      visible: true,
      title: title,
      message: message,
    });
  };

  const closeErrorDialog = () => {
    setErrorDialog({
      visible: false,
      title: "",
      message: "",
    });
  };

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await getMyProjects();

      if (response && Array.isArray(response)) {
        const formattedProjects = response.map((project) => {
          let displayName = project.name || project.title || "Unnamed Project";

          if (project.description) {
            const truncatedDesc =
              project.description.length > 30
                ? project.description.substring(0, 27) + "..."
                : project.description;
            displayName += ` - ${truncatedDesc}`;
          }

          if (displayName.length > 60) {
            displayName = displayName.substring(0, 57) + "...";
          }

          const formattedProject = {
            label: displayName,
            value: project.id,
            project: project,
          };

          return formattedProject;
        });

        setProjects(formattedProjects);

        setTimeout(() => {
          setIsLoadingProjects(false);
        }, 300);
      } else {
        console.warn("No projects data received from API");
        setProjects([]);
        setIsLoadingProjects(false);
      }
    } catch (error) {
      console.error("Error fetching projects from API:", error);
      showErrorDialog(
        "Error Loading Projects",
        "Failed to load projects list. Please try again."
      );
      setIsLoadingProjects(false);
    }
  };

  const fetchEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const response = await getEmployeesToAssignTask();

      if (response && Array.isArray(response)) {
        const formattedEmployees = response.map((employee) => {
          const fullName =
            `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
          let displayName = fullName
            ? `${fullName} (${employee.email})`
            : employee.email;

          if (displayName.length > 50) {
            displayName = displayName.substring(0, 47) + "...";
          }

          const formattedEmployee = {
            label: displayName,
            value: employee.id,
            employee: employee,
          };

          return formattedEmployee;
        });

        setEmployees(formattedEmployees);

        setTimeout(() => {
          setIsLoadingEmployees(false);
        }, 300);
      } else {
        console.warn("No employees data received from API");
        setEmployees([]);
        setIsLoadingEmployees(false);
      }
    } catch (error) {
      console.error("Error fetching employees from API:", error);
      showErrorDialog(
        "Error Loading Employees",
        "Failed to load employees list. Please try again."
      );
      setIsLoadingEmployees(false);
    }
  };

  const handleProjectCheckboxChange = (isChecked) => {
    handleEventFormChange("isProject", isChecked);

    if (isChecked) {
      fetchEmployees();

      setSelectedProjectValues([]);
      handleEventFormChange("projects", []);
    } else {
      setSelectedEmployeeValues([]);
      handleEventFormChange("assignedTo", []);
    }
  };

  const handleProjectSelection = (values) => {

    setSelectedProjectValues(values);

    const selectedProjects = projects
      .filter((proj) => values.includes(proj.value))
      .map((proj) => proj.project);

    handleEventFormChange("projects", selectedProjects);

    if (values.length > 0) {
      setSelectedEmployeeValues([]);
      handleEventFormChange("assignedTo", []);
    }

  };

  const handleEmployeeSelection = (values) => {

    setSelectedEmployeeValues(values);

    const selectedEmployees = employees
      .filter((emp) => values.includes(emp.value))
      .map((emp) => emp.employee);

    handleEventFormChange("assignedTo", selectedEmployees);

    if (values.length > 0) {
      setSelectedProjectValues([]);
      handleEventFormChange("projects", []);
    }

  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(startDateTime.getHours());
      newDate.setMinutes(startDateTime.getMinutes());
      setStartDateTime(newDate);

      if (newDate > endDateTime) {
        setEndDateTime(newDate);
      }
    }
  };

  const handleStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      const newDate = new Date(startDateTime);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());

      const now = new Date();
      const isToday = newDate.toDateString() === now.toDateString();

      if (isToday && newDate < now) {
        showErrorDialog(
          "Invalid Time",
          "You cannot select a time in the past for today. Please choose a future time."
        );
        return;
      }

      setStartDateTime(newDate);

      const timeString = newDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      handleEventFormChange("startTime", timeString);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (event.type === "set" && selectedDate) {
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

  const handleEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === "ios");
    if (event.type === "set" && selectedTime) {
      if (endDateTime) {
        const newDate = new Date(endDateTime);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        newDate.setSeconds(0);
        newDate.setMilliseconds(0);

        const now = new Date();
        const isToday = newDate.toDateString() === now.toDateString();

        if (isToday && newDate < now) {
          showErrorDialog(
            "Invalid Time",
            "You cannot select a time in the past for today. Please choose a future time."
          );
          return;
        }

        if (newDate >= startDateTime) {
          setEndDateTime(newDate);

          const timeString = newDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          handleEventFormChange("endTime", timeString);
        } else {
          showErrorDialog(
            "Invalid Time",
            "End time must be after start time. Please choose a later time."
          );
          return;
        }
      }
    }
  };

  const handleCreateEvent = async () => {

    if (!eventForm.title.trim()) {
      showErrorDialog("Error", "Please enter a title for the event");
      return;
    }

    if (!eventForm.startTime.trim()) {
      showErrorDialog("Error", "Please enter a start time for the event");
      return;
    }

    if (!eventForm.endTime.trim()) {
      showErrorDialog("Error", "Please enter an end time for the event");
      return;
    }

    if (endDateTime <= startDateTime) {
      showErrorDialog(
        "Error",
        "End time must be after start time. Please adjust your times."
      );
      return;
    }

    const hasEmployees =
      eventForm.isProject &&
      eventForm.assignedTo &&
      eventForm.assignedTo.length > 0;
    const hasProjects =
      !eventForm.isProject &&
      eventForm.projects &&
      eventForm.projects.length > 0;

    if (hasEmployees && hasProjects) {
      showErrorDialog(
        "Invalid Assignment",
        "You cannot assign both employees and projects to the same event. Please choose one assignment type."
      );
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      const localStartDate = new Date(startDateTime);
      const localEndDate = new Date(endDateTime);

      const eventDate =
        localStartDate.getFullYear() +
        "-" +
        String(localStartDate.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(localStartDate.getDate()).padStart(2, "0");

      const timezoneName = Localization.timezone;
      const locale = Localization.locale;
      const locales = Localization.locales;

      const debugTimezoneOffset = new Date().getTimezoneOffset();
      const debugTimezoneOffsetHours = -debugTimezoneOffset / 60;

      let assignedToIds = [];
      let projectIds = [];

      if (
        eventForm.isProject &&
        eventForm.assignedTo &&
        eventForm.assignedTo.length > 0
      ) {
        assignedToIds = eventForm.assignedTo.map((emp) => emp.id);
      } else if (
        !eventForm.isProject &&
        eventForm.projects &&
        eventForm.projects.length > 0
      ) {
        projectIds = eventForm.projects.map((proj) => proj.id);
      } else {
        assignedToIds = [];
        projectIds = [];
      }

      const formatWithTimezone = (date) => {
        const timezoneOffset = date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
        const offsetMinutes = Math.abs(timezoneOffset) % 60;
        const offsetSign = timezoneOffset <= 0 ? "+" : "-";
        const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;

        const isoString = date
          .toLocaleString("sv-SE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
          })
          .replace(" ", "T");

        return `${isoString}${timezoneString}`;
      };

      const eventData = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim() || "",
        startTime: formatWithTimezone(startDateTime),
        endTime: formatWithTimezone(endDateTime),
        assignedTo: assignedToIds,
        projects: projectIds,
      };

      const response = await createEvent(eventData);

      if (response) {

        try {
          const currentUserId = await AsyncStorage.getItem("userId");
          const currentUserFirstName =
            await AsyncStorage.getItem("userFirstName");
          const currentUserLastName =
            await AsyncStorage.getItem("userLastName");
          const currentUserName =
            `${currentUserFirstName || ""} ${currentUserLastName || ""}`.trim() ||
            "Unknown User";

          if (eventForm.assignedTo && eventForm.assignedTo.length > 0) {
            const assignedToUserIds = eventForm.assignedTo.map((employee) =>
              Number(employee.id)
            );

            const eventId = response?.id || response?.data?.id || eventData?.id;
            if (!eventId) {
              console.error("❌ No event ID found in response:", response);
              return;
            }

            const apiNotificationData = {
              title: "New Event Assigned",
              message: `You have been assigned to a new event: ${eventForm.title}`,
              assignedToUserIds: assignedToUserIds,
              eventId: Number(eventId),
              priority: "medium",
              eventName: eventForm.title,
              fromUserName: currentUserName,
            };

            await eventAssignement(apiNotificationData);
          } else {
          }
        } catch (apiError) {
          console.error("❌ Error sending API event notification:", apiError);
        }

        Toast.show({
          type: "success",
          text1: "Event Created Successfully!",
          text2: "Your new event has been added to the calendar",
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 80,
        });

        onClose();
        resetEventForm();
        if (onEventCreated) {
          onEventCreated();
        }
      } else {
        setCreateError("Failed to create event. Please try again.");
      }
    } catch (error) {
      console.error("Unexpected error in handleCreateEvent:", error);
      setCreateError("An unexpected error occurred. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetEventForm();
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setIsDropdownInteracting(false);
    setIsSearching(false);
    setEmployeeDropdownOpen(false);
    setProjectDropdownOpen(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="formSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-white">
        <View className="bg-black px-4 py-3 flex-row items-center justify-between">
          <Text className="text-white text-[18px] font-semibold">
            Create Event
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View className="flex-1 p-5 items-center">
            <FlatList
              ref={scrollViewRef}
              className="flex-1 w-full max-w-md"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!isDropdownInteracting || isSearching}
              data={[{ key: "form" }]}
              renderItem={() => (
                <View>
                  <View className="mb-8 items-center">
                    <Text className="text-[28px] font-bold text-[#333]">
                      Create Event
                    </Text>
                    <Text className="text-[16px] text-[#666] text-center">
                      Add a new event to your schedule
                    </Text>
                  </View>

                  <View className="mb-5">
                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="document-text"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Event Title
                        </Text>
                      </View>
                      <TextInput
                        className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333]"
                        placeholder="Enter event title"
                        value={eventForm.title}
                        onChangeText={(text) =>
                          handleEventFormChange("title", text)
                        }
                        placeholderTextColor="#999"
                        returnKeyType="next"
                      />
                    </View>

                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Description
                        </Text>
                      </View>
                      <TextInput
                        className="border border-[#e1e8ed] rounded-lg p-3 text-[16px] bg-[#f8f9fa] text-[#333] h-24"
                        placeholder="Describe your event"
                        value={eventForm.description}
                        onChangeText={(text) =>
                          handleEventFormChange("description", text)
                        }
                        multiline
                        numberOfLines={4}
                        placeholderTextColor="#999"
                        returnKeyType="next"
                        style={{ textAlignVertical: "top" }}
                      />
                    </View>

                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="folder"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          This is a Project
                        </Text>
                      </View>
                      <TouchableOpacity
                        className="flex-row items-center justify-between p-3 border border-[#e1e8ed] rounded-lg bg-[#f8f9fa]"
                        onPress={() =>
                          handleProjectCheckboxChange(!eventForm.isProject)
                        }
                        activeOpacity={0.7}
                      >
                        <View className="flex-row items-center flex-1">
                          <Text className="text-[16px] font-medium text-[#333]">
                            This is a Project
                          </Text>
                        </View>
                        <View
                          className={`w-5 h-5 border-2 rounded items-center justify-center ${
                            eventForm.isProject
                              ? "bg-black border-black"
                              : "bg-white border-[#d1d5db]"
                          }`}
                        >
                          {eventForm.isProject && (
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color="white"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>

                    {!eventForm.isProject && (
                      <View className="mb-5">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            <Ionicons
                              name="folder-open"
                              size={16}
                              color="#374151"
                              style={{ marginRight: 6 }}
                            />
                            <Text className="text-[16px] font-semibold text-[#333]">
                              Select Project
                            </Text>
                          </View>

                          {projects.length > 0 && (
                            <TouchableOpacity
                              onPress={() => {
                                const allProjectIds = projects.map(
                                  (proj) => proj.value
                                );
                                const isAllSelected = allProjectIds.every(
                                  (id) => selectedProjectValues.includes(id)
                                );

                                if (isAllSelected) {
                                  setSelectedProjectValues([]);
                                  handleEventFormChange("projects", []);
                                } else {
                                  setSelectedProjectValues(allProjectIds);
                                  const allProjects = projects.map(
                                    (proj) => proj.project
                                  );
                                  handleEventFormChange(
                                    "projects",
                                    allProjects
                                  );
                                }
                              }}
                              className="bg-blue-100 px-3 py-1 rounded-lg"
                              activeOpacity={0.7}
                            >
                              <Text className="text-blue-600 text-[12px] font-medium">
                                {projects.every((proj) =>
                                  selectedProjectValues.includes(proj.value)
                                )
                                  ? "Unselect All"
                                  : "Select All"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <DropDownPicker
                          open={projectDropdownOpen}
                          value={selectedProjectValues}
                          items={projects}
                          setOpen={(open) => {
                            if (open) {
                              setIsDropdownInteracting(true);
                            } else {
                              setIsDropdownInteracting(false);
                            }
                            setProjectDropdownOpen(open);
                          }}
                          setValue={(callback) => {
                          }}
                          setItems={setProjects}
                          multiple={true}
                          min={0}
                          max={10}
                          placeholder="Select projects (multiple allowed)"
                          placeholderStyle={{
                            color: "#9ca3af",
                            fontSize: 16,
                            fontWeight: "400",
                          }}
                          multipleText={`${selectedProjectValues.length} Project${selectedProjectValues.length !== 1 ? "s" : ""} Selected`}
                          multipleTextStyle={{
                            color: "#000000",
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                          onSelectItem={(items) => {
                            const values = items.map((item) => item.value);
                            handleProjectSelection(values);
                          }}
                          loading={isLoadingProjects}
                          activityIndicatorColor="#666"
                          searchable={true}
                          searchPlaceholder="Search projects..."
                          searchTextInputStyle={{
                            fontSize: 16,
                            color: "#333",
                          }}
                          searchTextInputProps={{
                            placeholderTextColor: "#9ca3af",
                            returnKeyType: "search",
                            blurOnSubmit: false,
                            autoCorrect: false,
                            autoCapitalize: "none",
                            onFocus: () => {
                              setIsSearching(true);
                            },
                            onBlur: () => {
                              setIsSearching(false);
                            },
                          }}
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderColor: "#e1e8ed",
                            borderRadius: 8,
                            minHeight: 0,
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                          }}
                          textStyle={{
                            fontSize: 16,
                            color:
                              selectedProjectValues.length > 0
                                ? "#333"
                                : "#9ca3af",
                            fontWeight: "400",
                          }}
                          dropDownContainerStyle={{
                            backgroundColor: "white",
                            borderColor: "#e5e7eb",
                            borderRadius: 8,
                            shadowColor: "#000",
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: 999999,
                            maxHeight: 200,
                            zIndex: 999999,

                            ...(keyboardVisible && {
                              marginBottom: keyboardHeight - 50,
                            }),
                          }}
                          listMode="SCROLLVIEW"
                          scrollViewProps={{
                            nestedScrollEnabled: true,
                            showsVerticalScrollIndicator: true,
                            bounces: true,
                            scrollEnabled: true,
                            onScrollBeginDrag: () => {
                              setIsDropdownInteracting(true);
                            },
                            onScrollEndDrag: () => {
                              if (projectDropdownOpen) {
                                setIsDropdownInteracting(true);
                              }
                            },
                            scrollEventThrottle: 16,
                            onTouchStart: () => {
                              setIsDropdownInteracting(true);
                            },
                            onTouchEnd: () => {
                              if (!projectDropdownOpen) {
                                setIsDropdownInteracting(false);
                              }
                            },
                          }}
                          labelProps={{
                            numberOfLines: 1,
                          }}
                          customItemContainerStyle={{
                            height: 40,
                          }}
                          customItemLabelStyle={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#333",
                          }}
                          arrowIconStyle={{
                            width: 16,
                            height: 16,
                            tintColor: "#6b7280",
                          }}
                          showArrowIcon={true}
                          renderListItem={(item) => {
                            const isSelected = selectedProjectValues.includes(
                              item.value
                            );

                            const project = item.project || {};

                            return (
                              <TouchableOpacity
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  paddingVertical: 12,
                                  paddingHorizontal: 16,
                                  backgroundColor: isSelected
                                    ? "#f5f5f5"
                                    : "transparent",
                                  borderLeftWidth: isSelected ? 3 : 0,
                                  borderLeftColor: "#000000",
                                }}
                                onPress={() => {
                                  const newValues = isSelected
                                    ? selectedProjectValues.filter(
                                        (val) => val !== item.value
                                      )
                                    : [...selectedProjectValues, item.value];
                                  handleProjectSelection(newValues);
                                }}
                                activeOpacity={0.7}
                              >
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderWidth: 2,
                                    borderColor: isSelected
                                      ? "#000000"
                                      : "#d1d5db",
                                    borderRadius: 4,
                                    backgroundColor: isSelected
                                      ? "#000000"
                                      : "transparent",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {isSelected && (
                                    <Ionicons
                                      name="checkmark"
                                      size={14}
                                      color="white"
                                    />
                                  )}
                                </View>

                                <View
                                  style={{
                                    flex: 1,
                                    marginLeft: 12,
                                    flexDirection: "row",
                                    alignItems: "center",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 16,
                                      color: isSelected ? "#000000" : "#333",
                                      fontWeight: isSelected ? "600" : "500",
                                      flex: 1,
                                    }}
                                  >
                                    {item.label || "Unknown Project"}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          }}
                          badgeTextStyle={{
                            fontSize: 12,
                            color: "#000000",
                            fontWeight: "600",
                          }}
                          badgeContainerStyle={{
                            backgroundColor: "#f0f0f0",
                            borderRadius: 12,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            marginRight: 4,
                            marginBottom: 4,
                          }}
                          closeAfterSelecting={false}
                          zIndex={999999}
                          zIndexInverse={1000}
                        />
                      </View>
                    )}

                    {eventForm.isProject && (
                      <View className="mb-5">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center">
                            <Ionicons
                              name="people"
                              size={16}
                              color="#374151"
                              style={{ marginRight: 6 }}
                            />
                            <Text className="text-[16px] font-semibold text-[#333]">
                              Assign to Employee
                            </Text>
                          </View>

                          {employees.length > 0 && (
                            <TouchableOpacity
                              onPress={() => {
                                const allEmployeeIds = employees.map(
                                  (emp) => emp.value
                                );
                                const isAllSelected = allEmployeeIds.every(
                                  (id) => selectedEmployeeValues.includes(id)
                                );

                                if (isAllSelected) {
                                  setSelectedEmployeeValues([]);
                                  handleEventFormChange("assignedTo", []);
                                } else {
                                  setSelectedEmployeeValues(allEmployeeIds);
                                  const allEmployees = employees.map(
                                    (emp) => emp.employee
                                  );
                                  handleEventFormChange(
                                    "assignedTo",
                                    allEmployees
                                  );
                                }
                              }}
                              className="bg-blue-100 px-3 py-1 rounded-lg"
                              activeOpacity={0.7}
                            >
                              <Text className="text-blue-600 text-[12px] font-medium">
                                {employees.every((emp) =>
                                  selectedEmployeeValues.includes(emp.value)
                                )
                                  ? "Unselect All"
                                  : "Select All"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <DropDownPicker
                          open={employeeDropdownOpen}
                          value={selectedEmployeeValues}
                          items={employees}
                          setOpen={(open) => {
                            if (open) {
                              setIsDropdownInteracting(true);
                            } else {
                              setIsDropdownInteracting(false);
                            }
                            setEmployeeDropdownOpen(open);
                          }}
                          setValue={setSelectedEmployeeValues}
                          setItems={setEmployees}
                          multiple={true}
                          min={0}
                          max={10}
                          placeholder="Select employees (multiple allowed)"
                          placeholderStyle={{
                            color: "#9ca3af",
                            fontSize: 16,
                            fontWeight: "400",
                          }}
                          multipleText={`${selectedEmployeeValues.length} Employee${selectedEmployeeValues.length !== 1 ? "s" : ""} Selected`}
                          multipleTextStyle={{
                            color: "#1e40af",
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                          onSelectItem={(items) => {
                            const values = items.map((item) => item.value);
                            handleEmployeeSelection(values);
                          }}
                          loading={isLoadingEmployees}
                          activityIndicatorColor="#666"
                          searchable={true}
                          searchPlaceholder="Search employees..."
                          searchTextInputStyle={{
                            fontSize: 16,
                            color: "#333",
                          }}
                          searchTextInputProps={{
                            placeholderTextColor: "#9ca3af",
                            returnKeyType: "search",
                            blurOnSubmit: false,
                            autoCorrect: false,
                            autoCapitalize: "none",
                            onFocus: () => {
                              setIsSearching(true);
                            },
                            onBlur: () => {
                              setIsSearching(false);
                            },
                          }}
                          style={{
                            backgroundColor: "#f8f9fa",
                            borderColor: "#e1e8ed",
                            borderRadius: 8,
                            minHeight: 0,
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                          }}
                          textStyle={{
                            fontSize: 16,
                            color:
                              selectedEmployeeValues.length > 0
                                ? "#333"
                                : "#9ca3af",
                            fontWeight: "400",
                          }}
                          dropDownContainerStyle={{
                            backgroundColor: "white",
                            borderColor: "#e5e7eb",
                            borderRadius: 8,
                            shadowColor: "#000",
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: 999999,
                            maxHeight: 200,
                            zIndex: 999999,

                            ...(keyboardVisible && {
                              marginBottom: keyboardHeight - 50,
                            }),
                          }}
                          listMode="SCROLLVIEW"
                          scrollViewProps={{
                            nestedScrollEnabled: true,
                            showsVerticalScrollIndicator: true,
                            bounces: true,
                            scrollEnabled: true,
                            onScrollBeginDrag: () => {
                              setIsDropdownInteracting(true);
                            },
                            onScrollEndDrag: () => {
                              if (employeeDropdownOpen) {
                                setIsDropdownInteracting(true);
                              }
                            },
                            scrollEventThrottle: 16,
                            onTouchStart: () => {
                              setIsDropdownInteracting(true);
                            },
                            onTouchEnd: () => {
                              if (!employeeDropdownOpen) {
                                setIsDropdownInteracting(false);
                              }
                            },
                          }}
                          labelProps={{
                            numberOfLines: 1,
                          }}
                          customItemContainerStyle={{
                            height: 40,
                          }}
                          customItemLabelStyle={{
                            fontSize: 14,
                            fontWeight: "500",
                            color: "#333",
                          }}
                          arrowIconStyle={{
                            width: 16,
                            height: 16,
                            tintColor: "#6b7280",
                          }}
                          showArrowIcon={true}
                          renderListItem={(item) => {
                            const isSelected = selectedEmployeeValues.includes(
                              item.value
                            );

                            const employee = item.employee || {};
                            const employeeEmail = employee.email || "";

                            return (
                              <TouchableOpacity
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  paddingVertical: 8,
                                  paddingHorizontal: 12,
                                  backgroundColor: isSelected
                                    ? "#f5f5f5"
                                    : "transparent",
                                  borderLeftWidth: isSelected ? 3 : 0,
                                  borderLeftColor: "#000000",
                                  minHeight: 44,
                                  maxHeight: 50,
                                  width: "100%",
                                }}
                                onPress={() => {
                                  const newValues = isSelected
                                    ? selectedEmployeeValues.filter(
                                        (val) => val !== item.value
                                      )
                                    : [...selectedEmployeeValues, item.value];
                                  handleEmployeeSelection(newValues);
                                }}
                                activeOpacity={0.7}
                              >
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderWidth: 2,
                                    borderColor: isSelected
                                      ? "#000000"
                                      : "#d1d5db",
                                    borderRadius: 4,
                                    backgroundColor: isSelected
                                      ? "#000000"
                                      : "transparent",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {isSelected && (
                                    <Ionicons
                                      name="checkmark"
                                      size={14}
                                      color="white"
                                    />
                                  )}
                                </View>

                                <View
                                  style={{
                                    flex: 1,
                                    marginLeft: 12,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    minHeight: 20,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      color: isSelected ? "#000000" : "#333",
                                      fontWeight: isSelected ? "600" : "500",
                                      flex: 1,
                                      numberOfLines: 1,
                                      ellipsizeMode: "tail",
                                    }}
                                  >
                                    {item.label || "Unknown Employee"}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          }}
                          badgeTextStyle={{
                            fontSize: 12,
                            color: "#1e40af",
                            fontWeight: "600",
                          }}
                          badgeContainerStyle={{
                            backgroundColor: "#e0f2fe",
                            borderRadius: 12,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            marginRight: 4,
                            marginBottom: 4,
                          }}
                          closeAfterSelecting={false}
                          zIndex={999999}
                          zIndexInverse={1000}
                        />
                      </View>
                    )}

                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="time"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          Start Date & Time *
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                          onPress={() => setShowStartDatePicker(true)}
                        >
                          <Text className="text-[16px] text-[#333] font-medium">
                            {startDateTime.toLocaleDateString()}
                          </Text>
                          <Ionicons
                            name="calendar-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                          onPress={() => setShowStartTimePicker(true)}
                        >
                          <Text className="text-[16px] text-[#333] font-medium">
                            {startDateTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </Text>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="mb-5">
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="calendar"
                          size={16}
                          color="#374151"
                          style={{ marginRight: 6 }}
                        />
                        <Text className="text-[16px] font-semibold text-[#333]">
                          End Date & Time *
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          className="flex-[2] flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                          onPress={() => setShowEndDatePicker(true)}
                        >
                          <Text className="text-[16px] text-[#333] font-medium">
                            {endDateTime.toLocaleDateString()}
                          </Text>
                          <Ionicons
                            name="calendar-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="flex-1 flex-row items-center justify-between border border-[#e1e8ed] rounded-lg p-3 bg-[#f8f9fa]"
                          onPress={() => setShowEndTimePicker(true)}
                        >
                          <Text className="text-[16px] text-[#333] font-medium">
                            {endDateTime.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </Text>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#666"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.key}
            />
          </View>
        </TouchableWithoutFeedback>

        <View className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-5 bg-transparent items-center">
          <TouchableOpacity
            className="w-[280px] bg-black rounded-lg p-4 items-center justify-center"
            onPress={handleCreateEvent}
            disabled={creating}
            activeOpacity={0.8}
          >
            {creating ? (
              <View className="flex-row items-center ">
                <ActivityIndicator color="#ffffff" size="small" />
              </View>
            ) : (
              <Text className="text-white text-[16px] font-semibold">
                Create Event
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={startDateTime}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
            minimumDate={selectedDate ? new Date(selectedDate) : new Date()}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={startDateTime}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleStartTimeChange}
            minimumDate={
              startDateTime.toDateString() === new Date().toDateString()
                ? new Date()
                : undefined
            }
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDateTime}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
            minimumDate={selectedDate ? new Date(selectedDate) : startDateTime}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endDateTime}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleEndTimeChange}
            minimumDate={
              endDateTime.toDateString() === new Date().toDateString()
                ? new Date()
                : undefined
            }
          />
        )}

        <ErrorDialog
          visible={errorDialog.visible}
          onClose={closeErrorDialog}
          title={errorDialog.title}
          message={errorDialog.message}
        />
      </View>
    </Modal>
  );
};

export default CreateEventModal;
