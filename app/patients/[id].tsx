import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Edit,
    FileText,
    History,
    Image as ImageIcon,
    Power,
    Printer,
    Share2,
    User,
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
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api, { API_BASE_URL } from "@/app/services/api";
import { getApiErrorMessage, useResponsiveLayout } from "@/utils";
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
        id_picture_url?: string | null;
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
    test_history?: {
        id: number;
        name: string;
        status: string;
        price: number;
        date?: string | null;
        payment_status?: string | null;
        result_quality?: string | null;
        transaction_id?: number | null;
        transaction_number?: string | null;
    }[];
};

type TestDetail = {
    id: number;
    transaction_id?: number;
    test_name: string;
    category: string;
    price: number;
    status: string;
    processed_by: string;
    started_at?: string;
    completed_at?: string;
    released_at?: string;
    result_values?: Record<string, unknown>;
    normal_range?: string;
    notes?: string;
    is_image_only_test?: boolean;
    documents?: { name?: string; path?: string; url?: string; size?: number }[];
    images?: (
        | string
        | { name: string; path: string; url: string; size: number }
    )[];
    correction_versions?: {
        version_no: number;
        snapshot_type: "before_correction" | "corrected";
        source_status?: string;
        snapshot_result_values?: Record<string, unknown>;
        snapshot_result_notes?: string | null;
        corrected_at: string;
        corrected_by: string;
    }[];
};

