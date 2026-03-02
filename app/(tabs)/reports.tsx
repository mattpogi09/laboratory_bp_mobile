import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    Beaker,
    Calendar,
    ChevronDown,
    ClipboardList,
    DollarSign,
    Download,
    Droplets,
    FileSpreadsheet,
    FileText,
    HeartPulse,
    Package,
    Shield,
    TestTube,
    Wallet,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Linking,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";

import api, { API_BASE_URL } from "@/app/services/api";
import type {
    AuditData,
    AuditLogRow,
    FinancialData,
    FinancialRow,
    InventoryData,
    InventoryLogRow,
    LabReportData,
    LabReportRow,
    Period,
    ReconciliationData,
    ReconciliationRow,
} from "@/types/reports";
import { getApiErrorMessage } from "@/utils";
import { getDateRange, periods } from "@/utils/date";
import { formatCurrency } from "@/utils/format";
import { useAuth } from "@/contexts/AuthContext";

const SCREEN_W = Dimensions.get("window").width;

type Tab =
    | "financial"
    | "inventory"
    | "audit"
    | "lab"
    | "reconciliation"
    | "lab-worksheets";

const WORKSHEET_TYPES = [
    {
        id: "hematology",
        name: "Hematology Worksheet",
        Icon: Droplets,
        bgColor: "#FEF2F2",
        borderColor: "#FECACA",
        iconColor: "#DC2626",
        description: "CBC, WBC Differential, Hemoglobin, Hematocrit",
    },
    {
        id: "chemistry",
        name: "Blood Chemistry Worksheet",
        Icon: Beaker,
        bgColor: "#EFF6FF",
        borderColor: "#BFDBFE",
        iconColor: "#2563EB",
        description: "FBS, Creatinine, BUA, Lipid Profile, SGOT/SGPT",
    },
    {
        id: "urinalysis",
        name: "Urinalysis Worksheet",
        Icon: TestTube,
        bgColor: "#FEFCE8",
        borderColor: "#FEF08A",
        iconColor: "#CA8A04",
        description: "Physical, Chemical & Microscopic Examination",
    },
    {
        id: "fecalysis",
        name: "Fecalysis Worksheet",
        Icon: TestTube,
        bgColor: "#FFFBEB",
        borderColor: "#FDE68A",
        iconColor: "#D97706",
        description: "Stool Analysis, Occult Blood, Parasites",
    },
    {
        id: "serology",
        name: "Serology Worksheet",
        Icon: HeartPulse,
        bgColor: "#FAF5FF",
        borderColor: "#E9D5FF",
        iconColor: "#7C3AED",
        description: "HBsAg, Anti-HBs, Dengue, Typhidot, RPR/VDRL",
    },
];

