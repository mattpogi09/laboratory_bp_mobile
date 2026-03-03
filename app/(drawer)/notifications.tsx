import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
    AlertTriangle,
    ArrowRight,
    Bell,
    BellOff,
    CheckCheck,
    CheckCircle,
    ChevronDown,
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

//  Type metadata 

const TYPE_META: Record<
    string,
    { label: string; color: string; bg: string; border: string; Icon: any; navRoute?: string }
> = {
    lab_defect:          { label: "Lab Issue",        color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", Icon: AlertTriangle,   navRoute: "/(drawer)/lab-queue" },
    test_ready:          { label: "Test Ready",        color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", Icon: CheckCircle,     navRoute: "/(drawer)/lab-queue" },
    new_transaction:     { label: "New Order",         color: "#1E3A8A", bg: "#EFF6FF", border: "#BFDBFE", Icon: ClipboardList,   navRoute: "/(tabs)/" },
    refund_request:      { label: "Refund Request",    color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", Icon: PhilippinePeso,  navRoute: "/(drawer)/refunds" },
    refund_approved:     { label: "Refund Approved",   color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0", Icon: CheckCircle,     navRoute: "/(drawer)/refunds" },
    refund_denied:       { label: "Refund Denied",     color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", Icon: XCircle,         navRoute: "/(drawer)/refunds" },
    transaction_cancelled:{ label: "Cancelled",        color: "#374151", bg: "#F9FAFB", border: "#D1D5DB", Icon: XCircle },
    transaction_refunded:{ label: "Refunded",          color: "#4C1D95", bg: "#F5F3FF", border: "#DDD6FE", Icon: PhilippinePeso,  navRoute: "/(drawer)/refunds" },
    stock_critical:      { label: "Critical Stock",    color: "#991B1B", bg: "#FEF2F2", border: "#FECACA", Icon: Package,         navRoute: "/(drawer)/inventory" },
    stock_low:           { label: "Low Stock",         color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", Icon: Package,         navRoute: "/(drawer)/inventory" },
    system_info:         { label: "System",            color: "#374151", bg: "#F9FAFB", border: "#D1D5DB", Icon: Info },
    cash_discrepancy:    { label: "Cash Discrepancy",  color: "#7C2D12", bg: "#FFF7ED", border: "#FED7AA", Icon: Wallet,          navRoute: "/(drawer)/reconciliation" },
};
const DEFAULT_META = { label: "Notification", color: "#374151", bg: "#F9FAFB", border: "#D1D5DB", Icon: Bell };

const STATUS_OPTIONS = [
    { label: "All Statuses", value: "" },
    { label: "Unread",       value: "unread" },
    { label: "Read",         value: "read" },
];

const TYPE_OPTIONS = [
    { label: "All Types", value: "" },
    ...Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label })),
];

//  FilterPicker (matches appointments) 

function FilterPicker({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.value === value);
    return (
        <>
            <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setOpen(true)}
                activeOpacity={0.75}
            >
                <Text style={styles.pickerButtonText} numberOfLines={1}>
                    {selected ? selected.label : label}
                </Text>
                <ChevronDown color="#6B7280" size={16} />
            </TouchableOpacity>
            <Modal visible={open} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                >
                    <View style={styles.pickerModal}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setOpen(false)}>
                                <X color="#6B7280" size={22} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {options.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value || "__all__"}
                                    style={[
                                        styles.pickerOption,
                                        value === opt.value && styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => { onChange(opt.value); setOpen(false); }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            value === opt.value && styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

//  Helpers 

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
    return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function fullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-PH", {
        month: "long", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
    });
}

//  Detail Bottom Sheet 

function NotificationDetailModal({
    notification,
    onClose,
    onMarkRead,
    onMarkUnread,
    onDelete,
    onNavigate,
}: {
    notification: AppNotification | null;
    onClose: () => void;
    onMarkRead: (n: AppNotification) => void;
    onMarkUnread: (n: AppNotification) => void;
    onDelete: (n: AppNotification) => void;
    onNavigate: (route: string) => void;
}) {
    if (!notification) return null;
    const meta = TYPE_META[notification.type] ?? DEFAULT_META;
    const { Icon, color, bg, navRoute, label } = meta;

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.sheetHandle} />

                    <View style={styles.modalHeaderRow}>
                        <View style={[styles.modalIconWrap, { backgroundColor: bg }]}>
                            <Icon size={26} color={color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.typeBadge, { backgroundColor: bg, borderColor: meta.border }]}>
                                <Text style={[styles.typeBadgeText, { color }]}>{label}</Text>
                            </View>
                            <Text style={styles.modalTimestamp}>{fullDate(notification.created_at)}</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} hitSlop={12}>
                            <X size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {notification.title ? (
                        <Text style={styles.modalTitle}>{notification.title}</Text>
                    ) : null}
                    <Text style={styles.modalMessage}>{notification.message}</Text>

                    <View style={styles.divider} />

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalBtn, styles.modalBtnOutline]}
                            onPress={() => { notification.read ? onMarkUnread(notification) : onMarkRead(notification); onClose(); }}
                        >
                            {notification.read ? <BellOff size={16} color="#6B7280" /> : <CheckCheck size={16} color="#22C55E" />}
                            <Text style={styles.modalBtnText}>{notification.read ? "Mark Unread" : "Mark Read"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalBtn, styles.modalBtnDanger]}
                            onPress={() => { onClose(); setTimeout(() => onDelete(notification), 300); }}
                        >
                            <Trash2 size={16} color="#fff" />
                            <Text style={[styles.modalBtnText, { color: "#fff" }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>

                    {navRoute ? (
                        <TouchableOpacity style={styles.navBtn} onPress={() => { onClose(); setTimeout(() => onNavigate(navRoute), 300); }}>
                            <Text style={styles.navBtnText}>View Related</Text>
                            <ArrowRight size={16} color="#ac3434" />
                        </TouchableOpacity>
                    ) : null}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

//  Main Screen 

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
    const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

    const [confirmDialog, setConfirmDialog] = useState({
        visible: false, title: "", message: "", confirmText: "", onConfirm: () => {},
        type: "warning" as "warning" | "info" | "danger",
    });
    const [successDialog, setSuccessDialog] = useState({
        visible: false, title: "", message: "",
        type: "success" as "success" | "error" | "info" | "warning",
    });

    const loadNotifications = useCallback(
        async (page = 1, replace = true, overrideStatus?: string, overrideType?: string) => {
            try {
                if (page === 1 && replace) setLoading(true);
                else if (page > 1) setLoadingMore(true);

                const sFilter = overrideStatus !== undefined ? overrideStatus : statusFilter;
                const tFilter = overrideType  !== undefined ? overrideType  : typeFilter;

                const params: any = { page, per_page: 20 };
                if (sFilter) params.status = sFilter;
                if (tFilter) params.type   = tFilter;

                const res = await api.get("/notifications", { params });
                setNotifications(replace ? res.data.data : (prev) => [...prev, ...res.data.data]);
                setCurrentPage(res.data.meta.current_page);
                setLastPage(res.data.meta.last_page);
                if (res.data.stats) setStats(res.data.stats);
                setLoadError(null);
            } catch (err: any) {
                const msg = getApiErrorMessage(err, "Failed to load notifications.");
                if (page === 1 && !refreshing) setLoadError(msg);
                else showError(msg);
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

    const showError = (message: string) =>
        setSuccessDialog({ visible: true, title: "Error", message, type: "error" });

    const onRefresh = () => { setRefreshing(true); loadNotifications(1, true); };
    const loadMore  = () => { if (!loadingMore && currentPage < lastPage) loadNotifications(currentPage + 1, false); };

    const markRead = async (n: AppNotification, silent = false) => {
        if (n.read) return;
        try {
            await api.post(`/notifications/${n.id}/mark-as-read`);
            setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
            setStats((s) => s ? { ...s, unread: Math.max(0, s.unread - 1) } : s);
            setSelectedNotification((sn) => sn?.id === n.id ? { ...sn, read: true } : sn);
            refreshCount();
        } catch (err: any) { if (!silent) showError(getApiErrorMessage(err, "Failed to mark as read.")); }
    };

    const markUnread = async (n: AppNotification) => {
        try {
            await api.post(`/notifications/${n.id}/mark-as-unread`);
            setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: false } : x));
            setStats((s) => s ? { ...s, unread: s.unread + 1 } : s);
            setSelectedNotification((sn) => sn?.id === n.id ? { ...sn, read: false } : sn);
            refreshCount();
        } catch (err: any) { showError(getApiErrorMessage(err, "Failed to mark as unread.")); }
    };

    const handleTap = (n: AppNotification) => {
        setSelectedNotification(n);
        markRead(n, true);
    };

    const handleDelete = (n: AppNotification) => {
        setConfirmDialog({
            visible: true, title: "Delete Notification",
            message: "Delete this notification? This cannot be undone.",
            confirmText: "DELETE", type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.delete(`/notifications/${n.id}`);
                    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
                    if (!n.read) setStats((s) => s ? { ...s, unread: Math.max(0, s.unread - 1), total: s.total - 1 } : s);
                    refreshCount();
                } catch (err: any) { showError(getApiErrorMessage(err, "Failed to delete notification.")); }
            },
        });
    };

    const handleMarkAllRead = () => {
        setConfirmDialog({
            visible: true, title: "Mark All as Read",
            message: "Mark all notifications as read?",
            confirmText: "Mark All", type: "info",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.post("/notifications/mark-all-as-read");
                    loadNotifications(1, true);
                    refreshCount();
                } catch (err: any) { showError(getApiErrorMessage(err, "Failed to mark all as read.")); }
            },
        });
    };

    const handleDeleteRead = () => {
        setConfirmDialog({
            visible: true, title: "Delete Read Notifications",
            message: "Delete all read notifications? This cannot be undone.",
            confirmText: "DELETE", type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.delete("/notifications/delete-read");
                    setSuccessDialog({ visible: true, title: "Cleared", message: "Read notifications deleted.", type: "success" });
                    loadNotifications(1, true);
                    refreshCount();
                } catch (err: any) { showError(getApiErrorMessage(err, "Failed to delete read notifications.")); }
            },
        });
    };

    //  Render card 

    const renderItem = ({ item }: { item: AppNotification }) => {
        const meta = TYPE_META[item.type] ?? DEFAULT_META;
        const { color, bg, border, Icon } = meta;
        return (
            <Pressable
                style={({ pressed }) => [styles.card, !item.read && styles.cardUnread, pressed && styles.cardPressed]}
                onPress={() => handleTap(item)}
            >
                <View style={[styles.accentBar, { backgroundColor: item.read ? "#E5E7EB" : color }]} />
                <View style={[styles.iconCircle, { backgroundColor: bg, borderColor: border }]}>
                    <Icon size={17} color={color} />
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.cardTopRow}>
                        <View style={[styles.typeBadge, { backgroundColor: bg, borderColor: border }]}>
                            <Text style={[styles.typeBadgeText, { color }]}>{meta.label}</Text>
                        </View>
                        <Text style={styles.cardTime}>{relativeTime(item.created_at)}</Text>
                    </View>
                    {item.title ? (
                        <Text style={[styles.cardTitle, item.read && styles.cardTitleRead]} numberOfLines={1}>
                            {item.title}
                        </Text>
                    ) : null}
                    <Text style={[styles.cardMessage, item.read && styles.cardMessageRead]} numberOfLines={2}>
                        {item.message}
                    </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </Pressable>
        );
    };

    //  Stats grid items 

    const statItems = stats ? [
        { label: "Total",      value: stats.total,        textColor: "#111827", bg: "#fff",    border: "#E5E7EB" },
        { label: "Unread",     value: stats.unread,       textColor: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
        stats.refunds     != null ? { label: "Refunds",    value: stats.refunds,     textColor: "#92400E", bg: "#FFFBEB", border: "#FDE68A" } : null,
        stats.lab_issues  != null ? { label: "Lab Issues", value: stats.lab_issues,  textColor: "#991B1B", bg: "#FEF2F2", border: "#FECACA" } : null,
        stats.system_alerts != null ? { label: "System",  value: stats.system_alerts,textColor: "#374151", bg: "#F9FAFB", border: "#D1D5DB" } : null,
    ].filter(Boolean) as { label: string; value: number; textColor: string; bg: string; border: string }[] : [];

    // 

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Bell size={22} color="#ac3434" />
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {stats && stats.unread > 0 ? (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{stats.unread > 99 ? "99+" : stats.unread}</Text>
                        </View>
                    ) : null}
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleMarkAllRead} activeOpacity={0.7}>
                        <CheckCheck size={15} color="#374151" />
                        <Text style={styles.headerBtnText}>Mark All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerBtn, styles.headerBtnRed]} onPress={handleDeleteRead} activeOpacity={0.7}>
                        <Trash2 size={15} color="#EF4444" />
                        <Text style={[styles.headerBtnText, { color: "#EF4444" }]}>Clear Read</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats grid */}
            {statItems.length > 0 && (
                <View style={styles.statsGrid}>
                    {statItems.map((s) => (
                        <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg, borderColor: s.border }]}>
                            <Text style={[styles.statValue, { color: s.textColor }]}>{s.value}</Text>
                            <Text style={[styles.statLabel, { color: s.textColor }]}>{s.label}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Filter row: Status + Type */}
            <View style={styles.filterRow}>
                <View style={{ flex: 1 }}>
                    <FilterPicker
                        label="All Statuses"
                        value={statusFilter}
                        options={STATUS_OPTIONS}
                        onChange={(v) => {
                            setStatusFilter(v);
                            loadNotifications(1, true, v, typeFilter);
                        }}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <FilterPicker
                        label="All Types"
                        value={typeFilter}
                        options={TYPE_OPTIONS}
                        onChange={(v) => {
                            setTypeFilter(v);
                            loadNotifications(1, true, statusFilter, v);
                        }}
                    />
                </View>
            </View>

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
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoadError(null); loadNotifications(1, true); }}>
                        <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ac3434"]} tintColor="#ac3434" />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.4}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        loadingMore ? <ActivityIndicator size="small" color="#ac3434" style={{ marginVertical: 16 }} /> : null
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIconWrap}>
                                <BellOff size={36} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>All caught up!</Text>
                            <Text style={styles.emptySubtitle}>No notifications to show</Text>
                        </View>
                    }
                />
            )}

            {/* Detail sheet */}
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

