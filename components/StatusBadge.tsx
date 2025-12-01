import React from "react";
import { StyleSheet, Text, View } from "react-native";

type StatusBadgeProps = {
  status: string;
  variant?: "lab" | "payment";
};

const STATUS_COLORS = {
  lab: {
    pending: { bg: "#FEE2E2", text: "#991B1B" },
    processing: { bg: "#FEF3C7", text: "#92400E" },
    completed: { bg: "#DBEAFE", text: "#1E40AF" },
    released: { bg: "#D1FAE5", text: "#065F46" },
  },
  payment: {
    paid: { bg: "#D1FAE5", text: "#065F46" },
    pending: { bg: "#FEE2E2", text: "#991B1B" },
    partial: { bg: "#FEF3C7", text: "#92400E" },
  },
};

export const StatusBadge = ({ status, variant = "lab" }: StatusBadgeProps) => {
  const colors =
    STATUS_COLORS[variant][status.toLowerCase() as keyof typeof STATUS_COLORS[typeof variant]] ||
    { bg: "#F3F4F6", text: "#6B7280" };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    textTransform: "capitalize",
    fontWeight: "600",
    fontSize: 12,
  },
});
