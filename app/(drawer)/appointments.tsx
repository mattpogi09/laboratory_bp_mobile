import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    AlertCircle,
    Calendar,
    CalendarX,
    Clock,
    Phone,
    RefreshCw,
    Search,
    User,
    X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import type {
    Appointment,
    AppointmentStats,
    AppointmentStatus,
} from "@/types";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SkeletonRow, SuccessDialog } from "@/components";

const STATUS_COLORS: Record<AppointmentStatus | string, string> = {
    PENDING: "#EAB308",
    CHECKED_IN: "#3B82F6",
    CONFIRMED: "#22C55E",
    CANCELLED: "#EF4444",
    NO_SHOW: "#6B7280",
};

const STATUS_TABS: { label: string; value: string }[] = [
    { label: "All", value: "" },
    { label: "Pending", value: "PENDING" },
    { label: "Checked In", value: "CHECKED_IN" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Cancelled", value: "CANCELLED" },
    { label: "No Show", value: "NO_SHOW" },
];

const DATE_PILLS = [
    { label: "All", value: "" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
];

function getDateParams(pill: string): Record<string, string> {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (pill === "today") {
        const d = fmt(now);
        return { date_from: d, date_to: d };
    }
    if (pill === "week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(now);
        mon.setDate(diff);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return { date_from: fmt(mon), date_to: fmt(sun) };
    }
    if (pill === "month") {
        const yr = now.getFullYear();
        const mo = now.getMonth();
        return {
            date_from: fmt(new Date(yr, mo, 1)),
            date_to: fmt(new Date(yr, mo + 1, 0)),
        };
    }
    return {};
}

export default function AppointmentsScreen() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [stats, setStats] = useState<AppointmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [datePill, setDatePill] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    // Detail modal
    const [selected, setSelected] = useState<Appointment | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    // Cancel modal
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState("");

    // Reschedule modal
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleForm, setRescheduleForm] = useState({
        new_date: "",
        new_time: "",
        reason: "",
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

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
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadAppointments = useCallback(
        async (page = 1, replace = true) => {
            try {
                if (page === 1) setLoading(true);
                else setLoadingMore(true);

                const params: any = { page, per_page: 20 };
                if (search) params.search = search;
                if (statusFilter) params.status = statusFilter;
                Object.assign(params, getDateParams(datePill));

                const res = await api.get("/appointments", { params });
                const incoming: Appointment[] = res.data.data;

                setAppointments(
                    replace || page === 1
                        ? incoming
                        : (prev) => [...prev, ...incoming],
                );
                setCurrentPage(res.data.meta.current_page);
                setLastPage(res.data.meta.last_page);
                if (res.data.stats) setStats(res.data.stats);
                setLoadError(null);
            } catch (err: any) {
                const msg = getApiErrorMessage(
                    err,
                    "Failed to load appointments.",
                );
                if (page === 1 && !refreshing) setLoadError(msg);
                else
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: msg,
                        type: "error",
                    });
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [search, statusFilter, datePill],
    );

    useFocusEffect(
        useCallback(() => {
            loadAppointments(1, true);
        }, [loadAppointments]),
    );

    useEffect(() => {
        const t = setTimeout(() => loadAppointments(1, true), 400);
        return () => clearTimeout(t);
    }, [loadAppointments]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAppointments(1, true);
    };

    const loadMore = () => {
        if (!loadingMore && currentPage < lastPage) {
            loadAppointments(currentPage + 1, false);
        }
    };

    const openDetail = async (id: number) => {
        setDetailLoading(true);
        setShowDetail(true);
        try {
            const res = await api.get(`/appointments/${id}`);
            setSelected(res.data);
        } catch (err: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(
                    err,
                    "Failed to load appointment details.",
                ),
                type: "error",
            });
            setShowDetail(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const openCancel = () => {
        setCancelReason("");
        setShowCancelModal(true);
    };

    const handleCancel = async () => {
        if (!selected) return;
        try {
            await api.post(`/appointments/${selected.id}/cancel`, {
                reason: cancelReason,
            });
            setShowCancelModal(false);
            setShowDetail(false);
            setSuccessDialog({
                visible: true,
                title: "Cancelled",
                message: "Appointment cancelled and patient notified.",
                type: "success",
            });
            loadAppointments(1, true);
        } catch (err: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(
                    err,
                    "Failed to cancel appointment.",
                ),
                type: "error",
            });
        }
    };

    // Load available time slots when date changes
    useEffect(() => {
        if (!rescheduleForm.new_date || !selected) {
            setAvailableSlots([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoadingSlots(true);
            try {
                const res = await api.get(
                    `/appointments/${selected.id}/available-slots`,
                    { params: { date: rescheduleForm.new_date } },
                );
                if (!cancelled)
                    setAvailableSlots(res.data.slots ?? res.data ?? []);
            } catch {
                if (!cancelled) setAvailableSlots([]);
            } finally {
                if (!cancelled) setLoadingSlots(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [rescheduleForm.new_date, selected]);

    const openReschedule = () => {
        setRescheduleForm({ new_date: "", new_time: "", reason: "" });
        setAvailableSlots([]);
        setShowDatePicker(false);
        setShowRescheduleModal(true);
    };

    const handleReschedule = async () => {
        if (!selected || !rescheduleForm.new_date || !rescheduleForm.new_time)
            return;
        try {
            await api.post(
                `/appointments/${selected.id}/reschedule`,
                rescheduleForm,
            );
            setShowRescheduleModal(false);
            setShowDetail(false);
            setSuccessDialog({
                visible: true,
                title: "Rescheduled",
                message: "Appointment rescheduled and patient notified.",
                type: "success",
            });
            loadAppointments(1, true);
        } catch (err: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(
                    err,
                    "Failed to reschedule appointment.",
                ),
                type: "error",
            });
        }
    };

    const renderItem = ({ item }: { item: Appointment }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => openDetail(item.id)}
            activeOpacity={0.7}
        >
            <View
                style={[
                    styles.statusBar,
                    {
                        backgroundColor:
                            STATUS_COLORS[item.status] ?? "#6B7280",
                    },
                ]}
            />
            <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                    <User size={14} color="#6B7280" />
                    <Text style={styles.cardName}>{item.patient_name}</Text>
                    <View
                        style={[
                            styles.badge,
                            {
                                backgroundColor:
                                    STATUS_COLORS[item.status] + "22",
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.badgeText,
                                { color: STATUS_COLORS[item.status] },
                            ]}
                        >
                            {item.status.replace("_", " ")}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardRow}>
                    <Calendar size={13} color="#9CA3AF" />
                    <Text style={styles.cardSub}>{item.appointment_date}</Text>
                    <Clock size={13} color="#9CA3AF" />
                    <Text style={styles.cardSub}>
                        {String(item.appointment_time).slice(0, 5)}
                    </Text>
                </View>
                {item.patient_phone ? (
                    <View style={styles.cardRow}>
                        <Phone size={13} color="#9CA3AF" />
                        <Text style={styles.cardSub}>{item.patient_phone}</Text>
                    </View>
                ) : null}
                <Text style={styles.refNum}>Ref: {item.reference_number}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Calendar size={22} color="#ac3434" />
                    <Text style={styles.headerTitle}>Appointments</Text>
                </View>
            </View>

            {/* Stats */}
            {stats && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsRow}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
                >
                    {[
                        { label: "Today", value: stats.total },
                        {
                            label: "Pending",
                            value: stats.pending,
                            color: "#EAB308",
                        },
                        {
                            label: "Checked In",
                            value: stats.checked_in,
                            color: "#3B82F6",
                        },
                        {
                            label: "Confirmed",
                            value: stats.confirmed,
                            color: "#22C55E",
                        },
                        {
                            label: "Cancelled",
                            value: stats.cancelled,
                            color: "#EF4444",
                        },
                        {
                            label: "No Show",
                            value: stats.no_show,
                            color: "#6B7280",
                        },
                    ].map((s) => (
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

            {/* Search */}
            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <Search size={16} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search name, ref, phone..."
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                </View>
            </View>

            {/* Date filter pills */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsRow}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
            >
                {DATE_PILLS.map((p) => (
                    <TouchableOpacity
                        key={p.value}
                        style={[
                            styles.tab,
                            datePill === p.value && styles.tabActive,
                        ]}
                        onPress={() => setDatePill(p.value)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                datePill === p.value && styles.tabTextActive,
                            ]}
                        >
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Status tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsRow}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
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
                            loadAppointments(1, true);
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

            {loadError && !appointments.length ? (
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>
                        Unable to load appointments
                    </Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setLoadError(null);
                            loadAppointments(1, true);
                        }}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : loading ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    <SkeletonRow count={6} />
                </View>
            ) : (
                <FlatList
                    data={appointments}
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
                            <CalendarX size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>
                                No appointments found
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: "#9CA3AF",
                                    textAlign: "center",
                                    marginTop: 4,
                                }}
                            >
                                Try adjusting your filters or date range
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Detail Modal */}
            <Modal
                visible={showDetail}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDetail(false)}
            >
                <View style={styles.overlay}>
                    <View style={[styles.modal, { maxHeight: "90%" }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Appointment Details
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowDetail(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        {detailLoading ? (
                            <ActivityIndicator
                                size="large"
                                color="#ac3434"
                                style={{ marginVertical: 30 }}
                            />
                        ) : selected ? (
                            <ScrollView
                                style={{ flex: 1 }}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>
                                        Patient
                                    </Text>
                                    <Text style={styles.detailValue}>
                                        {selected.patient_name}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>
                                        Reference
                                    </Text>
                                    <Text style={styles.detailValue}>
                                        {selected.reference_number}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date</Text>
                                    <Text style={styles.detailValue}>
                                        {selected.appointment_date as string}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Time</Text>
                                    <Text style={styles.detailValue}>
                                        {String(
                                            selected.appointment_time,
                                        ).slice(0, 5)}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>
                                        Status
                                    </Text>
                                    <Text
                                        style={[
                                            styles.detailValue,
                                            {
                                                color: STATUS_COLORS[
                                                    selected.status
                                                ],
                                            },
                                        ]}
                                    >
                                        {selected.status}
                                    </Text>
                                </View>
                                {selected.patient_email ? (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>
                                            Email
                                        </Text>
                                        <Text style={styles.detailValue}>
                                            {selected.patient_email}
                                        </Text>
                                    </View>
                                ) : null}
                                {selected.patient_phone ? (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>
                                            Phone
                                        </Text>
                                        <Text style={styles.detailValue}>
                                            {selected.patient_phone}
                                        </Text>
                                    </View>
                                ) : null}
                                {selected.notes ? (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>
                                            Notes
                                        </Text>
                                        <Text style={styles.detailValue}>
                                            {selected.notes}
                                        </Text>
                                    </View>
                                ) : null}
                                <Text style={styles.detailSectionTitle}>
                                    Tests
                                </Text>
                                {selected.tests.map((t, i) => (
                                    <View key={i} style={styles.testRow}>
                                        <Text style={styles.testName}>
                                            {t.name}
                                        </Text>
                                        <Text style={styles.testPrice}>
                                            ₱
                                            {Number(t.price).toLocaleString(
                                                "en-PH",
                                                { minimumFractionDigits: 2 },
                                            )}
                                        </Text>
                                    </View>
                                ))}
                                <View
                                    style={[
                                        styles.testRow,
                                        {
                                            borderTopWidth: 1,
                                            borderTopColor: "#E5E7EB",
                                            marginTop: 4,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.testName,
                                            { fontWeight: "700" },
                                        ]}
                                    >
                                        Total
                                    </Text>
                                    <Text
                                        style={[
                                            styles.testPrice,
                                            { fontWeight: "700" },
                                        ]}
                                    >
                                        ₱
                                        {Number(
                                            selected.total_amount,
                                        ).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </Text>
                                </View>
                                {selected.transaction ? (
                                    <>
                                        <Text style={styles.detailSectionTitle}>
                                            Transaction
                                        </Text>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Tx #
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {
                                                    selected.transaction
                                                        .transaction_number
                                                }
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Payment
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {
                                                    selected.transaction
                                                        .payment_status
                                                }
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>
                                                Lab
                                            </Text>
                                            <Text style={styles.detailValue}>
                                                {
                                                    selected.transaction
                                                        .lab_status
                                                }
                                            </Text>
                                        </View>
                                    </>
                                ) : null}

                                {/* Actions */}
                                {!["CANCELLED", "CONFIRMED"].includes(
                                    selected.status,
                                ) && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtn,
                                                {
                                                    backgroundColor:
                                                        "#EF444422",
                                                },
                                            ]}
                                            onPress={openCancel}
                                        >
                                            <CalendarX
                                                size={16}
                                                color="#EF4444"
                                            />
                                            <Text
                                                style={[
                                                    styles.actionBtnText,
                                                    { color: "#EF4444" },
                                                ]}
                                            >
                                                Cancel
                                            </Text>
                                        </TouchableOpacity>
                                        {["PENDING", "CHECKED_IN"].includes(
                                            selected.status,
                                        ) && (
                                            <TouchableOpacity
                                                style={[
                                                    styles.actionBtn,
                                                    {
                                                        backgroundColor:
                                                            "#3B82F622",
                                                    },
                                                ]}
                                                onPress={openReschedule}
                                            >
                                                <RefreshCw
                                                    size={16}
                                                    color="#3B82F6"
                                                />
                                                <Text
                                                    style={[
                                                        styles.actionBtnText,
                                                        { color: "#3B82F6" },
                                                    ]}
                                                >
                                                    Reschedule
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>

            {/* Cancel Modal */}
            <Modal
                visible={showCancelModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCancelModal(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Cancel Appointment
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowCancelModal(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="Reason for cancellation (optional)"
                            value={cancelReason}
                            onChangeText={setCancelReason}
                            multiline
                        />
                        <Text style={styles.hint}>
                            Patient will be notified via email and SMS.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtnAlt}
                                onPress={() => setShowCancelModal(false)}
                            >
                                <Text style={styles.cancelBtnAltText}>
                                    Go Back
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.saveBtn,
                                    { backgroundColor: "#EF4444" },
                                ]}
                                onPress={() => {
                                    setShowCancelModal(false);
                                    setConfirmDialog({
                                        visible: true,
                                        title: "Cancel Appointment",
                                        message: `Cancel appointment for ${selected?.patient_name}? The patient will be notified.`,
                                        confirmText: "CANCEL APPOINTMENT",
                                        type: "danger",
                                        onConfirm: handleCancel,
                                    });
                                }}
                            >
                                <Text style={styles.saveBtnText}>
                                    Confirm Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Reschedule Modal */}
            <Modal
                visible={showRescheduleModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRescheduleModal(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Reschedule Appointment
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowRescheduleModal(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.inputLabel}>New Date *</Text>
                        <TouchableOpacity
                            style={styles.datePickerBtn}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Calendar size={16} color="#6B7280" />
                            <Text
                                style={[
                                    styles.datePickerBtnText,
                                    !rescheduleForm.new_date && {
                                        color: "#9CA3AF",
                                    },
                                ]}
                            >
                                {rescheduleForm.new_date ||
                                    "Tap to select date"}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={
                                    rescheduleForm.new_date
                                        ? new Date(rescheduleForm.new_date)
                                        : new Date()
                                }
                                mode="date"
                                display={
                                    Platform.OS === "ios"
                                        ? "spinner"
                                        : "default"
                                }
                                minimumDate={new Date()}
                                onChange={(event, date) => {
                                    if (Platform.OS === "android")
                                        setShowDatePicker(false);
                                    if (date && event.type !== "dismissed") {
                                        const iso = date
                                            .toISOString()
                                            .split("T")[0];
                                        setRescheduleForm((f) => ({
                                            ...f,
                                            new_date: iso,
                                            new_time: "",
                                        }));
                                    }
                                }}
                            />
                        )}
                        {Platform.OS === "ios" && showDatePicker && (
                            <TouchableOpacity
                                style={styles.datePickerDone}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={styles.datePickerDoneText}>
                                    Done
                                </Text>
                            </TouchableOpacity>
                        )}

                        <Text style={[styles.inputLabel, { marginTop: 4 }]}>
                            New Time *
                        </Text>
                        {!rescheduleForm.new_date ? (
                            <Text style={styles.hint}>
                                Select a date first to see available time slots.
                            </Text>
                        ) : loadingSlots ? (
                            <View
                                style={{
                                    alignItems: "center",
                                    paddingVertical: 12,
                                }}
                            >
                                <ActivityIndicator
                                    size="small"
                                    color="#ac3434"
                                />
                                <Text style={[styles.hint, { marginTop: 4 }]}>
                                    Loading available slots...
                                </Text>
                            </View>
                        ) : availableSlots.length > 0 ? (
                            <View style={styles.slotsGrid}>
                                {availableSlots.map((slot) => (
                                    <TouchableOpacity
                                        key={slot}
                                        style={[
                                            styles.slotBtn,
                                            rescheduleForm.new_time === slot &&
                                                styles.slotBtnActive,
                                        ]}
                                        onPress={() =>
                                            setRescheduleForm((f) => ({
                                                ...f,
                                                new_time: slot,
                                            }))
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.slotBtnText,
                                                rescheduleForm.new_time ===
                                                    slot &&
                                                    styles.slotBtnTextActive,
                                            ]}
                                        >
                                            {slot}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : (
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 09:30"
                                value={rescheduleForm.new_time}
                                onChangeText={(t) =>
                                    setRescheduleForm((f) => ({
                                        ...f,
                                        new_time: t,
                                    }))
                                }
                            />
                        )}
                        <Text style={styles.inputLabel}>Reason (optional)</Text>
                        <TextInput
                            style={[styles.input, { height: 60 }]}
                            placeholder="Reason for rescheduling"
                            value={rescheduleForm.reason}
                            onChangeText={(t) =>
                                setRescheduleForm((f) => ({ ...f, reason: t }))
                            }
                            multiline
                        />
                        <Text style={styles.hint}>
                            Patient will be notified via email and SMS.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtnAlt}
                                onPress={() => setShowRescheduleModal(false)}
                            >
                                <Text style={styles.cancelBtnAltText}>
                                    Go Back
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleReschedule}
                            >
                                <Text style={styles.saveBtnText}>
                                    Reschedule
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
    searchRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#fff",
    },
    searchBox: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: "#111827" },
    dateInput: { flex: 0, minWidth: 120 },
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
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    refNum: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
    empty: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: "#9CA3AF" },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modal: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
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
    detailSectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
        marginTop: 16,
        marginBottom: 8,
    },
    testRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    testName: { fontSize: 13, color: "#374151", flex: 1 },
    testPrice: { fontSize: 13, color: "#374151" },
    actionRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 20,
        marginBottom: 8,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
    },
    actionBtnText: { fontSize: 14, fontWeight: "600" },
    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: "#111827",
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 4,
    },
    hint: { fontSize: 12, color: "#9CA3AF", marginBottom: 12 },
    datePickerBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: "#fff",
    },
    datePickerBtnText: {
        fontSize: 14,
        color: "#111827",
        flex: 1,
    },
    datePickerDone: {
        alignSelf: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 6,
        backgroundColor: "#ac3434",
        borderRadius: 8,
        marginBottom: 8,
    },
    datePickerDoneText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    slotsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    slotBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        backgroundColor: "#fff",
    },
    slotBtnActive: {
        backgroundColor: "#ac3434",
        borderColor: "#ac3434",
    },
    slotBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
    },
    slotBtnTextActive: { color: "#fff" },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    cancelBtnAlt: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: "center",
    },
    cancelBtnAltText: { fontSize: 14, fontWeight: "600", color: "#374151" },
    saveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: "#ac3434",
        alignItems: "center",
    },
    saveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