//  Styles 

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },

    // Header
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
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827", flexShrink: 1 },
    unreadBadge: {
        backgroundColor: "#ac3434", borderRadius: 99,
        minWidth: 22, height: 22, alignItems: "center", justifyContent: "center",
        paddingHorizontal: 6, flexShrink: 0,
    },
    unreadBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    headerRight: { flexDirection: "row", gap: 6, flexShrink: 0 },
    headerBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6,
        backgroundColor: "#F3F4F6", borderRadius: 8,
    },
    headerBtnRed: { backgroundColor: "#FEF2F2" },
    headerBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },

    // Stats grid (matches appointments)
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    statCard: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        width: "30%",
        flexGrow: 1,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    statValue: { fontSize: 22, fontWeight: "700" },
    statLabel: { fontSize: 11, marginTop: 2 },

    // Filter row (matches appointments)
    filterRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },

    // FilterPicker (matches appointments)
    pickerButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 4,
    },
    pickerButtonText: { flex: 1, fontSize: 14, color: "#374151" },
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    pickerModal: {
        backgroundColor: "#fff",
        borderRadius: 14,
        width: "100%",
        maxHeight: 400,
        overflow: "hidden",
    },
    pickerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    pickerTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
    pickerList: { maxHeight: 320 },
    pickerOption: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    pickerOptionSelected: { backgroundColor: "#FEF2F2" },
    pickerOptionText: { fontSize: 15, color: "#374151" },
    pickerOptionTextSelected: { color: "#ac3434", fontWeight: "700" },

    // List
    skeletonWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    list: { padding: 12, gap: 8, paddingBottom: 32 },

    // Card
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
    cardUnread: { elevation: 2, shadowOpacity: 0.1 },
    cardPressed: { opacity: 0.88 },
    accentBar: { width: 4, alignSelf: "stretch" },
    iconCircle: {
        width: 38, height: 38, borderRadius: 99,
        alignItems: "center", justifyContent: "center",
        marginLeft: 12, flexShrink: 0,
        borderWidth: 1,
    },
    cardContent: { flex: 1, paddingVertical: 11, paddingHorizontal: 10 },
    cardTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
    typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, borderWidth: 1 },
    typeBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
    cardTime: { fontSize: 11, color: "#9CA3AF", marginLeft: "auto" },
    cardTitle: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 2, lineHeight: 18 },
    cardTitleRead: { color: "#9CA3AF", fontWeight: "500" },
    cardMessage: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
    cardMessageRead: { color: "#9CA3AF" },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ac3434", marginRight: 12, flexShrink: 0 },

    // Empty
    empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: 10 },
    emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 4 },
    emptySubtitle: { fontSize: 13, color: "#9CA3AF" },

    // Error
    errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
    errorTitle: { fontSize: 16, fontWeight: "700", color: "#111827", textAlign: "center", marginTop: 4 },
    errorMessage: { fontSize: 13, color: "#6B7280", textAlign: "center" },
    retryBtn: { marginTop: 6, paddingHorizontal: 28, paddingVertical: 11, backgroundColor: "#ac3434", borderRadius: 10 },
    retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    // Detail bottom sheet
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 8 },
    sheetHandle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    modalHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
    modalIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    modalTimestamp: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
    modalCloseBtn: { padding: 6, backgroundColor: "#F3F4F6", borderRadius: 8, marginTop: 2 },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", lineHeight: 24, marginBottom: 8 },
    modalMessage: { fontSize: 14, color: "#4B5563", lineHeight: 22, marginBottom: 18 },
    divider: { height: 1, backgroundColor: "#F0F0F0", marginBottom: 16 },
    modalActions: { flexDirection: "row", gap: 10, marginBottom: 12 },
    modalBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 10 },
    modalBtnOutline: { borderWidth: 1.5, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
    modalBtnDanger: { backgroundColor: "#EF4444" },
    modalBtnText: { fontSize: 13, fontWeight: "700", color: "#374151" },
    navBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: "#ac3434", backgroundColor: "#FFF5F5" },
    navBtnText: { fontSize: 14, fontWeight: "700", color: "#ac3434" },
});
