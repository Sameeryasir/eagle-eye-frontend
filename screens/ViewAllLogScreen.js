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
} from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import CustomBottomNav from "./components/CustomBottomNav";
import { getUserRole } from "../services/utils/userRole";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

const searchBarClasses = `flex-row items-center rounded-2xl px-4 py-3 bg-[#F8FAFC] border border-[#EAECF0]`;

const ViewAllLogScreen = ({ route, navigation }) => {
  const { logs } = route.params || [];
  const [searchQuery, setSearchQuery] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Get user role on component mount
  React.useEffect(() => {
    const fetchUserRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
    };
    fetchUserRole();
  }, []);

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

  // Generate unique dates from logs
  const generateDateOptions = () => {
    if (!logs || logs.length === 0) return ["All Time"];

    const uniqueDates = [...new Set(logs.map((log) => log.date))];
    const dateOptions = uniqueDates.map((dateStr) => {
      const date = new Date(dateStr);
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = days[date.getDay()];
      const day = date.getDate();
      const month = date.toLocaleString("default", { month: "short" });
      return {
        label: `${dayName}, ${month} ${day}`,
        value: dateStr,
      };
    });

    return [{ label: "All Time", value: "All Time" }, ...dateOptions];
  };

  const [selectedTimeFilter, setSelectedTimeFilter] = useState("All Time");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState("All Projects");
  const [filteredLogs, setFilteredLogs] = useState(logs || []);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const timeFilterOptions = React.useMemo(() => generateDateOptions(), [logs]);

  // Generate unique projects from logs
  const generateProjectOptions = () => {
    // Add dummy projects if no logs exist
    const dummyProjects = [
      "Project 1",
      "Project 2", 
      "Project 3",
      "Project 4",
      "Project 5",
      "Project 6"
    ];

    if (!logs || logs.length === 0) {
      return [{ label: "All Projects", value: "All Projects" }, ...dummyProjects.map(project => ({
        label: project,
        value: project,
      }))];
    }

    const uniqueProjects = [...new Set(logs.map((log) => log.projectName || log.project).filter(Boolean))];
    
    // Add dummy projects if no real projects exist
    if (uniqueProjects.length === 0) {
      return [{ label: "All Projects", value: "All Projects" }, ...dummyProjects.map(project => ({
        label: project,
        value: project,
      }))];
    }

    const projectOptions = uniqueProjects.map((projectName) => ({
      label: projectName,
      value: projectName,
    }));

    return [{ label: "All Projects", value: "All Projects" }, ...projectOptions];
  };

  const projectFilterOptions = React.useMemo(() => generateProjectOptions(), [logs]);

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
    setSelectedProjectFilter(filter);
    setShowProjectDropdown(false);
    applyFilters(searchQuery, selectedTimeFilter, filter);
  };

  const applyFilters = (query, timeFilter, projectFilter) => {
    let filtered = logs || [];

    // Apply time filter
    if (timeFilter && timeFilter !== "All Time") {
      console.log("Filtering by time:", timeFilter);
      console.log("Available dates in logs:", logs.map(log => log.date));
      filtered = filtered.filter((log) => {
        const matches = log.date === timeFilter;
        console.log(`Log date: ${log.date}, Filter: ${timeFilter}, Matches: ${matches}`);
        return matches;
      });
    }

    // Apply project filter
    if (projectFilter && projectFilter !== "All Projects") {
      filtered = filtered.filter((log) => {
        const logProject = log.projectName || log.project;
        return logProject === projectFilter;
      });
    }

    // Apply search filter
    if (query && query.trim() !== "") {
      filtered = filtered.filter(
        (log) =>
          log.createdBy.toLowerCase().includes(query.toLowerCase()) ||
          log.description.toLowerCase().includes(query.toLowerCase()) ||
          log.date.includes(query) ||
          (log.projectName || log.project || "").toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const handleUpdate = (log) => {
    // Only allow updating logs if user is not an Employee
    if (userRole === "Employee") {
      // Show no response for Employee role
      return;
    }

    // TODO: Implement log update functionality
    // Update functionality will be implemented here
  };

  const handleDelete = (log) => {
    // Only allow deleting logs if user is not an Employee
    if (userRole === "Employee") {
      // Show no response for Employee role
      return;
    }

    const logId = log?.id;

    if (!logId) {
      return;
    }

    try {
      // TODO: Implement log deletion API call
      // await deleteLogById(logId);

      const updatedLogs = logs.filter((log) => log.id !== logId);
      const updatedFilteredLogs = filteredLogs.filter(
        (log) => log.id !== logId
      );

      // Update the logs in route params if possible
      if (route.params) {
        route.params.logs = updatedLogs;
      }

      setFilteredLogs(updatedFilteredLogs);
    } catch (error) {
      // Handle error silently or log it
      console.error("Error deleting log:", error);
    }
  };

  const LogCard = ({ log }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('LogsDetail', { log })}
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
        {userRole !== "Employee" && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View style={{ 
                flexDirection: "row", 
                alignItems: "center", 
                marginRight: 12, 
                minWidth: Math.max(85, screenWidth * 0.15),
                flexShrink: 0
              }}>
                <Text style={{
                  fontSize: Math.min(15, screenWidth * 0.038),
                  color: "black",
                  fontWeight: "600",
                  letterSpacing: 0.3,
                }}>
                  Created by:
                </Text>
              </View>
              <Text style={{
                flex: 1,
                fontSize: Math.min(15, screenWidth * 0.038),
                color: "#333",
                lineHeight: 24,
                flexShrink: 1,
              }}>
                {log.createdBy}
              </Text>
            </View>
          </View>
        )}

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
              {userRole === "Employee" 
                ? (log.description && log.description.length > 33
                    ? log.description.substring(0, 33) + "..."
                    : log.description)
                : (log.description && log.description.length > 14
                    ? log.description.substring(0, 14) + "..."
                    : log.description)
              }
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {(log.thumbnail || log.image) && (
              <View style={{ marginRight: 12, marginTop: userRole === "Employee" ? 0 : -30 }}>
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
                ) : (
                  <View
                    style={{
                      width: Math.min(60, screenWidth * 0.15),
                      height: Math.min(60, screenWidth * 0.15),
                      borderRadius: Math.min(8, screenWidth * 0.02),
                      backgroundColor: "#3155A1",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="image" size={Math.min(24, screenWidth * 0.06)} color="white" />
                  </View>
                )}
              </View>
            )}
            
            {userRole === "Employee" && (
              <Menu
                rendererProps={{
                  placement: "bottom-end",
                  anchorStyle: { marginRight: 0 },
                  triggerStyle: { marginRight: 0 },
                }}
              >
                <MenuTrigger>
                  <View style={{ activeOpacity: 1 }}>
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
            )}
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
      bounces={false}
      scrollEnabled={!(showTimeDropdown || showProjectDropdown)}
      nestedScrollEnabled={true}
    >
      {/* Header Section */}
      <View style={{ paddingVertical: Math.min(20, screenHeight * 0.025) }}>
        {/* Filter Dropdowns Row */}
        <View style={{ flexDirection: "row", marginBottom: 16, gap: 12 }}>
          {/* Time Filter Dropdown */}
          <View style={{ flex: 1, position: "relative" }}>
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
                  color="#6B7280"
                  style={{ marginRight: 8, flexShrink: 0 }}
                />
                <Text
                  style={{
                    fontSize: Math.min(15, screenWidth * 0.038),
                    color: "#111827",
                    fontWeight: "500",
                    flex: 1,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {timeFilterOptions.find(
                    (option) => option.value === selectedTimeFilter
                  )?.label || "All Time"}
                </Text>
              </View>
              <Ionicons
                name={showTimeDropdown ? "chevron-up" : "chevron-down"}
                size={Math.min(16, screenWidth * 0.04)}
                color="#6B7280"
                style={{ marginLeft: 12, flexShrink: 0 }}
              />
            </TouchableOpacity>

            {showTimeDropdown && (
              <TouchableWithoutFeedback onPress={() => {}}>
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
                  )?.label || "All Projects"}
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
              <TouchableWithoutFeedback onPress={() => {}}>
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
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderRadius: Math.min(16, screenWidth * 0.04),
            paddingHorizontal: Math.min(16, screenWidth * 0.04),
            paddingVertical: Math.min(12, screenHeight * 0.015),
            backgroundColor: "#F8FAFC",
            borderWidth: 1,
            borderColor: "#EAECF0",
            width: "100%",
            opacity: (showTimeDropdown || showProjectDropdown) ? 0.5 : 1,
          }}
        >
          <Ionicons
            name="search"
            size={Math.min(18, screenWidth * 0.045)}
            color="#6B7280"
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
          {filteredLogs.map((log) => (
            <LogCard key={String(log.id)} log={log} />
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-white">
      {renderContent()}
      <CustomBottomNav keyboardVisible={keyboardVisible} />
    </View>
  );
};

export default ViewAllLogScreen;
