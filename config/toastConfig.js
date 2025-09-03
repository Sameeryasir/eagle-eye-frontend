import React from "react";
import { View, Text } from "react-native";

const toastConfig = {
  success: ({ text1, text2 }) => (
    <View
      style={{
        width: "90%",
        backgroundColor: "#4CAF50", // green
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>
        {text1}
      </Text>
      {text2 ? (
        <Text style={{ fontSize: 14, color: "#fff", marginTop: 4 }}>
          {text2}
        </Text>
      ) : null}
    </View>
  ),

  error: ({ text1, text2 }) => (
    <View
      style={{
        width: "90%",
        backgroundColor: "#F44336", // red
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>
  {text1}
      </Text>
      {text2 ? (
        <Text
          style={{
            fontSize: 14,
            color: "#fff",
            marginTop: 4,
            flexWrap: "wrap", // allows wrapping long messages
          }}
        >
          {text2}
        </Text>
      ) : null}
    </View>
  ),

  info: ({ text1, text2 }) => (
    <View
      style={{
        width: "90%",
        backgroundColor: "#2196F3", // blue
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>
         {text1}
      </Text>
      {text2 ? (
        <Text style={{ fontSize: 14, color: "#fff", marginTop: 4 }}>
          {text2}
        </Text>
      ) : null}
    </View>
  ),
};

export default toastConfig;


