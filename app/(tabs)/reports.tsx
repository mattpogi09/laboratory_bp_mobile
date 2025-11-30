import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  Package,
  Shield,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';

import api from '@/app/services/api';

const formatCurrency = (value = 0) =>
  `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

type Tab = 'financial' | 'inventory' | 'audit' | 'lab';
type Period = 'day' | 'week' | 'month' | 'year';

const periods: { label: string; value: Period }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

const getDateRange = (period: Period): { from: string; to: string } => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const to = today.toISOString().split('T')[0];

  const from = new Date();
  switch (period) {
    case 'day':
      from.setHours(0, 0, 0, 0);
      break;
    case 'week':
      from.setDate(today.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    case 'month':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case 'year':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
  }

  return {
    from: from.toISOString().split('T')[0],
    to,
  };
};

type FinancialRow = {
  id: number;
  date: string;
  patient: string;
  tests: string;
  amount: number;
  discount_amount: number;
  discount_name: string | null;
  net_amount: number;
  payment_method: string;
  payment_status: string;
};

type InventoryLogRow = {
  id: number;
  date: string;
  transaction_code: string;
  item: string;
  type: string;
  quantity: number;
  previous_stock: number | null;
  new_stock: number | null;
  reason: string;
  performed_by: string;
};

type AuditLogRow = {
  id: number;
  timestamp: string;
  user: string;
  user_role: string | null;
  action: string;
  action_category: string;
  details: string;
  severity: string;
};

type LabReportRow = {
  id: number;
  date: string;
  transaction_number: string;
  patient: string;
  test_name: string;
  performed_by: string;
  status: string;
};

export default function ReportsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('financial');
  const [period, setPeriod] = useState<Period>('day');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Financial Report State
  const [financialData, setFinancialData] = useState<{
    rows: FinancialRow[];
    totals: { revenue: number; discounts: number; transactions: number };
  } | null>(null);

  // Inventory Log State
  const [inventoryData, setInventoryData] = useState<{
    data: InventoryLogRow[];
  } | null>(null);

  // Audit Log State
  const [auditData, setAuditData] = useState<{
    data: AuditLogRow[];
  } | null>(null);

  // Lab Report State
  const [labData, setLabData] = useState<{
    stats: {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      released: number;
    };
    rows: LabReportRow[];
  } | null>(null);

  const loadFinancial = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange(period);
      const response = await api.get('/reports/financial', {
        params: { from, to },
      });
      setFinancialData(response.data);
    } catch (error: any) {
      console.error('Failed to load financial report', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to load financial report. Please check your connection and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  const loadInventoryLog = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange(period);
      const response = await api.get('/reports/inventory-log', {
        params: { from, to },
      });
      setInventoryData(response.data);
    } catch (error: any) {
      console.error('Failed to load inventory log', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to load inventory log. Please check your connection and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  const loadAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange(period);
      const response = await api.get('/reports/audit-log', {
        params: { from, to },
      });
      setAuditData(response.data);
    } catch (error: any) {
      console.error('Failed to load audit log', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to load audit log. Please check your connection and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  const loadLabReport = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getDateRange(period);
      const response = await api.get('/reports/lab-report', {
        params: { from, to },
      });
      setLabData(response.data);
    } catch (error: any) {
      console.error('Failed to load lab report', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Failed to load lab report. Please check your connection and try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  const loadData = useCallback(() => {
    switch (activeTab) {
      case 'financial':
        loadFinancial();
        break;
      case 'inventory':
        loadInventoryLog();
        break;
      case 'audit':
        loadAuditLog();
        break;
      case 'lab':
        loadLabReport();
        break;
    }
  }, [activeTab, period, loadFinancial, loadInventoryLog, loadAuditLog, loadLabReport]);

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
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const tabs = [
    { id: 'financial' as Tab, label: 'Financial', icon: DollarSign },
    { id: 'inventory' as Tab, label: 'Inventory', icon: Package },
    { id: 'audit' as Tab, label: 'Audit', icon: Shield },
    { id: 'lab' as Tab, label: 'Lab', icon: FileText },
  ];

  return (
    <View style={styles.container}>
      {/* Period Filter */}
      <View style={styles.filterContainer}>
        <View style={styles.periodHeader}>
          <Calendar color="#6B7280" size={18} />
          <Text style={styles.periodHeaderText}>Report Period</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.periodChips}
          contentContainerStyle={styles.periodChipsContent}
        >
          {periods.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => handlePeriodChange(item.value)}
              style={[
                styles.periodChip,
                period === item.value && styles.periodChipActive,
              ]}
            >
              <Text
                style={[
                  styles.periodChipLabel,
                  period === item.value && styles.periodChipLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabScrollContent}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => handleTabChange(tab.id)}
            >
              <Icon
                color={isActive ? '#ac3434' : '#6B7280'}
                size={16}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <View style={styles.contentContainer}>
        {loading && !financialData && !inventoryData && !auditData && !labData ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#ac3434" />
          </View>
        ) : (
          <>
            <View
              style={[
                styles.tabContentWrapper,
                activeTab === 'financial' ? styles.tabVisible : styles.tabHidden,
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
                activeTab === 'inventory' ? styles.tabVisible : styles.tabHidden,
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
                activeTab === 'audit' ? styles.tabVisible : styles.tabHidden,
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
                activeTab === 'lab' ? styles.tabVisible : styles.tabHidden,
              ]}
            >
              <LabTab
                data={labData}
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
                item.payment_status === 'paid'
                  ? styles.badgePaid
                  : styles.badgePending,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  item.payment_status === 'paid'
                    ? { color: '#065F46' }
                    : { color: '#991B1B' },
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
                item.type === 'IN'
                  ? { backgroundColor: '#D1FAE5' }
                  : { backgroundColor: '#FEE2E2' },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  item.type === 'IN' ? { color: '#065F46' } : { color: '#991B1B' },
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
              {item.type === 'IN' ? '+' : '-'}
              {item.quantity}
            </Text>
          </View>
          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Stock:</Text>
            <Text style={styles.stockValue}>
              {item.previous_stock ?? '—'} → {item.new_stock ?? '—'}
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
                item.severity === 'critical'
                  ? { backgroundColor: '#FEE2E2' }
                  : item.severity === 'warning'
                    ? { backgroundColor: '#FEF3C7' }
                    : { backgroundColor: '#DBEAFE' },
              ]}
            >
              <Text
                style={[
                  styles.severityBadgeText,
                  item.severity === 'critical'
                    ? { color: '#991B1B' }
                    : item.severity === 'warning'
                      ? { color: '#92400E' }
                      : { color: '#1E40AF' },
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
          pending: { bg: '#FEE2E2', text: '#991B1B' },
          processing: { bg: '#FEF3C7', text: '#92400E' },
          completed: { bg: '#DBEAFE', text: '#1E40AF' },
          released: { bg: '#D1FAE5', text: '#065F46' },
        };
        const statusStyle = statusColors[item.status] || statusColors.pending;

        return (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportDate}>{item.date}</Text>
              <View
                style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
              >
                <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  contentContainer: {
    flex: 1,
    minHeight: '80%',
    position: 'relative',
    overflow: 'hidden',
  },
  tabContentWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  tabVisible: {
    opacity: 1,
    pointerEvents: 'auto',
    zIndex: 1,
  },
  tabHidden: {
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  periodHeaderText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  periodChips: {
    marginTop: 0,
  },
  periodChipsContent: {
    gap: 4,
    paddingRight: 12,
  },
  periodChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  periodChipActive: {
    backgroundColor: '#ac3434',
    borderColor: '#ac3434',
  },
  periodChipLabel: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  periodChipLabelActive: {
    color: '#fff',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabContent: {
    flex: 1,
    minHeight: 0,
    maxHeight: '100%',
  },
  tabScrollContent: { paddingHorizontal: 6 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#ac3434' },
  tabLabel: { color: '#6B7280', fontWeight: '600', fontSize: 12 },
  tabLabelActive: { color: '#ac3434' },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: { color: '#6B7280', fontSize: 11, marginBottom: 3 },
  statValue: { fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
    color: '#111827',
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reportDate: { color: '#6B7280', fontSize: 11 },
  reportAmount: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  reportPatient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  reportItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  reportTests: { color: '#6B7280', fontSize: 12, marginBottom: 6 },
  reportMeta: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  reportMetaText: { color: '#6B7280', fontSize: 11 },
  reportUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  reportAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 3,
  },
  reportDetails: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  performedBy: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgePaid: { backgroundColor: '#D1FAE5' },
  badgePending: { backgroundColor: '#FEE2E2' },
  badgeText: { fontWeight: '600', fontSize: 11, textTransform: 'capitalize' },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeBadgeText: { fontWeight: '600', fontSize: 11 },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  severityBadgeText: { fontWeight: '600', fontSize: 10, textTransform: 'capitalize' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: { fontWeight: '600', fontSize: 11, textTransform: 'capitalize' },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  stockLabel: { color: '#6B7280', fontSize: 12 },
  stockValue: { color: '#111827', fontWeight: '600', fontSize: 12 },
  emptyWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
});
