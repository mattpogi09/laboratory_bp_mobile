import { Stack, router } from 'expo-router';
import { Mail, KeyRound, CheckCircle, ArrowLeft } from 'lucide-react-native';
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

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1 = Email entry, 2 = OTP verification
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ email: '', otp: '' });
    const [status, setStatus] = useState('');

    // Handle Email Submission (Step 1)
    const handleSendOtp = async () => {
        if (!email.trim()) return;

        setIsLoading(true);
        setErrors({ email: '', otp: '' });
        setStatus('');

        try {
            const response = await axios.post(`${API_BASE_URL}/forgot-password`, {
                email: email.trim()
            });

            setStatus('We have sent a 6-digit OTP to your email address. Please check your inbox.');
            setStep(2);
        } catch (error: any) {
            console.log('Send OTP Error:', error);
            
            const message = error?.response?.data?.message || 'Failed to send OTP. Please try again.';
            const fieldErrors = error?.response?.data?.errors;

            if (fieldErrors?.email) {
                setErrors({ ...errors, email: fieldErrors.email[0] });
            } else {
                Alert.alert('Error', message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP Verification (Step 2)
    const handleVerifyOtp = async () => {
        if (otp.length !== 6) return;

        setIsLoading(true);
        setErrors({ email: '', otp: '' });
        setStatus('');

        try {
            const response = await axios.post(`${API_BASE_URL}/verify-otp`, {
                email: email.trim(),
                otp: otp.trim()
            });

            // Navigate to reset password screen with email
            router.push({
                pathname: '/reset-password' as any,
                params: { email: email.trim() }
            } as any);
        } catch (error: any) {
            console.log('Verify OTP Error:', error);
            
            const message = error?.response?.data?.message || 'Failed to verify OTP. Please try again.';
            const fieldErrors = error?.response?.data?.errors;

            if (fieldErrors?.otp) {
                setErrors({ ...errors, otp: fieldErrors.otp[0] });
            } else {
                Alert.alert('Error', message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP Input
    const handleOtpInput = (text: string) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 6);
        setOtp(cleaned);
    };

    // Resend OTP
    const handleResendOtp = async () => {
        setOtp('');
        await handleSendOtp();
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
                        {/* Step Indicator */}
                        <View style={styles.stepIndicator}>
                            <View style={styles.stepRow}>
                                <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
                                    {step > 1 ? (
                                        <CheckCircle color="white" size={20} />
                                    ) : (
                                        <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
                                    )}
                                </View>
                                <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                                <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
                                    <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
                                </View>
                            </View>
                        </View>

                        {/* Step 1: Email Entry */}
                        {step === 1 && (
                            <>
                                <View style={styles.header}>
                                    <View style={styles.iconContainer}>
                                        <Mail color="#DC2626" size={24} />
                                    </View>
                                    <Text style={styles.title}>Forgot Password?</Text>
                                    <Text style={styles.subtitle}>
                                        Enter your email address and we'll send you a 6-digit OTP code to reset your password.
                                    </Text>
                                </View>

                                {status ? (
                                    <View style={styles.successMessage}>
                                        <Text style={styles.successText}>{status}</Text>
                                    </View>
                                ) : null}

                                <View style={styles.form}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Email Address</Text>
                                        <TextInput
                                            style={[styles.input, errors.email ? styles.inputError : null]}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="Enter your email"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoFocus
                                        />
                                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                                    </View>

                                    <TouchableOpacity 
                                        style={[styles.button, isLoading && styles.buttonDisabled]} 
                                        onPress={handleSendOtp}
                                        disabled={isLoading || !email.trim()}
                                    >
                                        {isLoading ? (
                                            <View style={styles.loadingRow}>
                                                <ActivityIndicator color="white" size="small" />
                                                <Text style={styles.buttonText}> Sending OTP...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.buttonText}>Send OTP Code</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={styles.backButton}
                                        onPress={() => router.back()}
                                    >
                                        <ArrowLeft color="#6B7280" size={16} />
                                        <Text style={styles.backButtonText}>Back to Login</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* Step 2: OTP Verification */}
                        {step === 2 && (
                            <>
                                <View style={styles.header}>
                                    <View style={styles.iconContainer}>
                                        <KeyRound color="#DC2626" size={24} />
                                    </View>
                                    <Text style={styles.title}>Verify OTP Code</Text>
                                    <Text style={styles.subtitle}>
                                        We've sent a 6-digit code to{' '}
                                        <Text style={styles.emailBold}>{email}</Text>
                                    </Text>
                                </View>

                                {status ? (
                                    <View style={styles.successMessage}>
                                        <Text style={styles.successText}>{status}</Text>
                                    </View>
                                ) : null}

                                <View style={styles.form}>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, styles.labelCenter]}>Enter 6-Digit OTP</Text>
                                        <TextInput
                                            style={[styles.input, styles.otpInput, errors.otp ? styles.inputError : null]}
                                            value={otp}
                                            onChangeText={handleOtpInput}
                                            placeholder="000000"
                                            placeholderTextColor="#9CA3AF"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            autoFocus
                                        />
                                        {errors.otp ? <Text style={styles.errorText}>{errors.otp}</Text> : null}
                                    </View>

                                    <TouchableOpacity 
                                        style={[styles.button, (isLoading || otp.length !== 6) && styles.buttonDisabled]} 
                                        onPress={handleVerifyOtp}
                                        disabled={isLoading || otp.length !== 6}
                                    >
                                        {isLoading ? (
                                            <View style={styles.loadingRow}>
                                                <ActivityIndicator color="white" size="small" />
                                                <Text style={styles.buttonText}> Verifying...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.buttonText}>Verify & Continue</Text>
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.centerActions}>
                                        <Text style={styles.resendText}>
                                            Didn't receive the code?{' '}
                                            <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                                                <Text style={styles.resendLink}>Resend OTP</Text>
                                            </TouchableOpacity>
                                        </Text>

                                        <TouchableOpacity 
                                            style={styles.backButton}
                                            onPress={() => {
                                                setStep(1);
                                                setOtp('');
                                                setErrors({ email: '', otp: '' });
                                                setStatus('');
                                            }}
                                        >
                                            <ArrowLeft color="#6B7280" size={16} />
                                            <Text style={styles.backButtonText}>Change Email Address</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}
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
    stepIndicator: {
        marginBottom: 24,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircleActive: {
        backgroundColor: '#DC2626',
    },
    stepNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    stepNumberActive: {
        color: 'white',
    },
    stepLine: {
        width: 64,
        height: 4,
        backgroundColor: '#E5E7EB',
    },
    stepLineActive: {
        backgroundColor: '#DC2626',
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
        paddingHorizontal: 8,
    },
    emailBold: {
        fontWeight: '600',
        color: '#111827',
    },
    successMessage: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
    },
    successText: {
        fontSize: 14,
        color: '#166534',
        textAlign: 'center',
    },
    form: {
        gap: 24,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    labelCenter: {
        textAlign: 'center',
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
    inputError: {
        borderColor: '#DC2626',
        borderWidth: 1.5,
    },
    otpInput: {
        textAlign: 'center',
        fontSize: 24,
        letterSpacing: 8,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    backButtonText: {
        fontSize: 14,
        color: '#6B7280',
    },
    centerActions: {
        alignItems: 'center',
        gap: 12,
    },
    resendText: {
        fontSize: 14,
        color: '#6B7280',
    },
    resendLink: {
        fontSize: 14,
        color: '#DC2626',
        fontWeight: '600',
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
