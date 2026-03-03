import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
    AlertTriangle,
    ArrowRight,
    Bell,
    BellOff,
    CheckCheck,
    CheckCircle,
    ClipboardList,
    Info,
    Package,
    PhilippinePeso,
    Trash2,
    TrendingDown,
    Wallet,
    X,
    XCircle,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import { ConfirmDialog, SkeletonRow, SuccessDialog } from "@/components";
import { useNotificationBadge } from "@/contexts/NotificationContext";
import type { AppNotification, NotificationStats } from "@/types";
import { getApiErrorMessage } from "@/utils";

// --- Type metadata ---

const TYPE_META: Record<
    string,
    { label: string; color: string; Icon: any; navRoute?: string }
> = {
    lab_defect: {
        label: "Lab Issue",
        color: "#EF4444",
        Icon: AlertTriangle,
        navRoute: "/(drawer)/lab-queue",
    },
    test_ready: {
        label: "Test Ready",
        color: "#22C55E",
        Icon: CheckCircle,
        navRoute: "/(drawer)/lab-queue",
    },
    new_transaction: {
        label: "New Order",
        color: "#3B82F6",
        Icon: ClipboardList,
        navRoute: "/(tabs)/",
    },
    refund_request: {
        label: "Refund Request",
        color: "#EAB308",
        Icon: PhilippinePeso,
        navRoute: "/(drawer)/refunds",
    },
    refund_approved: {
        label: "Refund Approved",
        color: "#22C55E",
        Icon: CheckCircle,
        navRoute: "/(drawer)/refunds",
    },
    refund_denied: {
        label: "Refund Denied",
        color: "#EF4444",
        Icon: XCircle,
        navRoute: "/(drawer)/refunds",
    },
    transaction_cancelled: {
        label: "Cancelled",
        color: "#6B7280",
        Icon: XCircle,
    },
    transaction_refunded: {
        label: "Refunded",
        color: "#8B5CF6",
        Icon: PhilippinePeso,
        navRoute: "/(drawer)/refunds",
    },
    stock_critical: {
        label: "Critical Stock",
        color: "#EF4444",
        Icon: Package,
        navRoute: "/(drawer)/inventory",
    },
    stock_low: {
        label: "Low Stock",
        color: "#EAB308",
        Icon: Package,
        navRoute: "/(drawer)/inventory",
    },
    system_info: {
        label: "System",
        color: "#6B7280",
        Icon: Info,
    },
    cash_discrepancy: {
        label: "Cash Discrepancy",
        color: "#F97316",
        Icon: Wallet,
        navRoute: "/(drawer)/reconciliation",
    },
};

const DEFAULT_META = { label: "Notification", color: "#6B7280", Icon: Bell };

const FILTER_TABS = [
    { label: "All", value: "" },
    { label: "Unread", value: "unread" },
    { label: "Read", value: "read" },
];

const TYPE_FILTER_OPTIONS = [
    { label: "All Types", value: "" },
    ...Object.entries(TYPE_META).map(([value, m]) => ({
        value,
        label: m.label,
    })),
];

// --- Helpers ---

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return "Just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function fullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

// --- Detail Modal ---

interface DetailModalProps {
    notification: AppNotification | null;
    onClose: () => void;
    onMarkRead: (n: AppNotification) => void;
    onMarkUnread: (n: AppNotification) => void;
    onDelete: (n: AppNotification) => void;
    onNavigate: (route: string) => void;
}

