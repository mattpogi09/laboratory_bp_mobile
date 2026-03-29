import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
    AlertCircle,
    Ban,
    Calendar,
    CalendarX,
    ChevronDown,
    Clock,
    Eye,
    FileText,
    Mail,
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
    Image,
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
import type { Appointment, AppointmentStats, AppointmentStatus } from "@/types";
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
                                    key={opt.value}
                                    style={[
                                        styles.pickerOption,
                                        value === opt.value &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            value === opt.value &&
                                                styles.pickerOptionTextSelected,
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

function fmtDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function fmtDateDisplay(d: Date): string {
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

/** Safely format a YYYY-MM-DD string (or ISO timestamp) for display, e.g. "Apr 01, 2026" */
function formatAppointmentDate(val: string | undefined | null): string {
    if (!val) return "—";
    const s = String(val);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    const d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function DemographicBadge({ category }: { category?: string | null }) {
    const cfg: Record<string, { color: string; bg: string }> = {
        PWD:              { color: "#1E40AF", bg: "#DBEAFE" },
        "Senior Citizen": { color: "#5B21B6", bg: "#EDE9FE" },
        Pregnant:         { color: "#9D174D", bg: "#FCE7F3" },
        Regular:          { color: "#374151", bg: "#F3F4F6" },
    };
    const c = cfg[category ?? "Regular"] ?? cfg.Regular;
    return (
        <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: c.color }}>{category ?? "Regular"}</Text>
        </View>
    );
}

function PriorityBadge({ level }: { level?: string | null }) {
    if (!level) return null;
    const cfg: Record<string, { label: string; color: string; bg: string }> = {
        HIGH:   { label: "On Time", color: "#065F46", bg: "#D1FAE5" },
        MEDIUM: { label: "Grace",   color: "#92400E", bg: "#FEF3C7" },
        NONE:   { label: "Late",    color: "#991B1B", bg: "#FEE2E2" },
    };
    const c = cfg[level];
    if (!c) return null;
    return (
        <View style={{ backgroundColor: c.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: c.color }}>{c.label}</Text>
        </View>
    );
}

export default function AppointmentsScreen() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [stats, setStats] = useState<AppointmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [showFilterDatePicker, setShowFilterDatePicker] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    // Detail modal
    const [selected, setSelected] = useState<Appointment | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [idViewerUrl, setIdViewerUrl] = useState<string | null>(null);
    const [idViewerName, setIdViewerName] = useState<string | null>(null);

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
    const [availableSlots, setAvailableSlots] = useState<{ value: string; label: string }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [holidays, setHolidays] = useState<string[]>([]); // YYYY-MM-DD strings
    const [rescheduleDateError, setRescheduleDateError] = useState("");

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
                if (filterDate) {
                    params.date = fmtDate(filterDate);
                }

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
        [search, statusFilter, filterDate],
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
                    setAvailableSlots(res.data.slots ?? []);
            } catch (err: any) {
                if (!cancelled) {
                    setAvailableSlots([]);
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to load available time slots.",
                        ),
                        type: "error",
                    });
                }
            } finally {
                if (!cancelled) setLoadingSlots(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [rescheduleForm.new_date, selected]);

    // Load holidays for Sunday/holiday date blocking (current + next year)
    useEffect(() => {
        const year = new Date().getFullYear();
        Promise.all([
            api.get("/appointments/holidays", { params: { year } }),
            api.get("/appointments/holidays", { params: { year: year + 1 } }),
        ])
            .then(([r1, r2]) => {
                const all = [...(r1.data ?? []), ...(r2.data ?? [])];
                setHolidays(all.map((h: { date: string }) => h.date));
            })
            .catch(() => {}); // silent — blocking is best-effort
    }, []);

    const openReschedule = () => {
        setRescheduleForm({ new_date: "", new_time: "", reason: "" });
        setAvailableSlots([]);
        setShowDatePicker(false);
        setRescheduleDateError("");
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

    function formatTime(t: string | undefined | null): string {
        if (!t) return "—";
        const match = String(t).match(/^(\d{1,2}):(\d{2})/);
        if (!match) return String(t).slice(0, 5);
        const h = parseInt(match[1]);
        const m = match[2];
        return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
    }

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
                {/* Patient name + Status badge */}
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
                {/* Date + Time */}
                <View style={styles.cardRow}>
                    <Calendar size={13} color="#9CA3AF" />
                    <Text style={styles.cardSub}>{formatAppointmentDate(item.appointment_date)}</Text>
                    <Clock size={13} color="#9CA3AF" />
                    <Text style={styles.cardSub}>
                        {formatTime(String(item.appointment_time))}
                    </Text>
                </View>
                {/* Priority + Amount */}
                <View style={styles.cardRow}>
                    <PriorityBadge level={item.priority_level} />
                    <DemographicBadge category={(item as any).priority_category} />
                    <View style={{ flex: 1 }} />
                    <Text style={styles.cardAmount}>
                        ₱
                        {Number(item.total_amount).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                        })}
                    </Text>
                </View>
                {/* Tests count + Ref */}
                <View style={styles.cardRow}>
                    <Text style={styles.cardSub}>
                        {item.tests.length} test
                        {item.tests.length !== 1 ? "s" : ""}
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.refNum}>
                        Ref: {item.reference_number}
                    </Text>
                </View>
                {/* ID picture — shown on card for quick verification */}
                {(item as any).id_picture_url ? (
                    <TouchableOpacity
                        style={styles.idBtn}
                        onPress={(e) => {
                            e.stopPropagation();
                            setIdViewerUrl((item as any).id_picture_url);
                            setIdViewerName(item.patient_name);
                        }}
                    >
                        <Eye size={13} color="#2563EB" />
                        <Text style={styles.idBtnText}>View Uploaded ID</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.noIdText}>No ID uploaded</Text>
                )}
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
                    <View style={[styles.statCard, styles.statCardNoShow]}>
                        <Text style={[styles.statValue, { color: "#374151" }]}>
                            {stats.no_show}
                        </Text>
                        <Text style={[styles.statLabel, { color: "#4B5563" }]}>
                            No Shows
                        </Text>
                    </View>
                </View>
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

            {/* Filter row: Status + Date */}
            <View style={styles.filterRow}>
                <View style={{ flex: 1 }}>
                    <FilterPicker
                        label="All Statuses"
                        value={statusFilter}
                        options={STATUS_TABS}
                        onChange={(v) => {
                            setStatusFilter(v);
                            loadAppointments(1, true);
                        }}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowFilterDatePicker(true)}
                    >
                        <Calendar
                            size={14}
                            color="#6B7280"
                            style={{ marginRight: 6 }}
                        />
                        <Text
                            style={[
                                styles.pickerButtonText,
                                !filterDate && { color: "#9CA3AF" },
                            ]}
                            numberOfLines={1}
                        >
                            {filterDate
                                ? fmtDateDisplay(filterDate)
                                : "Select Date"}
                        </Text>
                        {filterDate ? (
                            <TouchableOpacity
                                hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                }}
                                onPress={() => setFilterDate(null)}
                            >
                                <X size={14} color="#9CA3AF" />
                            </TouchableOpacity>
                        ) : (
                            <ChevronDown color="#6B7280" size={16} />
                        )}
                    </TouchableOpacity>

                    {showFilterDatePicker && (
                        <DateTimePicker
                            value={filterDate ?? new Date()}
                            mode="date"
                            display={
                                Platform.OS === "ios" ? "spinner" : "default"
                            }
                            onChange={(_e, date) => {
                                setShowFilterDatePicker(false);
                                if (date) setFilterDate(date);
                            }}
                        />
                    )}
                </View>
            </View>

            {loadError && !appointments.length ? (
                <View style={[styles.errorContainer, { flex: 1 }]}>
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
                <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
                    <SkeletonRow count={6} />
                </View>
            ) : (
                <FlatList
                    style={{ flex: 1 }}
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

            {/* In-app ID image viewer */}
            <Modal
                visible={!!idViewerUrl}
                transparent
                animationType="fade"
                onRequestClose={() => { setIdViewerUrl(null); setIdViewerName(null); }}
            >
                <View style={styles.idViewerOverlay}>
                    <View style={styles.idViewerBox}>
                        <View style={styles.idViewerHeader}>
                            <Text style={styles.idViewerTitle} numberOfLines={1}>
                                ID — {idViewerName}
                            </Text>
                            <TouchableOpacity
                                onPress={() => { setIdViewerUrl(null); setIdViewerName(null); }}
                                style={{ padding: 4 }}
                            >
                                <X size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        {idViewerUrl && (
                            <Image
                                source={{ uri: idViewerUrl }}
                                style={styles.idViewerImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Detail Modal */}
            <Modal
                visible={showDetail}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDetail(false)}
            >
                <View style={styles.overlay}>
                    <View style={[styles.modal, { maxHeight: "90%", flex: 1 }]}>
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
                                {/* Patient header */}
                                <View style={styles.detailHeaderCard}>
                                    <Text style={styles.detailPatientName}>
                                        {selected.patient_name}
                                    </Text>
                                    <Text style={styles.detailReference}>
                                        Ref: {selected.reference_number}
                                    </Text>
                                </View>

                                {/* Schedule card */}
                                <View style={styles.detailCard}>
                                    <Text style={styles.detailCardTitle}>
                                        Schedule
                                    </Text>
                                    <View style={styles.detailCardRow}>
                                        <Calendar size={14} color="#6B7280" />
                                        <Text style={styles.detailCardLabel}>
                                            Date
                                        </Text>
                                        <Text style={styles.detailCardValue}>
                                            {formatAppointmentDate(selected.appointment_date)}
                                        </Text>
                                    </View>
                                    <View style={styles.detailCardRow}>
                                        <Clock size={14} color="#6B7280" />
                                        <Text style={styles.detailCardLabel}>
                                            Time
                                        </Text>
                                        <Text style={styles.detailCardValue}>
                                            {formatTime(
                                                String(
                                                    selected.appointment_time,
                                                ),
                                            )}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.detailCardRow,
                                            { marginTop: 2 },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.badge,
                                                {
                                                    backgroundColor:
                                                        STATUS_COLORS[
                                                            selected.status
                                                        ] + "22",
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.badgeText,
                                                    {
                                                        color: STATUS_COLORS[
                                                            selected.status
                                                        ],
                                                    },
                                                ]}
                                            >
                                                {selected.status.replace(
                                                    "_",
                                                    " ",
                                                )}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Queue type legend */}
                                <View style={[styles.detailCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                                    <Text style={[styles.detailCardTitle, { color: "#92400E", marginBottom: 6 }]}>Queue Type Legend</Text>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        <View style={{ flex: 1, backgroundColor: "#FEF3C7", borderRadius: 8, borderWidth: 1, borderColor: "#FDE68A", padding: 8 }}>
                                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400E" }}>PA — Priority + Appointment</Text>
                                            <Text style={{ fontSize: 11, color: "#78350F", marginTop: 2 }}>Verified demographic priority with appointment</Text>
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: "#EFF6FF", borderRadius: 8, borderWidth: 1, borderColor: "#BFDBFE", padding: 8 }}>
                                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E40AF" }}>A — Regular Appointment</Text>
                                            <Text style={{ fontSize: 11, color: "#1E3A8A", marginTop: 2 }}>Standard appointment without priority</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Patient info card */}
                                <View style={styles.detailCard}>
                                    <Text style={styles.detailCardTitle}>
                                        Patient Information
                                    </Text>
                                    {(selected as any).age ? (
                                        <View style={styles.detailCardRow}>
                                            <User size={14} color="#6B7280" />
                                            <Text style={styles.detailCardLabel}>Age</Text>
                                            <Text style={styles.detailCardValue}>
                                                {(selected as any).age} yrs • {(selected as any).gender ?? "—"}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {selected.patient_email ? (
                                        <View style={styles.detailCardRow}>
                                            <Mail size={14} color="#6B7280" />
                                            <Text
                                                style={styles.detailCardLabel}
                                            >
                                                Email
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.detailCardValue,
                                                    { flex: 2 },
                                                ]}
                                            >
                                                {selected.patient_email}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {selected.patient_phone ? (
                                        <View style={styles.detailCardRow}>
                                            <Phone size={14} color="#6B7280" />
                                            <Text
                                                style={styles.detailCardLabel}
                                            >
                                                Phone
                                            </Text>
                                            <Text
                                                style={styles.detailCardValue}
                                            >
                                                {selected.patient_phone}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {selected.notes ? (
                                        <View style={styles.detailCardRow}>
                                            <FileText
                                                size={14}
                                                color="#6B7280"
                                            />
                                            <Text
                                                style={styles.detailCardLabel}
                                            >
                                                Notes
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.detailCardValue,
                                                    { flex: 2 },
                                                ]}
                                            >
                                                {selected.notes}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Demographic priority + ID */}
                                {((selected as any).priority_category && (selected as any).priority_category !== "Regular") || (selected as any).id_picture_url ? (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailCardTitle}>Identification</Text>
                                        {(selected as any).priority_category && (selected as any).priority_category !== "Regular" && (
                                            <View style={styles.detailCardRow}>
                                                <Text style={styles.detailCardLabel}>Priority</Text>
                                                <DemographicBadge category={(selected as any).priority_category} />
                                            </View>
                                        )}
                                        {/* Demographic priority — always show */}
                                        <View style={styles.detailCardRow}>
                                            <Text style={styles.detailCardLabel}>Priority</Text>
                                            <View style={{
                                                backgroundColor: (selected as any).priority_category === "PWD" ? "#DBEAFE"
                                                    : (selected as any).priority_category === "Senior Citizen" ? "#EDE9FE"
                                                    : (selected as any).priority_category === "Pregnant" ? "#FCE7F3"
                                                    : "#F3F4F6",
                                                paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99
                                            }}>
                                                <Text style={{
                                                    fontSize: 11, fontWeight: "700",
                                                    color: (selected as any).priority_category === "PWD" ? "#1E40AF"
                                                        : (selected as any).priority_category === "Senior Citizen" ? "#5B21B6"
                                                        : (selected as any).priority_category === "Pregnant" ? "#9D174D"
                                                        : "#374151"
                                                }}>
                                                    {(selected as any).priority_category ?? "Regular"}
                                                </Text>
                                            </View>
                                        </View>
                                        {(selected as any).id_picture_url ? (
                                            <TouchableOpacity
                                                style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, backgroundColor: "#EFF6FF", borderRadius: 8, padding: 10 }}
                                                onPress={() => {
                                                    setIdViewerUrl((selected as any).id_picture_url);
                                                    setIdViewerName(selected.patient_name);
                                                }}
                                            >
                                                <Eye size={16} color="#2563EB" />
                                                <Text style={{ fontSize: 13, fontWeight: "600", color: "#2563EB" }}>View Uploaded ID</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>No ID uploaded</Text>
                                        )}
                                    </View>
                                ) : null}

                                {/* Priority card */}
                                {selected.priority_level ? (
                                    <View style={styles.detailCard}>
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <Text
                                                style={styles.detailCardTitle}
                                            >
                                                Priority
                                            </Text>
                                            <PriorityBadge
                                                level={selected.priority_level}
                                            />
                                        </View>
                                        {(selected.minutes_late ?? 0) > 0 ? (
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    color: "#DC2626",
                                                    marginTop: 4,
                                                }}
                                            >
                                                +{selected.minutes_late} min
                                                late
                                            </Text>
                                        ) : null}
                                    </View>
                                ) : null}

                                {/* Tests card */}
                                <View style={styles.detailCard}>
                                    <Text style={styles.detailCardTitle}>
                                        Tests
                                    </Text>
                                    {selected.tests.map((t, i) => (
                                        <View
                                            key={i}
                                            style={styles.detailTestRow}
                                        >
                                            <Text style={styles.detailTestName}>
                                                {t.name}
                                            </Text>
                                            <Text
                                                style={styles.detailTestPrice}
                                            >
                                                ₱
                                                {Number(t.price).toLocaleString(
                                                    "en-PH",
                                                    {
                                                        minimumFractionDigits: 2,
                                                    },
                                                )}
                                            </Text>
                                        </View>
                                    ))}
                                    <View
                                        style={[
                                            styles.detailTestRow,
                                            {
                                                borderTopWidth: 1,
                                                borderTopColor: "#E5E7EB",
                                                marginTop: 4,
                                                paddingTop: 6,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.detailTestName,
                                                {
                                                    fontWeight: "700",
                                                    color: "#111827",
                                                },
                                            ]}
                                        >
                                            Total
                                        </Text>
                                        <Text
                                            style={[
                                                styles.detailTestPrice,
                                                {
                                                    fontWeight: "700",
                                                    color: "#111827",
                                                },
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
                                </View>

                                {/* Transaction card */}
                                {selected.transaction ? (
                                    <View style={styles.detailCard}>
                                        <Text style={styles.detailCardTitle}>
                                            Transaction
                                        </Text>
                                        <View style={styles.detailCardRow}>
                                            <Text
                                                style={styles.detailCardLabel}
                                            >
                                                Tx #
                                            </Text>
                                            <Text
                                                style={styles.detailCardValue}
                                            >
                                                {
                                                    selected.transaction
                                                        .transaction_number
                                                }
                                            </Text>
                                        </View>
                                        <View style={styles.detailCardRow}>
                                            <Text
                                                style={styles.detailCardLabel}
                                            >
                                                Payment
                                            </Text>
                                            <Text
                                                style={styles.detailCardValue}
                                            >
                                                {
                                                    selected.transaction
                                                        .payment_status
                                                }
                                            </Text>
                                        </View>
                                        <View style={styles.detailCardRow}>
                                            <Text
                                                style={styles.detailCardLabel}
                                            >
                                                Lab
                                            </Text>
                                            <Text
                                                style={styles.detailCardValue}
                                            >
                                                {
                                                    selected.transaction
                                                        .lab_status
                                                }
                                            </Text>
                                        </View>
                                    </View>
                                ) : null}

                                {/* Actions */}
                                {!["CANCELLED", "CONFIRMED"].includes(
                                    selected.status,
                                ) && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.actionBtn,
                                                { backgroundColor: "#EF4444" },
                                            ]}
                                            onPress={openCancel}
                                        >
                                            <Ban size={16} color="#fff" />
                                            <Text
                                                style={[
                                                    styles.actionBtnText,
                                                    { color: "#fff" },
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
                                                            "#3B82F6",
                                                    },
                                                ]}
                                                onPress={openReschedule}
                                            >
                                                <RefreshCw
                                                    size={16}
                                                    color="#fff"
                                                />
                                                <Text
                                                    style={[
                                                        styles.actionBtnText,
                                                        { color: "#fff" },
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
                            maxLength={500}
                        />
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#9CA3AF",
                                textAlign: "right",
                                marginTop: 2,
                            }}
                        >
                            {cancelReason.length}/500
                        </Text>
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
                                        // Use local date to avoid UTC off-by-one
                                        const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                                        if (date.getDay() === 0) {
                                            setRescheduleDateError("Sundays are unavailable for appointments.");
                                            setRescheduleForm((f) => ({ ...f, new_date: "", new_time: "" }));
                                            setAvailableSlots([]);
                                            return;
                                        }
                                        if (holidays.includes(iso)) {
                                            setRescheduleDateError("This date is a holiday and unavailable.");
                                            setRescheduleForm((f) => ({ ...f, new_date: "", new_time: "" }));
                                            setAvailableSlots([]);
                                            return;
                                        }
                                        setRescheduleDateError("");
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
                        {rescheduleDateError ? (
                            <Text style={{ color: "#DC2626", fontSize: 12, marginTop: 4, marginBottom: 4 }}>
                                {rescheduleDateError}
                            </Text>
                        ) : null}

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
                                        key={slot.value}
                                        style={[
                                            styles.slotBtn,
                                            rescheduleForm.new_time === slot.value &&
                                                styles.slotBtnActive,
                                        ]}
                                        onPress={() =>
                                            setRescheduleForm((f) => ({
                                                ...f,
                                                new_time: slot.value,
                                            }))
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.slotBtnText,
                                                rescheduleForm.new_time === slot.value &&
                                                    styles.slotBtnTextActive,
                                            ]}
                                        >
                                            {slot.label}
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
                                maxLength={5}
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
                            maxLength={500}
                        />
                        <Text
                            style={{
                                fontSize: 12,
                                color: "#9CA3AF",
                                textAlign: "right",
                                marginTop: 2,
                            }}
                        >
                            {rescheduleForm.reason.length}/500
                        </Text>
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
    statCardNoShow: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    statValue: { fontSize: 22, fontWeight: "700", color: "#111827" },
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
    pickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
    },
    pickerModal: {
        backgroundColor: "#fff",
        borderRadius: 16,
        width: "80%",
        maxHeight: "70%",
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    pickerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
    pickerList: { maxHeight: 400 },
    pickerOption: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    pickerOptionSelected: { backgroundColor: "#EFF6FF" },
    pickerOptionText: { fontSize: 15, color: "#111827" },
    pickerOptionTextSelected: { color: "#2563EB", fontWeight: "600" },
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
    badgeText: { fontSize: 11, fontWeight: "700" },
    refNum: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
    idBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#EFF6FF",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginTop: 4,
        alignSelf: "flex-start",
    },
    idBtnText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
    noIdText: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
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
    idViewerTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
    idViewerImage: { width: "100%", height: 300, backgroundColor: "#F3F4F6" },
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
    detailHeaderCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    detailPatientName: { fontSize: 17, fontWeight: "700", color: "#111827" },
    detailReference: { fontSize: 12, color: "#6B7280", marginTop: 2 },
    detailCard: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        backgroundColor: "#fff",
    },
    detailCardTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 8,
    },
    detailCardRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
    },
    detailCardLabel: { fontSize: 12, color: "#6B7280", width: 50 },
    detailCardValue: {
        fontSize: 13,
        color: "#111827",
        fontWeight: "500",
        flex: 1,
    },
    detailTestRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 4,
        backgroundColor: "#F9FAFB",
        borderRadius: 6,
        marginBottom: 4,
    },
    detailTestName: { fontSize: 13, color: "#374151", flex: 1 },
    detailTestPrice: { fontSize: 13, color: "#6B7280" },
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
