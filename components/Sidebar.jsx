import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserRole } from "../services/utils/userRole";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/auth/Logout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { clearAllReduxStores } from "../store/utils/clearAllReduxStores";

const { width } = Dimensions.get("window");

const Sidebar = ({ isVisible, onClose, onNavigate }) => {
  const slideAnim = React.useRef(new Animated.Value(-width)).current;
  const [userData, setUserData] = React.useState({
    name: "",
    role: "",
  });
  const [userRole, setUserRole] = React.useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);
  const [activeMenuItem, setActiveMenuItem] = React.useState(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      loadUserData();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const loadUserData = async () => {
    try {
      const role = await getUserRole();
      const userFirstName = await AsyncStorage.getItem("userFirstName");
      const userLastName = await AsyncStorage.getItem("userLastName");

      const fullName = `${userFirstName || ""} ${userLastName || ""}`.trim();

      setUserRole(role);
      setUserData({
        name: fullName || "User",
        role: role || "User",
      });
    } catch (error) {
      console.error("Error loading user data:", error);
      setUserRole(null);
      setUserData({
        name: "User",
        role: "User",
      });
    }
  };

  const getMenuItems = () => {
    const baseItems = [
      {
        id: "chats",
        title: "Chats",
        icon: "chatbubbles",
        isActive: activeMenuItem === "chats",
      },
      {
        id: "files",
        title: "Files",
        icon: "document-text",
        isActive: activeMenuItem === "files",
      },
      {
        id: "material",
        title: "Material",
        icon: "cube",
        isActive: activeMenuItem === "material",
      },
    ];

    if (userRole !== "Employee") {
      baseItems.push({
        id: "personnel",
        title: "Crew",
        icon: "people",
        isActive: activeMenuItem === "personnel",
      });
    }

    return baseItems;
  };

  const handleNavigate = (itemId) => {
    setActiveMenuItem(itemId);

    onClose();

    if (itemId === "personnel") {
      navigation.navigate("PersonalScreen");
    } else if (itemId === "files") {
      navigation.navigate("FilesScreen");
    } else if (itemId === "chats") {
      navigation.navigate("ChatScreen");
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    try {
      setShowLogoutDialog(false);
      onClose();

      navigation.reset({
        index: 0,
        routes: [{ name: "SignIn" }],
      });

      clearAllReduxStores().catch((error) => {
        console.error("Error clearing Redux stores:", error);
      });

      logout()
        .then(() => logoutUser())
        .catch((error) => {
          console.error("Logout error:", error);
        });

      console.log(
        "✅ Logout initiated - navigation complete, cleanup in progress"
      );
    } catch (error) {
      console.error("Error during logout:", error);
      setShowLogoutDialog(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isVisible && (
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            zIndex: 9999,
          }}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.drawerContainer,
          {
            width: width * 0.75,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* User Profile Section */}
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={40} color="black" />
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileName}>{userData.name}</Text>
            <Text style={styles.profileRole}>{userData.role}</Text>
          </View>
        </View>

        {/* Navigation Items */}
        <View style={styles.menuContainer}>
          {getMenuItems().map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, item.isActive && styles.menuItemActive]}
              onPress={() => handleNavigate(item.id)}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={item.isActive ? "#1C1C1E" : "#8E8E93"}
              />
              <Text
                style={[
                  styles.menuLabel,
                  item.isActive && styles.menuLabelActive,
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Section */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="white" />
            <Text style={styles.logoutLabel}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Custom Logout Dialog */}
      <Modal
        visible={showLogoutDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.logoutModalBackdrop}>
          <View style={[styles.logoutModalCard, { width: width * 0.85 }]}>
            {/* Dialog Header */}
            <View style={styles.logoutModalHeader}>
              <View style={styles.logoutModalIconWrap}>
                <Ionicons name="log-out" size={32} color="#ef4444" />
              </View>
              <Text style={styles.logoutModalTitle}>Logout</Text>
              <Text style={styles.logoutModalSubtitle}>
                Are you sure you want to logout? You'll need to sign in again to
                access your account.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.logoutModalActions}>
              <TouchableOpacity
                style={styles.logoutModalCancel}
                onPress={cancelLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutModalCancelLabel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutModalConfirm}
                onPress={confirmLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutModalConfirmLabel}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
const styles = StyleSheet.create({
  drawerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: "#FFFFFF",
    zIndex: 10000,
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 89,
    paddingBottom: 34,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileTextWrap: {
    flex: 1,
    marginTop: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
    letterSpacing: 0.3,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 25,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  menuItemActive: {
    backgroundColor: "#F2F2F7",
    borderLeftWidth: 4,
    borderLeftColor: "#000000",
  },
  menuLabel: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: 0.3,
  },
  menuLabelActive: {
    fontWeight: "700",
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginTop: "auto",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: "#000000",
    alignSelf: "center",
    width: "60%",
    shadowColor: "#6C757D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutLabel: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  logoutModalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  logoutModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginHorizontal: 32,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutModalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoutModalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  logoutModalSubtitle: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
  },
  logoutModalActions: {
    flexDirection: "row",
  },
  logoutModalCancel: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginRight: 6,
  },
  logoutModalCancelLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  logoutModalConfirm: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginLeft: 6,
  },
  logoutModalConfirmLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
export default Sidebar;
