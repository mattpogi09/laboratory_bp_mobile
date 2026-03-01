import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    Bell,
    BellOff,
    CheckCheck,
    Trash2,
    X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import type { AppNotification, NotificationStats } from "@/types";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SkeletonRow, SuccessDialog } from "@/components";
import { useNotificationBadge } from "@/contexts/NotificationContext";

const TYPE_LABELS: Record<string, string> = {
    lab_defect: "Lab Issue",
    test_ready: "Test Ready",
    new_transaction: "New Order",
    refund_request: "Refund Request",
    refund_approved: "Refund Approved",
    refund_denied: "Refund Denied",
    transaction_cancelled: "Cancelled",
    transaction_refunded: "Refunded",
    stock_critical: "Critical Stock",
    stock_low: "Low Stock",
    system_info: "System",
    cash_discrepancy: "Cash Discrepancy",
};

const TYPE_COLORS: Record<string, string> = {
    lab_defect: "#EF4444",
    test_ready: "#22C55E",
    new_transaction: "#3B82F6",
    refund_request: "#EAB308",
    refund_approved: "#22C55E",
    refund_denied: "#EF4444",
    transaction_cancelled: "#6B7280",
    transaction_refunded: "#8B5CF6",
    stock_critical: "#EF4444",
    stock_low: "#EAB308",
    system_info: "#6B7280",
    cash_discrepancy: "#F97316",
};

const FILTER_TABS = [
    { label: "All", value: "" },
    { label: "Unread", value: "unread" },
    { label: "Read", value: "read" },
];

