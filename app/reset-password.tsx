import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
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
import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.91:8000/api';

export default function ResetPassword() {
    const params = useLocalSearchParams();
    const email = params.email as string || '';

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ 
        password: '', 
        password_confirmation: '' 
    });

    const handleResetPassword = async () => {
        if (!password || !passwordConfirmation) return;

        setIsLoading(true);
        setErrors({ password: '', password_confirmation: '' });

        try {
            const response = await axios.post(`${API_BASE_URL}/reset-password`, {
                token: 'verified',
                email: email,
                password: password,
                password_confirmation: passwordConfirmation,
            });

            Alert.alert(
                'Success',
                'Your password has been reset successfully. Please login with your new password.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace('/login')
                    }
                ]
            );
        } catch (error: any) {
            console.log('Reset Password Error:', error);
            
            const message = error?.response?.data?.message || 'Failed to reset password. Please try again.';
            const fieldErrors = error?.response?.data?.errors;

            if (fieldErrors) {
                setErrors({
                    password: fieldErrors.password?.[0] || '',
                    password_confirmation: fieldErrors.password_confirmation?.[0] || '',
                });
            } else {
                Alert.alert('Error', message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FEF2F2' }}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <Stack.Screen options={{ headerShown: false }} />
                
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <Image 
                            source={require('../assets/images/logo.png')} 
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandTitle}>BP Diagnostic</Text>
                        <Text style={styles.brandSubtitle}>Laboratory Management System</Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        <View style={styles.header}>
                            <View style={styles.iconContainer}>
                                <Lock color="#DC2626" size={24} />
                            </View>
                            <Text style={styles.title}>Reset Password</Text>
                            <Text style={styles.subtitle}>
                                Enter your new password below
                            </Text>
                        </View>

                        <View style={styles.form}>
                            {/* Email (Read-only) */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput
                                    style={[styles.input, styles.inputReadOnly]}
                                    value={email}
                                    editable={false}
                                />
                            </View>

                            {/* New Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password</Text>
                                <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Enter new password"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoFocus
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

                            {/* Confirm New Password */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm New Password</Text>
                                <View style={[styles.passwordContainer, errors.password_confirmation ? styles.inputError : null]}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        value={passwordConfirmation}
                                        onChangeText={setPasswordConfirmation}
                                        placeholder="Confirm new password"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                    />
                                    <TouchableOpacity 
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        {showConfirmPassword ? 
                                            <Eye color="#6B7280" size={20} /> : 
                                            <EyeOff color="#6B7280" size={20} />
                                        }
                                    </TouchableOpacity>
                                </View>
                                {errors.password_confirmation ? <Text style={styles.errorText}>{errors.password_confirmation}</Text> : null}
                            </View>

                            <TouchableOpacity 
                                style={[
                                    styles.button, 
                                    (isLoading || !password || !passwordConfirmation) && styles.buttonDisabled
                                ]} 
                                onPress={handleResetPassword}
                                disabled={isLoading || !password || !passwordConfirmation}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingRow}>
                                        <ActivityIndicator color="white" size="small" />
                                        <Text style={styles.buttonText}> Resetting Password...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.buttonText}>Reset Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            © {new Date().getFullYear()} BP Diagnostic Laboratory. All rights reserved.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 16,
    },
    logoSection: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 32,
    },
    logo: {
        width: 96,
        height: 96,
        marginBottom: 16,
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    brandSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#111827',
    },
    inputReadOnly: {
        backgroundColor: '#F9FAFB',
        color: '#111827',
    },
    inputError: {
        borderColor: '#DC2626',
        borderWidth: 1.5,
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
    errorText: {
        color: '#DC2626',
        fontSize: 12,
        marginTop: 4,
    },
    button: {
        backgroundColor: '#DC2626',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 4,
    },
    buttonDisabled: {
        backgroundColor: '#FCA5A5',
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footer: {
        marginTop: 32,
        marginBottom: 16,
    },
    footerText: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
});
