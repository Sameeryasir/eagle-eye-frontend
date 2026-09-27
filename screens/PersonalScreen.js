import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  useWindowDimensions,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getEmployeesToAssignTask } from "../services/employees/getEmployeesOfTheCompany";
import { createTeamMember } from "../services/users/createTeamMember";
import Loader from "../services/utils/loader";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/AuthContext";
import { Brand } from "../constants/brandColors";
import HomeBottomNav from "../components/HomeBottomNav";

function PersonalScreen({ navigation }) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { userInfo } = useAuth();
  const isOwner = userInfo?.role === "Owner" || userInfo?.role?.name === "Owner";

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addVisible, setAddVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roleName: "Employee",
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredEmployees(
        employees.filter((employee) => {
          const firstName = employee.first_name?.toLowerCase() || "";
          const lastName = employee.last_name?.toLowerCase() || "";
          const email = employee.email?.toLowerCase() || "";
          return (
            firstName.includes(query) ||
            lastName.includes(query) ||
            email.includes(query) ||
            `${firstName} ${lastName}`.includes(query)
          );
        })
      );
    }
  }, [employees, searchQuery]);

  const loadEmployees = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const employeesData = await getEmployeesToAssignTask();
      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
        setFilteredEmployees(employeesData);
      } else {
        setEmployees([]);
        setFilteredEmployees([]);
      }
    } catch (err) {
      setError("Failed to load crew. Please try again.");
      setEmployees([]);
      setFilteredEmployees([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    loadEmployees(true);
  }, []);

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      roleName: "Employee",
    });
  };

  const handleCreateMember = async () => {
    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.email.includes("@")
    ) {
      Toast.show({
        type: "error",
        text1: "Missing details",
        text2: "First name, last name, and email are required",
        topOffset: 80,
      });
      return;
    }

    setSaving(true);
    try {
      await createTeamMember({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        roleName: form.roleName,
      });
      Toast.show({
        type: "success",
        text1: "Team member added",
        text2: "They can log in with their email OTP",
        topOffset: 80,
      });
      setAddVisible(false);
      resetForm();
      loadEmployees(true);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Could not add team member";
      Toast.show({
        type: "error",
        text1: "Add failed",
        text2: Array.isArray(message) ? message.join(", ") : String(message),
        topOffset: 80,
      });
    } finally {
      setSaving(false);
    }
  };

  const getDisplayName = (employee) => {
    if (!employee) return "Unknown";
    const first = employee.first_name || "";
    const last = employee.last_name || "";
    const full = `${first} ${last}`.trim();
    return full || employee.email || "Unknown";
  };

  const EmployeeCard = ({ employee }) => {
    if (!employee || typeof employee !== "object") return null;
    const displayName = getDisplayName(employee);
    const email = employee.email || "No email";
    const roleLabel =
      employee.role?.name || employee.role || employee.roleName || "Crew";

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={{
          backgroundColor: "#fff",
          marginHorizontal: Math.min(20, screenWidth * 0.05),
          marginBottom: Math.min(12, screenHeight * 0.015),
          borderRadius: 14,
          padding: Math.min(16, screenWidth * 0.04),
          borderWidth: 1,
          borderColor: "#E8ECF1",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: Brand.ink,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <Text style={{ color: Brand.onInk, fontWeight: "700", fontSize: 16 }}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Math.min(16, screenWidth * 0.04),
                fontWeight: "600",
                color: Brand.ink,
                marginBottom: 2,
              }}
            >
              {displayName}
            </Text>
            <Text
              style={{
                fontSize: Math.min(13, screenWidth * 0.032),
                color: "#6B7280",
                marginBottom: 6,
              }}
            >
              {email}
            </Text>
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#F3F4F6",
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: "#374151",
                  fontWeight: "600",
                }}
              >
                {String(roleLabel)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <View
      style={{
        backgroundColor: "white",
        paddingHorizontal: Math.min(20, screenWidth * 0.05),
        paddingTop: Math.min(12, screenHeight * 0.015),
        paddingBottom: Math.min(16, screenHeight * 0.02),
      }}
    >
      <Text
        style={{
          fontSize: 15,
          color: "#5A6572",
          marginBottom: 12,
          lineHeight: 21,
        }}
      >
        Manage your field crew and managers. New members log in with email OTP.
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#f8f9fa",
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: "#e9ecef",
        }}
      >
        <Ionicons
          name="search"
          size={18}
          color="#6c757d"
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={{ flex: 1, fontSize: 16, color: "#333", paddingVertical: 4 }}
          placeholder="Search by name or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#6c757d" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const EmptyState = () => {
    const isSearchEmpty =
      searchQuery.trim() !== "" && filteredEmployees.length === 0;
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
          paddingVertical: 60,
        }}
      >
        <Ionicons
          name={isSearchEmpty ? "search-outline" : "people-outline"}
          size={72}
          color="#ccc"
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#666",
            marginTop: 16,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {isSearchEmpty ? "No Search Results" : "No crew yet"}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#999",
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {isSearchEmpty
            ? `No one matches "${searchQuery}".`
            : error ||
              "Add your first employee or manager so they can work on jobs."}
        </Text>
        {!isSearchEmpty && isOwner && !error && (
          <TouchableOpacity
            style={{
              backgroundColor: Brand.ink,
              paddingHorizontal: 22,
              paddingVertical: 12,
              borderRadius: 10,
              marginTop: 18,
            }}
            onPress={() => setAddVisible(true)}
          >
            <Text style={{ color: Brand.onInk, fontSize: 15, fontWeight: "700" }}>
              Add team member
            </Text>
          </TouchableOpacity>
        )}
        {error && (
          <TouchableOpacity
            style={{
              backgroundColor: Brand.ink,
              paddingHorizontal: 22,
              paddingVertical: 12,
              borderRadius: 10,
              marginTop: 18,
            }}
            onPress={() => loadEmployees()}
          >
            <Text style={{ color: Brand.onInk, fontSize: 15, fontWeight: "700" }}>
              Retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: Brand.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    backgroundColor: Brand.paperSoft,
    color: Brand.ink,
    marginBottom: 12,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "white" }}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Loader size="large" color="#000000" text="Loading crew..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => String(item.id || item.email)}
        renderItem={({ item }) => <EmployeeCard employee={item} />}
        ListHeaderComponent={<Header />}
        contentContainerStyle={{
          paddingBottom: Math.min(120, screenHeight * 0.15),
          flexGrow: 1,
        }}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {isOwner && (
        <TouchableOpacity
          onPress={() => setAddVisible(true)}
          style={{
            position: "absolute",
            right: 20,
            bottom: 110,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: Brand.ink,
            justifyContent: "center",
            alignItems: "center",
            elevation: 6,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          <Ionicons name="person-add" size={24} color={Brand.onInk} />
        </TouchableOpacity>
      )}

      <HomeBottomNav />

      <Modal
        visible={addVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddVisible(false)}
      >
        <KeyboardAvoidingView
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: Platform.OS === "ios" ? 34 : 20,
              maxHeight: screenHeight * 0.88,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: Brand.ink }}
              >
                Add team member
              </Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Ionicons name="close" size={24} color={Brand.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ color: "#5A6572", marginBottom: 14, lineHeight: 20 }}>
                They join your company and can sign in with a one-time email
                code.
              </Text>

              <TextInput
                style={inputStyle}
                placeholder="First name *"
                placeholderTextColor="#9AA3AD"
                value={form.firstName}
                onChangeText={(v) => setForm((p) => ({ ...p, firstName: v }))}
              />
              <TextInput
                style={inputStyle}
                placeholder="Last name *"
                placeholderTextColor="#9AA3AD"
                value={form.lastName}
                onChangeText={(v) => setForm((p) => ({ ...p, lastName: v }))}
              />
              <TextInput
                style={inputStyle}
                placeholder="Work email *"
                placeholderTextColor="#9AA3AD"
                autoCapitalize="none"
                keyboardType="email-address"
                value={form.email}
                onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              />
              <TextInput
                style={inputStyle}
                placeholder="Phone (optional)"
                placeholderTextColor="#9AA3AD"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={(v) =>
                  setForm((p) => ({ ...p, phone: v.replace(/[^\d]/g, "") }))
                }
              />

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#4A5563",
                  marginBottom: 8,
                }}
              >
                Role
              </Text>
              <View style={{ flexDirection: "row", marginBottom: 16, gap: 10 }}>
                {["Employee", "Manager"].map((role) => {
                  const selected = form.roleName === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      onPress={() => setForm((p) => ({ ...p, roleName: role }))}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: selected ? Brand.ink : Brand.line,
                        backgroundColor: selected ? Brand.ink : Brand.paperSoft,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? Brand.onInk : Brand.ink,
                          fontWeight: "600",
                        }}
                      >
                        {role === "Employee" ? "Crew" : "Manager"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: saving ? Brand.lineStrong : Brand.ink,
                  paddingVertical: 15,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                disabled={saving}
                onPress={handleCreateMember}
              >
                {saving ? (
                  <ActivityIndicator color={Brand.onInk} />
                ) : (
                  <Text
                    style={{
                      color: Brand.onInk,
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    Save team member
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default PersonalScreen;
