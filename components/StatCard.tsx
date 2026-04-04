import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useResponsiveLayout } from "@/utils";

type StatCardProps = {
  label: string;
  value: string;
  accent: string;
};

export const StatCard = ({ label, value, accent }: StatCardProps) => {
  const responsive = useResponsiveLayout();

  return (
    <View
      style={[
        styles.card,
        { borderLeftColor: accent },
        responsive.isCompact && styles.cardCompact,
      ]}
    >
      <Text style={[styles.label, responsive.isCompact && styles.labelCompact]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: accent }, responsive.isCompact && styles.valueCompact]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    minHeight: 80,
    justifyContent: "center",
  },
  cardCompact: {
    padding: 12,
    minHeight: 72,
  },
  label: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  labelCompact: {
    fontSize: 12,
    marginBottom: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
  },
  valueCompact: {
    fontSize: 20,
  },
});
