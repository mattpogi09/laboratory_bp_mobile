import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, TrendingUp, TrendingDown, CheckCircle2, Plus, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

interface Reconciliation {
  id: number;
  reconciliation_date: string;
  expected_cash: number;
  actual_cash: number;
  variance: number;
  status: 'balanced' | 'overage' | 'shortage';
  variance_type: string;
  transaction_count: number;
  notes: string | null;
  cashier: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at: string;
}

interface Stats {
  total_reconciliations: number;
  balanced_count: number;
  overage_count: number;
  shortage_count: number;
  total_overage: number;
  total_shortage: number;
}

export default function ReconciliationScreen() {
  const { apiCall, user } = useAuth();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedCash, setExpectedCash] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);

  const isAdmin = user?.role === 'admin';

  const fetchReconciliations = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          per_page: '20',
        });

        if (searchQuery) params.append('search', searchQuery);
        if (statusFilter) params.append('status', statusFilter);

        const response = await apiCall(`/api/reconciliations?${params}`);

        if (append) {
          setReconciliations((prev) => [...prev, ...response.data]);
        } else {
          setReconciliations(response.data);
        }

        if (isAdmin && response.stats) {
          setStats(response.stats);
        }

        setPage(response.current_page);
        setLastPage(response.last_page);
      } catch (error) {
        console.error('Error fetching reconciliations:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiCall, searchQuery, statusFilter, isAdmin]
  );

  useEffect(() => {
    fetchReconciliations();
  }, [searchQuery, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReconciliations(1);
  };

  const loadMore = () => {
    if (page < lastPage && !loading) {
      fetchReconciliations(page + 1, true);
    }
  };

  const fetchCreateData = async () => {
    try {
      const response = await apiCall('/api/reconciliations/create');
      setExpectedCash(response.expected_cash);
      setTransactionCount(response.transaction_count);
      setShowCreateModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load reconciliation data');
    }
  };

  const handleCreate = async () => {
    if (!actualCash || parseFloat(actualCash) < 0) {
      Alert.alert('Error', 'Please enter a valid cash amount');
      return;
    }

    setCreating(true);
    try {
      const response = await apiCall('/api/reconciliations', {
        method: 'POST',
        body: JSON.stringify({
          actual_cash: parseFloat(actualCash),
          notes: notes || null,
        }),
      });

      Alert.alert('Success', response.message);
      setShowCreateModal(false);
      setActualCash('');
      setNotes('');
      fetchReconciliations(1);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create reconciliation');
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'balanced':
        return '#10B981';
      case 'overage':
        return '#3B82F6';
      case 'shortage':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'balanced':
        return <CheckCircle2 color="#10B981" size={20} />;
      case 'overage':
        return <TrendingUp color="#3B82F6" size={20} />;
      case 'shortage':
        return <TrendingDown color="#EF4444" size={20} />;
      default:
        return null;
    }
  };

  const renderItem = ({ item }: { item: Reconciliation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(drawer)/reconciliation/${item.id}` as any)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <Text style={styles.date}>{new Date(item.reconciliation_date).toLocaleDateString()}</Text>
          {item.cashier && <Text style={styles.cashier}>{item.cashier.name}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountCol}>
          <Text style={styles.amountLabel}>Expected</Text>
          <Text style={styles.amountValue}>₱{item.expected_cash.toLocaleString()}</Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.amountLabel}>Actual</Text>
          <Text style={styles.amountValue}>₱{item.actual_cash.toLocaleString()}</Text>
        </View>
        <View style={styles.amountCol}>
          <Text style={styles.amountLabel}>Variance</Text>
          <Text style={[styles.amountValue, { color: getStatusColor(item.status) }]}>
            {item.variance >= 0 ? '+' : ''}₱{item.variance.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.transactionCount}>{item.transaction_count} transactions</Text>
        {item.notes && <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ac3434" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats Cards - Admin Only */}
      {isAdmin && stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_reconciliations}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.balanced_count}</Text>
            <Text style={styles.statLabel}>Balanced</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>
              ₱{stats.total_overage.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Overage</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              ₱{stats.total_shortage.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Shortage</Text>
          </View>
        </View>
      )}

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search color="#6B7280" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by cashier or date..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterPill, !statusFilter && styles.filterPillActive]}
          onPress={() => setStatusFilter('')}
        >
          <Text style={[styles.filterText, !statusFilter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, statusFilter === 'balanced' && styles.filterPillActive]}
          onPress={() => setStatusFilter('balanced')}
        >
          <Text style={[styles.filterText, statusFilter === 'balanced' && styles.filterTextActive]}>
            Balanced
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, statusFilter === 'overage' && styles.filterPillActive]}
          onPress={() => setStatusFilter('overage')}
        >
          <Text style={[styles.filterText, statusFilter === 'overage' && styles.filterTextActive]}>
            Overage
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, statusFilter === 'shortage' && styles.filterPillActive]}
          onPress={() => setStatusFilter('shortage')}
        >
          <Text style={[styles.filterText, statusFilter === 'shortage' && styles.filterTextActive]}>
            Shortage
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={reconciliations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No reconciliations found</Text>
          </View>
        }
      />

      {/* Create Button - Cashier/Admin Only */}
      {(user?.role === 'cashier' || isAdmin) && (
        <TouchableOpacity style={styles.fab} onPress={fetchCreateData}>
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Today's Reconciliation</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expected Cash:</Text>
              <Text style={styles.infoValue}>₱{expectedCash.toLocaleString()}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Transaction Count:</Text>
              <Text style={styles.infoValue}>{transactionCount}</Text>
            </View>

            <Text style={styles.inputLabel}>Actual Cash Count *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter actual cash amount"
              value={actualCash}
              onChangeText={setActualCash}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any notes or observations..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#ac3434',
    borderColor: '#ac3434',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flex: 1,
  },
  date: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cashier: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  amountsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  amountCol: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 4,
  },
  transactionCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  notes: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ac3434',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 100,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: '#ac3434',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
