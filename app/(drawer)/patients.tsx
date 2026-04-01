import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    FlaskConical,
    Power,
    PowerOff,
    Users,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import { getApiErrorMessage } from "@/utils";
import {
    ConfirmDialog,
    SearchBar,
    SkeletonRow,
    SuccessDialog,
} from "@/components";

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
    id_picture_url?: string | null;
    active_test_info?: {
        queue_number?: string | number | null;
        priority_level?: string | null;
        priority_category?: string | null;
        test_type?: string | null;
        lab_status?: string | null;
        transaction_number?: string | null;
    } | null;
};

type SortKey =
    | "updated_at"
    | "created_at"
    | "first_name"
    | "id"
    | "last_visit"
    | "total_transactions";

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
    { label: "Recent", value: "updated_at" },
    { label: "Name", value: "first_name" },
    { label: "ID", value: "id" },
    { label: "Last Visit", value: "last_visit" },
    { label: "Visits", value: "total_transactions" },
];

type Meta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

function fmtVisitDate(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default function PatientsScreen() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [meta, setMeta] = useState<Meta | null>(null);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortKey>("updated_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [idViewer, setIdViewer] = useState<{
        visible: boolean;
        url: string | null;
        name: string | null;
    }>({ visible: false, url: null, name: null });
    const [expandedPatientIds, setExpandedPatientIds] = useState<number[]>([]);

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
                        sort_by: sortBy,
                        sort_order: sortOrder,
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
        [isRefreshing, search, sortBy, sortOrder],
    );

    useEffect(() => {
        const debounce = setTimeout(() => loadPatients(1, true), 400);
        return () => clearTimeout(debounce);
    }, [loadPatients]);

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

    const toggleExpanded = (patientId: number) => {
        setExpandedPatientIds((prev) =>
            prev.includes(patientId)
                ? prev.filter((id) => id !== patientId)
                : [...prev, patientId],
        );
    };

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

    const renderItem = ({ item }: { item: Patient }) => {
        const isExpanded = expandedPatientIds.includes(item.id);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{item.full_name}</Text>
                        <Text style={styles.meta}>
                            {item.patient_id ?? `#${item.id}`} • {item.gender} •{" "}
                            {item.age} yrs
                        </Text>
                    </View>
                    <View style={styles.headerRightWrap}>
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
                                {(item.is_active ?? true)
                                    ? "Active"
                                    : "Inactive"}
                            </Text>
                        </View>
                        {isExpanded ? (
                            <ChevronDown size={16} color="#6B7280" />
                        ) : (
                            <ChevronRight size={16} color="#6B7280" />
                        )}
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCell}>
                        <Text style={styles.statNum}>
                            {item.total_tests ?? 0}
                        </Text>
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

                <View style={styles.quickInfoBlock}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Latest Test</Text>
                        {item.latest_test_name ? (
                            <View style={styles.latestTestBadge}>
                                <FlaskConical size={11} color="#6B7280" />
                                <Text
                                    style={styles.latestTestText}
                                    numberOfLines={1}
                                >
                                    {item.latest_test_name}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.value}>—</Text>
                        )}
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Valid ID</Text>
                        {item.id_picture_url ? (
                            <TouchableOpacity
                                onPress={() => {
                                    setIdViewer({
                                        visible: true,
                                        url: item.id_picture_url ?? null,
                                        name: item.full_name,
                                    });
                                }}
                                style={styles.idButton}
                            >
                                <Text style={styles.idButtonText}>
                                    View Uploaded ID
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={styles.value}>Not Uploaded</Text>
                        )}
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Lifetime Value</Text>
                        <Text style={styles.value}>
                            ₱{(item.total_spent ?? 0).toLocaleString("en-PH")}
                        </Text>
                    </View>
                </View>

                {isExpanded ? (
                    <View style={styles.expandedSection}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Contact</Text>
                            <Text style={styles.detailValue}>
                                {item.contact_number || "—"}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Address</Text>
                            <Text style={styles.detailValue}>
                                {item.address?.trim() || "—"}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>First Visit</Text>
                            <Text style={styles.detailValue}>
                                {fmtVisitDate(item.first_visit)}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Last Visit</Text>
                            <Text style={styles.detailValue}>
                                {fmtVisitDate(item.last_visit)}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Queue #</Text>
                            <Text style={styles.detailValue}>
                                {item.active_test_info?.queue_number ?? "—"}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                                Type / Apt Priority
                            </Text>
                            <View style={styles.detailChipWrap}>
                                <Text style={styles.opChip}>
                                    {item.active_test_info?.test_type || "—"}
                                </Text>
                                <Text style={styles.opChip}>
                                    {item.active_test_info?.priority_level ||
                                        "—"}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                                Demographic Priority
                            </Text>
                            <View style={styles.detailChipWrap}>
                                <Text style={styles.opChip}>
                                    {item.active_test_info?.priority_category ||
                                        "—"}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => router.push(`/patients/${item.id}`)}
                    >
                        <Text style={styles.detailsBtnText}>View Details</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.expandBtn,
                            isExpanded && styles.expandBtnActive,
                        ]}
                        onPress={() => toggleExpanded(item.id)}
                    >
                        {isExpanded ? (
                            <ChevronDown size={14} color="#1E40AF" />
                        ) : (
                            <ChevronRight size={14} color="#1E40AF" />
                        )}
                        <Text
                            style={[
                                styles.expandBtnText,
                                isExpanded && styles.expandBtnTextActive,
                            ]}
                        >
                            {isExpanded ? "Collapse" : "Expand"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.toggleBtn,
                            (item.is_active ?? true)
                                ? styles.toggleBtnDanger
                                : styles.toggleBtnSuccess,
                        ]}
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
                                (item.is_active ?? true)
                                    ? styles.toggleBtnTextDanger
                                    : styles.toggleBtnTextSuccess,
                            ]}
                        >
                            {(item.is_active ?? true)
                                ? "Deactivate"
                                : "Activate"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const header = useMemo(
        () => (
            <>
                <View style={styles.actionsRow}>
                    <View style={{ flex: 1 }}>
                        <SearchBar
                            placeholder="Search patients..."
                            value={search}
                            onChangeText={setSearch}
                            autoCorrect={false}
                        />
                    </View>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pillsRow}
                    contentContainerStyle={{
                        gap: 6,
                        paddingHorizontal: 0,
                        paddingVertical: 10,
                    }}
                >
                    {SORT_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.pill,
                                sortBy === option.value && styles.pillActive,
                            ]}
                            onPress={() => setSortBy(option.value)}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    sortBy === option.value &&
                                        styles.pillTextActive,
                                ]}
                            >
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={styles.pill}
                        onPress={() =>
                            setSortOrder((prev) =>
                                prev === "asc" ? "desc" : "asc",
                            )
                        }
                    >
                        <Text style={styles.pillText}>
                            {sortOrder === "asc" ? "Order: Asc" : "Order: Desc"}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </>
        ),
        [search, sortBy, sortOrder],
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

            <Modal
                visible={idViewer.visible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setIdViewer({ visible: false, url: null, name: null })
                }
            >
                <View style={styles.viewerOverlay}>
                    <View style={styles.viewerCard}>
                        <Text style={styles.viewerTitle}>
                            ID Picture
                            {idViewer.name ? ` - ${idViewer.name}` : ""}
                        </Text>
                        {idViewer.url ? (
                            <Image
                                source={{ uri: idViewer.url }}
                                style={styles.viewerImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={styles.emptySubtitle}>
                                No image available.
                            </Text>
                        )}
                        <TouchableOpacity
                            style={styles.viewerCloseButton}
                            onPress={() =>
                                setIdViewer({
                                    visible: false,
                                    url: null,
                                    name: null,
                                })
                            }
                        >
                            <Text style={styles.viewerCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
        color: "#111827",
    },
    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    pillsRow: {
        marginTop: 0,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        marginBottom: 12,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    pillActive: { backgroundColor: "#ac3434", borderColor: "#ac3434" },
    pillText: { fontSize: 13, fontWeight: "600", color: "#374151" },
    pillTextActive: { color: "#fff" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 1,
        borderWidth: 1,
        borderColor: "#EAECEF",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    headerRightWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginLeft: 8,
    },
    name: { fontSize: 16, fontWeight: "700", color: "#111827" },
    meta: { color: "#6B7280", marginTop: 2, fontSize: 11 },
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
        backgroundColor: "#F8FAFC",
        borderRadius: 10,
        marginBottom: 14,
        paddingVertical: 8,
    },
    statCell: { flex: 1, alignItems: "center" },
    statDivider: { width: 1, backgroundColor: "#E5E7EB", marginVertical: 4 },
    statNum: { fontSize: 16, fontWeight: "700", color: "#111827" },
    statLbl: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
    quickInfoBlock: {
        gap: 10,
    },
    latestTestBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        maxWidth: "62%",
        minWidth: 56,
    },
    latestTestText: {
        fontSize: 12,
        color: "#334155",
        fontWeight: "600",
        flexShrink: 1,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
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
    expandedSection: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#EEF2F7",
        gap: 9,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    detailLabel: {
        width: 122,
        color: "#64748B",
        fontSize: 11,
        fontWeight: "600",
        paddingTop: 2,
    },
    detailValue: {
        flex: 1,
        color: "#0F172A",
        fontSize: 13,
        fontWeight: "700",
        lineHeight: 18,
    },
    detailChipWrap: {
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    opChip: {
        fontSize: 11,
        color: "#334155",
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        overflow: "hidden",
        fontWeight: "600",
    },
    cardActions: {
        flexDirection: "row",
        gap: 10,
        marginTop: 14,
    },
    detailsBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#FCA5A5",
        borderRadius: 10,
        backgroundColor: "#BE123C",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 38,
        paddingHorizontal: 10,
    },
    detailsBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    expandBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        flex: 0.9,
        minHeight: 38,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#BFDBFE",
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 8,
    },
    expandBtnActive: {
        borderColor: "#93C5FD",
        backgroundColor: "#DBEAFE",
    },
    expandBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1E40AF",
    },
    expandBtnTextActive: {
        color: "#1D4ED8",
    },
    label: { color: "#6B7280", fontSize: 11, fontWeight: "600" },
    value: { color: "#111827", fontWeight: "700", fontSize: 13 },
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
        justifyContent: "center",
        flex: 1,
        gap: 4,
        paddingHorizontal: 10,
        minHeight: 38,
        borderRadius: 10,
        borderWidth: 1,
    },
    toggleBtnText: { fontSize: 12, fontWeight: "600" },
    toggleBtnDanger: {
        backgroundColor: "#FFF5F5",
        borderColor: "#FECACA",
    },
    toggleBtnSuccess: {
        backgroundColor: "#ECFDF5",
        borderColor: "#A7F3D0",
    },
    toggleBtnTextDanger: {
        color: "#EF4444",
    },
    toggleBtnTextSuccess: {
        color: "#10B981",
    },
    viewerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    viewerCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
    },
    viewerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 12,
    },
    viewerImage: {
        width: "100%",
        height: 320,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
    },
    viewerCloseButton: {
        marginTop: 12,
        alignSelf: "flex-end",
        backgroundColor: "#111827",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    viewerCloseText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "600",
    },
});
