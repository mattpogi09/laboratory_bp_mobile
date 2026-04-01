import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SERVICE_CATEGORIES } from "@/types/services";

type ServiceFormData = {
    name: string;
    category: string;
    price: string;
    description: string;
};

type ServiceFormProps = {
    initialData?: ServiceFormData;
    categories?: readonly string[];
    onDataChange: (data: ServiceFormData) => void;
};

export const ServiceForm = ({
    initialData = { name: "", category: "", price: "", description: "" },
    categories = SERVICE_CATEGORIES,
    onDataChange,
}: ServiceFormProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Service Name *</Text>
                <TextInput
                    style={styles.formInput}
                    value={initialData.name}
                    onChangeText={(text) =>
                        onDataChange({ ...initialData, name: text })
                    }
                    placeholder="Enter service name"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category *</Text>
                <CategoryPicker
                    selectedValue={initialData.category}
                    onValueChange={(value) =>
                        onDataChange({ ...initialData, category: value })
                    }
                    categories={categories}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Price *</Text>
                <TextInput
                    style={styles.formInput}
                    value={initialData.price}
                    onChangeText={(text) =>
                        onDataChange({ ...initialData, price: text })
                    }
                    placeholder="Enter price"
                    keyboardType="decimal-pad"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (Optional)</Text>
                <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={initialData.description}
                    onChangeText={(text) =>
                        onDataChange({ ...initialData, description: text })
                    }
                    placeholder="Enter description"
                    multiline
                    numberOfLines={4}
                    maxLength={1000}
                />
                <Text
                    style={{
                        fontSize: 12,
                        color: "#9CA3AF",
                        textAlign: "right",
                        marginTop: 2,
                    }}
                >
                    {initialData.description.length}/1000
                </Text>
            </View>
        </View>
    );
};

type CategoryPickerProps = {
    selectedValue: string;
    onValueChange: (value: string) => void;
    categories: readonly string[];
};

// CategoryPicker placeholder - kept lightweight until full picker wiring is implemented
const CategoryPicker = ({
    selectedValue,
    onValueChange,
    categories,
}: CategoryPickerProps) => (
    <View style={styles.pickerContainer}>
        <Text style={styles.pickerText}>
            {selectedValue || "Select Category"}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    formInput: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: "#111827",
        backgroundColor: "#fff",
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: "#fff",
    },
    pickerText: {
        fontSize: 15,
        color: "#374151",
    },
});
