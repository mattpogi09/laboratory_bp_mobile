import * as LocalAuthentication from "expo-local-authentication";
import { Stack, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Eye, EyeOff } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
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
import { useFocusEffect } from "@react-navigation/native";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SuccessDialog } from "@/components";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
    const { login, loginWithToken } = useAuth();

    // ── ALL REFS DECLARED FIRST — never undefined when used below ──
    const isBioRunning = useRef(false);
    const isNavigating = useRef(false);
    const hasAutoTriggered = useRef(false);
    const passwordInputRef = useRef<TextInput>(null);
    const panelOpacity = useRef(new Animated.Value(0)).current;
    const panelTranslateY = useRef(new Animated.Value(14)).current;
    const logoScale = useRef(new Animated.Value(0.96)).current;

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

    const isFormValid = username.trim() !== "" && password.trim() !== "";

    // ── Core biometric handler — refs are guaranteed defined here ──
    const handleBiometricLogin = useCallback(async () => {
        if (isBioRunning.current || isNavigating.current) return;
        isBioRunning.current = true;
        setBioError("");

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: "Scan your fingerprint to login",
                cancelLabel: "Cancel",
                disableDeviceFallback: true,
            });

            if (result.success) {
                const token = await SecureStore.getItemAsync("auth_token");
                if (token) {
                    try {
                        isNavigating.current = true;
                        await loginWithToken(token);
                        router.replace("/(drawer)");
                    } catch {
                        isNavigating.current = false;
                        isBioRunning.current = false;
                        await SecureStore.deleteItemAsync("biometric_enabled");
                        await SecureStore.deleteItemAsync("auth_token");
                        setBiometricEnabled(false);
                        setBioError(
                            "Session expired. Please use Manual Login and re-enable fingerprint in Settings",
                        );
                    }
                } else {
                    isBioRunning.current = false;
                    await SecureStore.deleteItemAsync("biometric_enabled");
                    setBiometricEnabled(false);
                    setBioError(
                        "Session expired. Please use Manual Login and re-enable fingerprint in Settings",
                    );
                }
            } else {
                isBioRunning.current = false;
                setBioError(
                    "Fingerprint not recognized. Try again or use Manual Login",
                );
            }
        } catch {
            isBioRunning.current = false;
            setBioError(
                "Fingerprint not recognized. Try again or use Manual Login",
            );
        }
    }, [loginWithToken]);

    // ── Read biometric_enabled on mount ──
    useEffect(() => {
        SecureStore.getItemAsync("biometric_enabled").then((val) => {
            setBiometricEnabled(val === "true");
        });
    }, []);

    // Subtle entrance motion for a smoother first impression.
    useEffect(() => {
        Animated.parallel([
            Animated.timing(panelOpacity, {
                toValue: 1,
                duration: 260,
                useNativeDriver: true,
            }),
            Animated.timing(panelTranslateY, {
                toValue: 0,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, [logoScale, panelOpacity, panelTranslateY]);

    // ── Auto-trigger ONCE using useFocusEffect ──
    // useFocusEffect only fires when screen is actually focused
    // hasAutoTriggered ref ensures it never fires more than once
    useFocusEffect(
        useCallback(() => {
            if (hasAutoTriggered.current) return;
            SecureStore.getItemAsync("biometric_enabled").then((val) => {
                if (val === "true") {
                    hasAutoTriggered.current = true;
                    setBiometricEnabled(true);
                    handleBiometricLogin();
                }
            });
        }, [handleBiometricLogin]),
    );

    const handleBiometricPress = useCallback(() => {
        if (biometricEnabled) {
            handleBiometricLogin();
        } else {
            setErrorDialog({
                visible: true,
                title: "Fingerprint Login Off",
                message: "Please enable fingerprint login in Settings first.",
            });
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
                title: isNetworkError
                    ? "No Internet Connection"
                    : "Login Failed",
                message: isNetworkError
                    ? "No internet connection. Please check your network and try again."
                    : (error?.response?.data?.message ??
                      "Unable to log in. Please double-check your credentials."),
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

            <View style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.manualScroll}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View
                            style={[
                                styles.glassPanel,
                                {
                                    opacity: panelOpacity,
                                    transform: [
                                        { translateY: panelTranslateY },
                                    ],
                                },
                            ]}
                        >
                            <View style={styles.panelHeader}>
                                <Animated.Image
                                    source={require("../assets/images/logo12.png")}
                                    style={[
                                        styles.panelLogo,
                                        { transform: [{ scale: logoScale }] },
                                    ]}
                                    resizeMode="contain"
                                />
                                <Text style={styles.panelTitle}>
                                    Welcome Back
                                </Text>
                                <Text style={styles.panelSubtitle}>
                                    Sign in to your account
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.quickBioBtn,
                                    !biometricEnabled &&
                                        styles.quickBioBtnDisabled,
                                ]}
                                onPress={handleBiometricPress}
                                activeOpacity={0.75}
                            >
                                <MaterialCommunityIcons
                                    name="fingerprint"
                                    size={22}
                                    color={
                                        biometricEnabled ? "#ac3434" : "#9CA3AF"
                                    }
                                />
                                <Text
                                    style={[
                                        styles.quickBioBtnText,
                                        !biometricEnabled &&
                                            styles.quickBioBtnTextDisabled,
                                    ]}
                                >
                                    {biometricEnabled
                                        ? "Use Fingerprint"
                                        : "Fingerprint is off (enable in Settings)"}
                                </Text>
                            </TouchableOpacity>

                            {bioError !== "" && (
                                <View style={styles.bioInlineErrorRow}>
                                    <Text style={styles.bioInlineErrorText}>
                                        {bioError}
                                    </Text>
                                    {biometricEnabled && (
                                        <TouchableOpacity
                                            style={styles.bioRetryBtn}
                                            onPress={handleBiometricLogin}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={styles.bioRetryText}>
                                                Retry
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Username</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            errors.username
                                                ? styles.inputError
                                                : null,
                                        ]}
                                        value={username}
                                        onChangeText={setUsername}
                                        placeholder="Enter your Username"
                                        placeholderTextColor="#9CA3AF"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="next"
                                        textContentType="username"
                                        onSubmitEditing={() =>
                                            passwordInputRef.current?.focus()
                                        }
                                        blurOnSubmit={false}
                                    />
                                    {errors.username ? (
                                        <Text style={styles.fieldError}>
                                            {errors.username}
                                        </Text>
                                    ) : null}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Password</Text>
                                    <View
                                        style={[
                                            styles.passwordContainer,
                                            errors.password
                                                ? styles.inputError
                                                : null,
                                        ]}
                                    >
                                        <TextInput
                                            ref={passwordInputRef}
                                            style={styles.passwordInput}
                                            value={password}
                                            onChangeText={setPassword}
                                            placeholder="Enter your Password"
                                            placeholderTextColor="#9CA3AF"
                                            secureTextEntry={!showPassword}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            textContentType="password"
                                            returnKeyType="done"
                                            onSubmitEditing={handleLogin}
                                        />
                                        <TouchableOpacity
                                            onPress={() =>
                                                setShowPassword((v) => !v)
                                            }
                                            style={styles.eyeIcon}
                                        >
                                            {showPassword ? (
                                                <Eye
                                                    color="#6B7280"
                                                    size={20}
                                                />
                                            ) : (
                                                <EyeOff
                                                    color="#6B7280"
                                                    size={20}
                                                />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    {errors.password ? (
                                        <Text style={styles.fieldError}>
                                            {errors.password}
                                        </Text>
                                    ) : null}
                                </View>

                                <View style={styles.rowEnd}>
                                    <TouchableOpacity
                                        onPress={() =>
                                            router.push("/forgot-password")
                                        }
                                    >
                                        <Text style={styles.forgotText}>
                                            Forgot password?
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.loginBtn,
                                        (!isFormValid || isLoading) &&
                                            styles.loginBtnDisabled,
                                    ]}
                                    onPress={handleLogin}
                                    disabled={!isFormValid || isLoading}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingRow}>
                                            <ActivityIndicator
                                                color="white"
                                                size="small"
                                            />
                                            <Text style={styles.loginBtnText}>
                                                {" "}
                                                Logging in...
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.loginBtnText}>
                                            Sign In
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            <SuccessDialog
                visible={errorDialog.visible}
                title={errorDialog.title}
                message={errorDialog.message}
                type="error"
                onClose={() =>
                    setErrorDialog({
                        visible: false,
                        title: "Login Failed",
                        message: "",
                    })
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F8F8F8" },
    container: { flex: 1 },
    manualScroll: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 40,
    },
    glassPanel: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 28,
        paddingTop: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    panelHeader: { alignItems: "center", marginBottom: 28 },
    panelLogo: { width: 90, height: 90, marginBottom: 12 },
    panelTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    panelSubtitle: { fontSize: 13, color: "#6B7280" },
    quickBioBtn: {
        marginBottom: 14,
        borderWidth: 1,
        borderColor: "#F0B4B4",
        backgroundColor: "#FFF5F5",
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    quickBioBtnDisabled: {
        borderColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
    },
    quickBioBtnText: {
        color: "#ac3434",
        fontSize: 13,
        fontWeight: "700",
    },
    quickBioBtnTextDisabled: {
        color: "#6B7280",
        fontWeight: "600",
    },
    bioInlineErrorRow: {
        marginTop: -4,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    bioInlineErrorText: {
        flex: 1,
        color: "#ac3434",
        fontSize: 12,
        lineHeight: 16,
    },
    bioRetryBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: "#FEE2E2",
    },
    bioRetryText: {
        color: "#991B1B",
        fontSize: 12,
        fontWeight: "700",
    },
    form: { gap: 20 },
    inputGroup: { gap: 6 },
    label: { color: "#374151", fontWeight: "600", fontSize: 14 },
    input: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 10,
        padding: 14,
        fontSize: 15,
        color: "#111827",
    },
    inputError: { borderColor: "#DC2626", borderWidth: 1.5 },
    fieldError: { color: "#DC2626", fontSize: 12, marginTop: 2 },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 10,
    },
    passwordInput: { flex: 1, padding: 14, fontSize: 15, color: "#111827" },
    eyeIcon: { padding: 12 },
    rowEnd: { alignItems: "flex-end", marginTop: -8 },
    forgotText: { fontSize: 14, color: "#ac3434", fontWeight: "500" },
    loginBtn: {
        backgroundColor: "#ac3434",
        padding: 16,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 4,
    },
    loginBtnDisabled: { backgroundColor: "#ac3434", opacity: 0.5 },
    loginBtnText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
        letterSpacing: 0.5,
    },
    loadingRow: { flexDirection: "row", alignItems: "center" },
});
