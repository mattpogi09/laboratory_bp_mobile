import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LucideIcon } from "lucide-react-native";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message?: string;
  iconSize?: number;
  iconColor?: string;
};

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  message,
  iconSize = 42,
  iconColor = "#D1D5DB"
}: EmptyStateProps) => (
  <View style={styles.container}>
    <Icon color={iconColor} size={iconSize} />
    <Text style={styles.title}>{title}</Text>
    {message && <Text style={styles.message}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