export default function PatientDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const responsive = useResponsiveLayout();
    const [data, setData] = useState<PatientDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Test Detail Modal State
    const [showTestModal, setShowTestModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);
    const [loadingTest, setLoadingTest] = useState(false);
    const [notifyingTestId, setNotifyingTestId] = useState<number | null>(null);
    const [notifiedTests, setNotifiedTests] = useState<number[]>([]);
    const [isTestHistoryExpanded, setIsTestHistoryExpanded] = useState(false);
    const [historyExpanded, setHistoryExpanded] = useState({ before: false, corrected: false });
    const [idViewer, setIdViewer] = useState<{
        visible: boolean;
        url: string | null;
        title: string;
    }>({ visible: false, url: null, title: "" });
    const [imageViewer, setImageViewer] = useState<{
        visible: boolean;
        url: string | null;
        title: string;
    }>({ visible: false, url: null, title: "" });

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
            setHistoryExpanded({ before: false, corrected: false });
            const response = await api.get(`/tests/${testId}`);
            const testData = {
                ...response.data,
                documents: response.data.documents || [],
                images:
                    response.data.images ||
                    (response.data.documents || []).map((doc: any) => doc.url),
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
        setFormData((prev) => ({ ...prev, gender: value }));
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

    const resolveFileUrl = useCallback((value?: string | null) => {
        if (!value) return null;
        if (value.startsWith("http")) return value;
        if (value.startsWith("files/")) return `${API_BASE_URL}/${value}`;
        if (value.startsWith("/api/files/")) {
            const root = API_BASE_URL.replace(/\/api\/?$/, "");
            return `${root}${value}`;
        }

        return `${API_BASE_URL}/files/${value.replace(/^\/+/, "")}`;
    }, []);

    const notifySpecimenRecollect = async (test: {
        id: number;
        result_quality?: string | null;
    }) => {
        if (
            !id ||
            notifyingTestId === test.id ||
            notifiedTests.includes(test.id)
        ) {
            return;
        }

        try {
            setNotifyingTestId(test.id);
            const response = await api.post(
                `/patients/${id}/notify-specimen-recollect`,
                {
                    transaction_test_id: test.id,
                },
            );

            setNotifiedTests((prev) => [...prev, test.id]);
            setSuccessDialog({
                visible: true,
                title: "Notification Sent",
                message:
                    response.data?.message ||
                    "Specimen recollect notification sent successfully.",
                type: "success",
            });
        } catch (error: any) {
            setSuccessDialog({
                visible: true,
                title: "Notify Failed",
                message: getApiErrorMessage(
                    error,
                    "Failed to send specimen recollect notification.",
                ),
                type: "error",
            });
        } finally {
            setNotifyingTestId(null);
        }
    };

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

    const handleVersionShare = async (test: TestDetail, versionIdx: number, sectionLabel: string) => {
        const version = test.correction_versions?.[versionIdx];
        if (!version) return;
        const values = version.snapshot_result_values ?? {};
        const lines = Object.entries(values)
            .filter(([k]) => !k.endsWith("_normal") && !k.endsWith("_interpretation") && k !== "metadata")
            .map(([k, v]) => `${k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}: ${v}`);
        const body = [
            `Test: ${test.test_name}`,
            `Section: ${sectionLabel}`,
            `Version: ${versionIdx + 1}`,
            `Date: ${version.corrected_at}`,
            `By: ${version.corrected_by}`,
            "",
            ...lines,
            version.snapshot_result_notes ? `\nNotes: ${version.snapshot_result_notes}` : "",
        ].join("\n");
        try {
            await Share.share({ message: body, title: `${test.test_name} — ${sectionLabel} v${versionIdx + 1}` });
        } catch {
            // user cancelled
        }
    };

    const renderVersionCard = (
        version: NonNullable<TestDetail["correction_versions"]>[number],
        localIdx: number,
        accentColor: string,
        sectionLabel: string,
        test: TestDetail,
        globalIdx: number,
    ) => {
        const values = version.snapshot_result_values ?? {};
        const entries = Object.entries(values).filter(
            ([k, v]) => v && !k.endsWith("_normal") && !k.endsWith("_interpretation") && k !== "metadata" && k !== "interpretation" && k !== "result_interpretation",
        );
        return (
            <View key={`v-${version.version_no}`} style={[styles.versionCard, { borderColor: accentColor + "55" }]}>
                <View style={styles.versionCardHeader}>
                    <Text style={[styles.versionLabel, { color: accentColor }]}>Version {localIdx + 1}</Text>
                    <TouchableOpacity
                        style={[styles.versionPrintBtn, { borderColor: accentColor + "88" }]}
                        onPress={() => handleVersionShare(test, globalIdx, sectionLabel)}
                    >
                        <Share2 size={12} color={accentColor} />
                        <Text style={[styles.versionPrintBtnText, { color: accentColor }]}>Share</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.versionMeta, { color: accentColor }]}>
                    {version.corrected_at} · By: {version.corrected_by}
                </Text>
                {entries.length > 0 ? (
                    entries.map(([k, v]) => (
                        <View key={k} style={styles.versionRow}>
                            <Text style={styles.versionRowLabel}>
                                {k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Text>
                            <Text style={styles.versionRowValue}>{String(v ?? "N/A")}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.versionEmpty}>No saved result values.</Text>
                )}
                <Text style={styles.versionNotes}>
                    Notes: {version.snapshot_result_notes ?? "N/A"}
                </Text>
            </View>
        );
    };

    const renderCorrectionHistory = (test: TestDetail) => {
        const versions = test.correction_versions ?? [];
        if (versions.length === 0) return null;

        const beforeVersions = versions
            .map((v, i) => ({ v, i }))
            .filter(({ v }) => v.snapshot_type === "before_correction");
        const correctedVersions = versions
            .map((v, i) => ({ v, i }))
            .filter(({ v }) => v.snapshot_type === "corrected");

        if (beforeVersions.length === 0 && correctedVersions.length === 0) return null;

        return (
            <>
                {beforeVersions.length > 0 && (
                    <View style={[styles.sectionCard, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}>
                        <TouchableOpacity
                            style={styles.historySectionHeader}
                            onPress={() => setHistoryExpanded((p) => ({ ...p, before: !p.before }))}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <History size={14} color="#C2410C" />
                                <Text style={[styles.sectionCardTitle, { color: "#C2410C", marginBottom: 0 }]}>
                                    Before Correction History
                                </Text>
                                <Text style={{ fontSize: 11, color: "#EA580C" }}>
                                    ({beforeVersions.length})
                                </Text>
                            </View>
                            {historyExpanded.before ? (
                                <ChevronDown size={16} color="#C2410C" />
                            ) : (
                                <ChevronRight size={16} color="#C2410C" />
                            )}
                        </TouchableOpacity>
                        {historyExpanded.before && (
                            <View style={{ marginTop: 10, gap: 10 }}>
                                {beforeVersions.map(({ v, i }, localIdx) =>
                                    renderVersionCard(v, localIdx, "#C2410C", "Before Correction", test, i)
                                )}
                            </View>
                        )}
                    </View>
                )}

                {correctedVersions.length > 0 && (
                    <View style={[styles.sectionCard, { backgroundColor: "#F0FDF4", borderColor: "#A7F3D0" }]}>
                        <TouchableOpacity
                            style={styles.historySectionHeader}
                            onPress={() => setHistoryExpanded((p) => ({ ...p, corrected: !p.corrected }))}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <History size={14} color="#059669" />
                                <Text style={[styles.sectionCardTitle, { color: "#059669", marginBottom: 0 }]}>
                                    Corrected History
                                </Text>
                                <Text style={{ fontSize: 11, color: "#10B981" }}>
                                    ({correctedVersions.length})
                                </Text>
                            </View>
                            {historyExpanded.corrected ? (
                                <ChevronDown size={16} color="#059669" />
                            ) : (
                                <ChevronRight size={16} color="#059669" />
                            )}
                        </TouchableOpacity>
                        {historyExpanded.corrected && (
                            <View style={{ marginTop: 10, gap: 10 }}>
                                {correctedVersions.map(({ v, i }, localIdx) =>
                                    renderVersionCard(v, localIdx, "#059669", "Corrected", test, i)
                                )}
                            </View>
                        )}
                    </View>
                )}
            </>
        );
    };

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
    const testHistory = (data.test_history || []).map((test) => ({
        ...test,
        date: test.date
            ? new Date(test.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
              })
            : "N/A",
    }));

    return (
        <SafeAreaView
            style={[
                { flex: 1, backgroundColor: "#F3F4F6" },
                responsive.isTablet && {
                    width: "100%",
                    maxWidth: 1100,
                    alignSelf: "center",
                },
            ]}
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
                contentContainerStyle={{
                    paddingHorizontal: responsive.horizontalPadding,
                    paddingVertical: 20,
                    paddingBottom: 40,
                }}
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
                                {patient.gender} - {patient.age} yrs
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
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Valid ID</Text>
                        {patient.id_picture_url ? (
                            <TouchableOpacity
                                style={styles.idButton}
                                onPress={() =>
                                    setIdViewer({
                                        visible: true,
                                        url: resolveFileUrl(
                                            patient.id_picture_url,
                                        ),
                                        title: `ID Picture - ${patient.full_name}`,
                                    })
                                }
                            >
                                <Text style={styles.idButtonText}>
                                    View Uploaded ID
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.value}>Not Uploaded</Text>
                        )}
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

                {/* Test History */}
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.sectionHeaderRow}
                        onPress={() =>
                            setIsTestHistoryExpanded((prev) => !prev)
                        }
                    >
                        <Text style={styles.sectionTitle}>
                            Test History ({testHistory.length})
                        </Text>
                        {isTestHistoryExpanded ? (
                            <ChevronDown size={18} color="#6B7280" />
                        ) : (
                            <ChevronRight size={18} color="#6B7280" />
                        )}
                    </TouchableOpacity>

                    {!isTestHistoryExpanded ? (
                        <Text style={styles.collapsedHintText}>
                            Tap to expand test history.
                        </Text>
                    ) : testHistory.length > 0 ? (
                        testHistory.map((test) => (
                            <TouchableOpacity
                                key={test.id}
                                style={styles.testHistoryCard}
                                onPress={() => loadTestDetails(test.id)}
                            >
                                <View style={styles.testHistoryRow}>
                                    <View style={styles.testHistoryLeft}>
                                        <View
                                            style={styles.testHistoryIconWrap}
                                        >
                                            <FileText
                                                size={16}
                                                color="#2563EB"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={styles.testHistoryName}
                                                numberOfLines={1}
                                            >
                                                {test.name}
                                            </Text>
                                            <Text
                                                style={styles.testHistoryDate}
                                            >
                                                {test.date}
                                            </Text>
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            styles.testStatus,
                                            test.status === "pending"
                                                ? { backgroundColor: "#FEE2E2" }
                                                : test.status === "processing"
                                                  ? {
                                                        backgroundColor:
                                                            "#FEF3C7",
                                                    }
                                                  : test.status === "completed"
                                                    ? {
                                                          backgroundColor:
                                                              "#DBEAFE",
                                                      }
                                                    : test.status ===
                                                        "cancelled"
                                                      ? {
                                                            backgroundColor:
                                                                "#F3F4F6",
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
                                                test.status === "pending"
                                                    ? { color: "#991B1B" }
                                                    : test.status ===
                                                        "processing"
                                                      ? { color: "#92400E" }
                                                      : test.status ===
                                                          "completed"
                                                        ? { color: "#1E40AF" }
                                                        : test.status ===
                                                            "cancelled"
                                                          ? { color: "#374151" }
                                                          : {
                                                                color: "#065F46",
                                                            },
                                            ]}
                                        >
                                            {test.status}
                                        </Text>
                                    </View>
                                </View>

                                {(test.result_quality ===
                                    "recollect_specimen" ||
                                    test.result_quality === "rerun_test" ||
                                    test.payment_status === "refunded" ||
                                    (test.result_quality ===
                                        "recollect_specimen" &&
                                        !!patient.email)) && (
                                    <View style={styles.testTagWrap}>
                                        {test.result_quality ===
                                            "recollect_specimen" && (
                                            <View
                                                style={
                                                    styles.recollectSpecimenBadge
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.recollectSpecimenText
                                                    }
                                                >
                                                    Recollect
                                                </Text>
                                            </View>
                                        )}
                                        {test.result_quality ===
                                            "rerun_test" && (
                                            <View style={styles.rerunBadge}>
                                                <Text
                                                    style={
                                                        styles.rerunBadgeText
                                                    }
                                                >
                                                    Rerun
                                                </Text>
                                            </View>
                                        )}
                                        {test.payment_status === "refunded" && (
                                            <View style={styles.refundedBadge}>
                                                <Text
                                                    style={
                                                        styles.refundedBadgeText
                                                    }
                                                >
                                                    Refunded
                                                </Text>
                                            </View>
                                        )}
                                        {test.result_quality ===
                                            "recollect_specimen" &&
                                            !!patient.email && (
                                                <TouchableOpacity
                                                    style={styles.notifyButton}
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        notifySpecimenRecollect(
                                                            {
                                                                id: test.id,
                                                                result_quality:
                                                                    test.result_quality,
                                                            },
                                                        );
                                                    }}
                                                    disabled={
                                                        notifyingTestId ===
                                                            test.id ||
                                                        notifiedTests.includes(
                                                            test.id,
                                                        )
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.notifyButtonText
                                                        }
                                                    >
                                                        {notifiedTests.includes(
                                                            test.id,
                                                        )
                                                            ? "Notified"
                                                            : notifyingTestId ===
                                                                test.id
                                                              ? "Sending..."
                                                              : "Notify"}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.emptyState}>
                            No test history available.
                        </Text>
                    )}
                </View>

                {/* Recent Transactions */}
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
                                {new Date(txn.created_at).toLocaleDateString(
                                    "en-US",
                                    {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    },
                                )}{" "}
                                - {txn.payment_status} - {txn.tests.length} test
                                {txn.tests.length !== 1 ? "s" : ""}
                            </Text>
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
                                                    first_name: text.replace(
                                                        /[^a-zA-ZÀ-ÿ\s'\-]/g,
                                                        "",
                                                    ),
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
                                                    last_name: text.replace(
                                                        /[^a-zA-ZÀ-ÿ\s'\-]/g,
                                                        "",
                                                    ),
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
                                                middle_name: text.replace(
                                                    /[^a-zA-ZÀ-ÿ\s'\-]/g,
                                                    "",
                                                ),
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
                                                styles.inputReadOnly,
                                                errors.age && styles.inputError,
                                            ]}
                                            value={formData.age}
                                            editable={false}
                                            placeholder="Auto-calculated"
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
                                        contact_number: text
                                            .replace(/[^0-9]/g, "")
                                            .slice(0, 11),
                                    }))
                                }
                                placeholder="09123456789"
                                keyboardType="phone-pad"
                                maxLength={11}
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
                            {/* Test Information */}
                            <View
                                style={[
                                    styles.sectionCard,
                                    {
                                        backgroundColor: "#F9FAFB",
                                        borderColor: "#E5E7EB",
                                    },
                                ]}
                            >
                                <Text style={styles.sectionCardTitle}>
                                    Test Information
                                </Text>
                                <View style={styles.infoGrid}>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>
                                            Test Name
                                        </Text>
                                        <Text style={styles.gridValue}>
                                            {selectedTest.test_name}
                                        </Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>
                                            Category
                                        </Text>
                                        <Text style={styles.gridValue}>
                                            {selectedTest.category || "N/A"}
                                        </Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>
                                            Status
                                        </Text>
                                        <View
                                            style={[
                                                styles.testStatus,
                                                {
                                                    alignSelf: "flex-start",
                                                    marginTop: 4,
                                                },
                                                selectedTest.status ===
                                                "pending"
                                                    ? {
                                                          backgroundColor:
                                                              "#FEE2E2",
                                                      }
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
                                                        : selectedTest.status ===
                                                            "cancelled"
                                                          ? {
                                                                backgroundColor:
                                                                    "#F3F4F6",
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
                                                            ? {
                                                                  color: "#1E40AF",
                                                              }
                                                            : selectedTest.status ===
                                                                "cancelled"
                                                              ? {
                                                                    color: "#374151",
                                                                }
                                                              : {
                                                                    color: "#065F46",
                                                                },
                                                ]}
                                            >
                                                {selectedTest.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>
                                            Price
                                        </Text>
                                        <Text style={styles.gridValue}>
                                            ₱
                                            {Number(
                                                selectedTest.price,
                                            ).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Processed By */}
                            {selectedTest.processed_by &&
                                selectedTest.processed_by !== "Pending" && (
                                    <View
                                        style={[
                                            styles.sectionCard,
                                            {
                                                backgroundColor: "#EFF6FF",
                                                borderColor: "#BFDBFE",
                                            },
                                        ]}
                                    >
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 8,
                                                marginBottom: 12,
                                            }}
                                        >
                                            <User size={16} color="#2563EB" />
                                            <Text
                                                style={styles.sectionCardTitle}
                                            >
                                                Processed By
                                            </Text>
                                        </View>
                                        <Text style={styles.gridValue}>
                                            {selectedTest.processed_by}
                                        </Text>
                                    </View>
                                )}

                            {/* Timeline */}
                            <View
                                style={[
                                    styles.sectionCard,
                                    {
                                        backgroundColor: "#F9FAFB",
                                        borderColor: "#E5E7EB",
                                    },
                                ]}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 12,
                                    }}
                                >
                                    <Calendar size={16} color="#6B7280" />
                                    <Text style={styles.sectionCardTitle}>
                                        Timeline
                                    </Text>
                                </View>
                                {selectedTest.started_at ? (
                                    <View style={styles.timelineRow}>
                                        <Text style={styles.timelineLabel}>
                                            Started:
                                        </Text>
                                        <Text style={styles.timelineValue}>
                                            {selectedTest.started_at}
                                        </Text>
                                    </View>
                                ) : null}
                                {selectedTest.completed_at ? (
                                    <View style={styles.timelineRow}>
                                        <Text style={styles.timelineLabel}>
                                            Completed:
                                        </Text>
                                        <Text style={styles.timelineValue}>
                                            {selectedTest.completed_at}
                                        </Text>
                                    </View>
                                ) : null}
                                {selectedTest.released_at ? (
                                    <View style={styles.timelineRow}>
                                        <Text style={styles.timelineLabel}>
                                            Released:
                                        </Text>
                                        <Text style={styles.timelineValue}>
                                            {selectedTest.released_at}
                                        </Text>
                                    </View>
                                ) : null}
                                {!selectedTest.started_at &&
                                    !selectedTest.completed_at &&
                                    !selectedTest.released_at && (
                                        <Text
                                            style={{
                                                color: "#9CA3AF",
                                                fontSize: 14,
                                                fontStyle: "italic",
                                            }}
                                        >
                                            No timeline yet
                                        </Text>
                                    )}
                            </View>

                            {/* Result Values */}
                            {!selectedTest.is_image_only_test &&
                                selectedTest.result_values &&
                                Object.keys(selectedTest.result_values).length >
                                    0 && (
                                    <View
                                        style={[
                                            styles.sectionCard,
                                            {
                                                backgroundColor: "#FFFFFF",
                                                borderColor: "#E5E7EB",
                                            },
                                        ]}
                                    >
                                        <Text style={styles.sectionCardTitle}>
                                            Result Values
                                        </Text>
                                        {Object.entries(
                                            selectedTest.result_values,
                                        ).map(([key, value]: [string, any]) =>
                                            key !== "metadata" ? (
                                                <View
                                                    key={key}
                                                    style={styles.resultRow}
                                                >
                                                    <Text
                                                        style={
                                                            styles.resultLabel
                                                        }
                                                    >
                                                        {key
                                                            .replace(/_/g, " ")
                                                            .replace(
                                                                /\b\w/g,
                                                                (l) =>
                                                                    l.toUpperCase(),
                                                            )}
                                                    </Text>
                                                    <Text
                                                        style={
                                                            styles.resultValue
                                                        }
                                                    >
                                                        {typeof value ===
                                                        "object"
                                                            ? JSON.stringify(
                                                                  value,
                                                              )
                                                            : String(value)}
                                                    </Text>
                                                </View>
                                            ) : null,
                                        )}
                                    </View>
                                )}

                            {/* Normal Range */}
                            {!selectedTest.is_image_only_test &&
                                selectedTest.normal_range && (
                                    <View
                                        style={[
                                            styles.sectionCard,
                                            {
                                                backgroundColor: "#F0FDF4",
                                                borderColor: "#BBF7D0",
                                            },
                                        ]}
                                    >
                                        <Text style={styles.sectionCardTitle}>
                                            Normal Range
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                color: "#374151",
                                            }}
                                        >
                                            {selectedTest.normal_range}
                                        </Text>
                                    </View>
                                )}

                            {/* Notes & Remarks */}
                            {selectedTest.notes && (
                                <View
                                    style={[
                                        styles.sectionCard,
                                        {
                                            backgroundColor: "#FFFBEB",
                                            borderColor: "#FDE68A",
                                        },
                                    ]}
                                >
                                    <Text style={styles.sectionCardTitle}>
                                        Notes & Remarks
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: "#92400E",
                                            lineHeight: 20,
                                        }}
                                    >
                                        {selectedTest.notes}
                                    </Text>
                                </View>
                            )}

                            {/* Correction History */}
                            {renderCorrectionHistory(selectedTest)}

                            {/* Uploaded Images */}
                            <View
                                style={[
                                    styles.sectionCard,
                                    {
                                        backgroundColor: "#FFFFFF",
                                        borderColor: "#E5E7EB",
                                    },
                                ]}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 12,
                                    }}
                                >
                                    <ImageIcon size={16} color="#6B7280" />
                                    <Text style={styles.sectionCardTitle}>
                                        Uploaded Images
                                    </Text>
                                    {(selectedTest.documents?.length ||
                                        selectedTest.images?.length) && (
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: "#9CA3AF",
                                            }}
                                        >
                                            (
                                            {selectedTest.documents?.length ||
                                                selectedTest.images?.length}
                                            )
                                        </Text>
                                    )}
                                </View>
                                {(selectedTest.documents ||
                                    selectedTest.images) &&
                                (selectedTest.documents?.length ||
                                    selectedTest.images?.length) ? (
                                    (selectedTest.documents?.length
                                        ? selectedTest.documents.map((doc) => ({
                                              name: doc.name || "Result Image",
                                              url: resolveFileUrl(
                                                  doc.url || doc.path,
                                              ),
                                              size: doc.size,
                                          }))
                                        : (selectedTest.images || []).map(
                                              (img, index) => ({
                                                  name: `Result Image ${
                                                      index + 1
                                                  }`,
                                                  url:
                                                      typeof img === "string"
                                                          ? resolveFileUrl(img)
                                                          : resolveFileUrl(
                                                                img.url ||
                                                                    img.path,
                                                            ),
                                                  size:
                                                      typeof img === "string"
                                                          ? 0
                                                          : img.size,
                                              }),
                                          )
                                    )
                                        .filter((doc) => !!doc.url)
                                        .map((doc, index) => (
                                            <TouchableOpacity
                                                key={`${doc.name}-${index}`}
                                                style={styles.imageContainer}
                                                onPress={() =>
                                                    setImageViewer({
                                                        visible: true,
                                                        url: doc.url,
                                                        title: doc.name,
                                                    })
                                                }
                                            >
                                                <Image
                                                    source={{
                                                        uri:
                                                            doc.url ||
                                                            undefined,
                                                    }}
                                                    style={styles.resultImage}
                                                    resizeMode="contain"
                                                />
                                                <View
                                                    style={
                                                        styles.imageMetaOverlay
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.imageMetaText
                                                        }
                                                        numberOfLines={1}
                                                    >
                                                        {doc.name}
                                                    </Text>
                                                    {doc.size ? (
                                                        <Text
                                                            style={
                                                                styles.imageMetaSubText
                                                            }
                                                        >
                                                            {Math.max(
                                                                1,
                                                                Math.round(
                                                                    doc.size /
                                                                        1024,
                                                                ),
                                                            )}{" "}
                                                            KB
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </TouchableOpacity>
                                        ))
                                ) : (
                                    <Text
                                        style={{
                                            fontSize: 14,
                                            color: "#9CA3AF",
                                            textAlign: "center",
                                            paddingVertical: 16,
                                            fontStyle: "italic",
                                        }}
                                    >
                                        No images uploaded
                                    </Text>
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

            <Modal
                visible={idViewer.visible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setIdViewer({ visible: false, url: null, title: "" })
                }
            >
                <View style={styles.viewerOverlay}>
                    <View style={styles.viewerCard}>
                        <Text style={styles.viewerTitle}>{idViewer.title}</Text>
                        {idViewer.url ? (
                            <Image
                                source={{ uri: idViewer.url }}
                                style={styles.viewerImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={styles.emptyState}>
                                No image found.
                            </Text>
                        )}
                        <TouchableOpacity
                            style={styles.viewerCloseButton}
                            onPress={() =>
                                setIdViewer({
                                    visible: false,
                                    url: null,
                                    title: "",
                                })
                            }
                        >
                            <Text style={styles.viewerCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={imageViewer.visible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setImageViewer({ visible: false, url: null, title: "" })
                }
            >
                <View style={styles.viewerOverlay}>
                    <View style={styles.viewerCard}>
                        <Text style={styles.viewerTitle}>
                            {imageViewer.title}
                        </Text>
                        {imageViewer.url ? (
                            <Image
                                source={{ uri: imageViewer.url }}
                                style={styles.viewerImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={styles.emptyState}>
                                No image found.
                            </Text>
                        )}
                        <TouchableOpacity
                            style={styles.viewerCloseButton}
                            onPress={() =>
                                setImageViewer({
                                    visible: false,
                                    url: null,
                                    title: "",
                                })
                            }
                        >
                            <Text style={styles.viewerCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
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
                        paddingHorizontal: responsive.horizontalPadding,
                        paddingVertical: 20,
                    }}
                >
                    <View
                        style={{
                            backgroundColor: "#FFFFFF",
                            borderRadius: 16,
                            width: "100%",
                            maxWidth: responsive.isTablet ? 460 : 400,
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
        alignItems: "center",
        marginTop: 8,
    },
    idButton: {
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    idButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1D4ED8",
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
    sectionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    collapsedHintText: {
        color: "#6B7280",
        fontSize: 13,
        fontStyle: "italic",
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
    testHistoryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        gap: 10,
    },
    testHistoryCard: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 12,
        marginTop: 8,
        backgroundColor: "#FFFFFF",
    },
    testHistoryLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 10,
    },
    testHistoryIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    testHistoryName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
    },
    testHistoryDate: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    testHistoryExpandedArea: {
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 10,
        paddingBottom: 12,
        gap: 10,
    },
    testTagWrap: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
    },
    recollectSpecimenBadge: {
        backgroundColor: "#FEF3C7",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    recollectSpecimenText: {
        color: "#92400E",
        fontSize: 11,
        fontWeight: "600",
    },
    rerunBadge: {
        backgroundColor: "#FEE2E2",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    rerunBadgeText: {
        color: "#991B1B",
        fontSize: 11,
        fontWeight: "600",
    },
    refundedBadge: {
        backgroundColor: "#FED7AA",
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    refundedBadgeText: {
        color: "#92400E",
        fontSize: 11,
        fontWeight: "600",
    },
    testActionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    viewResultButton: {
        flex: 1,
        backgroundColor: "#EFF6FF",
        borderColor: "#BFDBFE",
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 8,
        alignItems: "center",
    },
    viewResultButtonText: {
        color: "#1D4ED8",
        fontSize: 12,
        fontWeight: "700",
    },
    notifyButton: {
        backgroundColor: "#D97706",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    notifyButtonText: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "700",
    },
    sectionCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    sectionCardTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 12,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    gridItem: {
        width: "45%",
    },
    gridLabel: {
        fontSize: 11,
        color: "#6B7280",
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
    },
    timelineRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    timelineLabel: {
        fontSize: 14,
        color: "#6B7280",
    },
    timelineValue: {
        fontSize: 14,
        color: "#111827",
        fontWeight: "500",
    },
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
    inputReadOnly: {
        backgroundColor: "#F3F4F6",
        color: "#6B7280",
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
    imageMetaOverlay: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: "rgba(17,24,39,0.72)",
    },
    imageMetaText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "600",
    },
    imageMetaSubText: {
        color: "#D1D5DB",
        fontSize: 11,
        marginTop: 2,
    },
    viewerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    viewerCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
    },
    viewerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 10,
    },
    viewerImage: {
        width: "100%",
        height: 360,
        borderRadius: 10,
        backgroundColor: "#F3F4F6",
    },
    viewerCloseButton: {
        marginTop: 12,
        alignSelf: "flex-end",
        backgroundColor: "#111827",
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    viewerCloseText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "600",
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
    historySectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    versionCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        backgroundColor: "#FFFFFF",
        gap: 6,
    },
    versionCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    versionLabel: {
        fontSize: 13,
        fontWeight: "700",
    },
    versionPrintBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    versionPrintBtnText: {
        fontSize: 11,
        fontWeight: "600",
    },
    versionMeta: {
        fontSize: 11,
    },
    versionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F3F4F6",
    },
    versionRowLabel: {
        fontSize: 12,
        color: "#4B5563",
        flex: 1,
    },
    versionRowValue: {
        fontSize: 12,
        fontWeight: "600",
        color: "#111827",
        flex: 1,
        textAlign: "right",
    },
    versionEmpty: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    versionNotes: {
        fontSize: 11,
        color: "#6B7280",
        fontStyle: "italic",
        marginTop: 2,
    },
});
