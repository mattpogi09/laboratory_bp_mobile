import React, { useEffect, useRef } from "react";
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from "react-native";
import {
    CheckCircle,
    AlertCircle,
    Info,
    AlertTriangle,
    X,
} from "lucide-react-native";
import { useResponsiveLayout } from "@/utils";

type SuccessDialogProps = {
    visible: boolean;
    title: string;
    message: string;
    buttonText?: string;
    onClose: () => void;
    type?: "success" | "error" | "info" | "warning";
    autoClose?: boolean;
    autoCloseDelay?: number;
};

export default function SuccessDialog({
    visible,
    title,
    message,
    buttonText = "OK",
    onClose,
    type = "success",
    autoClose = false,
    autoCloseDelay = 2000,
}: SuccessDialogProps) {
    const responsive = useResponsiveLayout();
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();

            if (autoClose) {
                const timer = setTimeout(() => {
                    onClose();
                }, autoCloseDelay);
                return () => clearTimeout(timer);
            }
        } else {
            scaleAnim.setValue(0);
        }
    }, [visible, autoClose, autoCloseDelay]);

    const getIconAndColor = () => {
        switch (type) {
            case "success":
                return {
                    icon: <CheckCircle color="#10B981" size={32} />,
                    color: "#10B981",
                    bgColor: "#ECFDF5",
                };
            case "error":
                return {
                    icon: <AlertCircle color="#EF4444" size={32} />,
                    color: "#EF4444",
                    bgColor: "#FEF2F2",
                };
            case "warning":
                return {
                    icon: <AlertTriangle color="#F59E0B" size={32} />,
                    color: "#F59E0B",
                    bgColor: "#FFFBEB",
                };
            case "info":
                return {
                    icon: <Info color="#3B82F6" size={32} />,
                    color: "#3B82F6",
                    bgColor: "#EFF6FF",
                };
            default:
                return {
                    icon: <CheckCircle color="#10B981" size={32} />,
                    color: "#10B981",
                    bgColor: "#ECFDF5",
                };
        }
    };

    const { icon, color, bgColor } = getIconAndColor();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View
                style={[
                    styles.overlay,
                    { paddingHorizontal: responsive.horizontalPadding },
                ]}
            >
                <Animated.View
                    style={[
                        styles.dialog,
                        responsive.isTablet && styles.dialogTablet,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {!autoClose && (
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <X color="#9CA3AF" size={20} />
                        </TouchableOpacity>
                    )}

                    <View style={styles.content}>
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: bgColor },
                            ]}
                        >
                            {icon}
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>

                    {!autoClose && (
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    { backgroundColor: color },
                                ]}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.buttonText}>
                                    {buttonText}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
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
        width: 64,
        height: 64,
        borderRadius: 32,
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
        padding: 16,
        paddingTop: 8,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    buttonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
