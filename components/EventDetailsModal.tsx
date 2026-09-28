// @ts-nocheck
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useDispatch } from "react-redux";
import UpdateEventModal from "./UpdateEventModal";
import AccessDeniedDialog from "./AccessDeniedDialog";

import { getUserRole } from "../services/utils/userRole";
import { deleteEventById } from "../services/event/deleteById";

const EventDetailsModal = ({ visible, onClose, event, onEventUpdated }) => {
  const dispatch = useDispatch();

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  const [accessDeniedDialog, setAccessDeniedDialog] = useState({
    visible: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (visible) {
        try {
          setIsLoadingRole(true);
          const role = await getUserRole();
          setUserRole(role);
          console.log("EventDetailsModal - User role:", role);
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole(null);
        } finally {
          setIsLoadingRole(false);
        }
      }
    };

    fetchUserRole();
  }, [visible]);

  useEffect(() => {
    if (deleteError) {
      console.error("Delete error:", deleteError);

      Toast.show({
        type: "error",
        text1: "Delete Failed",
        text2: deleteError,
        visibilityTime: 4000,
        autoHide: true,
        topOffset: 80,
      });

      setDeleteError(null);

      setDeleteDialogVisible(false);
      onClose();
    }
  }, [deleteError, onClose]);

  const openAccessDeniedDialog = (message) => {
    setAccessDeniedDialog({
      visible: true,
      title: "Access Denied",
      message,
    });
  };

  const closeAccessDeniedDialog = () => {
    setAccessDeniedDialog((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  const handleUpdate = () => {
    if (userRole === "Employee" || userRole === "Manager") {
      const restrictedRoleLabel =
        userRole === "Employee" ? "Employees" : "Managers";
      openAccessDeniedDialog(`${restrictedRoleLabel} cannot update events.`);
      return;
    }
    setShowUpdateModal(true);
  };

  const handleUpdateModalClose = () => {
    setShowUpdateModal(false);
  };

  const handleEventUpdated = () => {
    setShowUpdateModal(false);
    onClose();
    if (onEventUpdated) {
      onEventUpdated();
    }
  };

  const handleDelete = () => {
    if (userRole === "Employee" || userRole === "Manager") {
      const restrictedRoleLabel =
        userRole === "Employee" ? "Employees" : "Managers";
      openAccessDeniedDialog(`${restrictedRoleLabel} cannot delete events.`);
      return;
    }
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);

      const result = await deleteEventById(event.originalEventId || event.id);

      Toast.show({
        type: "success",
        text1: "Event Deleted Successfully!",
        text2: "Your event has been permanently removed",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });

      setDeleteDialogVisible(false);
      onClose();
      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (error) {
      console.error("Error during delete confirmation:", error);
      setDeleteError(error.message || "Failed to delete event");

      Toast.show({
        type: "error",
        text1: "Delete Failed",
        text2: error.message || "Failed to delete event. Please try again.",
        visibilityTime: 3000,
        autoHide: true,
        topOffset: 80,
      });

      setDeleteDialogVisible(false);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogVisible(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-transparent justify-center items-center px-6">
          <View
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 10,
              },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View
              className="px-6 py-5"
              style={{
                backgroundColor: "black",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-black rounded-full items-center justify-center mr-3">
                    <Ionicons name="calendar" size={20} color="#FFFFFF" />
                  </View>
                  <Text className="text-lg font-bold text-white">
                    Event Details
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 bg-black rounded-full items-center justify-center"
                  style={{ backgroundColor: "#4B5563" }}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="p-6 bg-gray-50">
              {event && (
                <>
                  <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row items-center mb-3">
                      <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                        <Ionicons
                          name="document-text"
                          size={16}
                          color="#3B82F6"
                        />
                      </View>
                      <Text className="text-sm font-semibold text-gray-700">
                        Event Title
                      </Text>
                    </View>
                    <Text className="text-lg font-bold text-gray-800 leading-6 ml-11">
                      {event.title}
                    </Text>
                  </View>

                  <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row items-center mb-3">
                      <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name="time" size={16} color="#F59E0B" />
                      </View>
                      <Text className="text-sm font-semibold text-gray-700">
                        {event.isMultiDayEvent ? "Date & Time Range" : "Time"}
                      </Text>
                    </View>

                    {event.isMultiDayEvent ? (
                      <View className="ml-11">
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="calendar" size={16} color="#6B7280" />
                          <Text className="text-base text-gray-700 leading-6 ml-2 font-medium">
                            {event.originalStartDate} to {event.originalEndDate}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <Ionicons name="time" size={16} color="#6B7280" />
                          <Text className="text-base text-gray-700 leading-6 ml-2">
                            {event.startDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}{" "}
                            -{" "}
                            {event.endDate.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View className="ml-11">
                        <View className="flex-row items-center mb-2">
                          <Ionicons name="calendar" size={16} color="#6B7280" />
                          <Text className="text-base text-gray-700 leading-6 ml-2 font-medium">
                            {event.startDate.toLocaleDateString([], {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <Ionicons name="time" size={16} color="#6B7280" />
                          <Text className="text-base text-gray-700 leading-6 ml-2">
                            {event.startDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}{" "}
                            -{" "}
                            {event.endDate.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {event.projects && event.projects.length > 0 && (
                    <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                      <View className="flex-row items-center mb-3">
                        <View className="w-8 h-8 bg-purple-100 rounded-full items-center justify-center mr-3">
                          <Ionicons name="folder" size={16} color="#8B5CF6" />
                        </View>
                        <Text className="text-sm font-semibold text-gray-700">
                          Assigned Projects
                        </Text>
                      </View>
                      <View>
                        <FlatList
                          data={event.projects}
                          keyExtractor={(item, index) => `project-${index}`}
                          renderItem={({ item: project, index }) => (
                            <View className="flex-row items-start mb-2">
                              <View className="mr-3 mt-1">
                                <View className=" items-center justify-center">
                                  <Text className="text-sm font-bold text-black">
                                    {index + 1}
                                  </Text>
                                </View>
                              </View>

                              <View
                                className="bg-gray-50 rounded-xl p-2 border border-gray-200 flex-1"
                                style={{
                                  shadowColor: "#000",
                                  shadowOffset: { width: 0, height: 1 },
                                  shadowOpacity: 0.05,
                                  shadowRadius: 2,
                                  elevation: 1,
                                }}
                              >
                                <View className="flex-row items-center mb-2">
                                  <View className="w-6 h-6 bg-purple-200 rounded-full items-center justify-center mr-2">
                                    <Ionicons
                                      name="folder-outline"
                                      size={12}
                                      color="#8B5CF6"
                                    />
                                  </View>
                                  <Text className="text-base font-semibold text-gray-800 flex-1">
                                    {project.name || "Unnamed Project"}
                                  </Text>
                                </View>

                                {project.description && (
                                  <View className="ml-8">
                                    <Text className="text-sm text-gray-600 leading-5">
                                      {project.description.length > 10
                                        ? project.description.substring(0, 10) +
                                          "..."
                                        : project.description}
                                    </Text>
                                  </View>
                                )}

                                {!project.description && (
                                  <View className="ml-8">
                                    <Text className="text-sm text-gray-400 italic">
                                      No description available
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          )}
                          scrollEnabled={true}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                          initialNumToRender={2}
                          maxToRenderPerBatch={2}
                          windowSize={5}
                          removeClippedSubviews={true}
                          style={{ maxHeight: 120 }}
                          contentContainerStyle={{ paddingBottom: 8 }}
                        />
                      </View>
                    </View>
                  )}

                  <View className="flex-row space-x-3 gap-4 mb-6">
                    <TouchableOpacity
                      onPress={handleUpdate}
                      disabled={isLoadingRole}
                      className={`flex-1 py-3 rounded-xl ${
                        isLoadingRole ? "bg-gray-100" : "bg-gray-200"
                      }`}
                      style={{ opacity: isLoadingRole ? 0.5 : 1 }}
                    >
                      <Text
                        className={`text-center font-semibold text-base ${
                          isLoadingRole ? "text-gray-400" : "text-gray-700"
                        }`}
                      >
                        Update
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDelete}
                      disabled={isLoadingRole || deleting}
                      className={`flex-1 py-3 rounded-xl ${
                        isLoadingRole || deleting ? "bg-gray-100" : "bg-black"
                      }`}
                      style={{ opacity: isLoadingRole || deleting ? 0.5 : 1 }}
                    >
                      <Text
                        className={`text-center font-semibold text-base ${
                          isLoadingRole || deleting
                            ? "text-gray-400"
                            : "text-white"
                        }`}
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <UpdateEventModal
        visible={showUpdateModal}
        onClose={handleUpdateModalClose}
        event={event}
        onEventUpdated={handleEventUpdated}
      />

      <Modal
        visible={deleteDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxWidth: 320,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View
              style={{
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#FEF2F2",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="warning" size={24} color="#EF4444" />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#1F2937",
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                Delete Event
              </Text>
            </View>

            <Text
              style={{
                fontSize: 15,
                color: "#6B7280",
                textAlign: "center",
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              Are you sure you want to delete{" "}
              <Text style={{ fontWeight: "600", color: "#1F2937" }}>
                "{event?.title}"
              </Text>{" "}
              permanently?
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: "#EF4444",
                textAlign: "center",
                fontWeight: "500",
                marginBottom: 20,
              }}
            >
              This action cannot be undone.
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                }}
                onPress={cancelDelete}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: deleting ? "#F87171" : "#EF4444",
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: deleting ? 0.7 : 1,
                }}
                onPress={confirmDelete}
                activeOpacity={0.8}
                disabled={deleting}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AccessDeniedDialog
        visible={accessDeniedDialog.visible}
        title={accessDeniedDialog.title || "Access Denied"}
        message={
          accessDeniedDialog.message ||
          "You do not have permission to perform this action."
        }
        onClose={closeAccessDeniedDialog}
      />
    </>
  );
};

export default EventDetailsModal;
