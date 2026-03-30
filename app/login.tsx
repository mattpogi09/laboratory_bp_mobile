import * as LocalAuthentication from "expo-local-authentication";
import { Stack, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Eye, EyeOff, Lock } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SuccessDialog } from "@/components";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/app/services/api";

export default function Login() {
    const { login } = useAuth();

    // Biometric state
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [bioError, setBioError] = useState("");

    // Form state
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ username: "", password: "" });
    const [errorDialog, setErrorDialog] = useState({
        visible: false,
        title: "Login Failed",
        message: "",
    });

    // Form reveal animation
    const [formVisible, setFormVisible] = useState(false);
    const formAnim = useRef(new Animated.Value(0)).current;

    const isFormValid = username.trim() !== "" && password.trim() !== "";

    // Check biometric_enabled on mount
    useEffect(() => {
        SecureStore.getItemAsync("biometric_enabled").then((val) => {
            setBiometricEnabled(val === "true");
        });
    }, []);

    const revealForm = useCallback(() => {
        setFormVisible(true);
        Animated.timing(formAnim, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
        }).start();
    }, [formAnim]);

    const handleBiometricLogin = useCallback(async () => {
        setBioError("");
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Scan your fingerprint to login",
            cancelLabel: "Cancel",
            disableDeviceFallback: true,
        });

        if (result.success) {
            const token = await SecureStore.getItemAsync("auth_token");
            if (token) {
                api.defaults.headers.common["Authorization"] = "Bearer " + token;
                router.replace("/(drawer)");
            } else {
                await SecureStore.deleteItemAsync("biometric_enabled");
                setBiometricEnabled(false);
                setBioError(
                    "Session expired. Please use Manual Login and re-enable fingerprint in Settings"
                );
            }
        } else {
            setBioError("Fingerprint not recognized. Try again or use Manual Login");
        }
    }, []);

    const handleBiometricPress = useCallback(() => {
        if (biometricEnabled) {
            handleBiometricLogin();
        } else {
            Alert.alert("", "Please enable fingerprint login in Settings first");
        }
    }, [biometricEnabled, handleBiometricLogin]);

    const handleLogin = useCallback(async () => {
        if (!isFormValid) return;
        setIsLoading(true);
        setErrors({ username: "", password: "" });

        try {
            await login({ username, password });
            router.replace("/(drawer)");
        } catch (error: any) {
            const isNetworkError =
                !error?.response &&
                (error?.request ||
                    error?.code === "ECONNABORTED" ||
                    error?.message === "Network Error");

            setErrorDialog({
                visible: true,
                title: isNetworkError ? "No Internet Connection" : "Login Failed",
                message: isNetworkError
                    ? "No internet connection. Please check your network and try again."
                    : error?.response?.data?.message ??
                      "Unable to log in. Please double-check your credentials.",
            });

            const fieldErrors = error?.response?.data?.errors;
            if (fieldErrors) {
                setErrors({
                    username: fieldErrors.username?.[0] || "",
                    password: fieldErrors.password?.[0] || "",
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [isFormValid, login, username, password]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* TOP SECTION */}
                    <View style={styles.topSection}>
                        <Image
                            source={require("../assets/images/logo12.png")}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.greeting}>Good Day, Admin!</Text>
                        <Text style={styles.subtitle}>Laboratory Information System</Text>
                    </View>

                    {/* WHITE CARD */}
                    <View style={styles.card}>
                        {/* Biometric button */}
                        <TouchableOpacity
                            style={styles.cardBtn}
                            onPress={handleBiometricPress}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="fingerprint"
                                size={52}
                                color={biometricEnabled ? "#ac3434" : "#9CA3AF"}
                            />
                            <Text
                                style={[
                                    styles.cardBtnLabel,
                                    { color: biometricEnabled ? "#ac3434" : "#9CA3AF" },
                                    !biometricEnabled && { opacity: 0.5 },
                                ]}
                            >
                                {biometricEnabled ? "Biometric Login" : "Enable in Settings"}
                            </Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.divider} />

                        {/* Manual login button */}
                        <TouchableOpacity
                            style={styles.cardBtn}
                            onPress={revealForm}
                            activeOpacity={0.7}
                        >
                            <Lock size={52} color="#ac3434" />
                            <Text style={[styles.cardBtnLabel, { color: "#ac3434" }]}>
                                Manual Login
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bio error text */}
                    {bioError !== "" && (
                        <Text style={styles.bioError}>{bioError}</Text>
                    )}

                    {/* Animated form */}
                    {formVisible && (
                        <Animated.View
                            style={[
                                styles.formCard,
                                {
                                    opacity: formAnim,
                                    transform: [
                                        {
                                            translateY: formAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [20, 0],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            {/* Username */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Username</Text>
                                <TextInput
                                    style={[styles.input, errors.username ? styles.inputError : null]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Enter your Username"
                                    placeholderTextColor="#9CA3AF"
                                    autoCapitalize="none"
                                />
                                {errors.username ? (
                                    <Text style={styles.fieldError}>{errors.username}</Text>
                                ) : null}
                            </View>

                            {/* Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View
                                    style={[
                                        styles.passwordContainer,
                                        errors.password ? styles.inputError : null,
                                    ]}
                                >
                                    <TextInput
                                        style={styles.passwordInput}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Enter your Password"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword((v) => !v)}
                                        style={styles.eyeIcon}
                                    >
                                        {showPassword ? (
                                            <Eye color="#6B7280" size={20} />
                                        ) : (
                                            <EyeOff color="#6B7280" size={20} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                                {errors.password ? (
                                    <Text style={styles.fieldError}>{errors.password}</Text>
                                ) : null}
                            </View>

                            {/* Login button */}
                            <TouchableOpacity
                                style={[
                                    styles.loginBtn,
                                    (!isFormValid || isLoading) && styles.loginBtnDisabled,
                                ]}
                                onPress={handleLogin}
                                disabled={!isFormValid || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingRow}>
                                        <ActivityIndicator color="white" size="small" />
                                        <Text style={styles.loginBtnText}> Logging in...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.loginBtnText}>LOGIN</Text>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <SuccessDialog
                visible={errorDialog.visible}
                title={errorDialog.title}
                message={errorDialog.message}
                type="error"
                onClose={() =>
                    setErrorDialog({ visible: false, title: "Login Failed", message: "" })
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#ac3434" },
    scroll: { flexGrow: 1, paddingBottom: 40 },
    topSection: { alignItems: "center", paddingTop: 56, paddingBottom: 32 },
    logo: { width: 72, height: 72, marginBottom: 16 },
    greeting: {
        fontSize: 26,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#fff",
        opacity: 0.85,
    },
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 20,
        marginHorizontal: 24,
        padding: 8,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    cardBtn: {
        flex: 1,
        paddingVertical: 24,
        alignItems: "center",
        gap: 8,
    },
    cardBtnLabel: {
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
    },
    divider: {
        width: 1,
        backgroundColor: "#E5E7EB",
        height: "70%",
        alignSelf: "center",
    },
    bioError: {
        color: "#fff",
        fontSize: 13,
        textAlign: "center",
        marginTop: 12,
        marginHorizontal: 24,
    },
    formCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        marginHorizontal: 24,
        marginTop: 20,
        padding: 20,
        gap: 16,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    inputGroup: { gap: 6 },
    label: { color: "#374151", fontWeight: "500", fontSize: 14 },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: "#111827",
    },
    inputError: { borderColor: "#DC2626", borderWidth: 1.5 },
    fieldError: { color: "#DC2626", fontSize: 12, marginTop: 2 },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
    },
    passwordInput: { flex: 1, padding: 12, fontSize: 16, color: "#111827" },
    eyeIcon: { padding: 10 },
    loginBtn: {
        backgroundColor: "#ac3434",
        padding: 16,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 4,
    },
    loginBtnDisabled: { backgroundColor: "#e57373", opacity: 0.8 },
    loginBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    loadingRow: { flexDirection: "row", alignItems: "center" },
});
