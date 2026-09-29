// @ts-nocheck

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_OPTIONS = [
  { id: "low", label: "Low", color: "#10B981" },
  { id: "medium", label: "Medium", color: "#F59E0B" },
  { id: "high", label: "High", color: "#EF4444" },
  { id: "critical", label: "Critical", color: "#DC2626" },
];

function PriorityDropdown({
  value = "low",
  onChange,
  options = DEFAULT_OPTIONS,
  style,
  open: openProp,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof openProp === "boolean";
  const open = isControlled ? openProp : internalOpen;

  const setOpen = (next) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const selected =
    options.find((o) => o.id === value) || options[0] || DEFAULT_OPTIONS[0];

  return (
    <View style={[styles.wrap, open && styles.wrapOpen, style]}>
      <TouchableOpacity
        style={[styles.trigger, open && styles.triggerActive]}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(!open);
        }}
        activeOpacity={0.75}
      >
        <View style={styles.valueRow}>
          <View style={[styles.dot, { backgroundColor: selected.color }]} />
          <Text style={styles.valueText}>{selected.label}</Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      
      {open ? (
        <View style={styles.dropdownPanel}>
          <Text style={styles.sheetHint}>Select Priority</Text>
          {options.map((option) => {
            const isSelected = option.id === selected.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.option, isSelected && styles.optionSelected]}
                onPress={() => {
                  onChange?.(option.id);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.valueRow}>
                  <View
                    style={[styles.dot, { backgroundColor: option.color }]}
                  />
                  <Text style={styles.optionText}>{option.label}</Text>
                </View>
                {isSelected ? (
                  <Ionicons name="checkmark" size={18} color="#3B82F6" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    position: "relative",
    zIndex: 1,
  },
  wrapOpen: {
    zIndex: 100,
    elevation: 100,
  },
  trigger: {
    minHeight: 36,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#FFFFFF",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  valueText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  dropdownPanel: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    zIndex: 200,
    overflow: "hidden",
  },
  sheetHint: {
    fontSize: 12,
    color: "#9CA3AF",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionSelected: {
    backgroundColor: "#EFF6FF",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
});

export default PriorityDropdown;
export { DEFAULT_OPTIONS as PRIORITY_OPTIONS };
