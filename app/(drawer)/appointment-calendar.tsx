import api from "@/app/services/api";
import type { Appointment } from "@/types";
import { getApiErrorMessage } from "@/utils";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import {
    AlertCircle,
    Building2,
    ChevronLeft,
    ChevronRight,
    Clock,
    PartyPopper,
    User,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_W = Dimensions.get("window").width;
const DAY_SIZE = Math.floor((SCREEN_W - 32) / 7);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const STATUS_COLORS: Record<string, string> = {
    PENDING: "#EAB308",
    CHECKED_IN: "#3B82F6",
    CONFIRMED: "#22C55E",
    CANCELLED: "#EF4444",
    NO_SHOW: "#6B7280",
};

function fmt(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function AppointmentCalendarScreen() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<string>(
        fmt(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadHolidays = useCallback(async (y: number) => {
        try {
            const res = await api.get("/appointments/holidays", { params: { year: y } });
            setHolidays(res.data ?? []);
        } catch {
            // silent — backend serves hardcoded fallback if Google Calendar is unavailable
        }
    }, []);

    const holidayMap = useMemo(() => {
        const map: Record<string, string> = {};
        holidays.forEach((h) => { map[h.date] = h.name; });
        return map;
    }, [holidays]);

    const loadMonth = useCallback(async (y: number, m: number) => {
        try {
            setLoading(true);
            setLoadError(null);
            const dateFrom = fmt(y, m, 1);
            const lastDay = new Date(y, m + 1, 0).getDate();
            const dateTo = fmt(y, m, lastDay);
            const res = await api.get("/appointments", {
                params: { date_from: dateFrom, date_to: dateTo, per_page: 200 },
            });
            setAppointments(res.data.data ?? []);
        } catch (err: any) {
            setLoadError(
                getApiErrorMessage(err, "Failed to load appointments."),
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadHolidays(year);
            loadMonth(year, month);
        }, [loadHolidays, loadMonth, year, month]),
    );

    const goToPrev = () => {
        const d = new Date(year, month - 1, 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
    };
    const goToNext = () => {
        const d = new Date(year, month + 1, 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth());
    };

    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: {
            date: string | null;
            day: number | null;
            isCurrentMonth: boolean;
        }[] = [];
        for (let i = 0; i < firstDay; i++) {
            cells.push({ date: null, day: null, isCurrentMonth: false });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({
                date: fmt(year, month, d),
                day: d,
                isCurrentMonth: true,
            });
        }
        while (cells.length % 7 !== 0) {
            cells.push({ date: null, day: null, isCurrentMonth: false });
        }
        return cells;
    }, [year, month]);

    const apptMap = useMemo(() => {
        const map: Record<string, Appointment[]> = {};
        appointments.forEach((a) => {
            const d = a.appointment_date;
            if (!map[d]) map[d] = [];
            map[d].push(a);
        });
        return map;
    }, [appointments]);

    const selectedAppointments = selectedDate
        ? (apptMap[selectedDate] ?? [])
        : [];
    const todayStr = fmt(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
    );

    return (
        <SafeAreaView style={styles.safe} edges={["bottom"]}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.calHeader}>
                    <TouchableOpacity style={styles.navBtn} onPress={goToPrev}>
                        <ChevronLeft color="#374151" size={22} />
                    </TouchableOpacity>
                    <Text style={styles.monthLabel}>
                        {MONTH_NAMES[month]} {year}
                    </Text>
                    <TouchableOpacity style={styles.navBtn} onPress={goToNext}>
                        <ChevronRight color="#374151" size={22} />
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#ac3434" />
                        <Text style={styles.loadingText}>
                            Loading appointments...
                        </Text>
                    </View>
                )}

                <View style={styles.weekRow}>
                    {WEEKDAYS.map((d, i) => (
                        <View key={d} style={styles.weekCell}>
                            <Text style={[styles.weekLabel, i === 0 && styles.weekLabelSunday]}>{d}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.grid}>
                    {calendarDays.map((cell, idx) => {
                        if (!cell.isCurrentMonth) {
                            return <View key={idx} style={styles.dayCell} />;
                        }
                        const hasAppts = !!(
                            cell.date && apptMap[cell.date]?.length
                        );
                        const isToday = cell.date === todayStr;
                        const isSelected = cell.date === selectedDate;
                        const apptCount = cell.date
                            ? (apptMap[cell.date]?.length ?? 0)
                            : 0;
                        const dayOfWeek = cell.day ? new Date(year, month, cell.day).getDay() : -1;
                        const isSunday = dayOfWeek === 0;
                        const isHoliday = !!(cell.date && holidayMap[cell.date]);

                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[
                                    styles.dayCell,
                                    (isSunday || isHoliday) && styles.dayCellClosed,
                                    isToday && styles.dayCellToday,
                                    isSelected && styles.dayCellSelected,
                                ]}
                                onPress={() =>
                                    cell.date && setSelectedDate(cell.date)
                                }
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.dayNum,
                                        (isSunday || isHoliday) && styles.dayNumClosed,
                                        isToday && styles.dayNumToday,
                                        isSelected && styles.dayNumSelected,
                                    ]}
                                >
                                    {cell.day}
                                </Text>
                                {hasAppts && (
                                    <View style={styles.dotRow}>
                                        {[...Array(Math.min(apptCount, 3))].map(
                                            (_, i) => (
                                                <View
                                                    key={i}
                                                    style={[
                                                        styles.dot,
                                                        isSelected && {
                                                            backgroundColor:
                                                                "#fff",
                                                        },
                                                    ]}
                                                />
                                            ),
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>
                        {selectedDate} — {selectedAppointments.length}{" "}
                        appointment
                        {selectedAppointments.length !== 1 ? "s" : ""}
                    </Text>

                    {/* Holiday banner */}
                    {selectedDate && holidayMap[selectedDate] && (
                        <View style={styles.closedBanner}>
                            <PartyPopper size={15} color="#991B1B" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.closedBannerTitle}>
                                    {holidayMap[selectedDate]}
                                </Text>
                                <Text style={styles.closedBannerSub}>
                                    Philippine National Holiday – No bookings accepted
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Sunday banner */}
                    {selectedDate &&
                        !holidayMap[selectedDate] &&
                        new Date(selectedDate + "T12:00:00").getDay() === 0 && (
                            <View style={styles.closedBanner}>
                                <Building2 size={15} color="#991B1B" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.closedBannerTitle}>
                                        Sunday – Walk-ins Only
                                    </Text>
                                    <Text style={styles.closedBannerSub}>
                                        Clinic open for walk-in patients. No online appointments.
                                    </Text>
                                </View>
                            </View>
                        )}

                    {selectedAppointments.length === 0 ? (
                        <Text style={styles.emptyText}>
                            No appointments on this day.
                        </Text>
                    ) : (
                        selectedAppointments.map((appt) => (
                            <TouchableOpacity
                                key={appt.id}
                                style={styles.apptCard}
                                onPress={() =>
                                    router.push("/(drawer)/appointments")
                                }
                                activeOpacity={0.75}
                            >
                                <View
                                    style={[
                                        styles.apptStatusBar,
                                        {
                                            backgroundColor:
                                                STATUS_COLORS[appt.status] ??
                                                "#6B7280",
                                        },
                                    ]}
                                />
                                <View style={styles.apptBody}>
                                    <View style={styles.apptRow}>
                                        <User size={13} color="#6B7280" />
                                        <Text style={styles.apptPatient}>
                                            {appt.patient_name}
                                        </Text>
                                        <View
                                            style={[
                                                styles.badge,
                                                {
                                                    backgroundColor:
                                                        (STATUS_COLORS[
                                                            appt.status
                                                        ] ?? "#6B7280") + "22",
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.badgeText,
                                                    {
                                                        color:
                                                            STATUS_COLORS[
                                                                appt.status
                                                            ] ?? "#6B7280",
                                                    },
                                                ]}
                                            >
                                                {appt.status.replace("_", " ")}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.apptRow}>
                                        <Clock size={12} color="#9CA3AF" />
                                        <Text style={styles.apptTime}>
                                            {String(
                                                appt.appointment_time,
                                            ).slice(0, 5)}
                                        </Text>
                                        <Text style={styles.apptRef}>
                                            Ref: {appt.reference_number}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {loadError && (
                    <View style={styles.errorContainer}>
                        <AlertCircle color="#EF4444" size={36} />
                        <Text style={styles.errorTitle}>
                            Unable to load appointments
                        </Text>
                        <Text style={styles.errorMessage}>{loadError}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => loadMonth(year, month)}
                        >
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Legend */}
                <View style={styles.legend}>
                    <Text style={styles.legendTitle}>Calendar Legend</Text>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendSwatch, { backgroundColor: "#ac3434" }]} />
                        <Text style={styles.legendText}>Has Appointments</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendSwatch, { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1 }]} />
                        <Text style={styles.legendText}>Holiday (Closed)</Text>
                    </View>
                    <View style={styles.legendRow}>
                        <View style={[styles.legendSwatch, { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1 }]} />
                        <Text style={styles.legendText}>Sunday (Walk-in Only)</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#F9FAFB" },
    scroll: { padding: 16, paddingBottom: 40 },
    calHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    monthLabel: { fontSize: 18, fontWeight: "700", color: "#111827" },
    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        justifyContent: "center",
        marginBottom: 8,
    },
    loadingText: { fontSize: 13, color: "#6B7280" },
    errorContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
        marginTop: 12,
    },
    errorTitle: {
        fontSize: 17,
        fontWeight: "700",
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
    weekRow: { flexDirection: "row", marginBottom: 4 },
    weekCell: { width: DAY_SIZE, alignItems: "center", paddingVertical: 4 },
    weekLabel: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#F3F4F6",
        marginBottom: 16,
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0.5,
        borderColor: "#F3F4F6",
    },
    dayCellToday: { backgroundColor: "#FEF2F2" },
    dayCellClosed: { backgroundColor: "#FEF2F2" },
    dayCellSelected: { backgroundColor: "#ac3434" },
    dayNum: { fontSize: 14, fontWeight: "500", color: "#374151" },
    dayNumClosed: { color: "#991B1B", fontWeight: "600" },
    dayNumToday: { color: "#ac3434", fontWeight: "700" },
    dayNumSelected: { color: "#fff", fontWeight: "700" },
    weekLabelSunday: { color: "#991B1B" },
    dotRow: { flexDirection: "row", gap: 2, marginTop: 2 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#ac3434" },
    detailSection: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    detailTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
        paddingVertical: 16,
    },
    apptCard: {
        flexDirection: "row",
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 8,
    },
    apptStatusBar: { width: 4 },
    apptBody: { flex: 1, padding: 10 },
    apptRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 4,
    },
    apptPatient: { fontSize: 14, fontWeight: "600", color: "#111827", flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
    apptTime: { fontSize: 12, color: "#6B7280" },
    apptRef: { fontSize: 11, color: "#9CA3AF", marginLeft: 4 },
    closedBanner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    closedBannerTitle: { fontSize: 13, fontWeight: "700", color: "#991B1B" },
    closedBannerSub: { fontSize: 11, color: "#B91C1C", marginTop: 2 },
    legend: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    legendTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 8 },
    legendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    legendSwatch: { width: 14, height: 14, borderRadius: 3 },
    legendText: { fontSize: 12, color: "#6B7280" },
});
