import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, ClipboardList, FlaskConical, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';

import api from '@/app/services/api';
import type { TestItem, SummaryResponse, Meta } from '@/app/types/lab-queue';

const statusFilters = ['pending', 'processing', 'completed', 'released', 'all'] as const;

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'released', label: 'Released' },
  { value: 'all', label: 'All' },
] as const;

export default function LabQueueScreen() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [tests, setTests] = useState<TestItem[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [status, setStatus] = useState<(typeof statusFilters)[number]>('pending');
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const response = await api.get('/lab-queue/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load queue summary', error);
    }
  }, []);

  const loadTests = useCallback(
    async (page = 1, replace = false) => {
      try {
        if (page === 1 && !refreshing) setLoading(true);
        if (page > 1) setLoadingMore(true);

        const response = await api.get('/lab-queue/tests', {
          params: { status, page, per_page: 15 },
        });
        setMeta(response.data.meta);
        setTests((prev) =>
          replace || page === 1 ? response.data.data : [...prev, ...response.data.data],
        );
      } catch (error) {
        console.error('Failed to load lab tests', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [refreshing, status],
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTests(1, true);
  }, [loadTests]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
      loadTests(1, true);
    }, [loadSummary, loadTests]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadSummary();
    loadTests(1, true);
  };

  const handleStatusChange = (newStatus: typeof status) => {
    setStatus(newStatus);
    setStatusDropdownVisible(false);
  };

  const onEndReached = () => {
    if (loadingMore || !meta) return;
    if (meta.current_page < meta.last_page) {
      loadTests(meta.current_page + 1);
    }
  };

  const renderItem = ({ item }: { item: TestItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.patient}>{item.patient}</Text>
        <Text style={styles.amount}>₱{item.price.toLocaleString('en-PH')}</Text>
      </View>
      <Text style={styles.testName}>{item.test}</Text>
      <View style={styles.row}>
        <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
        <View
          style={[
            styles.statusChip,
            item.status === 'pending'
              ? styles.pending
              : item.status === 'processing'
                ? styles.processing
                : item.status === 'completed'
                  ? styles.completed
                  : styles.released,
          ]}
        >
          <Text
            style={[
              styles.statusChipText,
              item.status === 'pending'
                ? { color: '#991B1B' }
                : item.status === 'processing'
                  ? { color: '#92400E' }
                  : item.status === 'completed'
                    ? { color: '#1E40AF' }
                    : { color: '#065F46' },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading && !tests.length) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ac3434" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tests}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            <View style={styles.summaryRow}>
              <SummaryCard
                label="Pending"
                value={summary?.counts.pending ?? 0}
                color="#EF4444"
              />
              <SummaryCard
                label="Processing"
                value={summary?.counts.processing ?? 0}
                color="#F59E0B"
              />
              <SummaryCard
                label="Completed"
                value={summary?.counts.completed ?? 0}
                color="#3B82F6"
              />
              <SummaryCard
                label="Released"
                value={summary?.counts.released ?? 0}
                color="#10B981"
              />
            </View>

            {/* Status Filter Dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setStatusDropdownVisible(true)}
            >
              <Text style={styles.dropdownText}>
                {statusOptions.find((s) => s.value === status)?.label || 'Select Status'}
              </Text>
              <ChevronDown color="#6B7280" size={20} />
            </TouchableOpacity>

            <View style={styles.upNextCard}>
              <Text style={styles.upNextTitle}>Up Next</Text>
              {summary?.up_next?.length ? (
                summary.up_next.map((item) => (
                  <View key={item.id} style={styles.upNextRow}>
                    <View>
                      <Text style={styles.patient}>{item.patient}</Text>
                      <Text style={styles.testName}>{item.test}</Text>
                    </View>
                    <Text style={styles.timestamp}>
                      {new Date(item.created_at).toLocaleTimeString()}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyState}>No patients waiting.</Text>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <FlaskConical color="#D1D5DB" size={42} />
            <Text style={styles.emptyTitle}>Queue is clear</Text>
          </View>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color="#ac3434" />
            </View>
          ) : null
        }
      />

      {/* Status Dropdown Modal */}
      <Modal
        visible={statusDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusDropdownVisible(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity
                onPress={() => setStatusDropdownVisible(false)}
                style={styles.closeButton}
              >
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleStatusChange(option.value)}
                style={[
                  styles.dropdownOption,
                  status === option.value && styles.dropdownOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    status === option.value && styles.dropdownOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {status === option.value && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const SummaryCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <View style={styles.summaryCard}>
    <View style={[styles.summaryIcon, { backgroundColor: color + '22' }]}>
      <ClipboardList color={color} size={18} />
    </View>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: { color: '#6B7280', fontSize: 12, textAlign: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  dropdownText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    paddingVertical: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeButton: { padding: 4 },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionActive: { backgroundColor: '#FEF2F2' },
  dropdownOptionText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  dropdownOptionTextActive: { color: '#ac3434', fontWeight: '600' },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ac3434',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  upNextCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  upNextTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#111827' },
  upNextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  patient: { fontWeight: '700', color: '#111827' },
  amount: { fontWeight: '700', color: '#059669' },
  testName: { color: '#6B7280', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timestamp: { color: '#9CA3AF', fontSize: 12 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pending: { backgroundColor: '#FEE2E2' },
  processing: { backgroundColor: '#FEF3C7' },
  completed: { backgroundColor: '#DBEAFE' },
  released: { backgroundColor: '#D1FAE5' },
  statusChipText: { textTransform: 'capitalize', fontWeight: '600', color: '#374151' },
  emptyState: { color: '#9CA3AF', textAlign: 'center' },
  emptyWrapper: { alignItems: 'center', paddingVertical: 80, gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
});

