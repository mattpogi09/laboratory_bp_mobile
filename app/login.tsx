import * as LocalAuthentication from "expo-local-authentication";
import { Stack, router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Eye, EyeOff, Lock, ArrowLeft } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function Login() {
    const { login } = useAuth();

    // View: "selector" = two-button screen, "manual" = login form
    const [view, setView] = useState<"selector" | "manual">("selector");
    const slideAnim = useRef(new Animated.Value(0)).current;

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

    // Check biometric_enabled on mount, auto-trigger if enabled
    useEffect(() => {
        SecureStore.getItemAsync("biometric_enabled").then((val) => {
            if (val === "true") {
                setBiometricEnabled(true);
                handleBiometricLogin();
            }
        });
    }, []);

    const goToManual = useCallback(() => {
        setView("manual");
        Animated.timing(slideAnim, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
        }).start();
    }, [slideAnim]);

    const goToSelector = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
        }).start(() => setView("selector"));
    }, [slideAnim]);

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

    // Slide transforms
    const selectorTranslate = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -SCREEN_WIDTH],
    });
    const manualTranslate = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_WIDTH, 0],
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>

                {/* ── SELECTOR VIEW ── */}
                <Animated.View
                    style={[
                        styles.screen,
                        { transform: [{ translateX: selectorTranslate }] },
                    ]}
                    pointerEvents={view === "selector" ? "auto" : "none"}
                >
                    <ScrollView
                        contentContainerStyle={styles.selectorScroll}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Logo + greeting */}
                        <View style={styles.topSection}>
                            <Image
                                source={require("../assets/images/logo12.png")}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.greeting}>Good Day, Admin!</Text>
                            <Text style={styles.subtitle}>Laboratory Information System</Text>
                        </View>

                        {/* Two-button card */}
                        <View style={styles.card}>
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

                            <View style={styles.divider} />

                            <TouchableOpacity
                                style={styles.cardBtn}
                                onPress={goToManual}
                                activeOpacity={0.7}
                            >
                                <Lock size={52} color="#ac3434" />
                                <Text style={[styles.cardBtnLabel, { color: "#ac3434" }]}>
                                    Manual Login
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Bio error */}
                        {bioError !== "" && (
                            <Text style={styles.bioError}>{bioError}</Text>
                        )}
                    </ScrollView>
                </Animated.View>

                {/* ── MANUAL LOGIN VIEW ── */}
                <Animated.View
                    style={[
                        styles.screen,
                        { transform: [{ translateX: manualTranslate }] },
                    ]}
                    pointerEvents={view === "manual" ? "auto" : "none"}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1 }}
                    >
                        <ScrollView
                            contentContainerStyle={styles.manualScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Back button */}
                            <TouchableOpacity
                                style={styles.backBtn}
                                onPress={goToSelector}
                                activeOpacity={0.7}
                            >
                                <ArrowLeft size={20} color="#ac3434" />
                                <Text style={styles.backBtnText}>Back</Text>
                            </TouchableOpacity>

                            {/* Glass panel — matches web exactly */}
                            <View style={styles.glassPanel}>
                                {/* Logo */}
                                <View style={styles.panelHeader}>
                                    <Image
                                        source={require("../assets/images/logo12.png")}
                                        style={styles.panelLogo}
                                        resizeMode="contain"
                                    />
                                </View>

                                {/* Form */}
                                <View style={styles.form}>
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

                                    {/* Forgot password */}
                                    <View style={styles.rowEnd}>
                                        <TouchableOpacity onPress={() => router.push("/forgot-password")}>
                                            <Text style={styles.forgotText}>Forgot password?</Text>
                                        </TouchableOpacity>
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
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </Animated.View>

            </View>

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
    safeArea: { flex: 1, backgroundColor: "#F8F8F8" },
    container: { flex: 1, overflow: "hidden" },

    // Both screens sit side by side, absolutely positioned
    screen: {
        position: "absolute",
        width: SCREEN_WIDTH,
        height: "100%",
    },

    // Selector screen
    selectorScroll: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 40,
    },
    topSection: { alignItems: "center", marginBottom: 32 },
    logo: { width: 80, height: 80, marginBottom: 16 },
    greeting: { fontSize: 26, fontWeight: "700", color: "#111827", marginBottom: 4 },
    subtitle: { fontSize: 14, color: "#6B7280" },
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 8,
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    cardBtn: { flex: 1, paddingVertical: 24, alignItems: "center", gap: 8 },
    cardBtnLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
    divider: {
        width: 1,
        backgroundColor: "#E5E7EB",
        height: "70%",
        alignSelf: "center",
    },
    bioError: {
        color: "#ac3434",
        fontSize: 13,
        textAlign: "center",
        marginTop: 16,
    },

    // Manual login screen
    manualScroll: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 40,
    },
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 24,
        alignSelf: "flex-start",
    },
    backBtnText: { fontSize: 15, color: "#ac3434", fontWeight: "600" },
    glassPanel: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        paddingTop: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    panelHeader: { alignItems: "center", marginBottom: 32 },
    panelLogo: { width: 100, height: 100 },
    form: { gap: 20 },
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
    rowEnd: { alignItems: "flex-end", marginTop: -8 },
    forgotText: { fontSize: 14, color: "#ac3434" },
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
