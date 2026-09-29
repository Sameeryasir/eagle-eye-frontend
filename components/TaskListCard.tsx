// @ts-nocheck

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

const UI = {
  ink: "#111827",
  titleDone: "#9CA3AF",
  desc: "#6B7280",
  meta: "#6B7280",
  border: "#E5E7EB",
  paper: "#FFFFFF",
  stripeFallback: "#CBD5E1",
  high: { text: "#DC2626", bg: "#FEE2E2", dot: "#EF4444" },
  medium: { text: "#D97706", bg: "#FEF3C7", dot: "#F59E0B" },
  low: { text: "#059669", bg: "#D1FAE5", dot: "#10B981" },
  critical: { text: "#B91C1C", bg: "#FEE2E2", dot: "#EF4444" },
  todo: { label: "To Do", text: "#DC2626", bg: "#FEE2E2" },
  inProgress: { label: "In Progress", text: "#2563EB", bg: "#DBEAFE" },
  completed: { label: "Completed", text: "#059669", bg: "#D1FAE5" },
};

function isTaskCompleted(task) {
  const status = String(task?.status || task?.taskStatus || "").toLowerCase();
  return (
    status === "done" ||
    status === "completed" ||
    status === "closed" ||
    !!task?.isCompleted ||
    !!task?.closedTask
  );
}

function getStatusMeta(task) {
  const status = String(task?.status || task?.taskStatus || "").toLowerCase();
  if (
    status === "done" ||
    status === "completed" ||
    status === "closed" ||
    task?.isCompleted ||
    task?.closedTask
  ) {
    return UI.completed;
  }
  if (
    status === "in progress" ||
    status === "in_progress" ||
    status === "in-progress" ||
    status === "active" ||
    status === "started"
  ) {
    return UI.inProgress;
  }
  return UI.todo;
}

function getPriorityMeta(priority) {
  const value = String(priority || "").toLowerCase();
  if (value === "critical") {
    return { label: "Critical", ...UI.critical };
  }
  if (value === "high") {
    return { label: "High", ...UI.high };
  }
  if (value === "low") {
    return { label: "Low", ...UI.low };
  }
  if (value === "medium") {
    return { label: "Medium", ...UI.medium };
  }
  
  return { label: "Medium", ...UI.medium };
}

function formatDueLabel(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getProjectLabel(task, projectName) {
  if (projectName) return String(projectName);
  const project = task?.project;
  if (!project) {
    return (
      task?.projectName ||
      task?.category ||
      task?.categoryName ||
      ""
    );
  }
  if (typeof project === "string") return project;
  return project.name || project.title || "";
}

function TaskListCard({
  task,
  onPress,
  onEdit,
  onDelete,
  showMenu = false,
  projectName,
}) {
  const completed = isTaskCompleted(task);
  const status = getStatusMeta(task);
  const priority = getPriorityMeta(task?.priority);
  const description = String(task?.description || "").trim();
  const dueLabel = formatDueLabel(
    task?.endTime || task?.dueDate || task?.startTime || task?.createdAt
  );
  const folderLabel = getProjectLabel(task, projectName);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={onPress}
    >
      
      <View style={[styles.stripe, { backgroundColor: priority.dot }]} />

      <View style={styles.content}>
        
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, completed && styles.titleDone]}
            numberOfLines={2}
          >
            {task?.title || task?.name || "Untitled task"}
          </Text>

          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>

          {showMenu && (onEdit || onDelete) ? (
            <Menu>
              <MenuTrigger customStyles={{ triggerWrapper: styles.menuBtn }}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={16}
                  color={UI.meta}
                />
              </MenuTrigger>
              <MenuOptions
                customStyles={{ optionsContainer: styles.menuDropdown }}
              >
                {onEdit ? (
                  <MenuOption onSelect={onEdit}>
                    <View style={styles.menuItem}>
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color={UI.ink}
                      />
                      <Text style={styles.menuItemText}>Edit</Text>
                    </View>
                  </MenuOption>
                ) : null}
                {onDelete ? (
                  <MenuOption onSelect={onDelete}>
                    <View style={styles.menuItem}>
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#DC2626"
                      />
                      <Text style={[styles.menuItemText, { color: "#DC2626" }]}>
                        Delete
                      </Text>
                    </View>
                  </MenuOption>
                ) : null}
              </MenuOptions>
            </Menu>
          ) : (
            <View style={styles.menuBtn} pointerEvents="none">
              <Ionicons name="ellipsis-vertical" size={16} color={UI.meta} />
            </View>
          )}
        </View>

        {!!description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}

        
        <View style={styles.metaRow}>
          <View
            style={[styles.priorityPill, { backgroundColor: priority.bg }]}
          >
            <View
              style={[styles.priorityDot, { backgroundColor: priority.dot }]}
            />
            <Text style={[styles.priorityText, { color: priority.text }]}>
              {priority.label}
            </Text>
          </View>

          {!!dueLabel && (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={UI.meta} />
              <Text style={styles.metaText} numberOfLines={1}>
                {dueLabel}
              </Text>
            </View>
          )}

          {!!folderLabel && (
            <View style={styles.metaItem}>
              <Ionicons name="folder-outline" size={14} color={UI.meta} />
              <Text style={styles.metaText} numberOfLines={1}>
                {folderLabel}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: UI.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  stripe: {
    width: 4,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: UI.ink,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  titleDone: {
    color: UI.titleDone,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  menuBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
    marginRight: -4,
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: UI.desc,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "40%",
  },
  metaText: {
    fontSize: 12,
    color: UI.meta,
    fontWeight: "500",
    flexShrink: 1,
  },
  menuDropdown: {
    backgroundColor: UI.paper,
    borderRadius: 12,
    paddingVertical: 4,
    width: 148,
    borderWidth: 1,
    borderColor: UI.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI.ink,
  },
});

export default TaskListCard;
export { isTaskCompleted, getPriorityMeta, formatDueLabel, getStatusMeta };
