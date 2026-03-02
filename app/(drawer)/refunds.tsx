import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    ChevronRight,
    FileText,
    Search,
    X,
    XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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
    { label: "Pending",    value: "pending" },
    { label: "Approved",   value: "approved" },
    { label: "Denied",     value: "denied" },
    { label: "Completed",  value: "completed" },
];

const STATUS_COLORS: Record<
    RefundStatus | string,
    { bg: string; text: string; accent: string }
> = {
    pending: { bg: "#FFFBEB", text: "#92400E", accent: "#F59E0B" },
    approved: { bg: "#ECFDF5", text: "#065F46", accent: "#10B981" },
    denied: { bg: "#FFF1F2", text: "#9F1239", accent: "#F43F5E" },
    completed: { bg: "#F0F9FF", text: "#075985", accent: "#0EA5E9" },
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

    // Search
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearchChange = (text: string) => {
        setSearchInput(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setSearchQuery(text.trim()), 400);
    };

    const clearSearch = () => {
        setSearchInput("");
        setSearchQuery("");
    };

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
                        search: searchQuery || undefined,
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
        [statusFilter, searchQuery, refreshing],
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
        const c = STATUS_COLORS[status] ?? {
            bg: "#F3F4F6",
            text: "#374151",
            accent: "#9CA3AF",
        };
        return (
            <View style={[styles.badge, { backgroundColor: c.bg }]}>
                <View
                    style={[styles.badgeDot, { backgroundColor: c.accent }]}
                />
                <Text style={[styles.badgeText, { color: c.text }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
            </View>
        );
    };

    const renderItem = ({ item }: { item: RefundRequest }) => {
        const c = STATUS_COLORS[item.status] ?? {
            bg: "#F3F4F6",
            text: "#374151",
            accent: "#9CA3AF",
        };
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    setSelected(item);
                    setShowDenyInput(false);
                    setDenyNote("");
                    setShowDetail(true);
                }}
                activeOpacity={0.72}
            >
                {/* Left status accent */}
                <View
                    style={[styles.cardAccent, { backgroundColor: c.accent }]}
                />

                <View style={styles.cardBody}>
                    {/* Top row: name + badge */}
                    <View style={styles.cardTopRow}>
                        <View style={styles.cardNameRow}>
                            <FileText size={14} color={c.accent} />
                            <Text style={styles.cardPatient} numberOfLines={1}>
                                {item.transaction?.patient?.full_name ??
                                    "Unknown Patient"}
                            </Text>
                        </View>
                        {statusBadge(item.status)}
                    </View>

                    {/* TXN number + amount */}
                    <View style={styles.cardMeta}>
                        <Text style={styles.cardMono}>
                            #{item.transaction?.transaction_number ?? "—"}
                        </Text>
                        <Text style={[styles.cardAmount, { color: c.accent }]}>
                            {formatCurrency(item.refund_amount)}
                        </Text>
                    </View>

                    {/* Type + date */}
                    <View style={styles.cardFooter}>
                        <Text style={styles.cardLabel}>
                            {item.refund_type === "full"
                                ? "Full Refund"
                                : "Partial Refund"}
                            {"  ·  "}
                            {formatDate(item.created_at)}
                        </Text>
                        <ChevronRight size={14} color="#D1D5DB" />
                    </View>

                    {/* Reason snippet */}
                    {item.reason ? (
                        <Text style={styles.cardReason} numberOfLines={1}>
                            {item.reason}
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    // -------------------------------------------------------------------------
    // Main render
    // -------------------------------------------------------------------------

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Refund Requests</Text>
                {refunds.length > 0 && !loading && (
                    <Text style={styles.headerCount}>
                        {refunds.length} request
                        {refunds.length !== 1 ? "s" : ""}
                    </Text>
                )}
            </View>

            {/* Status filter tabs — horizontal scroll for 5 tabs */}
            <View style={styles.tabBarWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabBarContent}
                    style={styles.tabBarScroll}
                    bounces={false}
                >
                    {STATUS_TABS.map((tab) => {
                        const active = statusFilter === tab.value;
                        return (
                            <TouchableOpacity
                                key={tab.value}
                                style={styles.tabItem}
                                onPress={() => setStatusFilter(tab.value)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        active && styles.tabTextActive,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                                {active && <View style={styles.tabUnderline} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
                <Search size={15} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    value={searchInput}
                    onChangeText={handleSearchChange}
                    placeholder="Search patient or TXN#..."
                    placeholderTextColor="#CBD5E1"
                    returnKeyType="search"
                />
                {searchInput.length > 0 && (
                    <TouchableOpacity
                        onPress={clearSearch}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                        <X size={15} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

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
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : loading && !refreshing ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                    <SkeletonRow count={5} />
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
                            tintColor="#2563EB"
                        />
                    }
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <AlertTriangle size={44} color="#E5E7EB" />
                            <Text style={styles.emptyTitle}>
                                No refund requests
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {searchQuery
                                    ? `No results for "${searchQuery}".`
                                    : statusFilter === ""
                                      ? "There are no active refund requests."
                                      : statusFilter === "completed"
                                        ? "No completed refunds yet."
                                        : `No ${statusFilter} requests found.`}
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator
                                size="small"
                                color="#2563EB"
                                style={{ marginVertical: 16 }}
                            />
                        ) : null
                    }
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* ── Detail bottom sheet ── */}
            <Modal
                visible={showDetail}
                animationType="slide"
                transparent
                onRequestClose={() => setShowDetail(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowDetail(false)}
                    />
                    <View style={styles.modalContainer}>
                        {/* Drag handle */}
                        <View style={styles.dragHandle} />

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            {/* Modal header */}
                            <View style={styles.modalHeader}>
                                <View style={styles.modalHeaderLeft}>
                                    <Text style={styles.modalTitle}>
                                        Refund Details
                                    </Text>
                                    {selected && statusBadge(selected.status)}
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowDetail(false)}
                                    style={styles.closeBtn}
                                    hitSlop={{
                                        top: 8,
                                        right: 8,
                                        bottom: 8,
                                        left: 8,
                                    }}
                                >
                                    <X size={18} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            {selected && (
                                <>
                                    {/* Amount hero */}
                                    <View style={styles.amountHero}>
                                        <Text style={styles.amountLabel}>
                                            Refund Amount
                                        </Text>
                                        <Text style={styles.amountValue}>
                                            {formatCurrency(
                                                selected.refund_amount,
                                            )}
                                        </Text>
                                        <Text style={styles.amountSub}>
                                            of{" "}
                                            {formatCurrency(
                                                selected.total_transaction_amount,
                                            )}{" "}
                                            total
                                        </Text>
                                    </View>

                                    {/* Key info rows */}
                                    <View style={styles.infoBlock}>
                                        <InfoRow
                                            label="Patient"
                                            value={
                                                selected.transaction?.patient
                                                    ?.full_name ?? "—"
                                            }
                                        />
                                        <InfoRow
                                            label="Transaction"
                                            value={`#${selected.transaction?.transaction_number ?? "—"}`}
                                            mono
                                        />
                                        <InfoRow
                                            label="Type"
                                            value={
                                                selected.refund_type === "full"
                                                    ? "Full Refund"
                                                    : "Partial Refund"
                                            }
                                        />
                                        <InfoRow
                                            label="Requested by"
                                            value={
                                                selected.requested_by?.name ??
                                                "—"
                                            }
                                        />
                                        <InfoRow
                                            label="Date"
                                            value={formatDate(
                                                selected.created_at,
                                            )}
                                            last
                                        />
                                    </View>

                                    {/* Reason */}
                                    <View style={styles.textBlock}>
                                        <Text style={styles.blockLabel}>
                                            Reason
                                        </Text>
                                        <Text style={styles.blockText}>
                                            {selected.reason}
                                        </Text>
                                    </View>

                                    {/* Tests included */}
                                    {selected.tests &&
                                        selected.tests.length > 0 && (
                                            <View style={styles.testsBlock}>
                                                <Text style={styles.blockLabel}>
                                                    {selected.refund_type ===
                                                    "full"
                                                        ? "Tests Included in Refund"
                                                        : "Tests Selected for Refund"}
                                                </Text>
                                                {selected.tests.map(
                                                    (test, idx) => (
                                                        <View
                                                            key={test.id}
                                                            style={[
                                                                styles.testItem,
                                                                idx ===
                                                                    selected
                                                                        .tests
                                                                        .length -
                                                                        1 && {
                                                                    borderBottomWidth: 0,
                                                                },
                                                            ]}
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.testName
                                                                }
                                                            >
                                                                {test.test_name}
                                                            </Text>
                                                            <Text
                                                                style={
                                                                    styles.testPrice
                                                                }
                                                            >
                                                                ₱
                                                                {Number(
                                                                    test.price,
                                                                ).toLocaleString(
                                                                    "en-PH",
                                                                )}
                                                            </Text>
                                                        </View>
                                                    ),
                                                )}
                                            </View>
                                        )}

                                    {/* Admin notes if already processed */}
                                    {selected.admin_notes ? (
                                        <View style={styles.textBlock}>
                                            <Text style={styles.blockLabel}>
                                                Admin Notes
                                            </Text>
                                            <Text style={styles.blockText}>
                                                {selected.admin_notes}
                                            </Text>
                                        </View>
                                    ) : null}

                                    {/* Actions for pending */}
                                    {selected.status === "pending" && (
                                        <View style={styles.actionsBlock}>
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
                                                activeOpacity={0.8}
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
                                                    activeOpacity={0.8}
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
                                                        style={styles.denyLabel}
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
                                                                styles.cancelBtn,
                                                                {
                                                                    flex: 1,
                                                                    marginRight: 8,
                                                                },
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
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.actionBtn,
                                                                styles.denyBtn,
                                                                { flex: 1 },
                                                            ]}
                                                            onPress={() =>
                                                                handleDenyConfirm(
                                                                    selected,
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoading
                                                            }
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text
                                                                style={
                                                                    styles.actionBtnText
                                                                }
                                                            >
                                                                Confirm Deny
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
// Small sub-component for modal info rows
// ---------------------------------------------------------------------------

function InfoRow({
    label,
    value,
    mono = false,
    last = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
    last?: boolean;
}) {
    return (
        <View style={[infoRowStyles.row, last && infoRowStyles.lastRow]}>
            <Text style={infoRowStyles.label}>{label}</Text>
            <Text
                style={[infoRowStyles.value, mono && infoRowStyles.mono]}
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}

const infoRowStyles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F3F4F6",
    },
    lastRow: { borderBottomWidth: 0 },
    label: { fontSize: 13, color: "#9CA3AF", flex: 1 },
    value: {
        fontSize: 13,
        color: "#111827",
        fontWeight: "500",
        flex: 2,
        textAlign: "right",
    },
    mono: { fontFamily: "monospace", fontSize: 12 },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },

    // ── Header ──
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        backgroundColor: "#fff",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0F172A",
        letterSpacing: -0.4,
    },
    headerCount: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },

    // ── Tab bar — horizontal scroll ──
    tabBarWrapper: {
        backgroundColor: "#fff",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E2E8F0",
    },
    tabBarScroll: { height: 46 },
    tabBarContent: { paddingHorizontal: 4 },
    tabItem: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 18,
        height: 46,
        position: "relative",
    },
    tabText: { fontSize: 13, fontWeight: "500", color: "#94A3B8" },
    tabTextActive: { color: "#2563EB", fontWeight: "700" },
    tabUnderline: {
        position: "absolute",
        bottom: 0,
        left: 8,
        right: 8,
        height: 2.5,
        borderRadius: 2,
        backgroundColor: "#2563EB",
    },

    // ── Search bar ──
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginHorizontal: 16,
        marginVertical: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: "#0F172A",
        paddingVertical: 0,
    },

    // ── List ──
    listContent: { paddingTop: 8, paddingBottom: 32 },

    // ── Card ──
    card: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 10,
        backgroundColor: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardAccent: { width: 4 },
    cardBody: { flex: 1, padding: 14, gap: 5 },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    cardNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    cardPatient: { fontSize: 15, fontWeight: "600", color: "#0F172A", flex: 1 },
    cardMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    cardMono: {
        fontSize: 11,
        color: "#94A3B8",
        fontFamily: "monospace",
        letterSpacing: 0.2,
    },
    cardAmount: { fontSize: 15, fontWeight: "700" },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardLabel: { fontSize: 12, color: "#94A3B8" },
    cardReason: { fontSize: 12, color: "#64748B", fontStyle: "italic" },

    // ── Badge ──
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        gap: 4,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: "600" },

    // ── Empty / error ──
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 72,
        gap: 8,
    },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: "#94A3B8" },
    emptySubtitle: {
        fontSize: 13,
        color: "#CBD5E1",
        textAlign: "center",
        paddingHorizontal: 32,
    },
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
        color: "#0F172A",
        textAlign: "center",
    },
    errorMessage: { fontSize: 14, color: "#64748B", textAlign: "center" },
    retryBtn: {
        marginTop: 4,
        paddingHorizontal: 28,
        paddingVertical: 11,
        backgroundColor: "#2563EB",
        borderRadius: 10,
    },
    retryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

    // ── Modal ──
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(15,23,42,0.5)",
    },
    modalContainer: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "92%",
        paddingBottom: 34,
    },
    dragHandle: {
        alignSelf: "center",
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#E2E8F0",
        marginTop: 10,
        marginBottom: 4,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F1F5F9",
    },
    modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },

    // Amount hero
    amountHero: {
        alignItems: "center",
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: "#F8FAFC",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#E2E8F0",
        gap: 2,
    },
    amountLabel: {
        fontSize: 12,
        color: "#94A3B8",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    amountValue: {
        fontSize: 34,
        fontWeight: "800",
        color: "#0F172A",
        letterSpacing: -1,
    },
    amountSub: { fontSize: 13, color: "#94A3B8" },

    // Info block
    infoBlock: {
        paddingHorizontal: 20,
        paddingVertical: 4,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F1F5F9",
    },

    // Text block (reason / admin notes)
    textBlock: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F1F5F9",
        gap: 6,
    },
    blockLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#94A3B8",
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    blockText: { fontSize: 14, color: "#374151", lineHeight: 20 },

    // Tests block
    testsBlock: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F1F5F9",
        gap: 8,
    },
    testItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#F1F5F9",
    },
    testName: { fontSize: 13, color: "#0F172A", fontWeight: "500", flex: 1 },
    testPrice: { fontSize: 13, color: "#2563EB", fontWeight: "600" },

    // Actions block
    actionsBlock: { padding: 20, gap: 10 },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    approveBtn: { backgroundColor: "#10B981" },
    denyBtn: { backgroundColor: "#F43F5E" },
    cancelBtn: { backgroundColor: "#F1F5F9" },
    actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

    // Deny input
    denyInputWrapper: { gap: 8 },
    denyLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
    denyInput: {
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: "#0F172A",
        textAlignVertical: "top",
        backgroundColor: "#F8FAFC",
        minHeight: 80,
    },
    denyActions: { flexDirection: "row", gap: 8 },
});
