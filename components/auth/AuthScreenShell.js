import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Brand } from "../../constants/brandColors";
import { useResponsiveLayout } from "../../constants/responsiveLayout";

export function AuthScreenShell({
  title,
  subtitle,
  children,
  onBack,
  footer,
  scroll = false,
}) {
  const layout = useResponsiveLayout();
  const {
    insets,
    contentWidth,
    horizontalPad,
    titleSize,
    subtitleSize,
    hitSize,
    iconSize,
    isCompactHeight,
  } = layout;

  const body = (
    <View style={{ width: contentWidth, maxWidth: "100%", alignSelf: "center" }}>
      <Text
        style={{
          fontSize: titleSize,
          fontWeight: "700",
          color: Brand.ink,
          letterSpacing: -0.4,
          marginBottom: layout.rs(10),
        }}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text
          style={{
            fontSize: subtitleSize,
            color: Brand.inkMuted,
            lineHeight: subtitleSize * 1.45,
            marginBottom: isCompactHeight ? 22 : 30,
          }}
        >
          {subtitle}
        </Text>
      )}

      {children}
      {footer}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Brand.paper }}>
      <StatusBar barStyle="dark-content" backgroundColor={Brand.paper} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View
          style={{
            paddingTop: Math.max(insets.top, 10),
            paddingHorizontal: Math.max(horizontalPad - 12, 8),
            paddingBottom: 4,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={{
                width: hitSize,
                height: hitSize,
                borderRadius: hitSize / 2,
                alignItems: "center",
                justifyContent: "center",
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={iconSize} color={Brand.ink} />
            </TouchableOpacity>
          ) : (
            <View style={{ height: hitSize }} />
          )}
        </View>

        {scroll || isCompactHeight ? (
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: horizontalPad,
              paddingBottom: Math.max(insets.bottom, 24) + 12,
              justifyContent: isCompactHeight ? "flex-start" : "center",
              paddingTop: 8,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View
            style={{
              flex: 1,
              paddingHorizontal: horizontalPad,
              paddingBottom: Math.max(insets.bottom, 24),
              justifyContent: "center",
            }}
          >
            {body}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  containerStyle,
  ...props
}) {
  const [focused, setFocused] = React.useState(false);
  const layout = useResponsiveLayout();

  return (
    <View style={[{ marginBottom: layout.fieldGap }, containerStyle]}>
      {!!label && (
        <Text
          style={{
            fontSize: layout.rs(13),
            fontWeight: "600",
            color: Brand.inkSoft,
            marginBottom: layout.rs(8),
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          borderWidth: 1,
          borderColor: focused ? Brand.ink : Brand.line,
          borderRadius: layout.radius,
          backgroundColor: focused ? Brand.paper : Brand.paperSoft,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Brand.inkFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            height: layout.inputHeight,
            paddingHorizontal: layout.rs(16),
            fontSize: layout.bodySize,
            color: Brand.ink,
          }}
          {...props}
        />
      </View>
    </View>
  );
}

export function AuthPrimaryButton({ label, onPress, disabled, loading }) {
  const layout = useResponsiveLayout();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        width: "100%",
        backgroundColor: disabled || loading ? Brand.lineStrong : Brand.ink,
        paddingVertical: layout.buttonPadY,
        borderRadius: layout.radius,
        alignItems: "center",
        marginTop: layout.rs(8),
        minHeight: layout.rs(50),
        justifyContent: "center",
      }}
    >
      {loading ? (
        <ActivityIndicator color={Brand.onInk} />
      ) : (
        <Text
          style={{
            color: Brand.onInk,
            fontSize: layout.buttonTextSize,
            fontWeight: "600",
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function AuthFooterLink({ prompt, actionLabel, onPress }) {
  const layout = useResponsiveLayout();

  return (
    <TouchableOpacity
      style={{
        marginTop: layout.rs(24),
        alignItems: "center",
        paddingBottom: layout.rs(8),
      }}
      onPress={onPress}
    >
      <Text style={{ color: Brand.inkMuted, fontSize: layout.rs(14) }}>
        {prompt}{" "}
        <Text style={{ color: Brand.ink, fontWeight: "700" }}>{actionLabel}</Text>
      </Text>
    </TouchableOpacity>
  );
}

export function AuthSectionLabel({ children }) {
  const layout = useResponsiveLayout();

  return (
    <Text
      style={{
        fontSize: layout.labelSize,
        fontWeight: "700",
        color: Brand.inkFaint,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: layout.rs(14),
        marginTop: layout.rs(8),
      }}
    >
      {children}
    </Text>
  );
}
