import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Modal,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserRole } from "../services/utils/userRole";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/auth/Logout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clearAllReduxStores } from "../store/utils/clearAllReduxStores";
import { Brand } from "../constants/brandColors";

const { width: WINDOW_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(WINDOW_WIDTH * 0.78, 320);

const Sidebar = ({ isVisible, onClose, onNavigate, onLogoutComplete }) => {
  const [userData, setUserData] = React.useState({ name: "", role: "" });
  const [userRole, setUserRole] = React.useState(null);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);
  const [activeMenuItem, setActiveMenuItem] = React.useState(null);
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  React.useEffect(() => {
    if (isVisible) {
      loadUserData();
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
      setUserData({ name: "User", role: "User" });
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
    onClose?.();
    onNavigate?.(itemId);
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    try {
      setShowLogoutDialog(false);
      onClose?.();
      onLogoutComplete?.();

      clearAllReduxStores().catch((error) => {
        console.error("Error clearing Redux stores:", error);
      });

      logout()
        .then(() => logoutUser())
        .catch((error) => {
          console.error("Logout error:", error);
        });
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
      <Modal
        visible={!!isVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => onClose?.()}
      >
        <View style={styles.modalRoot}>
          <View
            style={[
              styles.drawerContainer,
              {
                width: DRAWER_WIDTH,
                paddingTop: insets.top,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.profileRow}>
              <View style={styles.avatarWrap}>
                <Ionicons name="person" size={36} color={Brand.ink} />
              </View>
              <View style={styles.profileTextWrap}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {userData.name}
                </Text>
                <Text style={styles.profileRole}>{userData.role}</Text>
              </View>
            </View>

            <View style={styles.menuContainer}>
              {getMenuItems().map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    item.isActive && styles.menuItemActive,
                  ]}
                  onPress={() => handleNavigate(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.isActive ? Brand.ink : Brand.inkMuted}
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

            <View style={styles.logoutContainer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.85}
              >
                <Ionicons name="log-out" size={22} color={Brand.onInk} />
                <Text style={styles.logoutLabel}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Pressable
            style={styles.backdrop}
            onPress={() => onClose?.()}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          />
        </View>
      </Modal>

      <Modal
        visible={showLogoutDialog}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.logoutModalBackdrop}>
          <View
            style={[styles.logoutModalCard, { width: WINDOW_WIDTH * 0.85 }]}
          >
            <View style={styles.logoutModalHeader}>
              <View style={styles.logoutModalIconWrap}>
                <Ionicons name="log-out" size={32} color={Brand.danger} />
              </View>
              <Text style={styles.logoutModalTitle}>Logout</Text>
              <Text style={styles.logoutModalSubtitle}>
                Are you sure you want to logout? You'll need to sign in again
                to access your account.
              </Text>
            </View>

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
  modalRoot: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(35, 31, 32, 0.45)",
  },
  drawerContainer: {
    height: "100%",
    backgroundColor: Brand.paper,
    shadowColor: Brand.ink,
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.line,
    backgroundColor: Brand.paper,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.paperSoft,
    borderWidth: 1,
    borderColor: Brand.line,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  profileTextWrap: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: Brand.ink,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  profileRole: {
    fontSize: 13,
    fontWeight: "500",
    color: Brand.inkMuted,
    letterSpacing: 0.2,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 14,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  menuItemActive: {
    backgroundColor: Brand.paperSoft,
    borderLeftWidth: 3,
    borderLeftColor: Brand.ink,
  },
  menuLabel: {
    marginLeft: 14,
    fontSize: 16,
    fontWeight: "600",
    color: Brand.ink,
    letterSpacing: 0.2,
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
    backgroundColor: Brand.ink,
    alignSelf: "center",
    width: "70%",
  },
  logoutLabel: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "600",
    color: Brand.onInk,
    letterSpacing: 0.2,
  },
  logoutModalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(35, 31, 32, 0.5)",
  },
  logoutModalCard: {
    backgroundColor: Brand.paper,
    borderRadius: 20,
    marginHorizontal: 32,
    padding: 24,
    shadowColor: Brand.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
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
    fontSize: 22,
    fontWeight: "700",
    color: Brand.ink,
    marginBottom: 8,
  },
  logoutModalSubtitle: {
    fontSize: 15,
    color: Brand.inkMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  logoutModalActions: {
    flexDirection: "row",
  },
  logoutModalCancel: {
    flex: 1,
    backgroundColor: Brand.paperSoft,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginRight: 6,
  },
  logoutModalCancelLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Brand.inkSoft,
  },
  logoutModalConfirm: {
    flex: 1,
    backgroundColor: Brand.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginLeft: 6,
  },
  logoutModalConfirmLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Brand.onInk,
  },
});

export default Sidebar;
