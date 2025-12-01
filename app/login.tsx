import Checkbox from 'expo-checkbox';
import { Stack, router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
    // State Management
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const { login } = useAuth();
    
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({ username: '', password: '' });

    // Validation
    const isFormValid = username.trim() !== '' && password.trim() !== '';

    // Handle Login Logic
    const handleLogin = async () => {
        if (!isFormValid) return;

        setIsLoading(true);
        setErrors({ username: '', password: '' });

        try {
            await login({ username, password, remember });
            router.replace('/(drawer)');
        } catch (error: any) {
            console.log("Login Error:", error);

            const message =
                error?.response?.data?.message ||
                'Unable to log in. Please double-check your credentials.';

            Alert.alert("Login Failed", message);

            const fieldErrors = error?.response?.data?.errors;
            if (fieldErrors) {
                setErrors({
                    username: fieldErrors.username?.[0] || '',
                    password: fieldErrors.password?.[0] || '',
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                {/* Hide the default header */}
                <Stack.Screen options={{ headerShown: false }} />
                
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.glassPanel}>
                        
                        {/* LOGO SECTION */}
                        <View style={styles.header}>
                            <Image 
                                source={require('../assets/images/logo.png')} 
                                style={styles.logo}
                                resizeMode="contain"
                            />
                            <Text style={styles.brandTitle}>BP Diagnostic</Text>
                        </View>

                        {/* STATUS MESSAGE (Like your web version) */}
                        {/* You can add a state for 'status' if needed, similar to errors */}

                        {/* FORM SECTION */}
                        <View style={styles.form}>
                            
                            {/* Username Input */}
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
                                {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
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
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        {showPassword ? 
                                            <Eye color="#6B7280" size={20} /> : 
                                            <EyeOff color="#6B7280" size={20} />
                                        }
                                    </TouchableOpacity>
                                </View>
                                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                            </View>

                            {/* Remember Me & Forgot PW */}
                            <View style={styles.rowBetween}>
                                <View style={styles.checkboxContainer}>
                                    <Checkbox
                                        value={remember}
                                        onValueChange={setRemember}
                                        color={remember ? '#ac3434' : undefined}
                                        style={styles.checkbox}
                                    />
                                    <Text style={styles.rememberText}>Remember me</Text>
                                </View>

                                <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                                    <Text style={styles.forgotText}>Forgot password?</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Login Button */}
                            <TouchableOpacity 
                                style={[
                                    styles.button, 
                                    (!isFormValid || isLoading) && styles.buttonDisabled
                                ]} 
                                onPress={handleLogin}
                                disabled={!isFormValid || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingRow}>
                                        <ActivityIndicator color="white" size="small" />
                                        <Text style={styles.buttonText}> Logging in...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.buttonText}>LOGIN</Text>
                                )}
                            </TouchableOpacity>

                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// STYLES (Converted from your Tailwind/CSS)
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    glassPanel: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        paddingTop: 32,
        // Shadow Elevation
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        height: 64, 
        width: 64,
        marginBottom: 16,
    },
    brandTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: 'black',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        color: '#374151', 
        fontWeight: '500',
        fontSize: 14,
        marginBottom: 4,
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1, // slightly thinner than web usually looks better on mobile
        borderColor: '#D1D5DB', 
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#111827',
    },
    inputError: {
        borderColor: '#DC2626',
        borderWidth: 1.5,
    },
    errorText: {
        color: '#DC2626',
        fontSize: 12,
        marginTop: 4,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
    },
    passwordInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        color: '#111827',
    },
    eyeIcon: {
        padding: 10,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        borderRadius: 4,
        marginRight: 8,
        borderColor: '#D1D5DB',
    },
    rememberText: {
        fontSize: 14,
        color: '#374151',
    },
    forgotText: {
        fontSize: 14,
        color: '#ac3434',
    },
    button: {
        backgroundColor: '#ac3434',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#e57373', // Lighter red
        opacity: 0.8,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});