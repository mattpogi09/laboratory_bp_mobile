import React from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Calendar,
  ChevronDown,
  ClipboardList,
  DollarSign,
  FileText,
  Package,
  Shield,
  Wallet,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";

import api from "@/app/services/api";
import { formatCurrency } from "@/app/utils/format";
import { getDateRange, periods } from "@/app/utils/date";
import type {
  Period,
  FinancialRow,
  InventoryLogRow,
  AuditLogRow,
  LabReportRow,
  ReconciliationRow,
  FinancialData,
  InventoryData,
  AuditData,
  LabReportData,
  ReconciliationData,
} from "@/app/types/reports";

type Tab = "financial" | "inventory" | "audit" | "lab" | "reconciliation";

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("financial");
  const [period, setPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [periodDropdownVisible, setPeriodDropdownVisible] = useState(false);
  const [tabDropdownVisible, setTabDropdownVisible] = useState(false);

  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [labData, setLabData] = useState<LabReportData | null>(null);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);

  const loadFinancial = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange(period);
      const response = await api.get("/reports/financial", {
        params: { from, to },
      });
      setFinancialData(response.data);
    } catch (error: any) {
      console.error("Failed to load financial report", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to load financial report. Please check your connection and try again.";
      Alert.alert("Error", errorMessage);
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
    } catch (error: any) {
      console.error("Failed to load inventory log", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to load inventory log. Please check your connection and try again.";
      Alert.alert("Error", errorMessage);
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
    } catch (error: any) {
      console.error("Failed to load audit log", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to load audit log. Please check your connection and try again.";
      Alert.alert("Error", errorMessage);
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
    } catch (error: any) {
      console.error("Failed to load lab report", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to load lab report. Please check your connection and try again.";
      Alert.alert("Error", errorMessage);
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
    } catch (error: any) {
      console.error("Failed to load reconciliation", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to load cash reconciliation. Please check your connection and try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

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
    { id: "reconciliation" as Tab, label: "Cash Reconciliation", icon: Wallet },
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
            {periods.find((p) => p.value === period)?.label || "Day"}
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
                  period === item.value && styles.dropdownOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    period === item.value && styles.dropdownOptionTextActive,
                  ]}
                >
                  {item.label}
                </Text>
                {period === item.value && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
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
              React.createElement(tabs.find((t) => t.id === activeTab)!.icon, {
                color: "#ac3434",
                size: 18,
              })
            }
            <Text style={styles.dropdownText}>
              {tabs.find((t) => t.id === activeTab)?.label || "Select Report"}
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
              <Text style={styles.modalTitle}>Select Report Type</Text>
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
                    activeTab === tab.id && styles.dropdownOptionActive,
                  ]}
                >
                  <View style={styles.dropdownOptionContent}>
                    <Icon 
                      color={activeTab === tab.id ? "#ac3434" : "#6B7280"} 
                      size={20} 
                    />
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        activeTab === tab.id && styles.dropdownOptionTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </View>
                  {activeTab === tab.id && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
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
        {loading &&
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
                activeTab === "audit" ? styles.tabVisible : styles.tabHidden,
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
                activeTab === "lab" ? styles.tabVisible : styles.tabHidden,
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
                activeTab === "reconciliation" ? styles.tabVisible : styles.tabHidden,
              ]}
            >
              <ReconciliationTab
                data={reconciliationData}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
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
                Discount: -{formatCurrency(item.discount_amount)}
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
              {item.previous_stock ?? "—"} → {item.new_stock ?? "—"}
            </Text>
          </View>
          <Text style={styles.reportMetaText}>Reason: {item.reason}</Text>
          <Text style={styles.performedBy}>
            Performed by: {item.performed_by}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyWrapper}>
          <Package color="#D1D5DB" size={42} />
          <Text style={styles.emptyTitle}>No inventory transactions found</Text>
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
      ListHeaderComponent={<Text style={styles.sectionTitle}>Audit Log</Text>}
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
          <Text style={styles.sectionTitle}>Lab Report</Text>
        </>
      }
      renderItem={({ item }) => {
        const statusColors: Record<string, { bg: string; text: string }> = {
          pending: { bg: "#FEE2E2", text: "#991B1B" },
          processing: { bg: "#FEF3C7", text: "#92400E" },
          completed: { bg: "#DBEAFE", text: "#1E40AF" },
          released: { bg: "#D1FAE5", text: "#065F46" },
        };
        const statusStyle = statusColors[item.status] || statusColors.pending;

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
                  style={[styles.statusBadgeText, { color: statusStyle.text }]}
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
              value={formatCurrency(data.stats.total_overage_amount)}
              accent="#3B82F6"
            />
            <StatCard
              label="Shortage"
              value={formatCurrency(Math.abs(data.stats.total_shortage_amount))}
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
            <Text style={[styles.reportMetaText, { fontWeight: "600" }]}>
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
          <Text style={styles.emptyTitle}>No reconciliations found</Text>
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
});