export default function ReportsScreen() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>("financial");
    const [period, setPeriod] = useState<Period>("day");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [periodDropdownVisible, setPeriodDropdownVisible] = useState(false);
    const [tabDropdownVisible, setTabDropdownVisible] = useState(false);
    const [worksheetDownloading, setWorksheetDownloading] = useState<
        string | null
    >(null);

    const [financialData, setFinancialData] = useState<FinancialData | null>(
        null,
    );
    const [inventoryData, setInventoryData] = useState<InventoryData | null>(
        null,
    );
    const [auditData, setAuditData] = useState<AuditData | null>(null);
    const [labData, setLabData] = useState<LabReportData | null>(null);
    const [reconciliationData, setReconciliationData] =
        useState<ReconciliationData | null>(null);

    const loadFinancial = useCallback(async () => {
        try {
            setLoading(true);
            const { from, to } = getDateRange(period);
            const response = await api.get("/reports/financial", {
                params: { from, to },
            });
            setFinancialData(response.data);
            setLoadError(null);
        } catch (error: any) {
            setLoadError(
                getApiErrorMessage(error, "Failed to load financial report."),
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    const loadInventoryLog = useCallback(async () => {
        try {
            setLoading(true);
            const { from, to } = getDateRange(period);
            const response = await api.get("/reports/inventory-log", {
                params: { from, to },
            });
            setInventoryData(response.data);
            setLoadError(null);
        } catch (error: any) {
            setLoadError(
                getApiErrorMessage(error, "Failed to load inventory log."),
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    const loadAuditLog = useCallback(async () => {
        try {
            setLoading(true);
            const { from, to } = getDateRange(period);
            const response = await api.get("/reports/audit-log", {
                params: { from, to },
            });
            setAuditData(response.data);
            setLoadError(null);
        } catch (error: any) {
            setLoadError(
                getApiErrorMessage(error, "Failed to load audit log."),
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    const loadLabReport = useCallback(async () => {
        try {
            setLoading(true);
            const { from, to } = getDateRange(period);
            const response = await api.get("/reports/lab-report", {
                params: { from, to },
            });
            setLabData(response.data);
            setLoadError(null);
        } catch (error: any) {
            setLoadError(
                getApiErrorMessage(error, "Failed to load lab report."),
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    const loadReconciliation = useCallback(async () => {
        try {
            setLoading(true);
            const { from, to } = getDateRange(period);
            const response = await api.get("/reports/reconciliation", {
                params: { from, to },
            });
            setReconciliationData(response.data);
            setLoadError(null);
        } catch (error: any) {
            setLoadError(
                getApiErrorMessage(
                    error,
                    "Failed to load cash reconciliation.",
                ),
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [period]);

    const handleWorksheetDownload = async (category: string) => {
        const { from, to } = getDateRange(period);
        const base = API_BASE_URL.replace(/\/api$/, "");
        const url = `${base}/api/lab-worksheets/export?category=${category}&date_from=${from}&date_to=${to}&token=${token}`;
        setWorksheetDownloading(category);
        try {
            await Linking.openURL(url);
        } catch {
            // silently ignore — browser will handle auth errors
        } finally {
            setTimeout(() => setWorksheetDownloading(null), 2500);
        }
    };

    const loadData = useCallback(() => {
        switch (activeTab) {
            case "financial":
                loadFinancial();
                break;
            case "inventory":
                loadInventoryLog();
                break;
            case "audit":
                loadAuditLog();
                break;
            case "lab":
                loadLabReport();
                break;
            case "reconciliation":
                loadReconciliation();
                break;
            case "lab-worksheets":
                // No API data needed — static download UI
                setLoading(false);
                break;
        }
    }, [
        activeTab,
        period,
        loadFinancial,
        loadInventoryLog,
        loadAuditLog,
        loadLabReport,
        loadReconciliation,
    ]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData]),
    );

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handlePeriodChange = (newPeriod: Period) => {
        setPeriod(newPeriod);
        setPeriodDropdownVisible(false);
    };

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        setTabDropdownVisible(false);
    };

    const tabs = [
        { id: "financial" as Tab, label: "Financial", icon: DollarSign },
        { id: "inventory" as Tab, label: "Inventory", icon: Package },
        { id: "audit" as Tab, label: "Audit", icon: Shield },
        { id: "lab" as Tab, label: "Lab", icon: FileText },
        {
            id: "reconciliation" as Tab,
            label: "Cash Reconciliation",
            icon: Wallet,
        },
        {
            id: "lab-worksheets" as Tab,
            label: "Lab Worksheets",
            icon: FileSpreadsheet,
        },
    ];

    return (
        <View style={styles.container}>
            {/* Period Filter */}
            <View style={styles.filterContainer}>
                <View style={styles.periodHeader}>
                    <Calendar color="#6B7280" size={18} />
                    <Text style={styles.periodHeaderText}>Report Period</Text>
                </View>
                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setPeriodDropdownVisible(true)}
                >
                    <Text style={styles.dropdownText}>
                        {periods.find((p) => p.value === period)?.label ||
                            "Day"}
                    </Text>
                    <ChevronDown color="#6B7280" size={20} />
                </TouchableOpacity>
            </View>

            {/* Period Dropdown Modal */}
            <Modal
                visible={periodDropdownVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPeriodDropdownVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setPeriodDropdownVisible(false)}
                >
                    <View style={styles.dropdownModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Period</Text>
                            <TouchableOpacity
                                onPress={() => setPeriodDropdownVisible(false)}
                                style={styles.closeButton}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        {periods.map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                onPress={() => handlePeriodChange(item.value)}
                                style={[
                                    styles.dropdownOption,
                                    period === item.value &&
                                        styles.dropdownOptionActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.dropdownOptionText,
                                        period === item.value &&
                                            styles.dropdownOptionTextActive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                                {period === item.value && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkText}>
                                            ✓
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Report Type Selector */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setTabDropdownVisible(true)}
                >
                    <View style={styles.dropdownTextRow}>
                        {tabs.find((t) => t.id === activeTab)?.icon &&
                            React.createElement(
                                tabs.find((t) => t.id === activeTab)!.icon,
                                {
                                    color: "#ac3434",
                                    size: 18,
                                },
                            )}
                        <Text style={styles.dropdownText}>
                            {tabs.find((t) => t.id === activeTab)?.label ||
                                "Select Report"}
                        </Text>
                    </View>
                    <ChevronDown color="#6B7280" size={20} />
                </TouchableOpacity>
            </View>

            {/* Report Type Dropdown Modal */}
            <Modal
                visible={tabDropdownVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setTabDropdownVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setTabDropdownVisible(false)}
                >
                    <View style={styles.dropdownModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Select Report Type
                            </Text>
                            <TouchableOpacity
                                onPress={() => setTabDropdownVisible(false)}
                                style={styles.closeButton}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    onPress={() => handleTabChange(tab.id)}
                                    style={[
                                        styles.dropdownOption,
                                        activeTab === tab.id &&
                                            styles.dropdownOptionActive,
                                    ]}
                                >
                                    <View style={styles.dropdownOptionContent}>
                                        <Icon
                                            color={
                                                activeTab === tab.id
                                                    ? "#ac3434"
                                                    : "#6B7280"
                                            }
                                            size={20}
                                        />
                                        <Text
                                            style={[
                                                styles.dropdownOptionText,
                                                activeTab === tab.id &&
                                                    styles.dropdownOptionTextActive,
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                    </View>
                                    {activeTab === tab.id && (
                                        <View style={styles.checkmark}>
                                            <Text style={styles.checkmarkText}>
                                                ✓
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Content */}
            <View style={styles.contentContainer}>
                {loadError ? (
                    <View style={styles.errorContainer}>
                        <AlertCircle color="#EF4444" size={36} />
                        <Text style={styles.errorTitle}>
                            Unable to load report
                        </Text>
                        <Text style={styles.errorMessage}>{loadError}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => {
                                setLoadError(null);
                                loadData();
                            }}
                        >
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : loading &&
                  activeTab !== "lab-worksheets" &&
                  !financialData &&
                  !inventoryData &&
                  !auditData &&
                  !labData ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#ac3434" />
                    </View>
                ) : (
                    <>
                        <View
                            style={[
                                styles.tabContentWrapper,
                                activeTab === "financial"
                                    ? styles.tabVisible
                                    : styles.tabHidden,
                            ]}
                        >
                            <FinancialTab
                                data={financialData}
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                            />
                        </View>
                        <View
                            style={[
                                styles.tabContentWrapper,
                                activeTab === "inventory"
                                    ? styles.tabVisible
                                    : styles.tabHidden,
                            ]}
                        >
                            <InventoryTab
                                data={inventoryData}
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                            />
                        </View>
                        <View
                            style={[
                                styles.tabContentWrapper,
                                activeTab === "audit"
                                    ? styles.tabVisible
                                    : styles.tabHidden,
                            ]}
                        >
                            <AuditTab
                                data={auditData}
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                            />
                        </View>
                        <View
                            style={[
                                styles.tabContentWrapper,
                                activeTab === "lab"
                                    ? styles.tabVisible
                                    : styles.tabHidden,
                            ]}
                        >
                            <LabTab
                                data={labData}
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                            />
                        </View>
                        <View
                            style={[
                                styles.tabContentWrapper,
                                activeTab === "reconciliation"
                                    ? styles.tabVisible
                                    : styles.tabHidden,
                            ]}
                        >
                            <ReconciliationTab
                                data={reconciliationData}
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                            />
                        </View>
                        <View
                            style={[
                                styles.tabContentWrapper,
                                activeTab === "lab-worksheets"
                                    ? styles.tabVisible
                                    : styles.tabHidden,
                            ]}
                        >
                            <ScrollView
                                contentContainerStyle={
                                    styles.worksheetContainer
                                }
                            >
                                <View style={styles.worksheetHeader}>
                                    <FileSpreadsheet
                                        color="#10B981"
                                        size={24}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            style={styles.worksheetHeaderTitle}
                                        >
                                            Lab Worksheets Export
                                        </Text>
                                        <Text style={styles.worksheetHeaderSub}>
                                            Export completed lab results to
                                            Excel worksheets
                                        </Text>
                                    </View>
                                </View>

                                {WORKSHEET_TYPES.map((ws) => (
                                    <View
                                        key={ws.id}
                                        style={[
                                            styles.worksheetCard,
                                            {
                                                backgroundColor: ws.bgColor,
                                                borderColor: ws.borderColor,
                                            },
                                        ]}
                                    >
                                        <View style={styles.worksheetCardTop}>
                                            <View
                                                style={
                                                    styles.worksheetIconWrapper
                                                }
                                            >
                                                <ws.Icon
                                                    color={ws.iconColor}
                                                    size={22}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={styles.worksheetName}
                                                >
                                                    {ws.name}
                                                </Text>
                                                <Text
                                                    style={styles.worksheetDesc}
                                                >
                                                    {ws.description}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={[
                                                styles.worksheetBtn,
                                                worksheetDownloading ===
                                                    ws.id &&
                                                    styles.worksheetBtnDisabled,
                                            ]}
                                            onPress={() =>
                                                handleWorksheetDownload(ws.id)
                                            }
                                            disabled={
                                                worksheetDownloading === ws.id
                                            }
                                        >
                                            <Download
                                                color={
                                                    worksheetDownloading ===
                                                    ws.id
                                                        ? "#9CA3AF"
                                                        : "#374151"
                                                }
                                                size={15}
                                            />
                                            <Text
                                                style={[
                                                    styles.worksheetBtnText,
                                                    worksheetDownloading ===
                                                        ws.id && {
                                                        color: "#9CA3AF",
                                                    },
                                                ]}
                                            >
                                                {worksheetDownloading === ws.id
                                                    ? "Opening..."
                                                    : "Export Excel"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                <View style={styles.worksheetNote}>
                                    <Text style={styles.worksheetNoteTitle}>
                                        Export Information
                                    </Text>
                                    <Text style={styles.worksheetNoteText}>
                                        • Includes patient info, test results,
                                        and performing technologist
                                    </Text>
                                    <Text style={styles.worksheetNoteText}>
                                        • Only completed/released tests with
                                        results are included
                                    </Text>
                                    <Text style={styles.worksheetNoteText}>
                                        • Select a period above to filter the
                                        date range
                                    </Text>
                                </View>
                            </ScrollView>
                        </View>
                    </>
                )}
            </View>
        </View>
    );
}

function FinancialTab({
    data,
    refreshing,
    onRefresh,
}: {
    data: { rows: FinancialRow[]; totals: any } | null;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    if (!data) {
        return (
            <View style={styles.emptyWrapper}>
                <ClipboardList color="#D1D5DB" size={42} />
                <Text style={styles.emptyTitle}>No data available</Text>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.tabContent}
            data={data.rows}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={
                data.rows.length === 0
                    ? { flex: 1, padding: 8, paddingBottom: 64 }
                    : { padding: 8, paddingBottom: 64 }
            }
            nestedScrollEnabled={false}
            removeClippedSubviews={true}
            ListHeaderComponent={
                <>
                    <View style={styles.cardsRow}>
                        <StatCard
                            label="Total Revenue"
                            value={formatCurrency(data.totals.revenue)}
                            accent="#10B981"
                        />
                        <StatCard
                            label="Total Discounts"
                            value={formatCurrency(data.totals.discounts)}
                            accent="#F59E0B"
                        />
                    </View>
                    <View style={styles.cardsRow}>
                        <StatCard
                            label="Transactions"
                            value={data.totals.transactions.toString()}
                            accent="#1D4ED8"
                        />
                    </View>
                    {(() => {
                        if (!data.rows.length) return null;
                        const map = new Map<string, number>();
                        data.rows.forEach((r) => {
                            const k = r.date.split("-").slice(1).join("/");
                            map.set(
                                k,
                                (map.get(k) ?? 0) + Number(r.net_amount),
                            );
                        });
                        const entries = Array.from(map.entries()).slice(-6);
                        if (!entries.length) return null;
                        return (
                            <View style={styles.chartCard}>
                                <Text style={styles.chartTitle}>
                                    Revenue by Date
                                </Text>
                                <BarChart
                                    data={{
                                        labels: entries.map(([l]) => l),
                                        datasets: [
                                            {
                                                data: entries.map(([, v]) =>
                                                    Math.max(0, v),
                                                ),
                                            },
                                        ],
                                    }}
                                    width={SCREEN_W - 32}
                                    height={180}
                                    yAxisLabel="₱"
                                    yAxisSuffix=""
                                    chartConfig={{
                                        backgroundColor: "#fff",
                                        backgroundGradientFrom: "#fff",
                                        backgroundGradientTo: "#fff",
                                        decimalPlaces: 0,
                                        color: (o = 1) =>
                                            `rgba(16, 185, 129, ${o})`,
                                        labelColor: (o = 1) =>
                                            `rgba(107, 114, 128, ${o})`,
                                        barPercentage: 0.7,
                                        propsForBackgroundLines: {
                                            strokeDasharray: "",
                                            stroke: "#F3F4F6",
                                        },
                                    }}
                                    style={styles.chart}
                                    showValuesOnTopOfBars={false}
                                    withInnerLines
                                    fromZero
                                />
                            </View>
                        );
                    })()}
                    <Text style={styles.sectionTitle}>Financial Report</Text>
                </>
            }
            renderItem={({ item }) => (
                <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.reportDate}>{item.date}</Text>
                        <Text style={styles.reportAmount}>
                            {formatCurrency(item.net_amount)}
                        </Text>
                    </View>
                    <Text style={styles.reportPatient}>{item.patient}</Text>
                    <Text style={styles.reportTests}>{item.tests}</Text>
                    <View style={styles.reportMeta}>
                        <Text style={styles.reportMetaText}>
                            Gross: {formatCurrency(item.amount)}
                        </Text>
                        {item.discount_amount > 0 && (
                            <Text style={styles.reportMetaText}>
                                Discount: -
                                {formatCurrency(item.discount_amount)}
                            </Text>
                        )}
                    </View>
                    <View style={styles.badgeRow}>
                        <View
                            style={[
                                styles.badge,
                                item.payment_status === "paid"
                                    ? styles.badgePaid
                                    : styles.badgePending,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    item.payment_status === "paid"
                                        ? { color: "#065F46" }
                                        : { color: "#991B1B" },
                                ]}
                            >
                                {item.payment_method}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
            ListEmptyComponent={
                <View style={styles.emptyWrapper}>
                    <ClipboardList color="#D1D5DB" size={42} />
                    <Text style={styles.emptyTitle}>No transactions found</Text>
                </View>
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        />
    );
}

function InventoryTab({
    data,
    refreshing,
    onRefresh,
}: {
    data: { data: InventoryLogRow[] } | null;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    if (!data) {
        return (
            <View style={styles.emptyWrapper}>
                <Package color="#D1D5DB" size={42} />
                <Text style={styles.emptyTitle}>No data available</Text>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.tabContent}
            data={data.data}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={
                data.data.length === 0
                    ? { flex: 1, padding: 8, paddingBottom: 64 }
                    : { padding: 8, paddingBottom: 64 }
            }
            nestedScrollEnabled={false}
            removeClippedSubviews={true}
            ListHeaderComponent={
                <Text style={styles.sectionTitle}>Inventory Log</Text>
            }
            renderItem={({ item }) => (
                <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.reportDate}>{item.date}</Text>
                        <View
                            style={[
                                styles.typeBadge,
                                item.type === "IN"
                                    ? { backgroundColor: "#D1FAE5" }
                                    : { backgroundColor: "#FEE2E2" },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.typeBadgeText,
                                    item.type === "IN"
                                        ? { color: "#065F46" }
                                        : { color: "#991B1B" },
                                ]}
                            >
                                {item.type}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.reportItemName}>{item.item}</Text>
                    <Text style={styles.reportMetaText}>
                        Transaction: {item.transaction_code}
                    </Text>
                    <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>Quantity:</Text>
                        <Text style={styles.stockValue}>
                            {item.type === "IN" ? "+" : "-"}
                            {item.quantity}
                        </Text>
                    </View>
                    <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>Stock:</Text>
                        <Text style={styles.stockValue}>
                            {item.previous_stock ?? "—"} →{" "}
                            {item.new_stock ?? "—"}
                        </Text>
                    </View>
                    <Text style={styles.reportMetaText}>
                        Reason: {item.reason}
                    </Text>
                    <Text style={styles.performedBy}>
                        Performed by: {item.performed_by}
                    </Text>
                </View>
            )}
            ListEmptyComponent={
                <View style={styles.emptyWrapper}>
                    <Package color="#D1D5DB" size={42} />
                    <Text style={styles.emptyTitle}>
                        No inventory transactions found
                    </Text>
                </View>
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        />
    );
}

function AuditTab({
    data,
    refreshing,
    onRefresh,
}: {
    data: { data: AuditLogRow[] } | null;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    if (!data) {
        return (
            <View style={styles.emptyWrapper}>
                <Shield color="#D1D5DB" size={42} />
                <Text style={styles.emptyTitle}>No data available</Text>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.tabContent}
            data={data.data}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={
                data.data.length === 0
                    ? { flex: 1, padding: 8, paddingBottom: 64 }
                    : { padding: 8, paddingBottom: 64 }
            }
            nestedScrollEnabled={false}
            removeClippedSubviews={true}
            ListHeaderComponent={
                <Text style={styles.sectionTitle}>Audit Log</Text>
            }
            renderItem={({ item }) => (
                <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.reportDate}>{item.timestamp}</Text>
                        <View
                            style={[
                                styles.severityBadge,
                                item.severity === "critical"
                                    ? { backgroundColor: "#FEE2E2" }
                                    : item.severity === "warning"
                                      ? { backgroundColor: "#FEF3C7" }
                                      : { backgroundColor: "#DBEAFE" },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.severityBadgeText,
                                    item.severity === "critical"
                                        ? { color: "#991B1B" }
                                        : item.severity === "warning"
                                          ? { color: "#92400E" }
                                          : { color: "#1E40AF" },
                                ]}
                            >
                                {item.severity}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.reportUser}>{item.user}</Text>
                    <Text style={styles.reportAction}>{item.action}</Text>
                    <Text style={styles.reportDetails}>{item.details}</Text>
                </View>
            )}
            ListEmptyComponent={
                <View style={styles.emptyWrapper}>
                    <Shield color="#D1D5DB" size={42} />
                    <Text style={styles.emptyTitle}>No audit logs found</Text>
                </View>
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        />
    );
}

function LabTab({
    data,
    refreshing,
    onRefresh,
}: {
    data: { stats: any; rows: LabReportRow[] } | null;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    if (!data) {
        return (
            <View style={styles.emptyWrapper}>
                <FileText color="#D1D5DB" size={42} />
                <Text style={styles.emptyTitle}>No data available</Text>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.tabContent}
            data={data.rows}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={
                data.rows.length === 0
                    ? { flex: 1, padding: 8, paddingBottom: 64 }
                    : { padding: 8, paddingBottom: 64 }
            }
            nestedScrollEnabled={false}
            removeClippedSubviews={true}
            ListHeaderComponent={
                <>
                    <View style={styles.cardsRow}>
                        <StatCard
                            label="Total Tests"
                            value={data.stats.total.toString()}
                            accent="#1D4ED8"
                        />
                        <StatCard
                            label="Pending"
                            value={data.stats.pending.toString()}
                            accent="#DC2626"
                        />
                    </View>
                    <View style={styles.cardsRow}>
                        <StatCard
                            label="Processing"
                            value={data.stats.processing.toString()}
                            accent="#F59E0B"
                        />
                        <StatCard
                            label="Completed"
                            value={data.stats.completed.toString()}
                            accent="#3B82F6"
                        />
                    </View>
                    <View style={styles.cardsRow}>
                        <StatCard
                            label="Released"
                            value={data.stats.released.toString()}
                            accent="#10B981"
                        />
                    </View>
                    {(() => {
                        const STATUS_DATA = [
                            {
                                name: "Pending",
                                population: data.stats.pending,
                                color: "#DC2626",
                                legendFontColor: "#374151",
                                legendFontSize: 12,
                            },
                            {
                                name: "Processing",
                                population: data.stats.processing,
                                color: "#D97706",
                                legendFontColor: "#374151",
                                legendFontSize: 12,
                            },
                            {
                                name: "Completed",
                                population: data.stats.completed,
                                color: "#2563EB",
                                legendFontColor: "#374151",
                                legendFontSize: 12,
                            },
                            {
                                name: "Released",
                                population: data.stats.released,
                                color: "#059669",
                                legendFontColor: "#374151",
                                legendFontSize: 12,
                            },
                        ].filter((d) => d.population > 0);
                        if (!STATUS_DATA.length) return null;
                        return (
                            <View style={styles.chartCard}>
                                <Text style={styles.chartTitle}>
                                    Test Status Distribution
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        color: "#6B7280",
                                        marginBottom: 8,
                                    }}
                                >
                                    Current global state — all time
                                </Text>
                                <PieChart
                                    data={STATUS_DATA}
                                    width={SCREEN_W - 32}
                                    height={180}
                                    chartConfig={{
                                        color: (o = 1) => `rgba(0,0,0,${o})`,
                                    }}
                                    accessor="population"
                                    backgroundColor="transparent"
                                    paddingLeft="15"
                                    hasLegend
                                    style={{ marginTop: 4 }}
                                />
                            </View>
                        );
                    })()}
                    <Text style={styles.sectionTitle}>Lab Report</Text>
                </>
            }
            renderItem={({ item }) => {
                const statusColors: Record<
                    string,
                    { bg: string; text: string }
                > = {
                    pending: { bg: "#FEE2E2", text: "#991B1B" },
                    processing: { bg: "#FEF3C7", text: "#92400E" },
                    completed: { bg: "#DBEAFE", text: "#1E40AF" },
                    released: { bg: "#D1FAE5", text: "#065F46" },
                };
                const statusStyle =
                    statusColors[item.status] || statusColors.pending;

                return (
                    <View style={styles.reportCard}>
                        <View style={styles.reportHeader}>
                            <Text style={styles.reportDate}>{item.date}</Text>
                            <View
                                style={[
                                    styles.statusBadge,
                                    { backgroundColor: statusStyle.bg },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusBadgeText,
                                        { color: statusStyle.text },
                                    ]}
                                >
                                    {item.status}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.reportPatient}>{item.patient}</Text>
                        <Text style={styles.reportTests}>{item.test_name}</Text>
                        <Text style={styles.reportMetaText}>
                            Transaction: {item.transaction_number}
                        </Text>
                        <Text style={styles.performedBy}>
                            Performed by: {item.performed_by}
                        </Text>
                    </View>
                );
            }}
            ListEmptyComponent={
                <View style={styles.emptyWrapper}>
                    <FileText color="#D1D5DB" size={42} />
                    <Text style={styles.emptyTitle}>No lab tests found</Text>
                </View>
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        />
    );
}

function ReconciliationTab({
    data,
    refreshing,
    onRefresh,
}: {
    data: {
        stats: {
            total: number;
            balanced: number;
            overage: number;
            shortage: number;
            total_overage_amount: number;
            total_shortage_amount: number;
        };
        rows: ReconciliationRow[];
    } | null;
    refreshing: boolean;
    onRefresh: () => void;
}) {
    if (!data) {
        return (
            <View style={styles.emptyWrapper}>
                <Wallet color="#D1D5DB" size={42} />
                <Text style={styles.emptyTitle}>No data available</Text>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.tabContent}
            data={data.rows}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={
                data.rows.length === 0
                    ? { flex: 1, padding: 8, paddingBottom: 64 }
                    : { padding: 8, paddingBottom: 64 }
            }
            nestedScrollEnabled={false}
            removeClippedSubviews={true}
            ListHeaderComponent={
                <>
                    <View style={styles.cardsRow}>
                        <StatCard
                            label="Total"
                            value={data.stats.total.toString()}
                            accent="#6B7280"
                        />
                        <StatCard
                            label="Balanced"
                            value={data.stats.balanced.toString()}
                            accent="#10B981"
                        />
                    </View>
                    <View style={styles.cardsRow}>
                        <StatCard
                            label="Overage"
                            value={formatCurrency(
                                data.stats.total_overage_amount,
                            )}
                            accent="#3B82F6"
                        />
                        <StatCard
                            label="Shortage"
                            value={formatCurrency(
                                Math.abs(data.stats.total_shortage_amount),
                            )}
                            accent="#EF4444"
                        />
                    </View>
                    <Text style={styles.sectionTitle}>Cash Reconciliation</Text>
                </>
            }
            renderItem={({ item }) => (
                <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.reportDate}>{item.date}</Text>
                        <View
                            style={[
                                styles.statusBadge,
                                {
                                    backgroundColor:
                                        item.status === "balanced"
                                            ? "#10B981"
                                            : item.status === "overage"
                                              ? "#3B82F6"
                                              : "#EF4444",
                                },
                            ]}
                        >
                            <Text style={styles.statusText}>
                                {item.status === "balanced"
                                    ? "Balanced"
                                    : item.status === "overage"
                                      ? "Overage"
                                      : "Shortage"}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.reportPatient}>{item.cashier}</Text>
                    <View style={styles.reportMeta}>
                        <Text style={styles.reportMetaText}>
                            Expected: {formatCurrency(item.expected_cash)}
                        </Text>
                        <Text style={styles.reportMetaText}>
                            Actual: {formatCurrency(item.actual_cash)}
                        </Text>
                    </View>
                    <View style={styles.reportMeta}>
                        <Text
                            style={[
                                styles.reportMetaText,
                                { fontWeight: "600" },
                            ]}
                        >
                            Variance: {item.variance >= 0 ? "+" : ""}
                            {formatCurrency(Math.abs(item.variance))}
                        </Text>
                        <Text style={styles.reportMetaText}>
                            {item.transaction_count} transactions
                        </Text>
                    </View>
                </View>
            )}
            ListEmptyComponent={
                <View style={styles.emptyWrapper}>
                    <Wallet color="#D1D5DB" size={42} />
                    <Text style={styles.emptyTitle}>
                        No reconciliations found
                    </Text>
                </View>
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        />
    );
}

const StatCard = ({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent: string;
}) => (
    <View style={styles.statCard}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    contentContainer: {
        flex: 1,
        minHeight: "80%",
        position: "relative",
        overflow: "hidden",
    },
    tabContentWrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
    },
    tabVisible: {
        opacity: 1,
        pointerEvents: "auto",
        zIndex: 1,
    },
    tabHidden: {
        opacity: 0,
        pointerEvents: "none",
        zIndex: 0,
    },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    filterContainer: {
        backgroundColor: "#fff",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    periodHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 6,
    },
    periodHeaderText: {
        color: "#374151",
        fontSize: 15,
        fontWeight: "600",
    },
    dropdown: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginTop: 2,
    },
    dropdownText: {
        color: "#374151",
        fontSize: 14,
        fontWeight: "600",
    },
    dropdownTextRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    dropdownModal: {
        backgroundColor: "#fff",
        borderRadius: 12,
        width: "100%",
        maxWidth: 300,
        overflow: "hidden",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    closeButton: {
        padding: 4,
    },
    dropdownOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    dropdownOptionActive: {
        backgroundColor: "#FEF2F2",
    },
    dropdownOptionContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    dropdownOptionText: {
        fontSize: 16,
        color: "#374151",
        fontWeight: "500",
    },
    dropdownOptionTextActive: {
        color: "#ac3434",
        fontWeight: "600",
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#ac3434",
        alignItems: "center",
        justifyContent: "center",
    },
    checkmarkText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    tabContainer: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    tabContent: {
        flex: 1,
        minHeight: 0,
        maxHeight: "100%",
    },
    tabScrollContent: { paddingHorizontal: 6 },
    tab: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 8,
        gap: 3,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: "#ac3434" },
    tabLabel: { color: "#6B7280", fontWeight: "600", fontSize: 12 },
    tabLabelActive: { color: "#ac3434" },
    cardsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
        gap: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statLabel: { color: "#6B7280", fontSize: 11, marginBottom: 3 },
    statValue: { fontSize: 16, fontWeight: "700" },
    sectionTitle: {
        fontSize: 15,
        fontWeight: "600",
        marginTop: 4,
        marginBottom: 8,
        color: "#111827",
    },
    reportCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    reportHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    reportDate: { color: "#6B7280", fontSize: 13 },
    reportAmount: { fontSize: 18, fontWeight: "700", color: "#10B981" },
    reportPatient: {
        fontSize: 17,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    reportItemName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    reportTests: { color: "#6B7280", fontSize: 14, marginBottom: 8 },
    reportMeta: { flexDirection: "row", gap: 10, marginBottom: 8 },
    reportMetaText: { color: "#6B7280", fontSize: 13 },
    reportUser: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    reportAction: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1D4ED8",
        marginBottom: 4,
    },
    reportDetails: { color: "#6B7280", fontSize: 14, lineHeight: 20 },
    performedBy: {
        color: "#6B7280",
        fontSize: 13,
        marginTop: 8,
        fontStyle: "italic",
    },
    badgeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
    },
    badgePaid: { backgroundColor: "#D1FAE5" },
    badgePending: { backgroundColor: "#FEE2E2" },
    badgeText: { fontWeight: "600", fontSize: 13, textTransform: "capitalize" },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    typeBadgeText: { fontWeight: "600", fontSize: 13 },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    severityBadgeText: {
        fontWeight: "600",
        fontSize: 12,
        textTransform: "capitalize",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontWeight: "600",
        fontSize: 13,
        textTransform: "capitalize",
    },
    statusText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
        textTransform: "capitalize",
    },
    stockRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 5,
    },
    stockLabel: { color: "#6B7280", fontSize: 14 },
    stockValue: { color: "#111827", fontWeight: "600", fontSize: 14 },
    emptyWrapper: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
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
    chartCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    chartTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    chart: {
        borderRadius: 8,
        marginLeft: -16,
    },
    worksheetContainer: { padding: 16, gap: 12, paddingBottom: 40 },
    worksheetHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 14,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    worksheetHeaderTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 2,
    },
    worksheetHeaderSub: { fontSize: 13, color: "#6B7280" },
    worksheetCard: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 14,
    },
    worksheetCardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 10,
    },
    worksheetIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    worksheetName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 2,
    },
    worksheetDesc: { fontSize: 12, color: "#6B7280" },
    worksheetBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: "#fff",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    worksheetBtnDisabled: { opacity: 0.5 },
    worksheetBtnText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
    },
    worksheetNote: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
        marginTop: 4,
        gap: 4,
    },
    worksheetNoteTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    worksheetNoteText: { fontSize: 12, color: "#6B7280", lineHeight: 18 },
});
