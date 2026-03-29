import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    ChevronDown,
    Clock,
    User,
    X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import { ConfirmDialog } from "@/components";
import { EmptyState } from "@/components";
import { getApiErrorMessage } from "@/utils";

type WalkIn = {
    id: number;
    reference_number: string;
    patient_name: string;
    contact: string;
    age: number;
    gender: string;
    priority_category: string;
    status: string;
    checked_in_at: string | null;
    registered_at: string;
    tests: { name: string; price: number }[];
    total_amount: number;
};

type Stats = {
    total: number;
    pending: number;
    checked_in: number;
    confirmed: number;
    cancelled: number;
    priority: number;
};

const PRIORITY_OPTIONS = ["Regular", "PWD", "Senior Citizen", "Pregnant"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    pending:    { bg: "#FEF3C7", text: "#92400E" },
    checked_in: { bg: "#DBEAFE", text: "#1E40AF" },
    confirmed:  { bg: "#D1FAE5", text: "#065F46" },
    cancelled:  { bg: "#FEE2E2", text: "#991B1B" },
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
    PWD:            { bg: "#EDE9FE", text: "#5B21B6" },
    Pregnant:       { bg: "#FCE7F3", text: "#9D174D" },
    "Senior Citizen": { bg: "#FEF3C7", text: "#92400E" },
    Regular:        { bg: "#F3F4F6", text: "#374151" },
};

