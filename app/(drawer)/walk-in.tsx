import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    AlertCircle,
    Calendar,
    CalendarX,
    CheckCircle,
    ChevronDown,
    Clock,
    Eye,
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
import { Image } from "react-native";

import api, { API_BASE_URL } from "@/app/services/api";
import { ConfirmDialog } from "@/components";
import { getApiErrorMessage, useResponsiveLayout } from "@/utils";

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
    id_picture_url?: string | null;
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

const STATUS_COLORS: Record<string, string> = {
    pending: "#EAB308",
    checked_in: "#3B82F6",
    confirmed: "#22C55E",
    cancelled: "#EF4444",
};

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
    PWD: { color: "#1E40AF", bg: "#DBEAFE" },
    "Senior Citizen": { color: "#5B21B6", bg: "#EDE9FE" },
    Pregnant: { color: "#9D174D", bg: "#FCE7F3" },
    Regular: { color: "#374151", bg: "#F3F4F6" },
};

export default function WalkInScreen() {
    const responsive = useResponsiveLayout();
    const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [confirmCheckIn, setConfirmCheckIn] = useState<WalkIn | null>(null);
    const [confirmCancel, setConfirmCancel] = useState<WalkIn | null>(null);

    const [priorityModal, setPriorityModal] = useState<WalkIn | null>(null);
    const [pendingPriority, setPendingPriority] = useState<{
        walkIn: WalkIn;
        newPriority: string;
    } | null>(null);
    const [updatingPriority, setUpdatingPriority] = useState(false);

    const [idViewer, setIdViewer] = useState<{
        visible: boolean;
        url: string | null;
        name: string | null;
    }>({
        visible: false,
        url: null,
        name: null,
    });

    const fetchWalkIns = useCallback(
        async (date: Date = selectedDate) => {
            try {
                setLoading(true);
                const dateStr = date.toISOString().split("T")[0];
                const res = await api.get("/walk-ins", {
                    params: { date: dateStr },
                });
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
            await api.post(`/walk-ins/${w.id}/cancel`);
            fetchWalkIns(selectedDate);
        } catch (e: any) {
            setError(getApiErrorMessage(e, "Failed to cancel walk-in."));
        } finally {
            setConfirmCancel(null);
        }
    };

    const handlePriorityUpdate = async () => {
        if (!pendingPriority) return;
        setUpdatingPriority(true);
        try {
            await api.patch(
                `/walk-ins/${pendingPriority.walkIn.id}/update-priority`,
                {
                    priority_category: pendingPriority.newPriority,
                },
            );
            fetchWalkIns(selectedDate);
        } catch (e: any) {
            setError(getApiErrorMessage(e, "Failed to update priority."));
        } finally {
            setUpdatingPriority(false);
            setPendingPriority(null);
        }
    };

    const pc = (category: string) =>
        PRIORITY_COLORS[category] ?? PRIORITY_COLORS.Regular;
    const isQueuePriority = (category: string) => category !== "Regular";

    const renderItem = ({ item }: { item: WalkIn }) => {
        const statusColor = STATUS_COLORS[item.status] ?? "#6B7280";
        const demoBadge = pc(item.priority_category);

        return (
            <View style={styles.card}>
                {/* Left status bar — same as appointments */}
                <View
                    style={[styles.statusBar, { backgroundColor: statusColor }]}
                />
                <View style={styles.cardBody}>
                    {/* Row 1: Name + status badge */}
                    <View style={styles.cardRow}>
                        <User size={14} color="#6B7280" />
                        <Text style={styles.cardName}>{item.patient_name}</Text>
                        <View
                            style={[
                                styles.badge,
                                { backgroundColor: statusColor + "22" },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    { color: statusColor },
                                ]}
                            >
                                {item.status.replace("_", " ")}
                            </Text>
                        </View>
                    </View>

                    {/* Row 2: Ref + registered time */}
                    <View style={styles.cardRow}>
                        <Clock size={13} color="#9CA3AF" />
                        <Text style={styles.cardSub}>
                            Registered: {item.registered_at}
                        </Text>
                        {item.checked_in_at && (
                            <>
                                <Text style={styles.cardSub}>-</Text>
                                <Text style={styles.cardSub}>
                                    In: {item.checked_in_at}
                                </Text>
                            </>
                        )}
                    </View>

                    {/* Row 3: Age/gender + demographic + queue type */}
                    <View style={styles.cardRow}>
                        <Text style={styles.cardSub}>
                            {item.age} yrs - {item.gender}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <View
                            style={[
                                styles.demoBadge,
                                { backgroundColor: demoBadge.bg },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.demoBadgeText,
                                    { color: demoBadge.color },
                                ]}
                            >
                                {item.priority_category}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.queueBadge,
                                isQueuePriority(item.priority_category)
                                    ? {
                                          backgroundColor: "#D1FAE5",
                                          borderColor: "#6EE7B7",
                                      }
                                    : {
                                          backgroundColor: "#F3F4F6",
                                          borderColor: "#D1D5DB",
                                      },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.queueBadgeText,
                                    {
                                        color: isQueuePriority(
                                            item.priority_category,
                                        )
                                            ? "#065F46"
                                            : "#374151",
                                    },
                                ]}
                            >
                                {isQueuePriority(item.priority_category)
                                    ? "PW"
                                    : "W"}
                            </Text>
                        </View>
                    </View>

                    {/* Row 4: Tests + amount */}
                    <View style={styles.cardRow}>
                        <Text style={styles.cardSub}>
                            {item.tests.length} test
                            {item.tests.length !== 1 ? "s" : ""}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.cardAmount}>
                            ₱
                            {Number(item.total_amount).toLocaleString("en-PH", {
                                minimumFractionDigits: 2,
                            })}
                        </Text>
                    </View>

                    {/* Row 5: Ref number */}
                    <View style={styles.cardRow}>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.refNum}>
                            Ref: {item.reference_number}
                        </Text>
                    </View>

                    {/* ID picture */}
                    {item.id_picture_url ? (
                        <TouchableOpacity
                            style={styles.idBtn}
                            onPress={() =>
                                setIdViewer({
                                    visible: true,
                                    url: item.id_picture_url!,
                                    name: item.patient_name,
                                })
                            }
                        >
                            <Eye size={13} color="#2563EB" />
                            <Text style={styles.idBtnText}>
                                View Uploaded ID
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.noId}>No ID uploaded</Text>
                    )}

                    {/* Action buttons */}
                    <View style={styles.actionRow}>
                        {item.status === "pending" && (
                            <TouchableOpacity
                                style={[
                                    styles.actionBtn,
                                    { backgroundColor: "#ac3434" },
                                ]}
                                onPress={() => setConfirmCheckIn(item)}
                            >
                                <CheckCircle size={14} color="#fff" />
                                <Text
                                    style={[
                                        styles.actionBtnText,
                                        { color: "#fff" },
                                    ]}
                                >
                                    Check In
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                { borderWidth: 1, borderColor: "#D1D5DB" },
                            ]}
                            onPress={() => setPriorityModal(item)}
                        >
                            <ChevronDown size={14} color="#374151" />
                            <Text
                                style={[
                                    styles.actionBtnText,
                                    { color: "#374151" },
                                ]}
                            >
                                Priority
                            </Text>
                        </TouchableOpacity>
                        {item.status !== "confirmed" &&
                            item.status !== "cancelled" && (
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        { backgroundColor: "#FEE2E2" },
                                    ]}
                                    onPress={() => setConfirmCancel(item)}
                                >
                                    <X size={14} color="#991B1B" />
                                    <Text
                                        style={[
                                            styles.actionBtnText,
                                            { color: "#991B1B" },
                                        ]}
                                    >
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View
            style={[
                styles.container,
                responsive.isTablet && {
                    width: "100%",
                    maxWidth: 1100,
                    alignSelf: "center",
                },
            ]}
        >
            {/* Stats */}
            {stats && (
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, styles.statCardTotal]}>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardPending]}>
                        <Text style={[styles.statValue, { color: "#92400E" }]}>
                            {stats.pending}
                        </Text>
                        <Text style={[styles.statLabel, { color: "#78350F" }]}>
                            Pending
                        </Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardCheckedIn]}>
                        <Text style={[styles.statValue, { color: "#1E3A8A" }]}>
                            {stats.checked_in}
                        </Text>
                        <Text style={[styles.statLabel, { color: "#1E40AF" }]}>
                            Checked In
                        </Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardConfirmed]}>
                        <Text style={[styles.statValue, { color: "#065F46" }]}>
                            {stats.confirmed}
                        </Text>
                        <Text style={[styles.statLabel, { color: "#047857" }]}>
                            Confirmed
                        </Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardCancelled]}>
                        <Text style={[styles.statValue, { color: "#991B1B" }]}>
                            {stats.cancelled}
                        </Text>
                        <Text style={[styles.statLabel, { color: "#B91C1C" }]}>
                            Cancelled
                        </Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardPriority]}>
                        <Text style={[styles.statValue, { color: "#5B21B6" }]}>
                            {stats.priority}
                        </Text>
                        <Text style={[styles.statLabel, { color: "#6D28D9" }]}>
                            Priority
                        </Text>
                    </View>
                </View>
            )}

            {/* Date filter row */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Calendar
                        size={14}
                        color="#6B7280"
                        style={{ marginRight: 6 }}
                    />
                    <Text style={styles.pickerButtonText} numberOfLines={1}>
                        {selectedDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                        })}
                    </Text>
                    <ChevronDown color="#6B7280" size={16} />
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                />
            )}

            {/* Queue type legend — matches appointments */}
            <View style={styles.legendCard}>
                <View style={styles.legendRow}>
                    <View
                        style={[
                            styles.legendItem,
                            {
                                backgroundColor: "#D1FAE5",
                                borderColor: "#6EE7B7",
                            },
                        ]}
                    >
                        <Text
                            style={[styles.legendTitle, { color: "#065F46" }]}
                        >
                            PW — Priority Walk-in
                        </Text>
                        <Text style={[styles.legendSub, { color: "#047857" }]}>
                            Verified demographic priority walk-in
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.legendItem,
                            {
                                backgroundColor: "#F3F4F6",
                                borderColor: "#D1D5DB",
                            },
                        ]}
                    >
                        <Text
                            style={[styles.legendTitle, { color: "#374151" }]}
                        >
                            W — Regular Walk-in
                        </Text>
                        <Text style={[styles.legendSub, { color: "#4B5563" }]}>
                            Standard walk-in without priority
                        </Text>
                    </View>
                </View>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>
                        Unable to load walk-ins
                    </Text>
                    <Text style={styles.errorMessage}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setError(null);
                            fetchWalkIns(selectedDate);
                        }}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!error &&
                (loading ? (
                    <View
                        style={{
                            flex: 1,
                            paddingHorizontal: 16,
                            paddingTop: 8,
                        }}
                    >
                        <ActivityIndicator
                            size="large"
                            color="#ac3434"
                            style={{ marginTop: 40 }}
                        />
                    </View>
                ) : (
                    <FlatList
                        style={{ flex: 1 }}
                        data={walkIns}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderItem}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={["#ac3434"]}
                            />
                        }
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <CalendarX size={40} color="#D1D5DB" />
                                <Text style={styles.emptyText}>
                                    No walk-ins found
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 13,
                                        color: "#9CA3AF",
                                        textAlign: "center",
                                        marginTop: 4,
                                    }}
                                >
                                    No walk-in registrations for this date
                                </Text>
                            </View>
                        }
                    />
                ))}

            {/* In-app ID image viewer */}
            <Modal
                visible={idViewer.visible}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setIdViewer({ visible: false, url: null, name: null })
                }
            >
                <View style={styles.idViewerOverlay}>
                    <View style={styles.idViewerBox}>
                        <View style={styles.idViewerHeader}>
                            <Text
                                style={styles.idViewerTitle}
                                numberOfLines={1}
                            >
                                ID — {idViewer.name}
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    setIdViewer({
                                        visible: false,
                                        url: null,
                                        name: null,
                                    })
                                }
                                style={{ padding: 4 }}
                            >
                                <X size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        {idViewer.url && (
                            <Image
                                source={{
                                    uri: idViewer.url.startsWith("http")
                                        ? idViewer.url
                                        : `${API_BASE_URL}/${idViewer.url}`,
                                }}
                                style={styles.idViewerImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Priority selection modal */}
            <Modal
                visible={!!priorityModal}
                transparent
                animationType="slide"
                onRequestClose={() => setPriorityModal(null)}
            >
                <TouchableOpacity
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={() => setPriorityModal(null)}
                >
                    <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                        <View style={styles.priorityBox}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>
                                        Change Priority
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: "#6B7280",
                                            marginTop: 2,
                                        }}
                                    >
                                        {priorityModal?.patient_name}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={{ padding: 4 }}
                                    onPress={() => setPriorityModal(null)}
                                >
                                    <X size={22} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            {PRIORITY_OPTIONS.map((p) => {
                                const isActive =
                                    priorityModal?.priority_category === p;
                                const badge = pc(p);
                                const descriptions: Record<string, string> = {
                                    Regular:
                                        "Standard walk-in, served by arrival order",
                                    PWD: "Person with disability — served first",
                                    "Senior Citizen":
                                        "60 years old and above — served first",
                                    Pregnant: "Pregnant patient — served first",
                                };
                                return (
                                    <TouchableOpacity
                                        key={p}
                                        style={[
                                            styles.priorityOption,
                                            isActive &&
                                                styles.priorityOptionActive,
                                        ]}
                                        onPress={() => {
                                            if (isActive) return;
                                            setPendingPriority({
                                                walkIn: priorityModal!,
                                                newPriority: p,
                                            });
                                            setPriorityModal(null);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View
                                            style={[
                                                styles.priorityOptionDot,
                                                {
                                                    backgroundColor: badge.bg,
                                                    borderColor: badge.color,
                                                },
                                            ]}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[
                                                    styles.priorityOptionLabel,
                                                    isActive && {
                                                        color: "#ac3434",
                                                        fontWeight: "700",
                                                    },
                                                ]}
                                            >
                                                {p}
                                            </Text>
                                            <Text
                                                style={
                                                    styles.priorityOptionDesc
                                                }
                                            >
                                                {descriptions[p]}
                                            </Text>
                                        </View>
                                        {isActive && (
                                            <View
                                                style={styles.priorityCheckmark}
                                            >
                                                <Text
                                                    style={
                                                        styles.priorityCheckmarkText
                                                    }
                                                >
                                                    ✓
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Walk-in detail bottom sheet — shown on card tap */}
            <ConfirmDialog
                visible={!!pendingPriority}
                title="Update Priority"
                message={`Change priority for ${pendingPriority?.walkIn.patient_name} from "${pendingPriority?.walkIn.priority_category}" to "${pendingPriority?.newPriority}"?\n\nThis updates their position in the queue.`}
                confirmText={updatingPriority ? "Updating..." : "Update"}
                type="info"
                onConfirm={handlePriorityUpdate}
                onCancel={() => setPendingPriority(null)}
            />

            <ConfirmDialog
                visible={!!confirmCheckIn}
                title="Check In Walk-In"
                message={`Check in ${confirmCheckIn?.patient_name}?\n\nRef: ${confirmCheckIn?.reference_number}`}
                confirmText="Check In"
                type="info"
                onConfirm={() =>
                    confirmCheckIn && handleCheckIn(confirmCheckIn)
                }
                onCancel={() => setConfirmCheckIn(null)}
            />

            <ConfirmDialog
                visible={!!confirmCancel}
                title="Cancel Walk-In"
                message={`Cancel registration for ${confirmCancel?.patient_name}?\n\nThis will permanently remove them from the queue.`}
                confirmText="Cancel Registration"
                type="danger"
                onConfirm={() => confirmCancel && handleCancel(confirmCancel)}
                onCancel={() => setConfirmCancel(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    // Stats grid — matches appointments
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
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    statCardTotal: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statCardPending: {
        backgroundColor: "#FFFBEB",
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    statCardCheckedIn: {
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    statCardConfirmed: {
        backgroundColor: "#ECFDF5",
        borderWidth: 1,
        borderColor: "#A7F3D0",
    },
    statCardCancelled: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    statCardPriority: {
        backgroundColor: "#F5F3FF",
        borderWidth: 1,
        borderColor: "#DDD6FE",
    },
    statValue: { fontSize: 22, fontWeight: "700", color: "#111827" },
    statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
    // Filter row — matches appointments
    filterRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    pickerButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingVertical: 9,
        paddingHorizontal: 12,
        backgroundColor: "#F9FAFB",
    },
    pickerButtonText: { fontSize: 14, color: "#111827", flex: 1 },
    legendCard: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    legendRow: {
        flexDirection: "row",
        gap: 8,
    },
    legendItem: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
    },
    legendTitle: {
        fontSize: 11,
        fontWeight: "700",
        marginBottom: 2,
    },
    legendSub: {
        fontSize: 10,
    },
    // Card — matches appointments
    list: { padding: 16, gap: 10 },
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
    statusBar: { width: 5 },
    cardBody: { flex: 1, padding: 12, gap: 4 },
    cardRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    cardName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
    cardSub: { fontSize: 12, color: "#6B7280" },
    cardAmount: { fontSize: 13, fontWeight: "700", color: "#111827" },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
    refNum: { fontSize: 11, color: "#9CA3AF" },
    demoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    demoBadgeText: { fontSize: 11, fontWeight: "600" },
    queueBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 99,
        borderWidth: 1,
    },
    queueBadgeText: { fontSize: 11, fontWeight: "700" },
    // Action buttons
    actionRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 10,
        flexWrap: "wrap",
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionBtnText: { fontSize: 13, fontWeight: "600" },
    idBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
    },
    idBtnText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
    noId: { fontSize: 11, color: "#9CA3AF", marginTop: 8 },
    // In-app ID viewer
    idViewerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    idViewerBox: {
        backgroundColor: "#fff",
        borderRadius: 16,
        width: "100%",
        maxWidth: 400,
        overflow: "hidden",
    },
    idViewerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    idViewerTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111827",
        flex: 1,
        marginRight: 8,
    },
    idViewerImage: { width: "100%", height: 300, backgroundColor: "#F3F4F6" },
    // Error
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
    // Empty
    empty: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: "#9CA3AF" },
    // Priority modal — bottom sheet style
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    priorityBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 32,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
    priorityOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    priorityOptionActive: { backgroundColor: "#FEF2F2" },
    priorityOptionDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
    },
    priorityOptionLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
    priorityOptionDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    priorityCheckmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#ac3434",
        alignItems: "center",
        justifyContent: "center",
    },
    priorityCheckmarkText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
