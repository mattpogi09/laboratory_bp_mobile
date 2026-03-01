import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Edit,
    FileText,
    Power,
    X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api, { API_BASE_URL } from "@/app/services/api";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SuccessDialog } from "@/components";
import AddressSelect from "@/components/AddressSelect";
import { useAuth } from "@/contexts/AuthContext";

type PatientDetail = {
    patient: {
        id: number;
        patient_id?: string;
        first_name?: string;
        last_name?: string;
        middle_name?: string;
        full_name: string;
        age?: number;
        gender?: string;
        contact_number?: string;
        email?: string;
        birth_date?: string;
        is_active?: boolean;
        address?: string;
        region_id?: string;
        province_id?: string;
        city_id?: string;
        barangay_code?: string;
        street?: string;
    };
    stats: {
        total_transactions: number;
        pending_tests: number;
        completed_tests: number;
        latest_test_name: string | null;
    };
    recent_transactions: {
        id: number;
        transaction_number: string;
        net_total: number;
        payment_status: string;
        lab_status: string;
        created_at: string;
        tests: { id: number; name: string; status: string; price: number }[];
    }[];
};

type TestDetail = {
    id: number;
    test_name: string;
    category: string;
    price: number;
    status: string;
    processed_by: string;
    completed_at?: string;
    released_at?: string;
    result_values?: Record<string, any>;
    normal_range?: string;
    notes?: string;
    images?: (
        | string
        | { name: string; path: string; url: string; size: number }
    )[];
};