export default function WalkInScreen() {
    const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [confirmCheckIn, setConfirmCheckIn] = useState<WalkIn | null>(null);
    const [confirmCancel, setConfirmCancel] = useState<WalkIn | null>(null);
    const [cancelReason, setCancelReason] = useState("");

    const [priorityModal, setPriorityModal] = useState<WalkIn | null>(null);
    const [updatingPriority, setUpdatingPriority] = useState(false);

    const fetchWalkIns = useCallback(
        async (date: Date = selectedDate) => {
            try {
                setLoading(true);
                const dateStr = date.toISOString().split("T")[0];
                const res = await api.get("/walk-ins", { params: { date: dateStr } });
                setWalkIns(res.data.data);
                setStats(res.data.stats);
                setError(null);
            } catch (e: any) {
                setError(getApiErrorMessage(e, "Failed to load walk-ins."));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [selectedDate],
    );

    useFocusEffect(
        useCallback(() => {
            fetchWalkIns(selectedDate);
        }, []),
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchWalkIns(selectedDate);
    };

    const handleDateChange = (_: any, date?: Date) => {
        setShowDatePicker(Platform.OS === "ios");
        if (date) {
            setSelectedDate(date);
            fetchWalkIns(date);
        }
    };

    const handleCheckIn = async (w: WalkIn) => {
        try {
            await api.post(`/walk-ins/${w.id}/check-in`);
            fetchWalkIns(selectedDate);
        } catch (e: any) {
            setError(getApiErrorMessage(e, "Failed to check in."));
        } finally {
            setConfirmCheckIn(null);
        }
    };

    const handleCancel = async (w: WalkIn) => {
        try {
            await api.post(`/walk-ins/${w.id}/cancel`, { reason: cancelReason });
            fetchWalkIns(selectedDate);
        } catch (e: any) {
            setError(getApiErrorMessage(e, "Failed to cancel walk-in."));
        } finally {
            setConfirmCancel(null);
            setCancelReason("");
        }
    };

    const handlePriorityUpdate = async (priority: string) => {
        if (!priorityModal) return;
        setUpdatingPriority(true);
        try {
            await api.patch(`/walk-ins/${priorityModal.id}/update-priority`, {
                priority_category: priority,
            });
            fetchWalkIns(selectedDate);
        } catch (e: any) {
            setError(getApiErrorMessage(e, "Failed to update priority."));
        } finally {
            setUpdatingPriority(false);
            setPriorityModal(null);
        }
    };

    const renderItem = ({ item }: { item: WalkIn }) => {
        const sc = STATUS_COLORS[item.status] ?? { bg: "#F3F4F6", text: "#374151" };
        const pc = PRIORITY_COLORS[item.priority_category] ?? PRIORITY_COLORS.Regular;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardName}>{item.patient_name}</Text>
                        <Text style={styles.cardRef}>{item.reference_number}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.text }]}>
                            {item.status.replace("_", " ")}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <User color="#6B7280" size={13} />
                    <Text style={styles.infoText}>
                        {item.age} yrs • {item.gender}
                    </Text>
                    <View style={[styles.priorityBadge, { backgroundColor: pc.bg }]}>
                        <Text style={[styles.priorityText, { color: pc.text }]}>
                            {item.priority_category}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Clock color="#6B7280" size={13} />
                    <Text style={styles.infoText}>
                        Registered: {item.registered_at}
                        {item.checked_in_at ? ` • Checked in: ${item.checked_in_at}` : ""}
                    </Text>
                </View>

                <View style={styles.testsRow}>
                    {item.tests.map((t, i) => (
                        <View key={i} style={styles.testChip}>
                            <Text style={styles.testChipText}>{t.name}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.totalAmount}>
                    ₱{item.total_amount.toLocaleString()}
                </Text>

                <View style={styles.actions}>
                    {item.status === "pending" && (
                        <TouchableOpacity
                            style={styles.btnCheckIn}
                            onPress={() => setConfirmCheckIn(item)}
                        >
                            <CheckCircle color="#fff" size={14} />
                            <Text style={styles.btnCheckInText}>Check In</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.btnPriority}
                        onPress={() => setPriorityModal(item)}
                    >
                        <ChevronDown color="#374151" size={14} />
                        <Text style={styles.btnPriorityText}>Priority</Text>
                    </TouchableOpacity>
                    {item.status !== "confirmed" && item.status !== "cancelled" && (
                        <TouchableOpacity
                            style={styles.btnCancel}
                            onPress={() => {
                                setCancelReason("");
                                setConfirmCancel(item);
                            }}
                        >
                            <X color="#991B1B" size={14} />
                            <Text style={styles.btnCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Date Selector */}
            <View style={styles.dateBar}>
                <Calendar color="#6B7280" size={16} />
                <Text style={styles.dateBarLabel}>Date:</Text>
                <TouchableOpacity
                    style={styles.datePill}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={styles.datePillText}>
                        {selectedDate.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                        })}
                    </Text>
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* Stats */}
            {stats && (
                <View style={styles.statsRow}>
                    {[
                        { label: "Total", value: stats.total, color: "#6B7280" },
                        { label: "Pending", value: stats.pending, color: "#D97706" },
                        { label: "Checked In", value: stats.checked_in, color: "#2563EB" },
                        { label: "Priority", value: stats.priority, color: "#7C3AED" },
                    ].map((s) => (
                        <View key={s.label} style={styles.statCard}>
                            <Text style={[styles.statValue, { color: s.color }]}>
                                {s.value}
                            </Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>
            )}

            {error && (
                <View style={styles.errorBanner}>
                    <AlertCircle color="#991B1B" size={16} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#ac3434" />
                </View>
            ) : (
                <FlatList
                    data={walkIns}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            icon={Calendar}
                            title="No walk-ins today"
                            message="No walk-in registrations found for this date."
                        />
                    }
                />
            )}

            {/* Priority Modal */}
            <Modal
                visible={!!priorityModal}
                transparent
                animationType="fade"
                onRequestClose={() => setPriorityModal(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPriorityModal(null)}
                >
                    <View style={styles.priorityBox}>
                        <Text style={styles.priorityBoxTitle}>
                            Change Priority
                        </Text>
                        {PRIORITY_OPTIONS.map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[
                                    styles.priorityOption,
                                    priorityModal?.priority_category === p &&
                                        styles.priorityOptionActive,
                                ]}
                                onPress={() => handlePriorityUpdate(p)}
                                disabled={updatingPriority}
                            >
                                <Text
                                    style={[
                                        styles.priorityOptionText,
                                        priorityModal?.priority_category === p && {
                                            color: "#ac3434",
                                            fontWeight: "700",
                                        },
                                    ]}
                                >
                                    {p}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <ConfirmDialog
                visible={!!confirmCheckIn}
                title="Check In Walk-In"
                message={`Check in ${confirmCheckIn?.patient_name}?`}
                confirmText="Check In"
                type="info"
                onConfirm={() => confirmCheckIn && handleCheckIn(confirmCheckIn)}
                onCancel={() => setConfirmCheckIn(null)}
            />

            <ConfirmDialog
                visible={!!confirmCancel}
                title="Cancel Walk-In"
                message={`Cancel registration for ${confirmCancel?.patient_name}?`}
                confirmText="Cancel Registration"
                type="danger"
                onConfirm={() => confirmCancel && handleCancel(confirmCancel)}
                onCancel={() => {
                    setConfirmCancel(null);
                    setCancelReason("");
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    dateBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    dateBarLabel: { fontSize: 14, color: "#374151", fontWeight: "600" },
    datePill: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    datePillText: { fontSize: 14, color: "#111827", fontWeight: "500" },
    statsRow: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        paddingVertical: 10,
        paddingHorizontal: 8,
        gap: 4,
    },
    statCard: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "#F9FAFB",
        marginHorizontal: 2,
    },
    statValue: { fontSize: 18, fontWeight: "700" },
    statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FEE2E2",
        padding: 12,
        margin: 12,
        borderRadius: 8,
    },
    errorText: { color: "#991B1B", fontSize: 13, flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 12, paddingBottom: 40 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    cardName: { fontSize: 16, fontWeight: "700", color: "#111827" },
    cardRef: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    badgeText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    infoText: { fontSize: 13, color: "#374151", flex: 1 },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    priorityText: { fontSize: 11, fontWeight: "600" },
    testsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginBottom: 8,
    },
    testChip: {
        backgroundColor: "#EFF6FF",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    testChipText: { fontSize: 12, color: "#1D4ED8", fontWeight: "500" },
    totalAmount: {
        fontSize: 16,
        fontWeight: "700",
        color: "#10B981",
        marginBottom: 10,
    },
    actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    btnCheckIn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#ac3434",
    },
    btnCheckInText: { fontSize: 13, fontWeight: "600", color: "#fff" },
    btnPriority: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    btnPriorityText: { fontSize: 13, fontWeight: "600", color: "#374151" },
    btnCancel: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#FEE2E2",
    },
    btnCancelText: { fontSize: 13, fontWeight: "600", color: "#991B1B" },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    priorityBox: {
        backgroundColor: "#fff",
        borderRadius: 12,
        width: "100%",
        maxWidth: 300,
        overflow: "hidden",
    },
    priorityBoxTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    priorityOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    priorityOptionActive: { backgroundColor: "#FEF2F2" },
    priorityOptionText: { fontSize: 15, color: "#374151" },
});