const TYPE_FILTER_OPTIONS = [
    { label: "All Types", value: "" },
    ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export default function NotificationsScreen() {
    const { refreshCount } = useNotificationBadge();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [stats, setStats] = useState<NotificationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [loadError, setLoadError] = useState<string | null>(null);

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

    const loadNotifications = useCallback(
        async (page = 1, replace = true) => {
            try {
                if (page === 1) setLoading(true);
                else setLoadingMore(true);

                const params: any = { page, per_page: 20 };
                if (statusFilter) params.status = statusFilter;
                if (typeFilter) params.type = typeFilter;

                const res = await api.get("/notifications", { params });
                const incoming: AppNotification[] = res.data.data;

                setNotifications(
                    replace ? incoming : (prev) => [...prev, ...incoming],
                );
                setCurrentPage(res.data.meta.current_page);
                setLastPage(res.data.meta.last_page);
                if (res.data.stats) setStats(res.data.stats);
                setLoadError(null);
            } catch (err: any) {
                const msg = getApiErrorMessage(
                    err,
                    "Failed to load notifications.",
                );
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
        [statusFilter, typeFilter],
    );

    useFocusEffect(
        useCallback(() => {
            loadNotifications(1, true);
            refreshCount();
        }, [loadNotifications, refreshCount]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications(1, true);
    };

    const loadMore = () => {
        if (!loadingMore && currentPage < lastPage) {
            loadNotifications(currentPage + 1, false);
        }
    };

    const markRead = async (n: AppNotification) => {
        try {
            await api.post(`/notifications/${n.id}/mark-as-read`);
            setNotifications((prev) =>
                prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
            );
            setStats((s) =>
                s ? { ...s, unread: Math.max(0, s.unread - 1) } : s,
            );
            refreshCount();
        } catch (err: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(err, "Failed to mark as read."),
                type: "error",
            });
        }
    };

    const markUnread = async (n: AppNotification) => {
        try {
            await api.post(`/notifications/${n.id}/mark-as-unread`);
            setNotifications((prev) =>
                prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)),
            );
            setStats((s) => (s ? { ...s, unread: s.unread + 1 } : s));
            refreshCount();
        } catch (err: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(err, "Failed to mark as unread."),
                type: "error",
            });
        }
    };

    const handleMarkAllRead = () => {
        setConfirmDialog({
            visible: true,
            title: "Mark All Read",
            message: "Mark all notifications as read?",
            confirmText: "Mark All",
            type: "info",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.post("/notifications/mark-all-as-read");
                    setSuccessDialog({
                        visible: true,
                        title: "Done",
                        message: "All notifications marked as read.",
                        type: "success",
                    });
                    loadNotifications(1, true);
                    refreshCount();
                } catch (err: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to mark all as read.",
                        ),
                        type: "error",
                    });
                }
            },
        });
    };

    const handleDeleteRead = () => {
        setConfirmDialog({
            visible: true,
            title: "Delete Read Notifications",
            message: "Delete all read notifications? This cannot be undone.",
            confirmText: "DELETE",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.delete("/notifications/delete-read");
                    setSuccessDialog({
                        visible: true,
                        title: "Deleted",
                        message: "Read notifications deleted.",
                        type: "success",
                    });
                    loadNotifications(1, true);
                    refreshCount();
                } catch (err: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to delete read notifications.",
                        ),
                        type: "error",
                    });
                }
            },
        });
    };

    const handleDelete = (n: AppNotification) => {
        setConfirmDialog({
            visible: true,
            title: "Delete Notification",
            message: "Delete this notification?",
            confirmText: "DELETE",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.delete(`/notifications/${n.id}`);
                    setNotifications((prev) =>
                        prev.filter((x) => x.id !== n.id),
                    );
                    if (!n.read && stats)
                        setStats((s) =>
                            s
                                ? {
                                      ...s,
                                      unread: Math.max(0, s.unread - 1),
                                      total: s.total - 1,
                                  }
                                : s,
                        );
                    setSuccessDialog({
                        visible: true,
                        title: "Deleted",
                        message: "Notification deleted.",
                        type: "success",
                    });
                    refreshCount();
                } catch (err: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to delete notification.",
                        ),
                        type: "error",
                    });
                }
            },
        });
    };

    const renderItem = ({ item }: { item: AppNotification }) => {
        const color = TYPE_COLORS[item.type] ?? "#6B7280";
        return (
            <View style={[styles.card, !item.read && styles.cardUnread]}>
                <View
                    style={[styles.typeIndicator, { backgroundColor: color }]}
                />
                <View style={styles.cardContent}>
                    <View style={styles.cardTopRow}>
                        <View
                            style={[
                                styles.typeBadge,
                                { backgroundColor: color + "22" },
                            ]}
                        >
                            <Text style={[styles.typeBadgeText, { color }]}>
                                {TYPE_LABELS[item.type] ?? item.type}
                            </Text>
                        </View>
                        <Text style={styles.cardTime}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <Text style={styles.cardMessage}>{item.message}</Text>
                </View>
                <View style={styles.cardActions}>
                    {item.read ? (
                        <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() => markUnread(item)}
                        >
                            <BellOff size={15} color="#9CA3AF" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() => markRead(item)}
                        >
                            <CheckCheck size={15} color="#22C55E" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => handleDelete(item)}
                    >
                        <X size={15} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Bell size={22} color="#ac3434" />
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {stats && stats.unread > 0 ? (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                                {stats.unread}
                            </Text>
                        </View>
                    ) : null}
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={handleMarkAllRead}
                    >
                        <CheckCheck size={16} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={handleDeleteRead}
                    >
                        <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats row */}
            {stats && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsRow}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
                >
                    {(
                        [
                            { label: "Total", value: stats.total },
                            {
                                label: "Unread",
                                value: stats.unread,
                                color: "#ac3434",
                            },
                            stats.refunds != null
                                ? {
                                      label: "Refunds",
                                      value: stats.refunds,
                                      color: "#EAB308",
                                  }
                                : null,
                            stats.lab_issues != null
                                ? {
                                      label: "Lab Issues",
                                      value: stats.lab_issues,
                                      color: "#EF4444",
                                  }
                                : null,
                            stats.system_alerts != null
                                ? {
                                      label: "System",
                                      value: stats.system_alerts,
                                      color: "#6B7280",
                                  }
                                : null,
                        ] as any[]
                    )
                        .filter(Boolean)
                        .map((s: any) => (
                            <View key={s.label} style={styles.statCard}>
                                <Text
                                    style={[
                                        styles.statValue,
                                        s.color ? { color: s.color } : {},
                                    ]}
                                >
                                    {s.value}
                                </Text>
                                <Text style={styles.statLabel}>{s.label}</Text>
                            </View>
                        ))}
                </ScrollView>
            )}

            {/* Status filter tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsRow}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
            >
                {FILTER_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.value}
                        style={[
                            styles.tab,
                            statusFilter === tab.value && styles.tabActive,
                        ]}
                        onPress={() => {
                            setStatusFilter(tab.value);
                            loadNotifications(1, true);
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

            {/* Type filter chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.typeRow}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
            >
                {TYPE_FILTER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value || "__all__"}
                        style={[
                            styles.typeChip,
                            typeFilter === opt.value && styles.typeChipActive,
                        ]}
                        onPress={() => {
                            setTypeFilter(opt.value);
                            loadNotifications(1, true);
                        }}
                    >
                        <Text
                            style={[
                                styles.typeChipText,
                                typeFilter === opt.value &&
                                    styles.typeChipTextActive,
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    <SkeletonRow count={6} />
                </View>
            ) : loadError && !notifications.length ? (
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>
                        Unable to load notifications
                    </Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setLoadError(null);
                            loadNotifications(1, true);
                        }}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={["#ac3434"]}
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    contentContainerStyle={styles.list}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator
                                size="small"
                                color="#ac3434"
                                style={{ marginVertical: 12 }}
                            />
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <BellOff size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>
                                You're all caught up
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: "#9CA3AF",
                                    textAlign: "center",
                                    marginTop: 4,
                                }}
                            >
                                No notifications to show
                            </Text>
                        </View>
                    }
                />
            )}

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
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    unreadBadge: {
        backgroundColor: "#ac3434",
        borderRadius: 99,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
    },
    unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    headerActions: { flexDirection: "row", gap: 8 },
    headerBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 8 },
    statsRow: {
        backgroundColor: "#fff",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    statCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: "center",
        minWidth: 70,
    },
    statValue: { fontSize: 20, fontWeight: "700", color: "#111827" },
    statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
    tabsRow: {
        backgroundColor: "#fff",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    tab: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
        backgroundColor: "#F3F4F6",
    },
    tabActive: { backgroundColor: "#ac3434" },
    tabText: { fontSize: 13, fontWeight: "600", color: "#374151" },
    tabTextActive: { color: "#fff" },
    typeRow: {
        backgroundColor: "#fff",
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    typeChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    typeChipActive: {
        backgroundColor: "#FEF2F2",
        borderColor: "#ac3434",
    },
    typeChipText: { fontSize: 12, fontWeight: "500", color: "#6B7280" },
    typeChipTextActive: { color: "#ac3434", fontWeight: "700" },
    list: { padding: 16, gap: 8 },
    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        overflow: "hidden",
    },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: "#ac3434" },
    typeIndicator: { width: 4 },
    cardContent: { flex: 1, padding: 12 },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    typeBadgeText: { fontSize: 11, fontWeight: "700" },
    cardTime: { fontSize: 11, color: "#9CA3AF", marginLeft: "auto" },
    cardMessage: { fontSize: 13, color: "#374151", lineHeight: 18 },
    cardActions: {
        flexDirection: "column",
        justifyContent: "center",
        gap: 8,
        paddingRight: 10,
        paddingVertical: 10,
    },
    actionIconBtn: { padding: 4 },
    empty: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: "#9CA3AF" },
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
