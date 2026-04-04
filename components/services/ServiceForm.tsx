import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { SERVICE_CATEGORIES } from "@/types/services";
import { useResponsiveLayout } from "@/utils";

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
    const responsive = useResponsiveLayout();

    return (
        <View
            style={[
                styles.container,
                { gap: responsive.isCompact ? 12 : 16 },
            ]}
        >
            <View style={styles.formGroup}>
                <Text
                    style={[
                        styles.formLabel,
                        responsive.isCompact && styles.formLabelCompact,
                    ]}
                >
                    Service Name *
                </Text>
                <TextInput
                    style={[
                        styles.formInput,
                        responsive.isCompact && styles.formInputCompact,
                    ]}
                    value={initialData.name}
                    onChangeText={(text) =>
                        onDataChange({ ...initialData, name: text })
                    }
                    placeholder="Enter service name"
                />
            </View>

            <View style={styles.formGroup}>
                <Text
                    style={[
                        styles.formLabel,
                        responsive.isCompact && styles.formLabelCompact,
                    ]}
                >
                    Category *
                </Text>
                <CategoryPicker
                    selectedValue={initialData.category}
                    onValueChange={(value) =>
                        onDataChange({ ...initialData, category: value })
                    }
                    categories={categories}
                    isCompact={responsive.isCompact}
                />
            </View>

            <View style={styles.formGroup}>
                <Text
                    style={[
                        styles.formLabel,
                        responsive.isCompact && styles.formLabelCompact,
                    ]}
                >
                    Price *
                </Text>
                <TextInput
                    style={[
                        styles.formInput,
                        responsive.isCompact && styles.formInputCompact,
                    ]}
                    value={initialData.price}
                    onChangeText={(text) =>
                        onDataChange({ ...initialData, price: text })
                    }
                    placeholder="Enter price"
                    keyboardType="decimal-pad"
                />
            </View>

            <View style={styles.formGroup}>
                <Text
                    style={[
                        styles.formLabel,
                        responsive.isCompact && styles.formLabelCompact,
                    ]}
                >
                    Description (Optional)
                </Text>
                <TextInput
                    style={[
                        styles.formInput,
                        styles.textArea,
                        responsive.isCompact && styles.formInputCompact,
                    ]}
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
                        fontSize: responsive.isCompact ? 11 : 12,
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
    isCompact?: boolean;
};

// CategoryPicker placeholder - kept lightweight until full picker wiring is implemented
const CategoryPicker = ({
    selectedValue,
    onValueChange,
    categories,
    isCompact = false,
}: CategoryPickerProps) => (
    <View style={[styles.pickerContainer, isCompact && styles.pickerCompact]}>
        <Text style={[styles.pickerText, isCompact && styles.pickerTextCompact]}>
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
    formLabelCompact: {
        fontSize: 13,
        marginBottom: 6,
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
    formInputCompact: {
        fontSize: 14,
        paddingVertical: 8,
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
    pickerCompact: {
        paddingVertical: 10,
    },
    pickerText: {
        fontSize: 15,
        color: "#374151",
    },
    pickerTextCompact: {
        fontSize: 14,
    },
});
