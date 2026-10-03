// @ts-nocheck
import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Brand } from "../../constants/brandColors";
import { useResponsiveLayout } from "../../constants/responsiveLayout";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_PHONE_COUNTRY,
} from "../../constants/countryDialCodes";

export function ProfileIdCardArt({ size = 88 }) {
  const cardW = size;
  const cardH = size * 0.72;
  return (
    <View
      style={{
        width: size + 12,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size * 0.95,
          height: size * 0.95,
          borderRadius: size,
          backgroundColor: "rgba(147, 197, 253, 0.35)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 2,
          right: 8,
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: "#60A5FA",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 16,
          right: 0,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#93C5FD",
        }}
      />
      <View
        style={{
          width: cardW,
          height: cardH,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          paddingHorizontal: 10,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          shadowColor: "#93C5FD",
          shadowOpacity: 0.45,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <View
          style={{
            width: cardH * 0.52,
            height: cardH * 0.52,
            borderRadius: 10,
            backgroundColor: "#EEF2FF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
            overflow: "hidden",
          }}
        >
          <Ionicons name="person" size={cardH * 0.34} color="#1F2937" />
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <View
            style={{
              height: 5,
              width: "90%",
              borderRadius: 3,
              backgroundColor: "#9CA3AF",
              marginBottom: 6,
            }}
          />
          <View
            style={{
              height: 4,
              width: "68%",
              borderRadius: 3,
              backgroundColor: "#D1D5DB",
              marginBottom: 5,
            }}
          />
          <View
            style={{
              height: 4,
              width: "52%",
              borderRadius: 3,
              backgroundColor: "#E5E7EB",
            }}
          />
        </View>
      </View>
    </View>
  );
}

export function CompanyBuildingArt({ size = 88 }) {
  const tile = size * 0.62;
  return (
    <View
      style={{
        width: size + 8,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size * 0.95,
          height: size * 0.95,
          borderRadius: size,
          backgroundColor: "rgba(167, 139, 250, 0.22)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 6,
          right: 4,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#60A5FA",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 18,
          right: -2,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#93C5FD",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 18,
          left: 2,
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: "#A78BFA",
          opacity: 0.7,
        }}
      />
      <View
        style={{
          width: tile,
          height: tile,
          borderRadius: 16,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#A78BFA",
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <Ionicons name="business" size={tile * 0.42} color="#1F2937" />
      </View>
    </View>
  );
}

export function OnboardingLayout({
  step,
  totalSteps = 2,
  title,
  subtitle,
  children,
  onBack,
  showBack = true,
  showStepCaption = true,
  headerAside = null,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  showPrimaryArrow = false,
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
    sectionGap,
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
        {(showBack || showStepCaption) && (
          <View
            style={{
              paddingTop: 8,
              paddingHorizontal: Math.max(horizontalPad - 12, 8),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {showBack && onBack ? (
              <Pressable
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={({ pressed }) => ({
                  width: hitSize,
                  height: hitSize,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={iconSize} color={Brand.ink} />
              </Pressable>
            ) : (
              <View style={{ width: hitSize, height: hitSize }} />
            )}
            {showStepCaption ? (
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
            ) : (
              <View style={{ width: hitSize }} />
            )}
            <View style={{ width: hitSize }} />
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: horizontalPad,
            paddingTop:
              showBack || showStepCaption
                ? isCompactHeight
                  ? 8
                  : 12
                : Math.max(insets.top, 12),
            paddingBottom: layout.rs(16),
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
                    height: layout.rs(4),
                    borderRadius: 2,
                    marginRight: i < totalSteps - 1 ? layout.rs(6) : 0,
                    backgroundColor: i < step ? Brand.ink : Brand.line,
                  }}
                />
              ))}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: sectionGap,
              }}
            >
              <View style={{ flex: 1, paddingRight: headerAside ? 8 : 0 }}>
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
                    height: 3,
                    backgroundColor: Brand.ink,
                    marginBottom: layout.rs(14),
                    borderRadius: 2,
                  }}
                />
                {!!subtitle && (
                  <Text
                    style={{
                      fontSize: subtitleSize,
                      color: Brand.inkMuted,
                      lineHeight: subtitleSize * 1.45,
                      letterSpacing: 0.15,
                      paddingRight: 4,
                    }}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
              {headerAside}
            </View>

            {children}
          </View>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: horizontalPad,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: "#FFFFFF",
          }}
        >
          <View
            style={{
              width: contentWidth,
              maxWidth: "100%",
              alignSelf: "center",
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={primaryLabel || "Continue"}
              activeOpacity={0.85}
              disabled={!!primaryDisabled || !!primaryLoading}
              onPress={onPrimary}
            >
              <View
                style={{
                  width: "100%",
                  height: 56,
                  borderRadius: 14,
                  backgroundColor:
                    primaryDisabled || primaryLoading ? "#D0CCCC" : "#231f20",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
              >
                {primaryLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: buttonTextSize || 16,
                      fontWeight: "600",
                      letterSpacing: 0.3,
                    }}
                  >
                    {primaryLabel || "Continue"}
                    {showPrimaryArrow ? "  →" : ""}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {secondary}
          </View>
        </View>
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
  required = false,
  leftIcon = null,
  iconBoxed = false,
  ...props
}) {
  const [focused, setFocused] = React.useState(false);
  const layout = useResponsiveLayout();
  const boxSize = layout.rs(28);

  return (
    <View style={[{ marginBottom: layout.fieldGap }, style]}>
      <Text
        style={{
          fontSize: layout.labelSize,
          fontWeight: "600",
          color: Brand.inkFaint,
          marginBottom: layout.rs(8),
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
        {required ? (
          <Text style={{ color: "#EF4444" }}> *</Text>
        ) : null}
      </Text>
      <View
        style={{
          height: layout.inputHeight,
          borderRadius: layout.rs(12),
          backgroundColor: Brand.paperSoft,
          borderWidth: 1,
          borderColor: focused ? Brand.ink : Brand.line,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: layout.rs(12),
        }}
      >
        {leftIcon ? (
          iconBoxed ? (
            <View
              style={{
                width: boxSize,
                height: boxSize,
                borderRadius: layout.rs(8),
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: Brand.line,
                alignItems: "center",
                justifyContent: "center",
                marginRight: layout.rs(10),
              }}
            >
              <Ionicons
                name={leftIcon}
                size={layout.rs(15)}
                color={Brand.inkMuted}
              />
            </View>
          ) : (
            <Ionicons
              name={leftIcon}
              size={layout.rs(18)}
              color={Brand.inkFaint}
              style={{ marginRight: layout.rs(10) }}
            />
          )
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Brand.inkFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            height: "100%",
            fontSize: layout.bodySize,
            color: Brand.ink,
            paddingVertical: 0,
          }}
          {...props}
        />
      </View>
    </View>
  );
}

export function OnboardingCountryField({
  label = "Country",
  value = "USA",
  onChange,
  style,
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const layout = useResponsiveLayout();

  const countries = React.useMemo(
    () =>
      COUNTRY_DIAL_CODES.map((c) => ({
        ...c,
        code:
          c.iso === "US"
            ? "USA"
            : c.iso === "GB"
              ? "UK"
              : c.iso,
      })),
    []
  );

  const selected =
    countries.find((c) => c.code === value || c.iso === value) ||
    countries.find((c) => c.iso === "US") ||
    countries[0];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [countries, query]);

  return (
    <View style={[{ marginBottom: layout.fieldGap }, style]}>
      <Text
        style={{
          fontSize: layout.labelSize,
          fontWeight: "600",
          color: Brand.inkFaint,
          marginBottom: layout.rs(8),
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          setQuery("");
          setPickerOpen(true);
        }}
        style={{
          height: layout.inputHeight,
          borderRadius: layout.rs(12),
          backgroundColor: Brand.paperSoft,
          borderWidth: 1,
          borderColor: Brand.line,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: layout.rs(12),
        }}
      >
        <Text style={{ fontSize: layout.rs(18), marginRight: 8 }}>
          {selected.flag}
        </Text>
        <Text
          style={{
            flex: 1,
            fontSize: layout.bodySize,
            color: Brand.ink,
            fontWeight: "500",
          }}
          numberOfLines={1}
        >
          {selected.code}
        </Text>
        <Ionicons name="chevron-down" size={16} color={Brand.inkFaint} />
      </TouchableOpacity>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Brand.paper }}>
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: Brand.line,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 18,
                fontWeight: "700",
                color: Brand.ink,
              }}
            >
              Select country
            </Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)}>
              <Ionicons name="close" size={24} color={Brand.ink} />
            </TouchableOpacity>
          </View>

          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              marginBottom: 8,
              height: 44,
              borderRadius: 12,
              backgroundColor: Brand.paperSoft,
              borderWidth: 1,
              borderColor: Brand.line,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
            }}
          >
            <Ionicons name="search" size={18} color={Brand.inkFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country"
              placeholderTextColor={Brand.inkFaint}
              autoFocus
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 16,
                color: Brand.ink,
                paddingVertical: 0,
              }}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.iso}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item.code === selected.code;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onChange?.(item.code);
                    setPickerOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: active ? Brand.paperSoft : Brand.paper,
                    borderBottomWidth: 1,
                    borderBottomColor: Brand.line,
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>
                    {item.flag}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: active ? "700" : "500",
                      color: Brand.ink,
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: Brand.inkMuted,
                    }}
                  >
                    {item.code}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