function NotificationDetailModal({
    notification,
    onClose,
    onMarkRead,
    onMarkUnread,
    onDelete,
    onNavigate,
}: DetailModalProps) {
    if (!notification) return null;

    const meta = TYPE_META[notification.type] ?? DEFAULT_META;
    const { Icon, color, label, navRoute } = meta;

    return (
        <Modal
            visible={!!notification}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable
                    style={styles.modalSheet}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.sheetHandle} />

                    <View style={styles.modalHeader}>
                        <View
                            style={[
                                styles.modalIconWrap,
                                { backgroundColor: color + "18" },
                            ]}
                        >
                            <Icon size={26} color={color} />
                        </View>
                        <View style={styles.modalHeaderText}>
                            <View
                                style={[
                                    styles.typeBadge,
                                    { backgroundColor: color + "20" },
                                ]}
                            >
                                <Text
                                    style={[styles.typeBadgeText, { color }]}
                                >
                                    {label}
                                </Text>
                            </View>
                            <Text style={styles.modalTimestamp}>
                                {fullDate(notification.created_at)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={onClose}
                            hitSlop={12}
                        >
                            <X size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {notification.title ? (
                        <Text style={styles.modalTitle}>
                            {notification.title}
                        </Text>
                    ) : null}

                    <Text style={styles.modalMessage}>
                        {notification.message}
                    </Text>

                    <View style={styles.divider} />

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalActionBtn, styles.btnOutline]}
                            onPress={() => {
                                notification.read
                                    ? onMarkUnread(notification)
                                    : onMarkRead(notification);
                                onClose();
                            }}
                        >
                            {notification.read ? (
                                <BellOff size={16} color="#6B7280" />
                            ) : (
                                <CheckCheck size={16} color="#22C55E" />
                            )}
                            <Text style={styles.modalActionBtnText}>
                                {notification.read ? "Mark Unread" : "Mark Read"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalActionBtn, styles.btnDanger]}
                            onPress={() => {
                                onClose();
                                setTimeout(() => onDelete(notification), 300);
                            }}
                        >
                            <Trash2 size={16} color="#fff" />
                            <Text
                                style={[
                                    styles.modalActionBtnText,
                                    { color: "#fff" },
                                ]}
                            >
                                Delete
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {navRoute ? (
                        <TouchableOpacity
                            style={styles.navBtn}
                            onPress={() => {
                                onClose();
                                setTimeout(() => onNavigate(navRoute), 300);
                            }}
                        >
                            <Text style={styles.navBtnText}>
                                View Related{" "}
                                {label
                                    .replace("Request", "Requests")
                                    .replace("Issue", "Lab Queue")
                                    .replace("Ready", "Queue")
                                    .replace("Discrepancy", "Reconciliation")
                                    .replace("Approved", "Requests")
                                    .replace("Denied", "Requests")}
                            </Text>
                            <ArrowRight size={16} color="#ac3434" />
                        </TouchableOpacity>
                    ) : null}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// --- Main Screen ---

