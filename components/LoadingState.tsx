import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

type LoadingStateProps = {
  message?: string;
  size?: "small" | "large";
  color?: string;
};

export const LoadingState = ({ 
  message = "Loading...", 
  size = "large",
  color = "#ac3434" 
}: LoadingStateProps) => (
  <View style={styles.container}>
    <ActivityIndicator size={size} color={color} />
    {message && <Text style={styles.message}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  message: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
});
