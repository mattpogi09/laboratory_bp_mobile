import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { X } from "lucide-react-native";

type DropdownModalProps<T> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly { label: string; value: T; icon?: React.ComponentType<any> }[];
  selectedValue: T;
  onSelect: (value: T) => void;
};

export function DropdownModal<T extends string>({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}: DropdownModalProps<T>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dropdownModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => onSelect(option.value)}
                style={[
                  styles.dropdownOption,
                  selectedValue === option.value && styles.dropdownOptionActive,
                ]}
              >
                <View style={styles.optionContent}>
                  {Icon && (
                    <Icon
                      color={selectedValue === option.value ? "#ac3434" : "#6B7280"}
                      size={20}
                    />
                  )}
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      selectedValue === option.value &&
                        styles.dropdownOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {selectedValue === option.value && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    paddingVertical: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  closeButton: { padding: 4 },
  dropdownOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownOptionActive: { backgroundColor: "#FEF2F2" },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dropdownOptionText: { fontSize: 15, color: "#374151", fontWeight: "500" },
  dropdownOptionTextActive: { color: "#ac3434", fontWeight: "600" },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ac3434",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