export default function NotificationsScreen() {
    const router = useRouter();
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
    const [selectedNotification, setSelectedNotification] =
        useState<AppNotification | null>(null);

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
        async (page = 1, replace = true, overrideStatus?: string, overrideType?: string) => {
            try {
                if (page === 1 && replace) setLoading(true);
                else if (page > 1) setLoadingMore(true);

                const sFilter = overrideStatus !== undefined ? overrideStatus : statusFilter;
                const tFilter = overrideType !== undefined ? overrideType : typeFilter;

                const params: any = { page, per_page: 20 };
                if (sFilter) params.status = sFilter;
                if (tFilter) params.type = tFilter;

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
                const msg = getApiErrorMessage(err, "Failed to load notifications.");
                if (page === 1 && !refreshing) {
                    setLoadError(msg);
                } else {
                    showError(msg);
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

    const showError = (message: string) => {
        setSuccessDialog({ visible: true, title: "Error", message, type: "error" });
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications(1, true);
    };

    const loadMore = () => {
        if (!loadingMore && currentPage < lastPage) {
            loadNotifications(currentPage + 1, false);
        }
    };

    // Per-item actions

    const markRead = async (n: AppNotification, silent = false) => {
        if (n.read) return;
        try {
            await api.post(`/notifications/${n.id}/mark-as-read`);
            setNotifications((prev) =>
                prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
            );
            setStats((s) => (s ? { ...s, unread: Math.max(0, s.unread - 1) } : s));
            setSelectedNotification((sn) => sn?.id === n.id ? { ...sn, read: true } : sn);
            refreshCount();
        } catch (err: any) {
            if (!silent) showError(getApiErrorMessage(err, "Failed to mark as read."));
        }
    };

    const markUnread = async (n: AppNotification) => {
        try {
            await api.post(`/notifications/${n.id}/mark-as-unread`);
            setNotifications((prev) =>
                prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)),
            );
            setStats((s) => (s ? { ...s, unread: s.unread + 1 } : s));
            setSelectedNotification((sn) => sn?.id === n.id ? { ...sn, read: false } : sn);
            refreshCount();
        } catch (err: any) {
            showError(getApiErrorMessage(err, "Failed to mark as unread."));
        }
    };

    const handleTap = (n: AppNotification) => {
        setSelectedNotification(n);
        markRead(n, true);
    };

    const handleDelete = (n: AppNotification) => {
        setConfirmDialog({
            visible: true,
            title: "Delete Notification",
            message: "Delete this notification? This cannot be undone.",
            confirmText: "DELETE",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.delete(`/notifications/${n.id}`);
                    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
                    if (!n.read && stats) {
                        setStats((s) =>
                            s ? { ...s, unread: Math.max(0, s.unread - 1), total: s.total - 1 } : s,
                        );
                    }
                    refreshCount();
                } catch (err: any) {
                    showError(getApiErrorMessage(err, "Failed to delete notification."));
                }
            },
        });
    };

    // Bulk actions

    const handleMarkAllRead = () => {
        setConfirmDialog({
            visible: true,
            title: "Mark All as Read",
            message: "Mark all notifications as read?",
            confirmText: "Mark All",
            type: "info",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.post("/notifications/mark-all-as-read");
                    loadNotifications(1, true);
                    refreshCount();
                } catch (err: any) {
                    showError(getApiErrorMessage(err, "Failed to mark all as read."));
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
                        title: "Cleared",
                        message: "Read notifications deleted.",
                        type: "success",
                    });
                    loadNotifications(1, true);
                    refreshCount();
                } catch (err: any) {
                    showError(getApiErrorMessage(err, "Failed to delete read notifications."));
                }
            },
        });
    };

    const applyStatusFilter = (val: string) => {
        setStatusFilter(val);
        setLoading(true);
        loadNotifications(1, true, val, typeFilter);
    };

    const applyTypeFilter = (val: string) => {
        setTypeFilter(val);
        setLoading(true);
        loadNotifications(1, true, statusFilter, val);
    };

    // Render card

    const renderItem = ({ item }: { item: AppNotification }) => {
        const meta = TYPE_META[item.type] ?? DEFAULT_META;
        const { color, label, Icon } = meta;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    !item.read && styles.cardUnread,
                    pressed && styles.cardPressed,
                ]}
                onPress={() => handleTap(item)}
            >
                <View
                    style={[
                        styles.accentBar,
                        { backgroundColor: item.read ? "#E5E7EB" : color },
                    ]}
                />
                <View
                    style={[styles.iconCircle, { backgroundColor: color + "18" }]}
                >
                    <Icon size={17} color={color} />
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.cardTopRow}>
                        <View
                            style={[styles.typeBadge, { backgroundColor: color + "18" }]}
                        >
                            <Text style={[styles.typeBadgeText, { color }]}>
                                {label}
                            </Text>
                        </View>
                        <Text style={styles.cardTime}>
                            {relativeTime(item.created_at)}
                        </Text>
                    </View>
                    {item.title ? (
                        <Text
                            style={[styles.cardTitle, item.read && { color: "#9CA3AF" }]}
                            numberOfLines={1}
                        >
                            {item.title}
                        </Text>
                    ) : null}
                    <Text
                        style={[styles.cardMessage, item.read && { color: "#9CA3AF" }]}
                        numberOfLines={2}
                    >
                        {item.message}
                    </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </Pressable>
        );
    };

    const statItems = stats
        ? [
              { label: "Total", value: stats.total, color: "#374151" },
              { label: "Unread", value: stats.unread, color: "#ac3434" },
              stats.refunds != null ? { label: "Refunds", value: stats.refunds, color: "#EAB308" } : null,
              stats.lab_issues != null ? { label: "Lab Issues", value: stats.lab_issues, color: "#EF4444" } : null,
              stats.system_alerts != null ? { label: "System", value: stats.system_alerts, color: "#6B7280" } : null,
          ].filter(Boolean)
        : [];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Bell size={20} color="#ac3434" />
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {stats && stats.unread > 0 ? (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                                {stats.unread > 99 ? "99+" : stats.unread}
                            </Text>
                        </View>
                    ) : null}
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={handleMarkAllRead}
                        activeOpacity={0.7}
                    >
                        <CheckCheck size={15} color="#374151" />
                        <Text style={styles.headerBtnLabel}>Mark All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerBtn, styles.headerBtnDanger]}
                        onPress={handleDeleteRead}
                        activeOpacity={0.7}
                    >
                        <Trash2 size={15} color="#EF4444" />
                        <Text style={[styles.headerBtnLabel, { color: "#EF4444" }]}>
                            Clear Read
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats */}
            {statItems.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsRow}
                    contentContainerStyle={styles.statsContent}
                >
                    {(statItems as any[]).map((s: any) => (
                        <View key={s.label} style={styles.statPill}>
                            <Text style={[styles.statValue, { color: s.color }]}>
                                {s.value}
                            </Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Status tabs */}
            <View style={styles.tabsWrap}>
                {FILTER_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.value}
                        style={[
                            styles.tab,
                            statusFilter === tab.value && styles.tabActive,
                        ]}
                        onPress={() => applyStatusFilter(tab.value)}
                        activeOpacity={0.75}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                statusFilter === tab.value && styles.tabTextActive,
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Type chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsRow}
                contentContainerStyle={styles.chipsContent}
            >
                {TYPE_FILTER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value || "__all__"}
                        style={[
                            styles.chip,
                            typeFilter === opt.value && styles.chipActive,
                        ]}
                        onPress={() => applyTypeFilter(opt.value)}
                        activeOpacity={0.75}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                typeFilter === opt.value && styles.chipTextActive,
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* List */}
            {loading ? (
                <View style={styles.skeletonWrap}>
                    <SkeletonRow count={7} />
                </View>
            ) : loadError ? (
                <View style={styles.errorContainer}>
                    <TrendingDown size={40} color="#EF4444" />
                    <Text style={styles.errorTitle}>Unable to load notifications</Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setLoadError(null);
                            loadNotifications(1, true);
                        }}
                    >
                        <Text style={styles.retryBtnText}>Try Again</Text>
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
                            tintColor="#ac3434"
                        />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator
                                size="small"
                                color="#ac3434"
                                style={{ marginVertical: 16 }}
                            />
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIconWrap}>
                                <BellOff size={36} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>All caught up!</Text>
                            <Text style={styles.emptySubtitle}>
                                No notifications to show
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Detail bottom sheet */}
            <NotificationDetailModal
                notification={selectedNotification}
                onClose={() => setSelectedNotification(null)}
                onMarkRead={markRead}
                onMarkUnread={markUnread}
                onDelete={handleDelete}
                onNavigate={(route) => router.push(route as any)}
            />

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