export function OnboardingPhoneField({
  label = "Phone (optional)",
  value,
  onChangeText,
  placeholder = "Phone number",
  style,
  country = DEFAULT_PHONE_COUNTRY,
  onCountryChange,
}) {
  const [focused, setFocused] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const layout = useResponsiveLayout();
  const selected = country || DEFAULT_PHONE_COUNTRY;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_DIAL_CODES;
    return COUNTRY_DIAL_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={[{ marginBottom: layout.fieldGap }, style]}>
      <Text
        style={{
          fontSize: layout.labelSize,
          fontWeight: "600",
          color: Brand.inkFaint,
          marginBottom: layout.rs(8),
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          height: layout.inputHeight,
          borderRadius: layout.rs(12),
          backgroundColor: Brand.paperSoft,
          borderWidth: 1,
          borderColor: focused ? Brand.ink : Brand.line,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: layout.rs(12),
        }}
      >
        <Ionicons
          name="call-outline"
          size={layout.rs(18)}
          color={Brand.inkFaint}
        />
        <View
          style={{
            width: 1,
            height: layout.rs(22),
            backgroundColor: Brand.lineStrong,
            marginHorizontal: layout.rs(10),
          }}
        />
        <TouchableOpacity
          onPress={() => {
            setQuery("");
            setPickerOpen(true);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Select country code"
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginRight: layout.rs(8),
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: layout.rs(16), marginRight: 4 }}>
            {selected.flag}
          </Text>
          <Text
            style={{
              fontSize: layout.rs(13),
              color: Brand.ink,
              fontWeight: "600",
              marginRight: 2,
            }}
          >
            {selected.dial}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Brand.inkFaint} />
        </TouchableOpacity>
        <View
          style={{
            width: 1,
            height: layout.rs(22),
            backgroundColor: Brand.lineStrong,
            marginRight: layout.rs(10),
          }}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Brand.inkFaint}
          keyboardType="phone-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            height: "100%",
            fontSize: layout.bodySize,
            color: Brand.ink,
            paddingVertical: 0,
          }}
        />
      </View>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: Brand.paper }}>
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: Brand.line,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 18,
                fontWeight: "700",
                color: Brand.ink,
              }}
            >
              Select country
            </Text>
            <TouchableOpacity
              onPress={() => setPickerOpen(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={Brand.ink} />
            </TouchableOpacity>
          </View>

          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              marginBottom: 8,
              height: 44,
              borderRadius: 12,
              backgroundColor: Brand.paperSoft,
              borderWidth: 1,
              borderColor: Brand.line,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
            }}
          >
            <Ionicons name="search" size={18} color={Brand.inkFaint} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or code"
              placeholderTextColor={Brand.inkFaint}
              autoFocus
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 16,
                color: Brand.ink,
                paddingVertical: 0,
              }}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.iso}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => {
              const active = item.iso === selected.iso;
              return (
                <TouchableOpacity
                  onPress={() => {
                    onCountryChange?.(item);
                    setPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: active ? Brand.paperSoft : Brand.paper,
                    borderBottomWidth: 1,
                    borderBottomColor: Brand.line,
                  }}
                >
                  <Text style={{ fontSize: 22, marginRight: 12 }}>
                    {item.flag}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: active ? "700" : "500",
                        color: Brand.ink,
                      }}
                    >
                      {item.name}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: Brand.inkMuted,
                    }}
                  >
                    {item.dial}
                  </Text>
                  {active ? (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={Brand.ink}
                      style={{ marginLeft: 10 }}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  color: Brand.inkFaint,
                  marginTop: 40,
                  fontSize: 15,
                }}
              >
                No countries match your search
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
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
