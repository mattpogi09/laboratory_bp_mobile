import React from "react";
import { StyleSheet, Text, View } from "react-native";

type StatCardProps = {
  label: string;
  value: string;
  accent: string;
};

export const StatCard = ({ label, value, accent }: StatCardProps) => (
  <View style={[styles.card, { borderLeftColor: accent }]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, { color: accent }]}>{value}</Text>
  </View>
);

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
  label: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  value: {
    fontSize: 24,
    fontWeight: "700",
  },
});