// --- Styles ---

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: {
        fontSize: 19,
        fontWeight: "700",
        color: "#111827",
        letterSpacing: -0.3,
    },
    unreadBadge: {
        backgroundColor: "#ac3434",
        borderRadius: 99,
        minWidth: 22,
        height: 22,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
    },
    unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    headerActions: { flexDirection: "row", gap: 6 },
    headerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
    },
    headerBtnDanger: { backgroundColor: "#FEF2F2" },
    headerBtnLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },

    statsRow: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
        maxHeight: 70,
    },
    statsContent: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
    statPill: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 7,
        alignItems: "center",
        minWidth: 68,
        borderWidth: 1,
        borderColor: "#F0F0F0",
    },
    statValue: { fontSize: 18, fontWeight: "700" },
    statLabel: { fontSize: 11, color: "#9CA3AF", marginTop: 1, fontWeight: "500" },

    tabsWrap: {
        flexDirection: "row",
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    tab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: "#F3F4F6",
    },
    tabActive: { backgroundColor: "#ac3434" },
    tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
    tabTextActive: { color: "#fff" },

    chipsRow: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
        maxHeight: 46,
    },
    chipsContent: { gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 99,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    chipActive: { backgroundColor: "#FEF2F2", borderColor: "#ac3434" },
    chipText: { fontSize: 12, fontWeight: "500", color: "#6B7280" },
    chipTextActive: { color: "#ac3434", fontWeight: "700" },

    skeletonWrap: { paddingHorizontal: 16, paddingTop: 12 },
    list: { padding: 12, gap: 8, paddingBottom: 32 },

    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    cardUnread: { shadowOpacity: 0.1, elevation: 2 },
    cardPressed: { opacity: 0.88 },
    accentBar: { width: 4, alignSelf: "stretch" },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 99,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 12,
        flexShrink: 0,
    },
    cardContent: { flex: 1, paddingVertical: 11, paddingHorizontal: 10 },
    cardTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
    },
    typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
    typeBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
    cardTime: { fontSize: 11, color: "#9CA3AF", marginLeft: "auto" },
    cardTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 2,
        lineHeight: 18,
    },
    cardMessage: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#ac3434",
        marginRight: 12,
        flexShrink: 0,
    },

    empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: 10 },
    emptyIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 4 },
    emptySubtitle: { fontSize: 13, color: "#9CA3AF" },

    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 10,
    },
    errorTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        textAlign: "center",
        marginTop: 4,
    },
    errorMessage: { fontSize: 13, color: "#6B7280", textAlign: "center" },
    retryBtn: {
        marginTop: 6,
        paddingHorizontal: 28,
        paddingVertical: 11,
        backgroundColor: "#ac3434",
        borderRadius: 10,
    },
    retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    modalSheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 8,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 14,
    },
    modalIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    modalHeaderText: { flex: 1, gap: 4 },
    modalTimestamp: { fontSize: 12, color: "#9CA3AF" },
    modalCloseBtn: {
        padding: 6,
        backgroundColor: "#F3F4F6",
        borderRadius: 8,
        marginTop: 2,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        lineHeight: 24,
        marginBottom: 8,
    },
    modalMessage: {
        fontSize: 14,
        color: "#4B5563",
        lineHeight: 22,
        marginBottom: 18,
    },
    divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 16 },
    modalActions: { flexDirection: "row", gap: 10, marginBottom: 12 },
    modalActionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 11,
        borderRadius: 10,
    },
    btnOutline: {
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        backgroundColor: "#F9FAFB",
    },
    btnDanger: { backgroundColor: "#EF4444" },
    modalActionBtnText: { fontSize: 13, fontWeight: "700", color: "#374151" },
    navBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#ac3434",
        backgroundColor: "#FFF5F5",
    },
    navBtnText: { fontSize: 14, fontWeight: "700", color: "#ac3434" },
});
