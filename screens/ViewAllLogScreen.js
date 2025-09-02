
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  Picker,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  Modal,
  RefreshControl,
} from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import CustomBottomNav from "./components/CustomBottomNav";
import { getUserRole } from "../services/utils/userRole";
import { deleteLogById } from "../services/log/deleteLogById";
import { updateLogById } from "../services/log/updateLogById";
import { getMyProjects } from "../services/projects/getProjectsByLoginUserId";
import UpdateLogModal from "./components/UpdateLogModal";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

const searchBarClasses = `flex-row items-center rounded-2xl px-4 py-3 bg-[#F8FAFC] border border-[#EAECF0]`;

const ViewAllLogScreen = ({ route, navigation }) => {
  const { logs } = route.params || [];

  // Debug: Log the received logs data to check createdAt field
  console.log("ViewAllLogScreen - Received logs from route.params:", logs);

  // Debug: Show current date and time for reference
  const now = new Date();
  console.log("ViewAllLogScreen - Current date/time:", {
    fullDate: now.toISOString(),
    dateOnly: now.toISOString().split('T')[0],
    localDate: now.toLocaleDateString(),
    localTime: now.toLocaleTimeString()
  });
  console.log("ViewAllLogScreen - Expected log createdAt format: '2025-08-28T10:44:55.453Z'");

  if (logs && logs.length > 0) {
    console.log("ViewAllLogScreen - Sample log data:", {
      id: logs[0].id,
      createdAt: logs[0].createdAt,
      date: logs[0].date,
      description: logs[0].description
    });
  }

  // State to store all logs from projects
  const [allLogsFromProjects, setAllLogsFromProjects] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // --- Update Modal State ---
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedLogForUpdate, setSelectedLogForUpdate] = useState(null);

  // Get user role on component mount
  React.useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
    };
    fetchUserRole();
  }, []);

  // Load project options on component mount
  React.useEffect(() => {
    const loadProjectOptions = async () => {
      const { options, projects } = await generateProjectOptions();
      setProjectFilterOptions(options);
      setProjectsData(projects);

      // Extract all logs from all projects (prevent duplicates)
      const allLogs = [];
      const seenLogIds = new Set(); // Track seen log IDs to prevent duplicates

      projects.forEach(project => {
        if (project.tasks && Array.isArray(project.tasks)) {
          project.tasks.forEach(task => {
            if (task.log) {
              // Create a unique identifier for this log
              const logKey = `${task.log.id}-${project.name}`;

              // Only add if we haven't seen this log before
              if (!seenLogIds.has(logKey)) {
                seenLogIds.add(logKey);

                const transformedLog = {
                  id: task.log.id,
                  createdBy: task.assignedTo ? `${task.assignedTo.first_name || ''} ${task.assignedTo.last_name || ''}`.trim() : 'Unknown User',
                  date: task.log.createdAt ? new Date(task.log.createdAt).toLocaleDateString() : 'N/A',
                  createdAt: task.log.createdAt, // Keep original createdAt for filtering (format: "2025-08-28T10:44:55.453Z")
                  description: task.log.note || 'No description',
                  images: task.log.images || [],
                  image: task.log.images && task.log.images.length > 0 ? { uri: task.log.images[0].imageUrl } : require("../assets/robot.png"),
                  projectName: project.name,
                };
                allLogs.push(transformedLog);
              }
            }
          });
        }
      });

      console.log("ViewAllLogScreen - Extracted all logs from projects:", allLogs.length);
      if (allLogs.length > 0) {
        console.log("ViewAllLogScreen - Sample log from projects:", {
          id: allLogs[0].id,
          createdAt: allLogs[0].createdAt,
          projectName: allLogs[0].projectName
        });
      }

      setAllLogsFromProjects(allLogs);
    };
    loadProjectOptions();
  }, []);

  // Re-apply filters when projectsData or allLogsFromProjects changes
  React.useEffect(() => {
    if (projectsData.length > 0) {
      // If "All Logs" is selected, we can apply filters immediately since we have logs from route params
      // If a specific project is selected, we need to wait for allLogsFromProjects to be populated
      if (selectedProjectFilter === "All Logs" || allLogsFromProjects.length > 0) {
        applyFilters(searchQuery, selectedTimeFilter, selectedProjectFilter);
      }
    }
  }, [projectsData, allLogsFromProjects, selectedProjectFilter]);

  // Reset time filter when project changes (to avoid invalid selections)
  React.useEffect(() => {
    if (selectedProjectFilter !== "All Logs" && projectsData.length > 0) {
      // Reset to "All Time" when project changes
      setSelectedTimeFilter("All Time");
    }
  }, [selectedProjectFilter, projectsData]);

  // Add keyboard listeners
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
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

  // Generate date options based on selected project
  const generateDateOptions = () => {
    const today = new Date();
    const dateOptions = [];

    // Always add "All Time" option first
    dateOptions.push({ label: "All Time", value: "All Time" });

    // Helper function to get consistent date format (YYYY-MM-DD)
    const getDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // If no specific project is selected, generate dates for the last 30 days
    if (selectedProjectFilter === "All Logs") {
      console.log("generateDateOptions - Generating dates for All Logs (last 30 days)");

      // Generate daily slots for the last 30 days
      for (let i = 29; i >= 0; i--) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() - i);

        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const day = currentDate.getDate();
        const month = currentDate.toLocaleDateString('en-US', { month: 'short' });
        const year = currentDate.getFullYear();

        // Use consistent date format (YYYY-MM-DD) to match your createdAt format
        const dateString = getDateString(currentDate);

        dateOptions.push({
          label: `${dayName}, ${month} ${day}, ${year}`,
          value: dateString, // This will be "2025-08-28" format
        });
      }

      console.log(`generateDateOptions - Generated ${dateOptions.length} date options for All Logs`);
      console.log(`generateDateOptions - Today's date string: ${getDateString(today)}`);
      return dateOptions;
    }

    // Find the selected project
    const selectedProject = projectsData.find(p => p.name === selectedProjectFilter);
    if (!selectedProject) {
      console.log("generateDateOptions - Selected project not found");
      return dateOptions; // Return just "All Time" if project not found
    }

    if (!selectedProject.startDate) {
      console.log("generateDateOptions - Project has no start date");
      return dateOptions; // Return just "All Time" if no start date
    }

    // Generate daily slots from project start date to today
    const startDate = new Date(selectedProject.startDate);

    console.log(`generateDateOptions - Project start date: ${startDate.toLocaleDateString()}`);
    console.log(`generateDateOptions - Today: ${today.toLocaleDateString()}`);

    // Generate daily slots
    const currentDate = new Date(startDate);
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    while (currentDate <= today) {
      const dayName = days[currentDate.getDay()];
      const day = currentDate.getDate();
      const month = currentDate.toLocaleString("default", { month: "short" });
      const year = currentDate.getFullYear();

      // Use consistent date format (YYYY-MM-DD) to match your createdAt format
      const dateString = getDateString(currentDate);

      dateOptions.push({
        label: `${dayName}, ${month} ${day}, ${year}`,
        value: dateString, // This will be "2025-08-28" format
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`generateDateOptions - Generated ${dateOptions.length} date options for project: ${selectedProjectFilter}`);
    return dateOptions;
  };

  const [selectedTimeFilter, setSelectedTimeFilter] = useState("All Time");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("All Logs");
  const [filteredLogs, setFilteredLogs] = useState(logs || []);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [projectFilterOptions, setProjectFilterOptions] = useState([{ label: "All Logs", value: "All Logs" }]);
  const [projectsData, setProjectsData] = useState([]); // Store projects data for filtering

  const timeFilterOptions = React.useMemo(() => generateDateOptions(), [selectedProjectFilter, projectsData]);

  // Generate unique projects from logs
  // Get logs for a specific project
  const getLogsForProject = (projectName) => {
    if (!projectName || projectName === "All Logs") {
      // Use logs from route params (which get refreshed during onRefresh)
      const currentLogs = route.params?.logs || logs || [];
      console.log("getLogsForProject - Returning logs from route params (All Logs selected):", currentLogs.length);
      if (currentLogs && currentLogs.length > 0) {
        console.log("getLogsForProject - Sample log from route params:", {
          id: currentLogs[0].id,
          createdAt: currentLogs[0].createdAt,
          date: currentLogs[0].date
        });
      }
      return currentLogs;
    }

    // Find the project by name
    const project = projectsData.find(p => p.name === projectName);
    if (!project || !project.tasks) {
      console.log(`getLogsForProject - Project "${projectName}" not found or has no tasks`);
      return [];
    }

    // Extract logs from all tasks in the project
    const projectLogs = [];
    project.tasks.forEach(task => {
      if (task.log) {
        console.log(`getLogsForProject - Processing task ${task.id}, log createdAt: ${task.log.createdAt}`);

        // Transform the log to match the expected format
        const transformedLog = {
          id: task.log.id,
          createdBy: task.assignedTo ? `${task.assignedTo.first_name || ''} ${task.assignedTo.last_name || ''}`.trim() : 'Unknown User',
          date: task.log.createdAt ? new Date(task.log.createdAt).toLocaleDateString() : 'N/A',
          createdAt: task.log.createdAt, // Keep original createdAt for filtering (format: "2025-08-28T10:44:55.453Z")
          description: task.log.note || 'No description',
          images: task.log.images || [],
          image: task.log.images && task.log.images.length > 0 ? { uri: task.log.images[0].imageUrl } : require("../assets/robot.png"),
          projectName: project.name, // Add project name for reference
        };
        projectLogs.push(transformedLog);
      }
    });

    console.log(`getLogsForProject - Found ${projectLogs.length} logs for project: ${projectName}`);
    if (projectLogs.length > 0) {
      console.log(`getLogsForProject - Sample log createdAt: ${projectLogs[0].createdAt}`);
    }
    return projectLogs;
  };

  const generateProjectOptions = async () => {
    console.log("generateProjectOptions - Starting to fetch projects...");

    try {
      const projects = await getMyProjects();
      console.log("generateProjectOptions - Projects fetched from API:", projects);

      if (projects && projects.length > 0) {
        // Extract project names from the response structure you provided
        const projectNames = projects.map((project) => project.name);
        console.log("generateProjectOptions - Project names extracted:", projectNames);

        const projectOptions = projectNames.map((projectName) => ({
          label: projectName,
          value: projectName,
        }));
        console.log("generateProjectOptions - Final project options:", projectOptions);
        return {
          options: [{ label: "All Logs", value: "All Logs" }, ...projectOptions],
          projects: projects
        };
      } else {
        console.log("generateProjectOptions - No real projects found, using dummy projects");
        const dummyProjects = [
          "Project 1",
          "Project 2",
          "Project 3",
          "Project 4",
          "Project 5",
          "Project 6"
        ];

        return {
          options: [{ label: "All Logs", value: "All Logs" }, ...dummyProjects.map(project => ({
            label: project,
            value: project,
          }))],
          projects: []
        };
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      const dummyProjects = [
        "Project 1",
        "Project 2",
        "Project 3",
        "Project 4",
        "Project 5",
        "Project 6"
      ];

      return {
        options: [{ label: "All Logs", value: "All Logs" }, ...dummyProjects.map(project => ({
          label: project,
          value: project,
        }))],
        projects: []
      };
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(query, selectedTimeFilter, selectedProjectFilter);
  };

  const handleTimeFilterChange = (filter) => {
    setSelectedTimeFilter(filter);
    setShowTimeDropdown(false);
    applyFilters(searchQuery, filter, selectedProjectFilter);
  };

  const handleProjectFilterChange = (filter) => {
    console.log(`handleProjectFilterChange - Selected project: ${filter}`);
    setSelectedProjectFilter(filter);
    setShowProjectDropdown(false);

    // Reset time filter to "All Time" when "All Logs" is selected
    if (filter === "All Logs") {
      setSelectedTimeFilter("All Time");
      setShowTimeDropdown(false);
      applyFilters(searchQuery, "All Time", filter);
    } else {
      applyFilters(searchQuery, selectedTimeFilter, filter);
    }
  };

  const handleImageTap = (image) => {
    setSelectedImage(image);
    setImageModalVisible(true);
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
    setSelectedImage(null);
  };

  const applyFilters = (query, timeFilter, projectFilter) => {
    // First, get logs based on project filter
    let filtered = getLogsForProject(projectFilter);
    console.log(`applyFilters - Initial logs for project '${projectFilter}':`, filtered.length);
    console.log(`applyFilters - Time filter: '${timeFilter}'`);
    console.log(`applyFilters - Search query: '${query}'`);

    // Remove duplicate logs based on log ID (same log can appear in multiple projects)
    const uniqueLogs = [];
    const seenLogIds = new Set();
    const duplicateLogIds = [];

    filtered.forEach(log => {
      if (!seenLogIds.has(log.id)) {
        seenLogIds.add(log.id);
        uniqueLogs.push(log);
      } else {
        duplicateLogIds.push(log.id);
      }
    });

    filtered = uniqueLogs;
    console.log(`applyFilters - After removing duplicates:`, filtered.length);

    if (duplicateLogIds.length > 0) {
      console.log(`applyFilters - Found ${duplicateLogIds.length} duplicate log IDs:`, duplicateLogIds);
    }

    // Debug: Show sample log data structure
    if (filtered.length > 0) {
      console.log("applyFilters - Sample log structure:", {
        id: filtered[0].id,
        createdAt: filtered[0].createdAt,
        date: filtered[0].date,
        description: filtered[0].description
      });
    }

    // Apply time filter
    if (timeFilter && timeFilter !== "All Time") {
      console.log("Filtering by time:", timeFilter);
      console.log("Available logs before time filtering:", filtered.length);

      // Normalize to device-locale date and compare
      const toLocalDateString = (value) => {
        try {
          const d = new Date(value);
          if (isNaN(d.getTime())) return null;
          return d.toLocaleDateString();
        } catch {
          return null;
        }
      };

      const filterLocal = toLocalDateString(timeFilter);

      filtered = filtered.filter((log) => {
        const raw = log.createdAt || log.date;
        if (!raw) return false;
        const logLocal = toLocalDateString(raw);
        const matches = Boolean(filterLocal && logLocal && logLocal === filterLocal);
        return matches;
      });

      console.log("Logs after time filtering:", filtered.length);
    }

    // Apply search filter
    if (query && query.trim() !== "") {
      filtered = filtered.filter(
        (log) =>
          log.createdBy.toLowerCase().includes(query.toLowerCase()) ||
          log.description.toLowerCase().includes(query.toLowerCase()) ||
          log.date.includes(query)
      );
    }

    console.log(`applyFilters - Final filtered logs:`, filtered.length);
    if (filtered.length > 0) {
      console.log(`applyFilters - Sample log dates:`, filtered.slice(0, 3).map(log => ({
        id: log.id,
        date: log.date,
        createdAt: log.createdAt
      })));
    }
    setFilteredLogs(filtered);
  };

  const handleUpdate = (log) => {
    console.log("handleUpdate called with log:", log);
    console.log("Current userRole:", userRole);
    console.log("Log ID for update:", log.id);

    // Open update modal with selected log
    setSelectedLogForUpdate(log);
    setUpdateModalVisible(true);
    console.log("Modal state set - updateModalVisible:", true);
    console.log("Selected log:", log);
  };

  // --- Handle Log Update ---
  const handleUpdateLog = async (updateData) => {
    try {
      if (!selectedLogForUpdate?.id) {
        throw new Error('No log selected for update');
      }

      // Check if the new note is empty or just whitespace
      const newNote = updateData.note || '';
      if (!newNote.trim()) {
        console.log("Note is empty, skipping update");
        Alert.alert("Error", "Please enter a note before updating");
        return;
      }

      // Check if there's any change in the note
      const currentNote = selectedLogForUpdate.description || '';

      if (currentNote.trim() === newNote.trim()) {
        console.log("No changes detected, skipping update");
        Alert.alert("Info", "No changes to update");
        return;
      }

      console.log("Updating log ID:", selectedLogForUpdate.id);
      console.log("Current note:", currentNote);
      console.log("New note:", newNote);

      // Call the update log API with only the note
      const response = await updateLogById(selectedLogForUpdate.id, { note: updateData.note });

      console.log("Log updated successfully:", response);

      // Get current logs from route params or fallback to logs state
      const currentLogs = route.params?.logs || logs || [];

      // Update the local logs state with only the note
      const updatedLogs = currentLogs.map(log =>
        log.id === selectedLogForUpdate.id
          ? { ...log, description: updateData.note }
          : log
      );

      // Update filtered logs as well
      const updatedFilteredLogs = filteredLogs.map(log =>
        log.id === selectedLogForUpdate.id
          ? { ...log, description: updateData.note }
          : log
      );

      // Update route params
      if (route.params) {
        route.params.logs = updatedLogs;
      }

      setFilteredLogs(updatedFilteredLogs);

      Alert.alert("Success", "Log updated successfully!");

    } catch (error) {
      console.error("Error updating log:", error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      console.log("ViewAllLogScreen - Starting refresh for user role:", userRole);

      // Reload project options (this calls getMyProjects internally)
      const { options, projects } = await generateProjectOptions();
      setProjectFilterOptions(options);
      setProjectsData(projects);

      console.log("ViewAllLogScreen - Projects refreshed:", projects.length);

      // Extract all logs from all projects
      const allLogs = [];
      projects.forEach(project => {
        if (project.tasks && Array.isArray(project.tasks)) {
          project.tasks.forEach(task => {
            if (task.log) {
              const transformedLog = {
                id: task.log.id,
                createdBy: task.assignedTo ? `${task.assignedTo.first_name || ''} ${task.assignedTo.last_name || ''}`.trim() : 'Unknown User',
                date: task.log.createdAt ? new Date(task.log.createdAt).toLocaleDateString() : 'N/A',
                createdAt: task.log.createdAt,
                description: task.log.note || 'No description',
                images: task.log.images || [],
                image: task.log.images && task.log.images.length > 0 ? { uri: task.log.images[0].imageUrl } : require("../assets/robot.png"),
                projectName: project.name,
              };
              allLogs.push(transformedLog);
            }
          });
        }
      });

      console.log("ViewAllLogScreen - Extracted logs from projects:", allLogs.length);
      setAllLogsFromProjects(allLogs);

      // Refresh logs from API for "All Logs" section (Employee, Manager, Admin, Owner roles)
      if (userRole === "Employee" || userRole === "Manager" || userRole === "Admin" || userRole === "Owner") {
        console.log("ViewAllLogScreen - Refreshing logs from API for role:", userRole);
        try {
          let sortedLogs = [];

          if (userRole === "Owner") {
            // Owner role: Extract logs from tasks within projects (same as WidgetScreen logic)
            console.log("ViewAllLogScreen - Owner role: Extracting logs from tasks");

            // Get tasks for the current project (if projectId is available)
            const projectId = route.params?.projectId;
            if (projectId) {
              const { getTaskByProjectId } = require("../services/tasks/getTaskByProjectId");
              const response = await getTaskByProjectId(projectId);

              if (response && response.tasks) {
                // Extract logs from tasks
                const tasksWithLogs = response.tasks.filter(task => task.log && task.log !== null);
                console.log("ViewAllLogScreen - Owner: Tasks with logs:", tasksWithLogs.length);

                const extractedLogs = tasksWithLogs.map(task => ({
                  id: task.log.id,
                  createdBy: task.assignedTo ? `${task.assignedTo.first_name || ''} ${task.assignedTo.last_name || ''}`.trim() : 'Unknown User',
                  date: task.log.createdAt ? new Date(task.log.createdAt).toLocaleDateString() : 'N/A',
                  createdAt: task.log.createdAt,
                  description: task.log.note || 'No description',
                  images: task.log.images || [],
                  image: task.log.images && task.log.images.length > 0 ? { uri: task.log.images[0].imageUrl } : require("../assets/robot.png"),
                  taskTitle: task.title,
                }));

                // Sort logs by date (newest first)
                sortedLogs = extractedLogs.sort((a, b) => {
                  const dateA = new Date(a.createdAt);
                  const dateB = new Date(b.createdAt);
                  return dateB - dateA;
                });

                console.log("ViewAllLogScreen - Owner: Extracted and sorted logs:", sortedLogs.length);
              }
            } else {
              // If no projectId, extract logs from all projects
              console.log("ViewAllLogScreen - Owner: No projectId, extracting from all projects");
              const allLogsFromAllProjects = [];

              projects.forEach(project => {
                if (project.tasks && Array.isArray(project.tasks)) {
                  project.tasks.forEach(task => {
                    if (task.log && task.log !== null) {
                      const transformedLog = {
                        id: task.log.id,
                        createdBy: task.assignedTo ? `${task.assignedTo.first_name || ''} ${task.assignedTo.last_name || ''}`.trim() : 'Unknown User',
                        date: task.log.createdAt ? new Date(task.log.createdAt).toLocaleDateString() : 'N/A',
                        createdAt: task.log.createdAt,
                        description: task.log.note || 'No description',
                        images: task.log.images || [],
                        image: task.log.images && task.log.images.length > 0 ? { uri: task.log.images[0].imageUrl } : require("../assets/robot.png"),
                        projectName: project.name,
                      };
                      allLogsFromAllProjects.push(transformedLog);
                    }
                  });
                }
              });

              // Sort logs by date (newest first)
              sortedLogs = allLogsFromAllProjects.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB - dateA;
              });

              console.log("ViewAllLogScreen - Owner: Extracted logs from all projects:", sortedLogs.length);
            }
          } else if (userRole === "Manager") {
            // Manager role: Use getLogs API (same as WidgetScreen behavior)
            console.log("ViewAllLogScreen - Manager role: Using getLogs API");

            const { getLogs } = require("../services/log/getLogs");
            const logsResponse = await getLogs();

            console.log("ViewAllLogScreen - Manager API logs response:", logsResponse);

            // Check if response has logs array or if it's directly an array
            let logsArray = [];
            if (logsResponse?.logs && Array.isArray(logsResponse.logs)) {
              logsArray = logsResponse.logs;
            } else if (Array.isArray(logsResponse)) {
              logsArray = logsResponse;
            } else {
              console.log("ViewAllLogScreen - Manager: No logs found in API response:", logsResponse);
              logsArray = [];
            }

            // Transform logs data to match the expected format
            const transformedLogs = logsArray.map(log => ({
              id: log.id,
              createdBy: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'Unknown User',
              date: log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
              createdAt: log.createdAt, // Preserve original createdAt for filtering
              description: log.note || 'No description',
              images: log.images || [], // Keep all images for the log
              image: log.images && log.images.length > 0 ? { uri: log.images[0].imageUrl } : require("../assets/robot.png"),
            }));

            // Sort logs by date (newest first)
            sortedLogs = transformedLogs.sort((a, b) => {
              const dateA = new Date(a.createdAt);
              const dateB = new Date(b.createdAt);
              return dateB - dateA;
            });

            console.log("ViewAllLogScreen - Manager: Updated logs from API:", sortedLogs.length);
          } else {
            // Employee, Admin roles: Use getLogs API
            const { getLogs } = require("../services/log/getLogs");
            const logsResponse = await getLogs();

            console.log("ViewAllLogScreen - API logs response:", logsResponse);

            // Check if response has logs array or if it's directly an array
            let logsArray = [];
            if (logsResponse?.logs && Array.isArray(logsResponse.logs)) {
              logsArray = logsResponse.logs;
            } else if (Array.isArray(logsResponse)) {
              logsArray = logsResponse;
            } else {
              console.log("ViewAllLogScreen - No logs found in API response:", logsResponse);
              logsArray = [];
            }

            // Transform logs data to match the expected format
            const transformedLogs = logsArray.map(log => ({
              id: log.id,
              createdBy: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'Unknown User',
              date: log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'N/A',
              createdAt: log.createdAt, // Preserve original createdAt for filtering
              description: log.note || 'No description',
              images: log.images || [], // Keep all images for the log
              image: log.images && log.images.length > 0 ? { uri: log.images[0].imageUrl } : require("../assets/robot.png"),
            }));

            // Sort logs by date (newest first)
            sortedLogs = transformedLogs.sort((a, b) => {
              const dateA = new Date(a.createdAt);
              const dateB = new Date(b.createdAt);
              return dateB - dateA;
            });

            console.log("ViewAllLogScreen - Updated logs from API:", sortedLogs.length);
          }

          // Update the logs in route params so "All Logs" section gets refreshed
          if (route.params) {
            route.params.logs = sortedLogs;
          }

          // Update the local logs state
          setFilteredLogs(prevFilteredLogs => {
            // If "All Logs" is selected, update with new logs
            if (selectedProjectFilter === "All Logs") {
              return sortedLogs;
            }
            // Otherwise keep the current filtered logs
            return prevFilteredLogs;
          });

        } catch (apiError) {
          console.error("ViewAllLogScreen - Error refreshing logs from API:", apiError);
          // Continue with the refresh even if API call fails
        }
      }

      // If a specific project is selected, re-fetch that project's tasks to ensure latest log updates
      if (selectedProjectFilter !== "All Logs") {
        try {
          const selectedProject = projects.find(p => p.name === selectedProjectFilter);
          if (selectedProject?.id) {
            const { getTaskByProjectId } = require("../services/tasks/getTaskByProjectId");
            const projResponse = await getTaskByProjectId(selectedProject.id);
            const projTasks = projResponse?.tasks || [];
            const projLogs = projTasks
              .filter(t => t.log)
              .map(t => ({
                id: t.log.id,
                createdBy: t.assignedTo ? `${t.assignedTo.first_name || ''} ${t.assignedTo.last_name || ''}`.trim() : 'Unknown User',
                date: t.log.createdAt ? new Date(t.log.createdAt).toLocaleDateString() : 'N/A',
                createdAt: t.log.createdAt,
                description: t.log.note || 'No description',
                images: t.log.images || [],
                image: t.log.images && t.log.images.length > 0 ? { uri: t.log.images[0].imageUrl } : require("../assets/robot.png"),
                projectName: selectedProject.name,
              }));
            setFilteredLogs(projLogs);
          }
        } catch (projErr) {
          console.error("ViewAllLogScreen - Error refreshing selected project logs:", projErr);
        }
      } else {
        // Re-apply filters with current settings when showing All Logs
        applyFilters(searchQuery, selectedTimeFilter, selectedProjectFilter);
      }

      console.log("ViewAllLogScreen - Refresh completed successfully for role:", userRole);
    } catch (error) {
      console.error("ViewAllLogScreen - Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [searchQuery, selectedTimeFilter, selectedProjectFilter, userRole, selectedProjectFilter]);

  const handleDelete = (log) => {
    // Allow deleting logs for all roles (Employee, Manager, Owner, Admin)
    // No restrictions - all users can delete logs

    const logId = log?.id;
    const logTitle = log?.description || "this log";

    if (!logId) {
      return;
    }

    Alert.alert(
      "Delete Log",
      `Are you sure you want to delete "${logTitle}" permanently? This action is not reversible.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLogById(logId);

              // Get current logs from route params or fallback to logs state
              const currentLogs = route.params?.logs || logs || [];
              const updatedLogs = currentLogs.filter((log) => log.id !== logId);
              const updatedFilteredLogs = filteredLogs.filter(
                (log) => log.id !== logId
              );

              // Update the logs in route params
              if (route.params) {
                route.params.logs = updatedLogs;
              }

              setFilteredLogs(updatedFilteredLogs);

              Alert.alert("Success", "Log deleted successfully!", [
                { text: "OK" },
              ]);
            } catch (error) {
              let errorMessage = "Failed to delete log. Please try again.";
              if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert("Error", errorMessage, [{ text: "OK" }]);
            }
          },
        },
      ]
    );
  };

  // Separate Manager Card Component
  const ManagerLogCard = ({ log }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('LogsDetail', { logId: log.id })}
      style={{
        backgroundColor: "#f8f9fa",
        borderRadius: Math.min(8, screenWidth * 0.02),
        padding: Math.min(16, screenWidth * 0.04),
        borderWidth: 1,
        borderColor: "#e9ecef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
      activeOpacity={0.7}
    >
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            {/* Created by section first */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={{
                fontSize: Math.min(15, screenWidth * 0.038),
                color: "black",
                fontWeight: "600",
                letterSpacing: 0.3,
                marginRight: 8,
              }}>
                Created by:
              </Text>
              <Text style={{
                fontSize: Math.min(15, screenWidth * 0.038),
                color: "#333",
                fontWeight: "500",
              }}>
                {log.createdBy}
              </Text>
            </View>

            {/* Note section second */}
            <Text style={{
              fontSize: Math.min(15, screenWidth * 0.038),
              color: "#333",
              lineHeight: 24,
              marginBottom: 12,
              flex: 1,
              flexWrap: 'wrap',
              wordBreak: 'break-all',
              overflow: 'hidden',
            }}>
              <Text style={{
                fontSize: Math.min(15, screenWidth * 0.038),
                color: "black",
                fontWeight: "600",
                letterSpacing: 0.3,
              }}>
                Note:{" "}
              </Text>
              {log.description && log.description.length > 15
                ? log.description.substring(0, 15) + "..."
                : log.description}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {/* Show uploaded images if available */}
            {log.images && log.images.length > 0 ? (
              <View style={{ marginRight: 12, marginTop: 0 }}>
                <TouchableOpacity
                  onPress={() => handleImageTap(log.images[0])}
                  style={{ position: 'relative' }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: log.images[0].imageUrl }}
                    style={{
                      width: Math.min(60, screenWidth * 0.15),
                      height: Math.min(60, screenWidth * 0.15),
                      borderRadius: Math.min(8, screenWidth * 0.02),
                    }}
                    contentFit="cover"
                    transition={100}
                  />
                  {log.images.length > 1 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        backgroundColor: '#3155A1',
                        borderRadius: 12,
                        minWidth: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: 'white',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                        {log.images.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (log.thumbnail || log.image) ? (
              <View style={{ marginRight: 12, marginTop: 0 }}>
                {log.thumbnail ? (
                  <Image
                    source={{ uri: log.thumbnail }}
                    style={{
                      width: Math.min(60, screenWidth * 0.15),
                      height: Math.min(60, screenWidth * 0.15),
                      borderRadius: Math.min(8, screenWidth * 0.02),
                    }}
                    contentFit="cover"
                    transition={100}
                  />
                ) : log.image ? (
                  <Image
                    source={log.image}
                    style={{
                      width: Math.min(60, screenWidth * 0.15),
                      height: Math.min(60, screenWidth * 0.15),
                      borderRadius: Math.min(8, screenWidth * 0.02),
                    }}
                    contentFit="cover"
                    transition={100}
                  />
                ) : null}
              </View>
            ) : null}

            <Menu
              rendererProps={{
                placement: "bottom-end",
                anchorStyle: { marginRight: 0 },
                triggerStyle: { marginRight: 0 },
              }}
            >
              <MenuTrigger>
                <View style={{
                  activeOpacity: 1,
                  marginTop: 0
                }}>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={Math.min(16, screenWidth * 0.04)}
                    color="#6b7280"
                  />
                </View>
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    backgroundColor: "white",
                    borderRadius: Math.min(8, screenWidth * 0.02),
                    padding: Math.min(8, screenWidth * 0.02),
                    width: Math.min(120, screenWidth * 0.3),
                    marginRight: -40,
                    marginTop: 15,
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 3,
                  },
                }}
              >
                <MenuOption
                  onSelect={() => handleUpdate(log)}
                  customStyles={{
                    optionWrapper: {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: Math.min(10, screenHeight * 0.012),
                      paddingHorizontal: Math.min(16, screenWidth * 0.04),
                      borderRadius: 4,
                    },
                  }}
                >
                  <Ionicons name="create-outline" size={Math.min(18, screenWidth * 0.045)} color="#000" />
                  <Text
                    style={{
                      marginLeft: 10,
                      fontSize: Math.min(14, screenWidth * 0.035),
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    Update
                  </Text>
                </MenuOption>
                <MenuOption
                  onSelect={() => handleDelete(log)}
                  customStyles={{
                    optionWrapper: {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: Math.min(10, screenHeight * 0.012),
                      paddingHorizontal: Math.min(16, screenWidth * 0.04),
                      borderRadius: 4,
                    },
                  }}
                >
                  <Ionicons name="trash-outline" size={Math.min(18, screenWidth * 0.045)} color="#dc3545" />
                  <Text
                    style={{
                      marginLeft: 10,
                      fontSize: Math.min(14, screenWidth * 0.035),
                      fontWeight: "600",
                      color: "#dc3545",
                    }}
                  >
                    Delete
                  </Text>
                </MenuOption>
              </MenuOptions>
            </Menu>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const LogCard = ({ log }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('LogsDetail', { logId: log.id })}
      style={{
        backgroundColor: "#f8f9fa",
        borderRadius: Math.min(8, screenWidth * 0.02),
        padding: Math.min(16, screenWidth * 0.04),
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#e9ecef",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
      activeOpacity={0.7}
    >
      <View>
        {/* Employee and other roles - No Created by section */}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{
              fontSize: Math.min(15, screenWidth * 0.038),
              color: "#333",
              lineHeight: 24,
              marginBottom: 12,
              flex: 1,
              flexWrap: 'wrap',
              wordBreak: 'break-all',
              overflow: 'hidden',
            }}>
              <Text style={{
                fontSize: Math.min(15, screenWidth * 0.038),
                color: "black",
                fontWeight: "600",
                letterSpacing: 0.3,
              }}>
                Note:{" "}
              </Text>
              {log.description && log.description.length > 33
                ? log.description.substring(0, 33) + "..."
                : log.description}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {/* Show uploaded images if available */}
            {log.images && log.images.length > 0 ? (
              <View style={{ marginRight: 12, marginTop: 0 }}>
                <TouchableOpacity
                  onPress={() => handleImageTap(log.images[0])}
                  style={{ position: 'relative' }}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: log.images[0].imageUrl }}
                    style={{
                      width: Math.min(60, screenWidth * 0.15),
                      height: Math.min(60, screenWidth * 0.15),
                      borderRadius: Math.min(8, screenWidth * 0.02),
                    }}
                    contentFit="cover"
                    transition={100}
                  />
                  {log.images.length > 1 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        backgroundColor: '#3155A1',
                        borderRadius: 12,
                        minWidth: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 2,
                        borderColor: 'white',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                        {log.images.length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (log.thumbnail || log.image) ? (
              <View style={{ marginRight: 12, marginTop: 0 }}>
                {log.thumbnail ? (
                  <Image
                    source={{ uri: log.thumbnail }}
                    style={{
                      width: Math.min(60, screenWidth * 0.15),
                      height: Math.min(60, screenWidth * 0.15),
                      borderRadius: Math.min(8, screenWidth * 0.02),
                    }}
                    contentFit="cover"
                    transition={100}
                  />
                ) : log.image ? (
                  <Image
                    source={log.image}
                    style={{
                      width: Math.min(60, screenWidth * 0.15),
                      height: Math.min(60, screenWidth * 0.15),
                      borderRadius: Math.min(8, screenWidth * 0.02),
                    }}
                    contentFit="cover"
                    transition={100}
                  />
                ) : null}
              </View>
            ) : null}

            <Menu
              rendererProps={{
                placement: "bottom-end",
                anchorStyle: { marginRight: 0 },
                triggerStyle: { marginRight: 0 },
              }}
            >
              <MenuTrigger>
                <View style={{
                  activeOpacity: 1,
                  marginTop: 0
                }}>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={Math.min(16, screenWidth * 0.04)}
                    color="#6b7280"
                  />
                </View>
              </MenuTrigger>
              <MenuOptions
                customStyles={{
                  optionsContainer: {
                    backgroundColor: "white",
                    borderRadius: Math.min(8, screenWidth * 0.02),
                    padding: Math.min(8, screenWidth * 0.02),
                    width: Math.min(120, screenWidth * 0.3),
                    marginRight: -40,
                    marginTop: 15,
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 3,
                  },
                }}
              >
                <MenuOption
                  onSelect={() => handleUpdate(log)}
                  customStyles={{
                    optionWrapper: {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: Math.min(10, screenHeight * 0.012),
                      paddingHorizontal: Math.min(16, screenWidth * 0.04),
                      borderRadius: 4,
                    },
                  }}
                >
                  <Ionicons name="create-outline" size={Math.min(18, screenWidth * 0.045)} color="#000" />
                  <Text
                    style={{
                      marginLeft: 10,
                      fontSize: Math.min(14, screenWidth * 0.035),
                      fontWeight: "600",
                      color: "black",
                    }}
                  >
                    Update
                  </Text>
                </MenuOption>
                <MenuOption
                  onSelect={() => handleDelete(log)}
                  customStyles={{
                    optionWrapper: {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: Math.min(10, screenHeight * 0.012),
                      paddingHorizontal: Math.min(16, screenWidth * 0.04),
                      borderRadius: 4,
                    },
                  }}
                >
                  <Ionicons name="trash-outline" size={Math.min(18, screenWidth * 0.045)} color="#dc3545" />
                  <Text
                    style={{
                      marginLeft: 10,
                      fontSize: Math.min(14, screenWidth * 0.035),
                      fontWeight: "600",
                      color: "#dc3545",
                    }}
                  >
                    Delete
                  </Text>
                </MenuOption>
              </MenuOptions>
            </Menu>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: Math.min(20, screenWidth * 0.05),
        paddingBottom: 120,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={true}
      bounces={true}
      scrollEnabled={!(showTimeDropdown || showProjectDropdown)}
      nestedScrollEnabled={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#3155A1"]}
          tintColor="#3155A1"
        />
      }
    >
      {/* Header Section */}
      <View style={{ paddingVertical: Math.min(20, screenHeight * 0.025) }}>
        {/* Filter Dropdowns Row */}
        <View style={{
          flexDirection: "row",
          marginBottom: 16,
          gap: 12,
          justifyContent: "space-between"
        }}>
          {/* Project Filter Dropdown */}
          <View style={{ flex: 1, position: "relative" }}>
            <TouchableOpacity
              onPress={() => {
                setShowProjectDropdown(!showProjectDropdown);
                setShowTimeDropdown(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#EAECF0",
                borderRadius: Math.min(16, screenWidth * 0.04),
                paddingHorizontal: Math.min(16, screenWidth * 0.04),
                paddingVertical: Math.min(12, screenHeight * 0.015),
                width: "100%",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="folder"
                  size={Math.min(18, screenWidth * 0.045)}
                  color="#6B7280"
                  style={{ marginRight: 8, flexShrink: 0 }}
                />
                <Text
                  style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: "#111827",
                    fontWeight: "500",
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {projectFilterOptions.find(
                    (option) => option.value === selectedProjectFilter
                  )?.label || "All Logs"}
                </Text>
              </View>
              <Ionicons
                name={showProjectDropdown ? "chevron-up" : "chevron-down"}
                size={Math.min(16, screenWidth * 0.04)}
                color="#6B7280"
                style={{ marginLeft: 1, flexShrink: 0 }}
              />
            </TouchableOpacity>

            {showProjectDropdown && (
              <TouchableWithoutFeedback onPress={() => { }}>
                <View
                  style={{
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: "#EAECF0",
                    borderRadius: Math.min(16, screenWidth * 0.04),
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 10,
                    position: "absolute",
                    top: 60,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                  }}
                >
                  <ScrollView
                    style={{ maxHeight: Math.min(150, screenHeight * 0.2) }}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle="black"
                    bounces={false}
                    nestedScrollEnabled={true}
                    scrollEventThrottle={16}
                    onScrollBeginDrag={() => {
                      // Prevent main scroll when dropdown is being scrolled
                    }}
                    onTouchStart={() => {
                      // Prevent main scroll when touching dropdown
                    }}
                  >
                    {projectFilterOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => handleProjectFilterChange(option.value)}
                        style={{
                          paddingHorizontal: Math.min(16, screenWidth * 0.04),
                          paddingVertical: Math.min(14, screenHeight * 0.017),
                          borderBottomWidth: 1,
                          borderBottomColor: "#F1F5F9",
                          backgroundColor: selectedProjectFilter === option.value ? "#F0F9FF" : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: Math.min(14, screenWidth * 0.035),
                            color: selectedProjectFilter === option.value ? "#3155A1" : "#111827",
                            fontWeight: selectedProjectFilter === option.value ? "600" : "400",
                            numberOfLines: 2,
                            lineHeight: Math.min(20, screenHeight * 0.025),
                          }}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>

          {/* Time Filter Dropdown */}
          <View style={{
            flex: 1,
            position: "relative"
          }}>
            <TouchableOpacity
              onPress={() => {
                setShowTimeDropdown(!showTimeDropdown);
                setShowProjectDropdown(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#F8FAFC",
                borderWidth: 1,
                borderColor: "#EAECF0",
                borderRadius: Math.min(16, screenWidth * 0.04),
                paddingHorizontal: Math.min(16, screenWidth * 0.04),
                paddingVertical: Math.min(12, screenHeight * 0.015),
                width: "100%",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons
                  name="time"
                  size={Math.min(18, screenWidth * 0.045)}
                  color={selectedProjectFilter === "All Logs" ? "#9CA3AF" : "#6B7280"}
                  style={{ marginRight: 8, flexShrink: 0 }}
                />
                <Text
                  style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: selectedProjectFilter === "All Logs" ? "#9CA3AF" : "#111827",
                    fontWeight: "500",
                    flex: 1,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedProjectFilter === "All Logs"
                    ? "Select Project First"
                    : (timeFilterOptions.find(
                      (option) => option.value === selectedTimeFilter
                    )?.label || "All Time")
                  }
                </Text>
              </View>
              <Ionicons
                name={showTimeDropdown ? "chevron-up" : "chevron-down"}
                size={Math.min(16, screenWidth * 0.04)}
                color={selectedProjectFilter === "All Logs" ? "#9CA3AF" : "#6B7280"}
                style={{ marginLeft: 12, flexShrink: 0 }}
              />
            </TouchableOpacity>

            {showTimeDropdown && selectedProjectFilter !== "All Logs" && (
              <TouchableWithoutFeedback onPress={() => { }}>
                <View
                  style={{
                    backgroundColor: "white",
                    borderWidth: 1,
                    borderColor: "#EAECF0",
                    borderRadius: Math.min(16, screenWidth * 0.04),
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 10,
                    position: "absolute",
                    top: 60,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                  }}
                >
                  <ScrollView
                    style={{ maxHeight: Math.min(150, screenHeight * 0.2) }}
                    showsVerticalScrollIndicator={true}
                    indicatorStyle="black"
                    bounces={false}
                    nestedScrollEnabled={true}
                    scrollEventThrottle={16}
                    onScrollBeginDrag={() => {
                      // Prevent main scroll when dropdown is being scrolled
                    }}
                    onTouchStart={() => {
                      // Prevent main scroll when touching dropdown
                    }}
                  >
                    {timeFilterOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => handleTimeFilterChange(option.value)}
                        style={{
                          paddingHorizontal: Math.min(16, screenWidth * 0.04),
                          paddingVertical: Math.min(14, screenHeight * 0.017),
                          borderBottomWidth: 1,
                          borderBottomColor: "#F1F5F9",
                          backgroundColor: selectedTimeFilter === option.value ? "#F0F9FF" : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: Math.min(14, screenWidth * 0.035),
                            color: selectedTimeFilter === option.value ? "#3155A1" : "#111827",
                            fontWeight: selectedTimeFilter === option.value ? "600" : "400",
                            numberOfLines: 2,
                            lineHeight: Math.min(20, screenHeight * 0.025),
                          }}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: Math.min(16, screenWidth * 0.04),
            paddingHorizontal: Math.min(16, screenWidth * 0.04),
            paddingVertical: Math.min(12, screenHeight * 0.015),
            backgroundColor: selectedProjectFilter === "All Logs" ? "#F1F5F9" : "#F8FAFC",
            borderWidth: 1,
            borderColor: selectedProjectFilter === "All Logs" ? "#D1D5DB" : "#EAECF0",
            width: "100%",
            opacity: (showTimeDropdown || showProjectDropdown) ? 0.5 : (selectedProjectFilter === "All Logs" ? 0.6 : 1),
          }}
        >
          <Ionicons
            name="search"
            size={Math.min(18, screenWidth * 0.045)}
            color={selectedProjectFilter === "All Logs" ? "#9CA3AF" : "#6B7280"}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={{
              flex: 1,
              fontSize: Math.min(15, screenWidth * 0.038),
              color: "#111827",
            }}
            placeholder="Search logs"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            blurOnSubmit={false}
            editable={!(showTimeDropdown || showProjectDropdown)}
          />
          {searchQuery.length > 0 && !(showTimeDropdown || showProjectDropdown) && (
            <TouchableOpacity onPress={() => handleSearch("")} style={{ marginLeft: 8 }}>
              <Ionicons name="close-circle" size={Math.min(18, screenWidth * 0.045)} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Logs Section */}
      {filteredLogs.length === 0 ? (
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: Math.min(20, screenWidth * 0.05),
          minHeight: Math.min(300, screenHeight * 0.375),
        }}>
          <Ionicons name="document-text-outline" size={Math.min(64, screenWidth * 0.16)} color="#ccc" />
          <Text style={{
            fontSize: Math.min(18, screenWidth * 0.045),
            color: "#666",
            fontWeight: "600",
            marginTop: 16,
            marginBottom: 8,
          }}>
            {searchQuery ? "No logs found" : "No logs available"}
          </Text>
          <Text style={{
            fontSize: Math.min(14, screenWidth * 0.035),
            color: "#999",
            fontWeight: "400",
            textAlign: "center",
          }}>
            {searchQuery
              ? "Try adjusting your search terms"
              : "Logs will appear here once created"}
          </Text>
        </View>
      ) : (
        <View>
          {filteredLogs.map((log, index) => (
            <View key={`${log.id}-${log.projectName || 'unknown'}-${index}`} style={{ marginBottom: index < filteredLogs.length - 1 ? 20 : 0 }}>
              {userRole === "Manager" || userRole === "Owner" ? (
                <ManagerLogCard log={log} />
              ) : (
                <LogCard log={log} />
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-white">
      {renderContent()}
      <CustomBottomNav
        keyboardVisible={keyboardVisible}
        onAddPress={() => {
          // For Employee role, navigate to CreatLog with Employee projectId
          if (userRole === "Employee") {
            const employeeProjectId = route.params?.["Employee projectId"] || null;
            const navigationParams = employeeProjectId ? { "Employee projectId": employeeProjectId } : {};
            navigation.navigate("CreatLog", navigationParams);
            return;
          }

          // For Manager role, navigate to CreatLog with project data
          if (userRole === "Manager") {
            // Get the managerProjectId passed from WidgetScreen
            const managerProjectId = route.params?.managerProjectId || null;
            console.log("ViewAllLogScreen - Manager FAB pressed, managerProjectId:", managerProjectId);

            let navigationParams = {};

            // Pass the Manager project ID as projectId to CreateLogScreen
            if (managerProjectId) {
              navigationParams.projectId = managerProjectId;
            }

            console.log("ViewAllLogScreen - Navigating to CreatLog with params:", navigationParams);
            navigation.navigate("CreatLog", navigationParams);
            return;
          }

          // For Admin role, navigate to CreatLog with project data
          if (userRole === "Admin") {
            const projectId = route.params?.projectId || null;
            const navigationParams = projectId ? { projectId: projectId } : {};
            navigation.navigate("CreatLog", navigationParams);
            return;
          }

          // Owner role - do nothing (no navigation)
          if (userRole === "Owner") {
            // Owner cannot create logs, so do nothing when FAB is pressed
            return;
          }
        }}
      />

      {/* Full Screen Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <TouchableOpacity
            onPress={closeImageModal}
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 1,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage.imageUrl }}
              style={{
                width: screenWidth * 0.9,
                height: screenHeight * 0.7,
                borderRadius: 12,
                backgroundColor: 'transparent',
              }}
              contentFit="contain"
              transition={200}
            />
          )}
        </View>
      </Modal>

      {/* Update Log Modal */}
      <UpdateLogModal
        visible={updateModalVisible}
        onClose={() => {
          setUpdateModalVisible(false);
          setSelectedLogForUpdate(null);
        }}
        log={selectedLogForUpdate}
        onUpdate={handleUpdateLog}
        userRole={userRole}
      />
    </View>
  );
};

export default ViewAllLogScreen;
