import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
    AlertCircle,
    FlaskConical,
    Power,
    PowerOff,
    Search,
    Users,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SkeletonRow, SuccessDialog } from "@/components";

type Patient = {
    id: number;
    patient_id?: string;
    full_name: string;
    age: number;
    gender: string;
    contact_number: string;
    address?: string;
    is_active?: boolean;
    last_visit?: string | null;
    last_visit_amount?: number | null;
    first_visit?: string | null;
    total_transactions: number;
    total_spent: number;
    total_tests?: number;
    active_tests_count?: number;
    completed_tests_count?: number;
    latest_test_name?: string | null;
};

type Meta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

export default function PatientsScreen() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadPatients = useCallback(
        async (page = 1, replace = false) => {
            try {
                if (page === 1 && !isRefreshing) setIsLoading(true);
                if (page > 1) setLoadingMore(true);

                const response = await api.get("/patients", {
                    params: {
                        page,
                        per_page: 15,
                        search: search.trim() || undefined,
                    },
                });

                setMeta(response.data.meta);
                setPatients((prev) =>
                    replace || page === 1
                        ? response.data.data
                        : [...prev, ...response.data.data],
                );
                setLoadError(null);
            } catch (error: any) {
                setLoadError(
                    getApiErrorMessage(error, "Failed to load patients."),
                );
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
                setLoadingMore(false);
            }
        },
        [isRefreshing, search],
    );

    useEffect(() => {
        const debounce = setTimeout(() => loadPatients(1, true), 400);
        return () => clearTimeout(debounce);
    }, [loadPatients, search]);

    useFocusEffect(
        useCallback(() => {
            loadPatients(1, true);
        }, [loadPatients]),
    );

    const onRefresh = () => {
        setIsRefreshing(true);
        loadPatients(1, true);
    };

    const onEndReached = () => {
        if (loadingMore || isLoading) return;
        if (meta && meta.current_page < meta.last_page) {
            loadPatients(meta.current_page + 1);
        }
    };

    const [confirmDialog, setConfirmDialog] = useState({
        visible: false,
        title: "",
        message: "",
        confirmText: "",
        onConfirm: () => {},
        type: "warning" as "warning" | "info" | "danger",
    });
    const [successDialog, setSuccessDialog] = useState({
        visible: false,
        title: "",
        message: "",
        type: "success" as "success" | "error" | "info" | "warning",
    });

    const handleTogglePatient = (patient: Patient) => {
        const active = patient.is_active ?? true;
        setConfirmDialog({
            visible: true,
            title: `${active ? "Deactivate" : "Activate"} Patient`,
            message: `${active ? "Deactivate" : "Activate"} ${patient.full_name}?`,
            confirmText: active ? "DEACTIVATE" : "ACTIVATE",
            type: active ? "warning" : "info",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.post(`/patients/${patient.id}/toggle`);
                    setSuccessDialog({
                        visible: true,
                        title: "Success",
                        message: `Patient ${active ? "deactivated" : "activated"} successfully`,
                        type: "success",
                    });
                    loadPatients(1, true);
                } catch (error: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            error,
                            "Failed to toggle patient status",
                        ),
                        type: "error",
                    });
                }
            },
        });
    };

    const renderItem = ({ item }: { item: Patient }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/patients/${item.id}`)}
        >
            {/* Card header: name + status badge */}
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.full_name}</Text>
                    <Text style={styles.meta}>
                        {item.patient_id ?? `#${item.id}`} • {item.gender} •{" "}
                        {item.age} yrs
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        (item.is_active ?? true)
                            ? styles.statusActive
                            : styles.statusInactive,
                    ]}
                >
                    <Text
                        style={[
                            styles.statusBadgeText,
                            (item.is_active ?? true)
                                ? { color: "#166534" }
                                : { color: "#991B1B" },
                        ]}
                    >
                        {(item.is_active ?? true) ? "Active" : "Inactive"}
                    </Text>
                </View>
            </View>

            {/* Test stats row */}
            <View style={styles.statsRow}>
                <View style={styles.statCell}>
                    <Text style={styles.statNum}>{item.total_tests ?? 0}</Text>
                    <Text style={styles.statLbl}>Total Tests</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                    <Text style={[styles.statNum, { color: "#EAB308" }]}>
                        {item.active_tests_count ?? 0}
                    </Text>
                    <Text style={styles.statLbl}>Active</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                    <Text style={[styles.statNum, { color: "#22C55E" }]}>
                        {item.completed_tests_count ?? 0}
                    </Text>
                    <Text style={styles.statLbl}>Completed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                    <Text style={styles.statNum}>
                        {item.total_transactions}
                    </Text>
                    <Text style={styles.statLbl}>Visits</Text>
                </View>
            </View>

            {/* Info rows */}
            <View style={styles.row}>
                <Text style={styles.label}>Contact</Text>
                <Text style={styles.value}>{item.contact_number || "N/A"}</Text>
            </View>
            {!!item.address && (
                <View style={styles.row}>
                    <Text style={styles.label}>Address</Text>
                    <Text
                        style={[styles.value, { flex: 1, textAlign: "right" }]}
                        numberOfLines={1}
                    >
                        {item.address}
                    </Text>
                </View>
            )}
            <View style={styles.row}>
                <Text style={styles.label}>First Visit</Text>
                <Text style={styles.value}>
                    {item.first_visit
                        ? new Date(item.first_visit).toLocaleDateString()
                        : "—"}
                </Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Last Visit</Text>
                <Text style={styles.value}>
                    {item.last_visit
                        ? new Date(item.last_visit).toLocaleDateString()
                        : "—"}
                </Text>
            </View>
            {!!item.latest_test_name && (
                <View style={styles.row}>
                    <Text style={styles.label}>Latest Test</Text>
                    <View style={styles.latestTestBadge}>
                        <FlaskConical size={11} color="#6B7280" />
                        <Text style={styles.latestTestText}>
                            {item.latest_test_name}
                        </Text>
                    </View>
                </View>
            )}
            <View style={styles.row}>
                <Text style={styles.label}>Lifetime Value</Text>
                <Text
                    style={[
                        styles.value,
                        { fontWeight: "700", color: "#111827" },
                    ]}
                >
                    ₱{(item.total_spent ?? 0).toLocaleString("en-PH")}
                </Text>
            </View>

            <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => handleTogglePatient(item)}
            >
                {(item.is_active ?? true) ? (
                    <PowerOff size={14} color="#EF4444" />
                ) : (
                    <Power size={14} color="#10B981" />
                )}
                <Text
                    style={[
                        styles.toggleBtnText,
                        {
                            color:
                                (item.is_active ?? true)
                                    ? "#EF4444"
                                    : "#10B981",
                        },
                    ]}
                >
                    {(item.is_active ?? true) ? "Deactivate" : "Activate"}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const header = useMemo(
        () => (
            <>
                <View style={styles.actionsRow}>
                    <View style={[styles.searchContainer, { flex: 1 }]}>
                        <Search color="#9CA3AF" size={18} />
                        <TextInput
                            placeholder="Search patients"
                            placeholderTextColor="#9CA3AF"
                            style={styles.searchInput}
                            value={search}
                            onChangeText={setSearch}
                            autoCorrect={false}
                        />
                    </View>
                </View>
            </>
        ),
        [search],
    );

    if (isLoading && !patients.length) {
        return (
            <View style={styles.container}>
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <SkeletonRow count={6} />
                </View>
            </View>
        );
    }

    if (loadError && !patients.length) {
        return (
            <View style={styles.errorContainer}>
                <AlertCircle color="#EF4444" size={36} />
                <Text style={styles.errorTitle}>Unable to load patients</Text>
                <Text style={styles.errorMessage}>{loadError}</Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => loadPatients(1, true)}
                >
                    <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={patients}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
                ListHeaderComponent={header}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Users color="#D1D5DB" size={42} />
                        <Text style={styles.emptyTitle}>No patients found</Text>
                        <Text style={styles.emptySubtitle}>
                            Try adjusting your search keywords.
                        </Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                    />
                }
                onEndReached={onEndReached}
                onEndReachedThreshold={0.2}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 16 }}>
                            <ActivityIndicator color="#ac3434" />
                        </View>
                    ) : null
                }
            />
            <ConfirmDialog
                visible={confirmDialog.visible}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() =>
                    setConfirmDialog((d) => ({ ...d, visible: false }))
                }
            />
            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                autoClose={successDialog.type === "success"}
                onClose={() =>
                    setSuccessDialog((d) => ({ ...d, visible: false }))
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: "#111827",
        fontSize: 16,
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
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
    name: { fontSize: 16, fontWeight: "700", color: "#111827" },
    meta: { color: "#6B7280", marginTop: 2, fontSize: 12 },
    statusBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: "flex-start",
        marginTop: 2,
    },
    statusActive: { backgroundColor: "#DCFCE7" },
    statusInactive: { backgroundColor: "#FEE2E2" },
    statusBadgeText: { fontSize: 11, fontWeight: "700" },
    statsRow: {
        flexDirection: "row",
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        marginBottom: 10,
        paddingVertical: 8,
    },
    statCell: { flex: 1, alignItems: "center" },
    statDivider: { width: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },
    statNum: { fontSize: 16, fontWeight: "700", color: "#111827" },
    statLbl: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
    latestTestBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    latestTestText: { fontSize: 12, color: "#374151", fontWeight: "500" },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    label: { color: "#6B7280", fontSize: 13 },
    value: { color: "#111827", fontWeight: "600" },
    emptyState: {
        alignItems: "center",
        paddingVertical: 80,
        gap: 8,
    },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
    emptySubtitle: { color: "#6B7280" },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 12,
    },
    errorTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: "#111827",
        textAlign: "center",
    },
    errorMessage: { fontSize: 14, color: "#6B7280", textAlign: "center" },
    retryBtn: {
        marginTop: 4,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: "#ac3434",
        borderRadius: 10,
    },
    retryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
    toggleBtn: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-end",
        gap: 4,
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    toggleBtnText: { fontSize: 12, fontWeight: "600" },
});
