import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
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
import { ConfirmDialog, SearchBar, SkeletonRow, SuccessDialog } from "@/components";
import { formatTimeLeft, getApiErrorMessage, useResponsiveLayout } from "@/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CorrectionStatus = "pending" | "approved" | "rejected" | "corrected" | "expired" | "all";

type CorrectionRequest = {
    id: number;
    transaction_number: string;
    patient_name: string;
    scope: "test" | "transaction";
    test_name: string | null;
    reason: string;
    status: CorrectionStatus;
    admin_note: string | null;
    requested_by_name: string;
    approved_by_name: string | null;
    rejected_by_name: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    corrected_at: string | null;
    expires_at: string | null;
    expires_at_raw: string | null;
    created_at: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { label: string; value: CorrectionStatus }[] = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
    { label: "Corrected", value: "corrected" },
    { label: "Expired", value: "expired" },
    { label: "All", value: "all" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    pending:   { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
    approved:  { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
    rejected:  { bg: "#FFF1F2", text: "#9F1239", dot: "#F43F5E" },
    corrected: { bg: "#EFF6FF", text: "#1E40AF", dot: "#3B82F6" },
    expired:   { bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CorrectionApprovalsScreen() {
    const responsive = useResponsiveLayout();
    const [requests, setRequests] = useState<CorrectionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<CorrectionStatus>("pending");
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Live countdown
    const [nowMs, setNowMs] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    // Action modal state
    const [selected, setSelected] = useState<CorrectionRequest | null>(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [approveNote, setApproveNote] = useState("");
    const [rejectNote, setRejectNote] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({
        visible: false, title: "", message: "", confirmText: "",
        onConfirm: () => {}, type: "warning" as "warning" | "info" | "danger",
    });
    const [successDialog, setSuccessDialog] = useState({
        visible: false, title: "", message: "",
        type: "success" as "success" | "error" | "info" | "warning",
    });

    // -------------------------------------------------------------------------
    // Data loading
    // -------------------------------------------------------------------------

    const loadRequests = useCallback(
        async (page = 1, replace = false) => {
            try {
                if (page === 1 && !refreshing) setLoading(true);
                if (page > 1) setLoadingMore(true);

                const res = await api.get("/correction-approvals", {
                    params: {
                        page,
                        status: statusFilter,
                        search: searchQuery || undefined,
                    },
                });

                const { data, meta } = res.data;
                setCurrentPage(meta.current_page);
                setLastPage(meta.last_page);
                setRequests((prev) => (replace || page === 1 ? data : [...prev, ...data]));
                setLoadError(null);
            } catch (err: any) {
                const msg = getApiErrorMessage(err, "Failed to load correction requests.");
                if (page === 1 && !refreshing) setLoadError(msg);
                else setSuccessDialog({ visible: true, title: "Error", message: msg, type: "error" });
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [statusFilter, searchQuery, refreshing],
    );

    useFocusEffect(useCallback(() => { loadRequests(1, true); }, [loadRequests]));

    const handleSearchChange = (text: string) => {
        setSearchInput(text);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setSearchQuery(text.trim()), 400);
    };

    const onRefresh = () => { setRefreshing(true); loadRequests(1, true); };
    const onEndReached = () => {
        if (loadingMore || loading) return;
        if (currentPage < lastPage) loadRequests(currentPage + 1);
    };

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    const openApprove = (req: CorrectionRequest) => {
        setSelected(req);
        setApproveNote("");
        setShowApproveModal(true);
    };

    const openReject = (req: CorrectionRequest) => {
        setSelected(req);
        setRejectNote("");
        setShowRejectModal(true);
    };

    const handleApprove = async () => {
        if (!selected) return;
        setActionLoading(true);
        try {
            await api.post(`/correction-approvals/${selected.id}/approve`, {
                admin_note: approveNote.trim() || null,
            });
            setShowApproveModal(false);
            setSuccessDialog({ visible: true, title: "Approved", message: "Correction request approved.", type: "success" });
            loadRequests(1, true);
        } catch (err: any) {
            setSuccessDialog({ visible: true, title: "Error", message: getApiErrorMessage(err, "Failed to approve request."), type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selected) return;
        if (!rejectNote.trim()) {
            setSuccessDialog({ visible: true, title: "Validation", message: "Rejection reason is required.", type: "error" });
            return;
        }
        setActionLoading(true);
        try {
            await api.post(`/correction-approvals/${selected.id}/reject`, {
                admin_note: rejectNote.trim(),
            });
            setShowRejectModal(false);
            setSuccessDialog({ visible: true, title: "Rejected", message: "Correction request rejected.", type: "success" });
            loadRequests(1, true);
        } catch (err: any) {
            setSuccessDialog({ visible: true, title: "Error", message: getApiErrorMessage(err, "Failed to reject request."), type: "error" });
        } finally {
            setActionLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    // Render helpers
    // -------------------------------------------------------------------------

    const statusBadge = (status: string) => {
        const c = STATUS_COLORS[status] ?? { bg: "#F3F4F6", text: "#374151", dot: "#9CA3AF" };
        return (
            <View style={[styles.badge, { backgroundColor: c.bg }]}>
                <View style={[styles.badgeDot, { backgroundColor: c.dot }]} />
                <Text style={[styles.badgeText, { color: c.text }]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
            </View>
        );
    };

    const renderItem = ({ item }: { item: CorrectionRequest }) => {
        const timeLeft = formatTimeLeft(item.expires_at_raw, nowMs);
        const isExpired = ["pending", "approved"].includes(item.status) && timeLeft === "Expired";
        const displayStatus = isExpired ? "expired" : item.status;

        return (
            <View style={styles.card}>
                <View style={[styles.cardAccent, { backgroundColor: (STATUS_COLORS[displayStatus] ?? STATUS_COLORS.expired).dot }]} />
                <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                        <Text style={styles.cardTxn} numberOfLines={1}>
                            {`#${item.transaction_number}`}
                        </Text>
                        {statusBadge(displayStatus)}
                    </View>

                    <Text style={styles.cardPatient}>{item.patient_name}</Text>

                    <View style={styles.cardMeta}>
                        <MetaRow label="Scope" value={item.scope === "transaction" ? "Whole Transaction" : `Test: ${item.test_name ?? "—"}`} />
                        <MetaRow label="Requested by" value={item.requested_by_name} />
                        <MetaRow label="Submitted" value={item.created_at} />
                        {item.expires_at && ["pending", "approved"].includes(item.status) && (
                            <>
                                <MetaRow label="Expires" value={item.expires_at} />
                                <MetaRow
                                    label="Time Left"
                                    value={timeLeft ?? "N/A"}
                                    valueStyle={{ color: timeLeft === "Expired" ? "#DC2626" : "#059669", fontWeight: "700" }}
                                />
                            </>
                        )}
                    </View>

                    <View style={styles.reasonBox}>
                        <Text style={styles.reasonLabel}>Reason</Text>
                        <Text style={styles.reasonText}>{item.reason}</Text>
                    </View>

                    {item.status === "approved" && item.approved_by_name && (
                        <View style={[styles.noteBox, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                            <Text style={[styles.noteText, { color: "#065F46" }]}>
                                {`Approved by ${item.approved_by_name} on ${item.approved_at}${item.admin_note ? `\nNote: ${item.admin_note}` : ""}`}
                            </Text>
                        </View>
                    )}

                    {item.status === "rejected" && item.rejected_by_name && (
                        <View style={[styles.noteBox, { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" }]}>
                            <Text style={[styles.noteText, { color: "#9F1239" }]}>
                                {`Rejected by ${item.rejected_by_name} on ${item.rejected_at}${item.admin_note ? `\nReason: ${item.admin_note}` : ""}`}
                            </Text>
                        </View>
                    )}

                    {item.status === "corrected" && item.corrected_at && (
                        <View style={[styles.noteBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                            <Text style={[styles.noteText, { color: "#1E40AF" }]}>
                                {`Correction applied on ${item.corrected_at}`}
                            </Text>
                        </View>
                    )}

                    {item.status === "pending" && !isExpired && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => openApprove(item)}>
                                <CheckCircle size={15} color="#fff" />
                                <Text style={styles.actionBtnText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => openReject(item)}>
                                <XCircle size={15} color="#fff" />
                                <Text style={styles.actionBtnText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // -------------------------------------------------------------------------
    // Main render
    // -------------------------------------------------------------------------

    return (
        <View style={[styles.container, responsive.isTablet && { maxWidth: 1100, alignSelf: "center", width: "100%" }]}>
            {/* Tab bar */}
            <View style={styles.tabBarWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent} bounces={false}>
                    {TABS.map((tab) => {
                        const active = statusFilter === tab.value;
                        return (
                            <TouchableOpacity key={tab.value} style={styles.tabItem} onPress={() => setStatusFilter(tab.value)} activeOpacity={0.7}>
                                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                                {active && <View style={styles.tabUnderline} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Search */}
            <SearchBar
                value={searchInput}
                onChangeText={handleSearchChange}
                placeholder="Search by TXN# or patient name..."
                onClear={() => { setSearchInput(""); setSearchQuery(""); }}
                containerStyle={styles.searchContainer}
            />

            {/* List */}
            {loadError && !requests.length ? (
                <View style={styles.centered}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>Unable to load requests</Text>
                    <Text style={styles.errorMsg}>{loadError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoadError(null); loadRequests(1, true); }}>
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : loading && !refreshing ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                    <SkeletonRow count={4} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(r) => String(r.id)}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.3}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <AlertTriangle size={44} color="#E5E7EB" />
                            <Text style={styles.emptyTitle}>No correction requests</Text>
                            <Text style={styles.emptySubtitle}>No requests match the current filter.</Text>
                        </View>
                    }
                    ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#ac3434" style={{ marginVertical: 16 }} /> : null}
                />
            )}

            {/* Approve Modal */}
            <Modal visible={showApproveModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowApproveModal(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Approve Correction Request</Text>
                    </View>
                    <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
                        {selected && (
                            <Text style={styles.modalSubtitle}>
                                {`#${selected.transaction_number} — ${selected.scope === "transaction" ? "Whole Transaction" : selected.test_name}`}
                            </Text>
                        )}
                        <Text style={styles.inputLabel}>Admin Note (Optional)</Text>
                        <TextInput
                            style={styles.textArea}
                            value={approveNote}
                            onChangeText={setApproveNote}
                            placeholder="Add any notes about this approval..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{`${approveNote.length}/500`}</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowApproveModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.approveBtnModal]} onPress={handleApprove} disabled={actionLoading}>
                                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Approve</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal visible={showRejectModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRejectModal(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Reject Correction Request</Text>
                    </View>
                    <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
                        {selected && (
                            <Text style={styles.modalSubtitle}>
                                {`#${selected.transaction_number} — ${selected.scope === "transaction" ? "Whole Transaction" : selected.test_name}`}
                            </Text>
                        )}
                        <Text style={styles.inputLabel}>
                            Reason for Rejection <Text style={{ color: "#DC2626" }}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.textArea}
                            value={rejectNote}
                            onChangeText={setRejectNote}
                            placeholder="Explain why this correction request is being rejected..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{`${rejectNote.length}/500`}</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowRejectModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.rejectBtnModal]} onPress={handleReject} disabled={actionLoading}>
                                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Reject</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            <ConfirmDialog
                visible={confirmDialog.visible}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog((d) => ({ ...d, visible: false }))}
            />
            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                autoClose={successDialog.type === "success"}
                onClose={() => setSuccessDialog((d) => ({ ...d, visible: false }))}
            />
        </View>
    );
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function MetaRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: object }) {
    return (
        <View style={metaStyles.row}>
            <Text style={metaStyles.label}>{label}</Text>
            <Text style={[metaStyles.value, valueStyle]} numberOfLines={2}>{value}</Text>
        </View>
    );
}

const metaStyles = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    label: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", flex: 1 },
    value: { fontSize: 12, color: "#111827", fontWeight: "500", flex: 2, textAlign: "right" },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },

    tabBarWrapper: { backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E2E8F0" },
    tabBarContent: { paddingHorizontal: 4 },
    tabItem: { alignItems: "center", justifyContent: "center", paddingHorizontal: 16, height: 46, position: "relative" },
    tabText: { fontSize: 13, fontWeight: "500", color: "#94A3B8" },
    tabTextActive: { color: "#ac3434", fontWeight: "700" },
    tabUnderline: { position: "absolute", bottom: 0, left: 8, right: 8, height: 2.5, borderRadius: 2, backgroundColor: "#ac3434" },

    searchContainer: { marginHorizontal: 16, marginVertical: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12 },

    listContent: { paddingTop: 8, paddingBottom: 32 },

    card: { flexDirection: "row", marginHorizontal: 16, marginTop: 10, backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    cardAccent: { width: 4 },
    cardBody: { flex: 1, padding: 14, gap: 6 },
    cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    cardTxn: { fontSize: 14, fontWeight: "700", color: "#0F172A", flex: 1 },
    cardPatient: { fontSize: 13, color: "#374151", fontWeight: "600" },
    cardMeta: { gap: 2, marginTop: 4 },

    badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 4 },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: { fontSize: 11, fontWeight: "600" },

    reasonBox: { backgroundColor: "#F9FAFB", borderRadius: 8, padding: 10, marginTop: 4 },
    reasonLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", marginBottom: 3 },
    reasonText: { fontSize: 13, color: "#374151", lineHeight: 18 },

    noteBox: { borderRadius: 8, padding: 10, borderWidth: 1, marginTop: 4 },
    noteText: { fontSize: 12, lineHeight: 17 },

    actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
    approveBtn: { backgroundColor: "#10B981" },
    rejectBtn: { backgroundColor: "#F43F5E" },
    actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

    centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 72, gap: 8 },
    errorTitle: { fontSize: 17, fontWeight: "600", color: "#0F172A", textAlign: "center" },
    errorMsg: { fontSize: 14, color: "#64748B", textAlign: "center" },
    retryBtn: { marginTop: 4, paddingHorizontal: 28, paddingVertical: 11, backgroundColor: "#ac3434", borderRadius: 10 },
    retryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: "#94A3B8" },
    emptySubtitle: { fontSize: 13, color: "#CBD5E1", textAlign: "center", paddingHorizontal: 32 },

    modalContainer: { flex: 1, backgroundColor: "#fff" },
    modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    modalSubtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
    modalBody: { flex: 1, padding: 20 },
    inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
    textArea: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 14, color: "#111827", minHeight: 100, backgroundColor: "#F9FAFB" },
    charCount: { fontSize: 12, color: "#9CA3AF", textAlign: "right", marginTop: 4 },
    modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
    modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    cancelBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB" },
    cancelBtnText: { color: "#374151", fontWeight: "600", fontSize: 15 },
    approveBtnModal: { backgroundColor: "#10B981" },
    rejectBtnModal: { backgroundColor: "#F43F5E" },
    modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
