import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  Clock,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import api from '@/app/services/api';
import { useAuth } from '@/contexts/AuthContext';

type MetricCard = {
  title: string;
  value: string;
  trend?: number;
  subtitle?: string;
  color: string;
  icon: React.ReactNode;
};

type DashboardResponse = {
  stats: {
    totalRevenue: number;
    revenueTrend: number;
    patientsCount: number;
    patientsTrend: number;
    lowStockItems: number;
    pendingTests: number;
  };
  period: string;
  pendingTasks: { patient: string; test: string; time: string; status: string }[];
  lowStockItems: {
    id: number;
    name: string;
    current_stock: number;
    minimum_stock: number;
    unit: string;
  }[];
  revenueChartData: { label: string; value: number }[];
  testStatusData: Record<string, number>;
  alerts: { type: string; message: string; action?: string; route?: string; params?: any }[];
};

const periods: { label: string; value: string }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

const TEST_STATUSES = [
  { key: 'pending', label: 'Pending', color: '#DC2626' },
  { key: 'processing', label: 'Processing', color: '#D97706' },
  { key: 'completed', label: 'Completed', color: '#2563EB' },
  { key: 'released', label: 'Released', color: '#059669' },
];

const formatCurrency = (value?: number | string) => {
  if (value === undefined || value === null) return '₱0';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '₱0';
  return `₱${numValue
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('day');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await api.get('/dashboard', { params: { period } });
      setData(response.data);
    } catch (error: any) {
      console.error('Dashboard load failed', error);
      Alert.alert('Error', 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, refreshing]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleAlertAction = (alert: { route?: string; params?: any }) => {
    if (!alert.route) return;

    // Map backend routes to mobile routes
    const routeMap: Record<string, string> = {
      'inventory': '/(drawer)/inventory',
      'reports-logs': '/(drawer)/reports',
      'admin.reconciliation.show': '/reconciliation',
      'admin.reconciliation.index': '/(drawer)/reconciliation',
    };

    const mobileRoute = routeMap[alert.route] || '/(drawer)/inventory';

    // If route has params (like reconciliation detail), append the id
    if (alert.params?.reconciliation) {
      router.push(`${mobileRoute}/${alert.params.reconciliation}` as any);
    } else {
      router.push(mobileRoute as any);
    }
  };

  const metricCards: MetricCard[] = useMemo(
    () => [
      {
        title: 'Revenue',
        value: formatCurrency(data?.stats.totalRevenue),
        trend: data?.stats.revenueTrend,
        color: '#10B981',
        icon: <TrendingUp color="white" size={20} />,
      },
      {
        title: 'Patients',
        value: `${data?.stats.patientsCount ?? 0}`,
        trend: data?.stats.patientsTrend,
        color: '#3B82F6',
        icon: <Users color="white" size={20} />,
      },
      {
        title: 'Low Stock',
        value: `${data?.stats.lowStockItems ?? 0}`,
        color: '#F59E0B',
        icon: <AlertTriangle color="white" size={20} />,
      },
      {
        title: 'Pending Tests',
        value: `${data?.stats.pendingTests ?? 0}`,
        color: '#8B5CF6',
        icon: <Clock color="white" size={20} />,
      },
    ],
    [data],
  );

  const testStatusEntries = useMemo(() => {
    if (!data?.testStatusData) return [];
    const total = Object.values(data.testStatusData).reduce(
      (sum, value) => sum + value,
      0,
    );
    return TEST_STATUSES.map((status) => {
      const value = data.testStatusData[status.key] ?? 0;
      const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
      return { ...status, value, percentage };
    });
  }, [data]);

  if (loading && !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ac3434" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 48 + insets.bottom },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name}</Text>
            <Text style={styles.subtitle}>
              Operational overview for {period === 'day' ? 'today' : period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'this year'}.
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.periodChips}
        >
          {periods.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setPeriod(item.value)}
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

        <View style={styles.metricsGrid}>
          {metricCards.map((metric) => (
            <View key={metric.title} style={styles.metricCard}>
              <View
                style={[styles.metricIconWrapper, { backgroundColor: metric.color }]}
              >
                {metric.icon}
              </View>
              <Text style={styles.metricLabel}>{metric.title}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              {metric.trend !== undefined && (
                <Text
                  style={
                    metric.trend >= 0
                      ? styles.metricTrendPositive
                      : styles.metricTrendNegative
                  }
                >
                  {metric.trend >= 0 ? '▲' : '▼'} {Math.abs(metric.trend)}%
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.row}>
          <View style={[styles.card, styles.flexCard]}>
            <Text style={styles.cardTitle}>Test Status</Text>
            {testStatusEntries.length ? (
              <View style={styles.statusList}>
                {testStatusEntries.map((status) => (
                  <View key={status.key} style={styles.statusRow}>
                    <View
                      style={[styles.statusDot, { backgroundColor: status.color }]}
                    />
                    <Text style={styles.statusLabel}>{status.label}</Text>
                    <View style={styles.statusValueWrapper}>
                      <Text style={styles.statusValue}>{status.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyState}>No lab activity yet.</Text>
            )}
          </View>

          <View style={[styles.card, styles.flexCard]}>
            <Text style={styles.cardTitle}>Alerts</Text>
            {data?.alerts?.length ? (
              data.alerts.map((alertItem, index) => (
                <View key={index} style={styles.alertItem}>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertMessage}>{alertItem.message}</Text>
                    {alertItem.action && (
                      <TouchableOpacity 
                        onPress={() => handleAlertAction(alertItem)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.alertAction}>{alertItem.action}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyState}>All clear.</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.stockHeader}>
            <Text style={styles.cardTitle}>Stock Status</Text>
            <TouchableOpacity onPress={() => router.push('/inventory')}>
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>
          {data?.lowStockItems?.map((item) => {
            const needed = Math.max(0, item.minimum_stock - item.current_stock);
            const percentage =
              item.minimum_stock > 0
                ? Math.min(100, (item.current_stock / item.minimum_stock) * 100)
                : 0;
            let progressColor = '#F59E0B'; // Yellow/Orange for low stock
            if (percentage <= 20) progressColor = '#DC2626'; // Red for very low
            else if (percentage <= 50) progressColor = '#F59E0B'; // Yellow for low
            return (
              <View key={item.id} style={styles.stockItem}>
                <View style={styles.stockItemHeader}>
                  <Text style={styles.stockItemName}>{item.name}</Text>
                  <Text style={styles.stockNeeded}>{needed} needed</Text>
                </View>
                <Text style={styles.stockRatio}>
                  {item.current_stock} / {item.minimum_stock} {item.unit}
                </Text>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${percentage}%`, backgroundColor: progressColor },
                    ]}
                  />
                </View>
              </View>
            );
          })}
          {!data?.lowStockItems?.length && (
            <Text style={styles.emptyState}>Inventory looks healthy.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Tasks</Text>
          {data?.pendingTasks?.map((task, index) => (
            <View key={`${task.patient}-${index}`} style={styles.taskRow}>
              <View>
                <Text style={styles.taskPatient}>{task.patient}</Text>
                <Text style={styles.taskTest}>{task.test}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.taskTime}>{task.time}</Text>
                <View
                  style={[
                    styles.statusPill,
                    task.status === 'pending'
                      ? styles.statusPending
                      : task.status === 'processing'
                        ? styles.statusProcessing
                        : task.status === 'completed'
                          ? styles.statusCompleted
                          : styles.statusReleased,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      task.status === 'pending'
                        ? { color: '#991B1B' }
                        : task.status === 'processing'
                          ? { color: '#92400E' }
                          : task.status === 'completed'
                            ? { color: '#1E40AF' }
                            : { color: '#065F46' },
                    ]}
                  >
                    {task.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {!data?.pendingTasks?.length && (
            <Text style={styles.emptyState}>No pending lab tasks.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6B7280', fontSize: 14 },
  periodChips: { marginBottom: 16 },
  periodChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    marginRight: 12,
  },
  periodChipActive: { backgroundColor: '#ac3434', borderColor: '#ac3434' },
  periodChipLabel: { color: '#374151', fontWeight: '600' },
  periodChipLabelActive: { color: '#fff' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricLabel: { fontSize: 12, color: '#6B7280' },
  metricValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  metricTrendPositive: { marginTop: 4, fontSize: 12, color: '#059669' },
  metricTrendNegative: { marginTop: 4, fontSize: 12, color: '#DC2626' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0891B2',
  },
  stockItem: {
    marginBottom: 20,
  },
  stockItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  stockNeeded: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  stockRatio: {
    fontSize: 13,
    color: '#F59E0B',
    marginBottom: 8,
  },
  placeholder: { alignItems: 'center', paddingVertical: 24 },
  placeholderTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  placeholderSubtitle: { marginTop: 4, color: '#6B7280', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  flexCard: { flex: 1 },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  alertMessage: { color: '#374151', fontWeight: '500' },
  alertAction: { color: '#ac3434', fontSize: 12, marginTop: 2 },
  listItem: { marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { fontWeight: '600', color: '#111827' },
  itemStock: { color: '#6B7280', fontSize: 13 },
  progressBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  emptyState: { color: '#9CA3AF', fontSize: 14 },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskPatient: { fontWeight: '600', color: '#111827' },
  taskTest: { fontSize: 13, color: '#6B7280' },
  taskTime: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPending: { backgroundColor: '#FEE2E2' },
  statusProcessing: { backgroundColor: '#FEF3C7' },
  statusCompleted: { backgroundColor: '#DBEAFE' },
  statusReleased: { backgroundColor: '#D1FAE5' },
  statusText: { textTransform: 'capitalize', fontWeight: '600', fontSize: 12 },
  statusList: { marginTop: 4 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { flex: 1, color: '#1F2937', fontWeight: '500' },
  statusValueWrapper: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  statusValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusPercent: { fontSize: 12, color: '#6B7280' },
});