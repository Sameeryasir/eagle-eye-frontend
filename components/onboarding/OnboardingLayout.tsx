// @ts-nocheck
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

export function OnboardingLayout({
  step,
  totalSteps = 2,
  title,
  subtitle,
  children,
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  secondary,
}) {
  const layout = useResponsiveLayout();
  const {
    insets,
    contentWidth,
    horizontalPad,
    titleSize,
    subtitleSize,
    buttonTextSize,
    buttonPadY,
    sectionGap,
    radius,
    hitSize,
    iconSize,
    captionSize,
    isCompactHeight,
  } = layout;

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
            paddingTop: Math.max(insets.top, 8),
            paddingHorizontal: Math.max(horizontalPad - 12, 8),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={onBack}
            style={{
              width: hitSize,
              height: hitSize,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={iconSize} color={Brand.ink} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: captionSize,
              fontWeight: "600",
              color: Brand.inkMuted,
              letterSpacing: 0.8,
            }}
          >
            {step} / {totalSteps}
          </Text>
          <View style={{ width: hitSize }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: horizontalPad,
            paddingTop: isCompactHeight ? 8 : 12,
            paddingBottom: Math.max(insets.bottom, 20) + 16,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces
        >
          <View
            style={{
              width: contentWidth,
              maxWidth: "100%",
              alignSelf: "center",
              flexGrow: 1,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                marginBottom: sectionGap,
              }}
            >
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: layout.rs(3),
                    borderRadius: 2,
                    marginRight: i < totalSteps - 1 ? layout.rs(6) : 0,
                    backgroundColor: i < step ? Brand.ink : Brand.line,
                  }}
                />
              ))}
            </View>

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
            <View
              style={{
                width: layout.rs(32),
                height: 2,
                backgroundColor: Brand.ink,
                marginBottom: layout.rs(14),
                opacity: 0.85,
              }}
            />
            {!!subtitle && (
              <Text
                style={{
                  fontSize: subtitleSize,
                  color: Brand.inkMuted,
                  lineHeight: subtitleSize * 1.45,
                  marginBottom: sectionGap,
                  letterSpacing: 0.15,
                }}
              >
                {subtitle}
              </Text>
            )}

            {children}

            <View style={{ flexGrow: 1, minHeight: isCompactHeight ? 12 : 24 }} />

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={primaryDisabled || primaryLoading}
              onPress={onPrimary}
              style={{
                width: "100%",
                backgroundColor:
                  primaryDisabled || primaryLoading
                    ? Brand.lineStrong
                    : Brand.ink,
                paddingVertical: buttonPadY,
                borderRadius: radius,
                alignItems: "center",
                marginTop: layout.rs(16),
                minHeight: layout.rs(50),
                justifyContent: "center",
              }}
            >
              {primaryLoading ? (
                <ActivityIndicator color={Brand.onInk} />
              ) : (
                <Text
                  style={{
                    color: Brand.onInk,
                    fontSize: buttonTextSize,
                    fontWeight: "600",
                    letterSpacing: 0.3,
                  }}
                >
                  {primaryLabel}
                </Text>
              )}
            </TouchableOpacity>

            {secondary}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function OnboardingField({
  label,
  value,
  onChangeText,
  placeholder,
  style,
  ...props
}) {
  const [focused, setFocused] = React.useState(false);
  const layout = useResponsiveLayout();

  return (
    <View style={[{ marginBottom: layout.fieldGap }, style]}>
      <Text
        style={{
          fontSize: layout.labelSize,
          fontWeight: "600",
          color: Brand.inkSoft,
          marginBottom: layout.rs(8),
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Brand.inkFaint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: layout.inputHeight,
          borderWidth: 1,
          borderColor: focused ? Brand.ink : Brand.line,
          borderRadius: layout.radius,
          paddingHorizontal: layout.rs(16),
          fontSize: layout.bodySize,
          color: Brand.ink,
          backgroundColor: focused ? Brand.paper : Brand.paperSoft,
        }}
        {...props}
      />
    </View>
  );
}

export function OnboardingFieldRow({ children }) {
  const { stackFields, width } = useResponsiveLayout();

  if (stackFields) {
    return <View style={{ width: "100%" }}>{children}</View>;
  }

  return (
    <View
      style={{
        flexDirection: "row",
        width: "100%",
        maxWidth: width,
      }}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        const isLast = index === React.Children.count(children) - 1;
        return React.cloneElement(child, {
          style: [
            { flex: 1 },
            !isLast ? { marginRight: 12 } : null,
            child.props.style,
          ],
        });
      })}
    </View>
  );
}
