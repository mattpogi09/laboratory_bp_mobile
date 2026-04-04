import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LucideIcon } from "lucide-react-native";
import { useResponsiveLayout } from "@/utils";

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
}: EmptyStateProps) => {
  const responsive = useResponsiveLayout();

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: responsive.horizontalPadding,
          paddingVertical: responsive.isCompact ? 56 : 80,
        },
      ]}
    >
      <Icon color={iconColor} size={responsive.isCompact ? Math.max(32, iconSize - 6) : iconSize} />
      <Text style={[styles.title, responsive.isCompact && styles.titleCompact]}>{title}</Text>
      {message && <Text style={[styles.message, responsive.isCompact && styles.messageCompact]}>{message}</Text>}
    </View>
  );
};

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
  titleCompact: {
    fontSize: 16,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  messageCompact: {
    fontSize: 13,
  },
});
