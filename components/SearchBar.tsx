import { Search, X } from "lucide-react-native";
import React from "react";
import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
    ViewStyle,
    TextStyle,
} from "react-native";
import { useResponsiveLayout } from "@/utils";

type SearchBarProps = {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    onClear?: () => void;
    containerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
} & Omit<TextInputProps, "value" | "onChangeText" | "style" | "placeholder">;

export function SearchBar({
    value,
    onChangeText,
    placeholder,
    onClear,
    containerStyle,
    inputStyle,
    placeholderTextColor = "#9CA3AF",
    ...textInputProps
}: SearchBarProps) {
    const responsive = useResponsiveLayout();

    const clear = () => {
        if (onClear) {
            onClear();
            return;
        }
        onChangeText("");
    };

    return (
        <View style={[styles.container, containerStyle]}>
            <Search color="#6B7280" size={18} style={styles.icon} />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={placeholderTextColor}
                style={[
                    styles.input,
                    {
                        fontSize: responsive.isCompact ? 14 : 16,
                        paddingVertical: responsive.isCompact ? 8 : 10,
                    },
                    inputStyle,
                ]}
                {...textInputProps}
            />
            {value.length > 0 ? (
                <TouchableOpacity
                    onPress={clear}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                    <X size={16} color="#94A3B8" />
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
        color: "#111827",
    },
});
