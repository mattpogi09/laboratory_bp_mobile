import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    FileText,
    X,
    XCircle,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
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
import type { RefundRequest, RefundStatus } from "@/types";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SkeletonRow, SuccessDialog } from "@/components";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: { label: string; value: string }[] = [
    { label: "All Active", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Denied", value: "denied" },
];

const STATUS_COLORS: Record<
    RefundStatus | string,
    { bg: string; text: string }
> = {
    pending: { bg: "#FEF9C3", text: "#854D0E" },
    approved: { bg: "#DCFCE7", text: "#166534" },
    denied: { bg: "#FEE2E2", text: "#991B1B" },
    completed: { bg: "#F3F4F6", text: "#374151" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RefundsScreen() {
    const [refunds, setRefunds] = useState<RefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const [statusFilter, setStatusFilter] = useState("");

    // Detail modal
    const [selected, setSelected] = useState<RefundRequest | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Deny note input
    const [denyNote, setDenyNote] = useState("");
    const [showDenyInput, setShowDenyInput] = useState(false);

    // Action states
    const [actionLoading, setActionLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Dialogs
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

    // -------------------------------------------------------------------------
    // Data loading
    // -------------------------------------------------------------------------

    const loadRefunds = useCallback(
        async (page = 1, replace = false) => {
            try {
                if (page === 1 && !refreshing) setLoading(true);
                if (page > 1) setLoadingMore(true);

                const res = await api.get("/refunds", {
                    params: {
                        page,
                        status: statusFilter || undefined,
                    },
                });

                const { data, meta } = res.data;
                setCurrentPage(meta.current_page);
                setLastPage(meta.last_page);
                setRefunds((prev) =>
                    replace || page === 1 ? data : [...prev, ...data],
                );
                setLoadError(null);
            } catch (err: any) {
                const msg = getApiErrorMessage(err, "Failed to load refunds.");
                if (page === 1 && !refreshing) {
                    setLoadError(msg);
                } else {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: msg,
                        type: "error",
                    });
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [statusFilter, refreshing],
    );

    useFocusEffect(
        useCallback(() => {
            loadRefunds(1, true);
        }, [loadRefunds]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadRefunds(1, true);
    };

    const onEndReached = () => {
        if (loadingMore || loading) return;
        if (currentPage < lastPage) loadRefunds(currentPage + 1);
    };

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    const handleApprove = (refund: RefundRequest) => {
        setConfirmDialog({
            visible: true,
            title: "Approve Refund",
            message: `Approve ₱${Number(refund.refund_amount).toLocaleString(
                "en-PH",
                {
                    minimumFractionDigits: 2,
                },
            )} refund for ${refund.transaction?.patient?.full_name ?? "patient"}?`,
            confirmText: "APPROVE",
            type: "info",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                setActionLoading(true);
                try {
                    await api.post(`/refunds/${refund.id}/approve`);
                    setShowDetail(false);
                    setSuccessDialog({
                        visible: true,
                        title: "Approved",
                        message: "Refund request has been approved.",
                        type: "success",
                    });
                    loadRefunds(1, true);
                } catch (err: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to approve refund.",
                        ),
                        type: "error",
                    });
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    const handleDenyConfirm = (refund: RefundRequest) => {
        if (!denyNote.trim()) {
            setSuccessDialog({
                visible: true,
                title: "Validation Error",
                message: "A denial reason is required.",
                type: "error",
            });
            return;
        }

        setConfirmDialog({
            visible: true,
            title: "Deny Refund",
            message: `Deny ₱${Number(refund.refund_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} refund for ${refund.transaction?.patient?.full_name ?? "patient"}?\n\nThis action cannot be undone.`,
            confirmText: "DENY",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                setActionLoading(true);
                try {
                    await api.post(`/refunds/${refund.id}/deny`, {
                        admin_notes: denyNote.trim(),
                    });
                    setShowDenyInput(false);
                    setDenyNote("");
                    setShowDetail(false);
                    setSuccessDialog({
                        visible: true,
                        title: "Denied",
                        message: "Refund request has been denied.",
                        type: "success",
                    });
                    loadRefunds(1, true);
                } catch (err: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to deny refund.",
                        ),
                        type: "error",
                    });
                } finally {
                    setActionLoading(false);
                }
            },
        });
    };

    // -------------------------------------------------------------------------
    // Rendering helpers
    // -------------------------------------------------------------------------

    const formatCurrency = (amount: number) =>
        `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "2-digit",
            });
        } catch {
            return iso;
        }
    };

    const statusBadge = (status: RefundStatus | string) => {
        const c = STATUS_COLORS[status] ?? { bg: "#F3F4F6", text: "#374151" };
        return (
            <View style={[styles.badge, { backgroundColor: c.bg }]}>
                <Text style={[styles.badgeText, { color: c.text }]}>
                    {status.toUpperCase()}
                </Text>
            </View>
        );
    };

    const renderItem = ({ item }: { item: RefundRequest }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                setSelected(item);
                setShowDenyInput(false);
                setDenyNote("");
                setShowDetail(true);
            }}
        >
            <View style={styles.cardRow}>
                <FileText size={18} color="#6B7280" />
                <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.transaction?.patient?.full_name ?? "Unknown Patient"}
                </Text>
                {statusBadge(item.status)}
            </View>

            <View style={styles.cardMeta}>
                <Text style={styles.cardMono}>
                    #{item.transaction?.transaction_number ?? "—"}
                </Text>
                <Text style={styles.cardAmount}>
                    {formatCurrency(item.refund_amount)}
                </Text>
            </View>

            <Text style={styles.cardLabel}>
                {item.refund_type === "full" ? "Full Refund" : "Partial Refund"}{" "}
                · {formatDate(item.created_at)}
            </Text>
            <Text style={styles.cardReason} numberOfLines={2}>
                {item.reason}
            </Text>
        </TouchableOpacity>
    );

    // -------------------------------------------------------------------------
    // Main render
    // -------------------------------------------------------------------------

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Refund Requests</Text>
            </View>

            {/* Status filter tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabBar}
                contentContainerStyle={styles.tabBarContent}
            >
                {STATUS_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.value}
                        style={[
                            styles.tab,
                            statusFilter === tab.value && styles.tabActive,
                        ]}
                        onPress={() => {
                            setStatusFilter(tab.value);
                            setRefunds([]);
                        }}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                statusFilter === tab.value &&
                                    styles.tabTextActive,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* List */}
            {loadError && !refunds.length ? (
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>
                        Unable to load refunds
                    </Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setLoadError(null);
                            loadRefunds(1, true);
                        }}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : loading && !refreshing ? (
                <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                    <SkeletonRow count={6} />
                </View>
            ) : (
                <FlatList
                    data={refunds}
                    keyExtractor={(r) => String(r.id)}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <AlertTriangle size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>
                                No refund requests
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: "#9CA3AF",
                                    textAlign: "center",
                                    marginTop: 4,
                                }}
                            >
                                All requests have been processed
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator
                                size="small"
                                color="#3B82F6"
                                style={{ marginVertical: 12 }}
                            />
                        ) : null
                    }
                    contentContainerStyle={{ paddingBottom: 24 }}
                />
            )}

            {/* Detail modal */}
            <Modal
                visible={showDetail}
                animationType="slide"
                transparent
                onRequestClose={() => setShowDetail(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <ScrollView>
                            {/* Modal header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    Refund Details
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowDetail(false)}
                                >
                                    <X size={22} color="#374151" />
                                </TouchableOpacity>
                            </View>

                            {selected && (
                                <>
                                    {/* Status */}
                                    <View style={styles.detailSection}>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Status
                                            </Text>
                                            {statusBadge(selected.status)}
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Type
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {selected.refund_type === "full"
                                                    ? "Full Refund"
                                                    : "Partial Refund"}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Amount
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.detailValue,
                                                    styles.amount,
                                                ]}
                                            >
                                                {formatCurrency(
                                                    selected.refund_amount,
                                                )}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Transaction Total
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {formatCurrency(
                                                    selected.total_transaction_amount,
                                                )}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Transaction info */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.sectionLabel}>
                                            Transaction
                                        </Text>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Patient
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {selected.transaction?.patient
                                                    ?.full_name ?? "—"}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Transaction #
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {selected.transaction
                                                    ?.transaction_number ?? "—"}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Requested by
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {selected.requested_by?.name ??
                                                    "—"}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Date
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {formatDate(
                                                    selected.created_at,
                                                )}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Reason */}
                                    <View style={styles.detailSection}>
                                        <Text style={styles.sectionLabel}>
                                            Reason
                                        </Text>
                                        <Text style={styles.reasonText}>
                                            {selected.reason}
                                        </Text>
                                    </View>

                                    {/* Tests included */}
                                    {selected.tests &&
                                        selected.tests.length > 0 && (
                                            <View style={styles.detailSection}>
                                                <Text
                                                    style={styles.sectionLabel}
                                                >
                                                    {selected.refund_type ===
                                                    "full"
                                                        ? "Tests Included in Refund"
                                                        : "Tests Selected for Refund"}
                                                </Text>
                                                {selected.tests.map((test) => (
                                                    <View
                                                        key={test.id}
                                                        style={[
                                                            styles.detailRow,
                                                            styles.testRow,
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.detailLabel,
                                                                {
                                                                    color: "#111827",
                                                                },
                                                            ]}
                                                        >
                                                            {test.test_name}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.detailValue,
                                                                {
                                                                    color: "#374151",
                                                                },
                                                            ]}
                                                        >
                                                            ₱
                                                            {Number(
                                                                test.price,
                                                            ).toLocaleString(
                                                                "en-PH",
                                                            )}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                    {/* Admin notes if already processed */}
                                    {selected.admin_notes ? (
                                        <View style={styles.detailSection}>
                                            <Text style={styles.sectionLabel}>
                                                Admin Notes
                                            </Text>
                                            <Text style={styles.reasonText}>
                                                {selected.admin_notes}
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Actions for pending */}
                                    {selected.status === "pending" && (
                                        <View style={styles.detailSection}>
                                            {/* Approve */}
                                            <TouchableOpacity
                                                style={[
                                                    styles.actionBtn,
                                                    styles.approveBtn,
                                                ]}
                                                onPress={() =>
                                                    handleApprove(selected)
                                                }
                                                disabled={actionLoading}
                                            >
                                                <CheckCircle
                                                    size={18}
                                                    color="#fff"
                                                />
                                                <Text
                                                    style={styles.actionBtnText}
                                                >
                                                    Approve Refund
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Deny */}
                                            {!showDenyInput ? (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.actionBtn,
                                                        styles.denyBtn,
                                                    ]}
                                                    onPress={() =>
                                                        setShowDenyInput(true)
                                                    }
                                                    disabled={actionLoading}
                                                >
                                                    <XCircle
                                                        size={18}
                                                        color="#fff"
                                                    />
                                                    <Text
                                                        style={
                                                            styles.actionBtnText
                                                        }
                                                    >
                                                        Deny Refund
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View
                                                    style={
                                                        styles.denyInputWrapper
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.detailLabel
                                                        }
                                                    >
                                                        Reason for Denial *
                                                    </Text>
                                                    <TextInput
                                                        style={styles.denyInput}
                                                        value={denyNote}
                                                        onChangeText={
                                                            setDenyNote
                                                        }
                                                        placeholder="Enter denial reason..."
                                                        placeholderTextColor="#9CA3AF"
                                                        multiline
                                                        numberOfLines={3}
                                                    />
                                                    <View
                                                        style={
                                                            styles.denyActions
                                                        }
                                                    >
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.actionBtn,
                                                                styles.denyBtn,
                                                                {
                                                                    flex: 1,
                                                                    marginRight: 8,
                                                                },
                                                            ]}
                                                            onPress={() =>
                                                                handleDenyConfirm(
                                                                    selected,
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoading
                                                            }
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.actionBtnText
                                                                }
                                                            >
                                                                Confirm Deny
                                                            </Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.actionBtn,
                                                                styles.cancelBtn,
                                                                { flex: 1 },
                                                            ]}
                                                            onPress={() => {
                                                                setShowDenyInput(
                                                                    false,
                                                                );
                                                                setDenyNote("");
                                                            }}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.actionBtnText,
                                                                    {
                                                                        color: "#374151",
                                                                    },
                                                                ]}
                                                            >
                                                                Cancel
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Dialogs */}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },

    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },

    // Tab bar
    tabBar: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    tabBarContent: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
    },
    tabActive: { backgroundColor: "#3B82F6" },
    tabText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
    tabTextActive: { color: "#fff" },

    // Centered empty / loading
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: { fontSize: 15, color: "#9CA3AF" },

    // Card
    card: {
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        gap: 6,
    },
    cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
    cardMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardMono: { fontSize: 12, color: "#6B7280", fontFamily: "monospace" },
    cardAmount: { fontSize: 15, fontWeight: "700", color: "#1D4ED8" },
    cardLabel: { fontSize: 12, color: "#9CA3AF" },
    cardReason: { fontSize: 13, color: "#374151" },

    // Badge
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    badgeText: { fontSize: 11, fontWeight: "700" },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
        paddingBottom: 24,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },

    // Detail sections
    detailSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        gap: 8,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#6B7280",
        marginBottom: 4,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    testRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    detailLabel: { fontSize: 13, color: "#6B7280", flex: 1 },
    detailValue: {
        fontSize: 13,
        color: "#111827",
        fontWeight: "500",
        flex: 2,
        textAlign: "right",
    },
    amount: { fontWeight: "700", color: "#1D4ED8", fontSize: 16 },
    reasonText: { fontSize: 14, color: "#374151", lineHeight: 20 },

    // Action buttons
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 8,
    },
    approveBtn: { backgroundColor: "#22C55E" },
    denyBtn: { backgroundColor: "#EF4444" },
    cancelBtn: { backgroundColor: "#E5E7EB" },
    actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },

    // Deny input
    denyInputWrapper: { gap: 8 },
    denyInput: {
        borderWidth: 1,
        borderColor: "#D1FAE5",
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: "#111827",
        textAlignVertical: "top",
        backgroundColor: "#F9FAFB",
    },
    denyActions: { flexDirection: "row" },
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
});