export default function PatientDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const [data, setData] = useState<PatientDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showOtherGender, setShowOtherGender] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Test Detail Modal State
    const [showTestModal, setShowTestModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);
    const [loadingTest, setLoadingTest] = useState(false);

    // Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        visible: false,
        title: "",
        message: "",
        onConfirm: () => {},
        type: "warning" as "warning" | "info" | "danger",
    });
    const [successDialog, setSuccessDialog] = useState({
        visible: false,
        title: "",
        message: "",
        type: "success" as "success" | "error" | "info" | "warning",
    });
    const [showGenderPicker, setShowGenderPicker] = useState(false);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        middle_name: "",
        email: "",
        age: "",
        gender: "",
        birth_date: "",
        contact_number: "",
        region_id: "",
        province_id: "",
        city_id: "",
        barangay_code: "",
        street: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const loadDetails = useCallback(
        async (options?: { silent?: boolean }) => {
            if (!id) return;
            const silent = options?.silent ?? false;
            try {
                if (!silent) setLoading(true);
                const response = await api.get(`/patients/${id}`);
                setData(response.data);
            } catch (error: any) {
                setSuccessDialog({
                    visible: true,
                    title: "Error",
                    message: getApiErrorMessage(
                        error,
                        "Failed to load patient details.",
                    ),
                    type: "error",
                });
            } finally {
                if (!silent) setLoading(false);
                setRefreshing(false);
            }
        },
        [id],
    );

    const loadTestDetails = async (testId: number) => {
        try {
            setLoadingTest(true);
            setShowTestModal(true);
            const response = await api.get(`/tests/${testId}`);
            // Map 'documents' to 'images' for compatibility
            const testData = {
                ...response.data,
                images: response.data.documents || response.data.images || [],
            };
            setSelectedTest(testData);
        } catch (error: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(
                    error,
                    "Failed to load test details.",
                ),
                type: "error",
            });
            setShowTestModal(false);
        } finally {
            setLoadingTest(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, [loadDetails]);

    const onRefresh = () => {
        setRefreshing(true);
        loadDetails({ silent: true });
    };

    const openEditModal = () => {
        if (!data?.patient) return;
        const patient = data.patient;
        setFormData({
            first_name: patient.first_name || "",
            last_name: patient.last_name || "",
            middle_name: patient.middle_name || "",
            email: patient.email || "",
            age: patient.age?.toString() || "",
            gender: patient.gender || "",
            birth_date: patient.birth_date || "",
            contact_number: patient.contact_number || "",
            region_id: patient.region_id || "",
            province_id: patient.province_id || "",
            city_id: patient.city_id || "",
            barangay_code: patient.barangay_code || "",
            street: patient.street || "",
        });
        setShowOtherGender(
            !!(patient.gender && !["Male", "Female"].includes(patient.gender)),
        );
        setErrors({});
        setShowEditModal(true);
    };

    const handleSubmit = async () => {
        setErrors({});
        setSubmitting(true);

        try {
            const payload: any = {
                email: formData.email || null,
                contact_number: formData.contact_number || null,
                region_id: formData.region_id || null,
                province_id: formData.province_id || null,
                city_id: formData.city_id || null,
                barangay_code: formData.barangay_code || null,
                street: formData.street || null,
            };

            if (user?.role === "admin") {
                payload.first_name = formData.first_name;
                payload.last_name = formData.last_name;
                payload.middle_name = formData.middle_name || null;
                payload.age = parseInt(formData.age) || 0;
                payload.gender = formData.gender;
                payload.birth_date = formData.birth_date || null;
            }

            await api.put(`/patients/${id}`, payload);
            setShowEditModal(false);
            loadDetails();
            setSuccessDialog({
                visible: true,
                title: "Success",
                message: "Patient updated successfully.",
                type: "success",
            });
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setSuccessDialog({
                    visible: true,
                    title: "Error",
                    message:
                        error.response?.data?.message ||
                        "Failed to update patient.",
                    type: "error",
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenderChange = (value: string) => {
        if (value === "Other") {
            setShowOtherGender(true);
            setFormData((prev) => ({ ...prev, gender: "" }));
        } else {
            setShowOtherGender(false);
            setFormData((prev) => ({ ...prev, gender: value }));
        }
    };

    const handleDateSelect = () => {
        setShowDatePicker(true);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }

        if (event.type === "set" && selectedDate) {
            const formatted = selectedDate.toISOString().split("T")[0];
            const today = new Date();
            let calcAge = today.getFullYear() - selectedDate.getFullYear();
            const monthDiff = today.getMonth() - selectedDate.getMonth();
            if (
                monthDiff < 0 ||
                (monthDiff === 0 && today.getDate() < selectedDate.getDate())
            ) {
                calcAge--;
            }
            setFormData((prev) => ({
                ...prev,
                birth_date: formatted,
                ...(calcAge >= 0 ? { age: calcAge.toString() } : {}),
            }));

            if (Platform.OS === "ios") {
                setShowDatePicker(false);
            }
        } else if (event.type === "dismissed") {
            setShowDatePicker(false);
        }
    };

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
        });
    };

    const handleToggleActive = () => {
        if (!data?.patient) return;

        const isActive = data.patient.is_active;
        setConfirmDialog({
            visible: true,
            title: `${isActive ? "Deactivate" : "Activate"} Patient`,
            message: `Are you sure you want to ${
                isActive ? "deactivate" : "activate"
            } ${data.patient.full_name}?\n\n${
                isActive
                    ? "This patient will be marked as inactive."
                    : "This patient will be reactivated."
            }`,
            type: isActive ? "danger" : "info",
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, visible: false });
                try {
                    await api.post(`/patients/${id}/toggle`);
                    setSuccessDialog({
                        visible: true,
                        title: "Success",
                        message: `Patient ${
                            isActive ? "deactivated" : "activated"
                        } successfully`,
                        type: "success",
                    });
                    loadDetails({ silent: true });
                } catch (error: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message:
                            error.response?.data?.message ||
                            "Failed to toggle patient status",
                        type: "error",
                    });
                }
            },
        });
    };

    const isAdmin = user?.role === "admin";

    // Memoize address value and onChange callback to prevent infinite loops
    const addressValue = useMemo(
        () => ({
            region_id: formData.region_id,
            province_id: formData.province_id,
            city_id: formData.city_id,
            barangay_code: formData.barangay_code,
            street: formData.street,
        }),
        [
            formData.region_id,
            formData.province_id,
            formData.city_id,
            formData.barangay_code,
            formData.street,
        ],
    );

    const handleAddressChange = useCallback((address: any) => {
        setFormData((prev) => ({
            ...prev,
            region_id: address.region_id || "",
            province_id: address.province_id || "",
            city_id: address.city_id || "",
            barangay_code: address.barangay_code || "",
            street: address.street || "",
        }));
    }, []);

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color="#ac3434" size="large" />
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.loading}>
                <Text>Unable to load patient.</Text>
            </View>
        );
    }

    const patient = data.patient;
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");

    return (
        <SafeAreaView
            style={{ flex: 1, backgroundColor: "#F3F4F6" }}
            edges={["top", "bottom"]}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.customHeader}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <ChevronLeft size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Patient Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>
                                {patient.full_name?.charAt(0).toUpperCase() ||
                                    "?"}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>
                                {patient.full_name}
                            </Text>
                            <Text style={styles.subtitle}>
                                {patient.gender} • {patient.age} yrs
                            </Text>
                            {patient.patient_id ? (
                                <Text style={styles.patientIdText}>
                                    ID: {patient.patient_id}
                                </Text>
                            ) : null}
                            <View
                                style={[
                                    styles.statusBadge,
                                    patient.is_active
                                        ? styles.statusActive
                                        : styles.statusInactive,
                                    { marginTop: 4, alignSelf: "flex-start" },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusBadgeText,
                                        {
                                            color: patient.is_active
                                                ? "#166534"
                                                : "#991B1B",
                                        },
                                    ]}
                                >
                                    {patient.is_active ? "Active" : "Inactive"}
                                </Text>
                            </View>
                        </View>
                        <View
                            style={{
                                flexDirection: "row",
                                gap: 8,
                                alignSelf: "flex-start",
                            }}
                        >
                            {isAdmin && (
                                <TouchableOpacity
                                    style={[
                                        styles.editButton,
                                        patient.is_active
                                            ? { backgroundColor: "#FEE2E2" }
                                            : { backgroundColor: "#D1FAE5" },
                                    ]}
                                    onPress={handleToggleActive}
                                >
                                    <Power
                                        color={
                                            patient.is_active
                                                ? "#DC2626"
                                                : "#059669"
                                        }
                                        size={18}
                                    />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={openEditModal}
                            >
                                <Edit color="#ac3434" size={18} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Contact</Text>
                        <Text style={styles.value}>
                            {patient.contact_number || "N/A"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Email</Text>
                        <Text style={styles.value}>
                            {patient.email || "N/A"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Date of Birth</Text>
                        <Text style={styles.value}>
                            {patient.birth_date
                                ? new Date(
                                      patient.birth_date,
                                  ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                  })
                                : "N/A"}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Address</Text>
                        <Text
                            style={[
                                styles.value,
                                { flex: 1, textAlign: "right" },
                            ]}
                        >
                            {patient.address || "N/A"}
                        </Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <StatCard
                        label="Total Visits"
                        value={data.stats.total_transactions}
                        color="#7C3AED"
                    />
                    <StatCard
                        label="Active Tests"
                        value={data.stats.pending_tests}
                        color="#D97706"
                    />
                    <StatCard
                        label="Completed"
                        value={data.stats.completed_tests}
                        color="#059669"
                    />
                    <StatCard
                        label="Latest Test"
                        value={data.stats.latest_test_name || "—"}
                        color="#2563EB"
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    {data.recent_transactions.map((txn) => (
                        <View key={txn.id} style={styles.transaction}>
                            <View style={styles.transactionHeader}>
                                <Text style={styles.transactionNumber}>
                                    {txn.transaction_number}
                                </Text>
                                <Text style={styles.transactionAmount}>
                                    ₱{txn.net_total.toLocaleString("en-PH")}
                                </Text>
                            </View>
                            <Text style={styles.transactionMeta}>
                                {new Date(txn.created_at).toLocaleString()} •{" "}
                                {txn.payment_status}
                            </Text>
                            <View style={styles.testsList}>
                                {txn.tests.map((test) => (
                                    <TouchableOpacity
                                        key={test.id}
                                        style={styles.testRow}
                                        onPress={() => loadTestDetails(test.id)}
                                    >
                                        <Text style={styles.testName}>
                                            {test.name}
                                        </Text>
                                        <View style={styles.testRight}>
                                            <Text style={styles.testPrice}>
                                                ₱{test.price}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.testStatus,
                                                    test.status === "pending"
                                                        ? {
                                                              backgroundColor:
                                                                  "#FEE2E2",
                                                          }
                                                        : test.status ===
                                                            "processing"
                                                          ? {
                                                                backgroundColor:
                                                                    "#FEF3C7",
                                                            }
                                                          : test.status ===
                                                              "completed"
                                                            ? {
                                                                  backgroundColor:
                                                                      "#DBEAFE",
                                                              }
                                                            : {
                                                                  backgroundColor:
                                                                      "#D1FAE5",
                                                              },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.testStatusText,
                                                        test.status ===
                                                        "pending"
                                                            ? {
                                                                  color: "#991B1B",
                                                              }
                                                            : test.status ===
                                                                "processing"
                                                              ? {
                                                                    color: "#92400E",
                                                                }
                                                              : test.status ===
                                                                  "completed"
                                                                ? {
                                                                      color: "#1E40AF",
                                                                  }
                                                                : {
                                                                      color: "#065F46",
                                                                  },
                                                    ]}
                                                >
                                                    {test.status}
                                                </Text>
                                            </View>
                                            <ChevronRight
                                                size={16}
                                                color="#9CA3AF"
                                            />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                    {!data.recent_transactions.length && (
                        <Text style={styles.emptyState}>
                            No transactions recorded yet.
                        </Text>
                    )}
                </View>
            </ScrollView>

            {/* Edit Modal */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Patient</Text>
                        <TouchableOpacity
                            onPress={() => setShowEditModal(false)}
                        >
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.modalContent}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {isAdmin && (
                            <>
                                <View style={styles.formRow}>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>
                                            First Name{" "}
                                            <Text style={styles.required}>
                                                *
                                            </Text>
                                        </Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                errors.first_name &&
                                                    styles.inputError,
                                            ]}
                                            value={formData.first_name}
                                            onChangeText={(text) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    first_name: text,
                                                }))
                                            }
                                            placeholder="Juan"
                                        />
                                        {errors.first_name && (
                                            <Text style={styles.errorText}>
                                                {errors.first_name}
                                            </Text>
                                        )}
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>
                                            Last Name{" "}
                                            <Text style={styles.required}>
                                                *
                                            </Text>
                                        </Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                errors.last_name &&
                                                    styles.inputError,
                                            ]}
                                            value={formData.last_name}
                                            onChangeText={(text) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    last_name: text,
                                                }))
                                            }
                                            placeholder="Dela Cruz"
                                        />
                                        {errors.last_name && (
                                            <Text style={styles.errorText}>
                                                {errors.last_name}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>
                                        Middle Name
                                    </Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.middle_name}
                                        onChangeText={(text) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                middle_name: text,
                                            }))
                                        }
                                        placeholder="Optional"
                                    />
                                </View>

                                <View style={styles.formRow}>
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>
                                            Age{" "}
                                            <Text style={styles.required}>
                                                *
                                            </Text>
                                        </Text>
                                        <TextInput
                                            style={[
                                                styles.input,
                                                errors.age && styles.inputError,
                                            ]}
                                            value={formData.age}
                                            onChangeText={(text) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    age: text.replace(
                                                        /[^0-9]/g,
                                                        "",
                                                    ),
                                                }))
                                            }
                                            placeholder="25"
                                            keyboardType="numeric"
                                        />
                                        {errors.age && (
                                            <Text style={styles.errorText}>
                                                {errors.age}
                                            </Text>
                                        )}
                                    </View>

                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>
                                            Gender{" "}
                                            <Text style={styles.required}>
                                                *
                                            </Text>
                                        </Text>
                                        <View style={styles.pickerContainer}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.pickerButton,
                                                    errors.gender &&
                                                        styles.inputError,
                                                ]}
                                                onPress={() =>
                                                    setShowGenderPicker(true)
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.pickerText,
                                                        !formData.gender &&
                                                            styles.placeholderText,
                                                    ]}
                                                >
                                                    {formData.gender ||
                                                        "Select Gender"}
                                                </Text>
                                                <ChevronDown
                                                    color="#6B7280"
                                                    size={20}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        {errors.gender && (
                                            <Text style={styles.errorText}>
                                                {errors.gender}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>
                                        Date of Birth
                                    </Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.datePickerButton,
                                            errors.birth_date &&
                                                styles.inputError,
                                        ]}
                                        onPress={handleDateSelect}
                                    >
                                        <Text
                                            style={[
                                                styles.datePickerText,
                                                !formData.birth_date &&
                                                    styles.placeholderText,
                                            ]}
                                        >
                                            {formData.birth_date
                                                ? formatDisplayDate(
                                                      formData.birth_date,
                                                  )
                                                : "MM/DD/YYYY"}
                                        </Text>
                                        <Calendar color="#6B7280" size={20} />
                                    </TouchableOpacity>
                                    {errors.birth_date && (
                                        <Text style={styles.errorText}>
                                            {errors.birth_date}
                                        </Text>
                                    )}
                                </View>
                            </>
                        )}

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Email</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    errors.email && styles.inputError,
                                ]}
                                value={formData.email}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        email: text,
                                    }))
                                }
                                placeholder="email@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {errors.email && (
                                <Text style={styles.errorText}>
                                    {errors.email}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Contact Number</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    errors.contact_number && styles.inputError,
                                ]}
                                value={formData.contact_number}
                                onChangeText={(text) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        contact_number: text,
                                    }))
                                }
                                placeholder="09123456789"
                                keyboardType="phone-pad"
                            />
                            {errors.contact_number && (
                                <Text style={styles.errorText}>
                                    {errors.contact_number}
                                </Text>
                            )}
                        </View>

                        <AddressSelect
                            value={addressValue}
                            onChange={handleAddressChange}
                            errors={errors}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.submitButton,
                                    submitting && styles.submitButtonDisabled,
                                ]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        Update
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Test Detail Modal */}
            <Modal
                visible={showTestModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowTestModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Test Result Details
                        </Text>
                        <TouchableOpacity
                            onPress={() => setShowTestModal(false)}
                        >
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    {loadingTest ? (
                        <View style={styles.loading}>
                            <ActivityIndicator color="#ac3434" size="large" />
                        </View>
                    ) : selectedTest ? (
                        <ScrollView
                            style={styles.modalContent}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            <View style={styles.resultCard}>
                                <View style={styles.resultHeader}>
                                    <View>
                                        <Text style={styles.resultTestName}>
                                            {selectedTest.test_name}
                                        </Text>
                                        <Text style={styles.resultCategory}>
                                            {selectedTest.category}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.testStatus,
                                            { alignSelf: "flex-start" },
                                            selectedTest.status === "pending"
                                                ? { backgroundColor: "#FEE2E2" }
                                                : selectedTest.status ===
                                                    "processing"
                                                  ? {
                                                        backgroundColor:
                                                            "#FEF3C7",
                                                    }
                                                  : selectedTest.status ===
                                                      "completed"
                                                    ? {
                                                          backgroundColor:
                                                              "#DBEAFE",
                                                      }
                                                    : {
                                                          backgroundColor:
                                                              "#D1FAE5",
                                                      },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.testStatusText,
                                                selectedTest.status ===
                                                "pending"
                                                    ? { color: "#991B1B" }
                                                    : selectedTest.status ===
                                                        "processing"
                                                      ? { color: "#92400E" }
                                                      : selectedTest.status ===
                                                          "completed"
                                                        ? { color: "#1E40AF" }
                                                        : { color: "#065F46" },
                                            ]}
                                        >
                                            {selectedTest.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.resultMetaRow}>
                                    <View>
                                        <Text style={styles.metaLabel}>
                                            Processed By
                                        </Text>
                                        <Text style={styles.metaValue}>
                                            {selectedTest.processed_by}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.metaLabel}>
                                            Price
                                        </Text>
                                        <Text style={styles.metaValue}>
                                            ₱{selectedTest.price}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.resultMetaRow}>
                                    <View>
                                        <Text style={styles.metaLabel}>
                                            Completed
                                        </Text>
                                        <Text style={styles.metaValue}>
                                            {selectedTest.completed_at || "-"}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={styles.metaLabel}>
                                            Released
                                        </Text>
                                        <Text style={styles.metaValue}>
                                            {selectedTest.released_at || "-"}
                                        </Text>
                                    </View>
                                </View>

                                {selectedTest.result_values &&
                                    Object.keys(selectedTest.result_values)
                                        .length > 0 && (
                                        <View style={styles.section}>
                                            <Text style={styles.sectionHeader}>
                                                Result Values
                                            </Text>
                                            {Object.entries(
                                                selectedTest.result_values,
                                            ).map(
                                                ([key, value]: [
                                                    string,
                                                    any,
                                                ]) => (
                                                    <View
                                                        key={key}
                                                        style={styles.resultRow}
                                                    >
                                                        <Text
                                                            style={
                                                                styles.resultLabel
                                                            }
                                                        >
                                                            {key}
                                                        </Text>
                                                        <Text
                                                            style={
                                                                styles.resultValue
                                                            }
                                                        >
                                                            {String(value)}
                                                        </Text>
                                                    </View>
                                                ),
                                            )}
                                        </View>
                                    )}

                                {selectedTest.normal_range && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionHeader}>
                                            Normal Range
                                        </Text>
                                        <Text style={styles.notesText}>
                                            {selectedTest.normal_range}
                                        </Text>
                                    </View>
                                )}

                                {selectedTest.notes && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionHeader}>
                                            Notes & Remarks
                                        </Text>
                                        <View style={styles.notesBox}>
                                            <Text style={styles.notesText}>
                                                {selectedTest.notes}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {selectedTest.images &&
                                    selectedTest.images.length > 0 && (
                                        <View style={styles.section}>
                                            <Text style={styles.sectionHeader}>
                                                Uploaded Images (
                                                {selectedTest.images.length})
                                            </Text>
                                            {selectedTest.images.map(
                                                (img, index) => {
                                                    // Handle different formats: string, object with url, or object with path
                                                    let imageUrl: string = "";

                                                    if (
                                                        typeof img === "string"
                                                    ) {
                                                        // If it's a string that already starts with /storage/, just prepend base URL
                                                        if (
                                                            img.startsWith(
                                                                "/storage/",
                                                            )
                                                        ) {
                                                            imageUrl = `${baseUrl}${img}`;
                                                        } else if (
                                                            img.startsWith(
                                                                "http",
                                                            )
                                                        ) {
                                                            imageUrl = img;
                                                        } else {
                                                            // Otherwise construct the full path
                                                            imageUrl = `${baseUrl}/storage/${img}`;
                                                        }
                                                    } else if (img.url) {
                                                        // If backend provided a URL, use it (prepend base URL if relative)
                                                        imageUrl =
                                                            img.url.startsWith(
                                                                "http",
                                                            )
                                                                ? img.url
                                                                : `${baseUrl}${img.url}`;
                                                    } else if (img.path) {
                                                        // Fallback to constructing from path
                                                        imageUrl = `${baseUrl}/storage/${img.path}`;
                                                    }

                                                    console.log(
                                                        "Image data:",
                                                        img,
                                                    );
                                                    console.log(
                                                        "Final URL:",
                                                        imageUrl,
                                                    );

                                                    return (
                                                        <View
                                                            key={index}
                                                            style={
                                                                styles.imageContainer
                                                            }
                                                        >
                                                            <Image
                                                                source={{
                                                                    uri: imageUrl,
                                                                }}
                                                                style={
                                                                    styles.resultImage
                                                                }
                                                                resizeMode="contain"
                                                                onError={(
                                                                    error,
                                                                ) => {
                                                                    console.log(
                                                                        "❌ Image load error:",
                                                                        error
                                                                            .nativeEvent
                                                                            .error,
                                                                    );
                                                                    console.log(
                                                                        "Failed URL:",
                                                                        imageUrl,
                                                                    );
                                                                }}
                                                                onLoadStart={() =>
                                                                    console.log(
                                                                        "⏳ Loading image:",
                                                                        imageUrl,
                                                                    )
                                                                }
                                                                onLoadEnd={() =>
                                                                    console.log(
                                                                        "✅ Image loaded:",
                                                                        imageUrl,
                                                                    )
                                                                }
                                                            />
                                                        </View>
                                                    );
                                                },
                                            )}
                                        </View>
                                    )}

                                {selectedTest.status === "pending" && (
                                    <View style={styles.pendingState}>
                                        <FileText size={48} color="#9CA3AF" />
                                        <Text style={styles.pendingText}>
                                            Results pending
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    ) : (
                        <View style={styles.loading}>
                            <Text>Failed to load test details.</Text>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={
                        formData.birth_date
                            ? new Date(formData.birth_date)
                            : new Date()
                    }
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                />
            )}

            <ConfirmDialog
                visible={confirmDialog.visible}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() =>
                    setConfirmDialog({ ...confirmDialog, visible: false })
                }
            />

            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                onClose={() =>
                    setSuccessDialog({ ...successDialog, visible: false })
                }
            />

            {/* Gender Picker Modal */}
            <Modal
                visible={showGenderPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowGenderPicker(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 20,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: 16,
                            width: "100%",
                            maxWidth: 400,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 8,
                        }}
                    >
                        <View
                            style={{
                                padding: 20,
                                borderBottomWidth: 1,
                                borderBottomColor: "#E5E7EB",
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 18,
                                    fontWeight: "700",
                                    color: "#111827",
                                }}
                            >
                                Select Gender
                            </Text>
                        </View>
                        <View style={{ padding: 16, gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    padding: 16,
                                    backgroundColor: "#F3F4F6",
                                    borderRadius: 8,
                                    alignItems: "center",
                                }}
                                onPress={() => {
                                    handleGenderChange("Male");
                                    setShowGenderPicker(false);
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: "600",
                                        color: "#111827",
                                    }}
                                >
                                    Male
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    padding: 16,
                                    backgroundColor: "#F3F4F6",
                                    borderRadius: 8,
                                    alignItems: "center",
                                }}
                                onPress={() => {
                                    handleGenderChange("Female");
                                    setShowGenderPicker(false);
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: "600",
                                        color: "#111827",
                                    }}
                                >
                                    Female
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{
                                    padding: 16,
                                    backgroundColor: "#FFF",
                                    borderRadius: 8,
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: "#E5E7EB",
                                }}
                                onPress={() => setShowGenderPicker(false)}
                            >
                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: "600",
                                        color: "#6B7280",
                                    }}
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const StatCard = ({
    label,
    value,
    color,
}: {
    label: string;
    value: number | string;
    color?: string;
}) => (
    <View
        style={[
            styles.statCard,
            color
                ? {
                      backgroundColor: color + "15",
                      borderColor: color + "33",
                      borderWidth: 1,
                  }
                : undefined,
        ]}
    >
        <Text style={[styles.statLabel, color ? { color } : undefined]}>
            {label}
        </Text>
        {typeof value === "number" ? (
            <Text style={[styles.statValue, color ? { color } : undefined]}>
                {value}
            </Text>
        ) : (
            <Text
                style={[styles.statValueText, color ? { color } : undefined]}
                numberOfLines={2}
            >
                {value}
            </Text>
        )}
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    customHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    title: { fontSize: 24, fontWeight: "700", color: "#111827", flex: 1 },
    subtitle: { color: "#6B7280", marginTop: 2 },
    editButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: "#FEF2F2",
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    label: { color: "#6B7280", fontSize: 14 },
    value: { color: "#111827", fontWeight: "600" },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 6,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 10,
        alignItems: "center",
        minWidth: 0,
    },
    statLabel: { color: "#6B7280", fontSize: 10, textAlign: "center" },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        marginTop: 4,
    },
    statValueText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#111827",
        textAlign: "center",
        marginTop: 4,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#7C2D12",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatarText: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
    },
    statusBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    statusActive: { backgroundColor: "#DCFCE7" },
    statusInactive: { backgroundColor: "#FEE2E2" },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
    patientIdText: {
        fontSize: 12,
        color: "#9CA3AF",
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
        color: "#111827",
    },
    transaction: {
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        paddingVertical: 12,
    },
    transactionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    transactionNumber: { fontWeight: "600", color: "#111827" },
    transactionAmount: { fontWeight: "700", color: "#0EA5E9" },
    transactionMeta: { color: "#6B7280", fontSize: 12, marginBottom: 8 },
    testsList: { gap: 8 },
    testRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        paddingVertical: 4,
    },
    testName: {
        color: "#111827",
        fontWeight: "500",
        flex: 1,
        flexShrink: 1,
    },
    testRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
    },
    testPrice: { color: "#374151", fontWeight: "600" },
    testStatus: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    testStatusText: {
        textTransform: "capitalize",
        fontSize: 12,
        fontWeight: "600",
    },
    emptyState: { textAlign: "center", color: "#9CA3AF" },
    modalContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    formRow: {
        flexDirection: "row",
        gap: 12,
    },
    formGroup: {
        flex: 1,
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 6,
    },
    required: {
        color: "#DC2626",
    },
    input: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: "#111827",
        minHeight: 44,
    },
    inputError: {
        borderColor: "#DC2626",
    },
    errorText: {
        color: "#DC2626",
        fontSize: 12,
        marginTop: 4,
    },
    pickerContainer: {
        marginBottom: 0,
    },
    pickerButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
    },
    pickerText: {
        flex: 1,
        fontSize: 16,
        color: "#111827",
    },
    placeholderText: {
        color: "#9CA3AF",
    },
    datePickerButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 44,
    },
    datePickerText: {
        flex: 1,
        fontSize: 16,
        color: "#111827",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButton: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    cancelButtonText: {
        color: "#374151",
        fontSize: 16,
        fontWeight: "600",
    },
    submitButton: {
        backgroundColor: "#ac3434",
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

    // Result Modal Styles
    resultCard: {
        gap: 20,
    },
    resultHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    resultTestName: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    resultCategory: {
        color: "#6B7280",
        fontSize: 14,
    },
    resultMetaRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        paddingBottom: 12,
    },
    metaLabel: {
        color: "#6B7280",
        fontSize: 12,
        marginBottom: 2,
    },
    metaValue: {
        color: "#111827",
        fontWeight: "600",
        fontSize: 14,
    },
    section: {
        gap: 8,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    resultRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    resultLabel: {
        color: "#4B5563",
        fontSize: 15,
    },
    resultValue: {
        color: "#111827",
        fontWeight: "600",
        fontSize: 15,
    },
    notesBox: {
        backgroundColor: "#FEF9C3",
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FEF08A",
    },
    notesText: {
        color: "#854D0E",
        fontSize: 14,
        lineHeight: 20,
    },
    imageContainer: {
        height: 200,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    resultImage: {
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
    },
    pendingState: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        gap: 12,
    },
    pendingText: {
        color: "#9CA3AF",
        fontSize: 16,
    },
});
