import React from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { AlertTriangle, Info, X } from "lucide-react-native";
import { useResponsiveLayout } from "@/utils";

type ConfirmDialogProps = {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: "warning" | "info" | "danger";
    confirmColor?: string;
};

export default function ConfirmDialog({
    visible,
    title,
    message,
    confirmText = "CONFIRM",
    cancelText = "CANCEL",
    onConfirm,
    onCancel,
    type = "warning",
    confirmColor,
}: ConfirmDialogProps) {
    const responsive = useResponsiveLayout();

    const getIconColor = () => {
        switch (type) {
            case "danger":
                return "#DC2626";
            case "warning":
                return "#F59E0B";
            case "info":
                return "#3B82F6";
            default:
                return "#F59E0B";
        }
    };

    const getIcon = () => {
        const color = getIconColor();
        switch (type) {
            case "info":
                return <Info color={color} size={24} />;
            default:
                return <AlertTriangle color={color} size={24} />;
        }
    };

    const getConfirmButtonColor = () => {
        if (confirmColor) return confirmColor;
        switch (type) {
            case "danger":
                return "#DC2626";
            case "warning":
                return "#F59E0B";
            case "info":
                return "#3B82F6";
            default:
                return "#3B82F6";
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View
                style={[
                    styles.overlay,
                    { paddingHorizontal: responsive.horizontalPadding },
                ]}
            >
                <View
                    style={[
                        styles.dialog,
                        responsive.isTablet && styles.dialogTablet,
                    ]}
                >
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onCancel}
                    >
                        <X color="#9CA3AF" size={20} />
                    </TouchableOpacity>

                    <View style={styles.content}>
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: `${getIconColor()}15` },
                            ]}
                        >
                            {getIcon()}
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                styles.confirmButton,
                                {
                                    backgroundColor: getConfirmButtonColor(),
                                },
                            ]}
                            onPress={onConfirm}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.confirmText}>
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    dialog: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        width: "100%",
        maxWidth: 400,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    dialogTablet: {
        maxWidth: 460,
    },
    closeButton: {
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 1,
        padding: 4,
    },
    content: {
        padding: 24,
        paddingTop: 32,
        alignItems: "center",
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 8,
        textAlign: "center",
    },
    message: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 12,
        padding: 16,
        paddingTop: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#F3F4F6",
    },
    confirmButton: {
        backgroundColor: "#3B82F6",
    },
    cancelText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#4B5563",
    },
    confirmText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
