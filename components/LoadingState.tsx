import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useResponsiveLayout } from "@/utils";

type LoadingStateProps = {
  message?: string;
  size?: "small" | "large";
  color?: string;
};

export const LoadingState = ({ 
  message = "Loading...", 
  size = "large",
  color = "#ac3434" 
}: LoadingStateProps) => {
  const responsive = useResponsiveLayout();

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: responsive.horizontalPadding },
      ]}
    >
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={[styles.message, responsive.isCompact && styles.messageCompact]}>{message}</Text>}
    </View>
  );
};

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
  messageCompact: {
    fontSize: 13,
  },
});
