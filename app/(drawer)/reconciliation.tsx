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
import { Search, TrendingUp, TrendingDown, CheckCircle2, Plus, X, ChevronDown, Clipboard, DollarSign, Wallet, User, FileBarChart } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import api from '@/app/services/api';

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
  const { user } = useAuth();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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

        const response = await api.get(`/reconciliations?${params}`);

        if (append) {
          setReconciliations((prev) => [...prev, ...response.data.data]);
        } else {
          setReconciliations(response.data.data);
        }

        if (isAdmin && response.data.stats) {
          setStats(response.data.stats);
        }

        setPage(response.data.current_page);
        setLastPage(response.data.last_page);
      } catch (error) {
        console.error('Error fetching reconciliations:', error);
        Alert.alert('Error', 'Failed to load reconciliations');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, statusFilter, isAdmin]
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
      const response = await api.get('/reconciliations/create');
      setExpectedCash(response.data.expected_cash);
      setTransactionCount(response.data.transaction_count);
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
      const response = await api.post('/reconciliations', {
        actual_cash: parseFloat(actualCash),
        notes: notes || null,
      });

      Alert.alert('Success', response.data.message);
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
      onPress={() => router.push(`/reconciliation/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <Text style={styles.date}>
            {new Date(item.reconciliation_date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </Text>
          {item.cashier && (
            <View style={styles.cashierRow}>
              <User color="#6B7280" size={14} />
              <Text style={styles.cashier}>{item.cashier.name}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          {getStatusIcon(item.status)}
          <Text style={styles.statusText}>
            {item.status === 'balanced' ? 'Balanced' : 
             item.status === 'overage' ? 'Overage' : 'Shortage'}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.amountsRow}>
        <View style={styles.amountCol}>
          <View style={styles.amountLabelRow}>
            <DollarSign color="#10B981" size={14} strokeWidth={2.5} />
            <Text style={styles.amountLabel}>Expected</Text>
          </View>
          <Text style={styles.amountValue}>₱{item.expected_cash.toLocaleString()}</Text>
        </View>
        <View style={styles.amountCol}>
          <View style={styles.amountLabelRow}>
            <Wallet color="#3B82F6" size={14} strokeWidth={2.5} />
            <Text style={styles.amountLabel}>Actual</Text>
          </View>
          <Text style={styles.amountValue}>₱{item.actual_cash.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.varianceRow}>
        <View style={[styles.varianceCard, { backgroundColor: `${getStatusColor(item.status)}10` }]}>
          <View style={styles.varianceLabelRow}>
            {item.status === 'overage' ? (
              <View style={styles.overageIconBg}>
                <TrendingUp color="#fff" size={12} strokeWidth={3} />
              </View>
            ) : item.status === 'shortage' ? (
              <TrendingDown color="#EF4444" size={14} strokeWidth={2.5} />
            ) : (
              <CheckCircle2 color="#10B981" size={14} strokeWidth={2.5} />
            )}
            <Text style={styles.varianceLabel}>Variance</Text>
          </View>
          <Text style={[styles.varianceValue, { color: getStatusColor(item.status) }]}>
            {item.variance >= 0 ? '+' : ''}₱{Math.abs(item.variance).toLocaleString()}
          </Text>
        </View>
        <View style={styles.transactionBadge}>
          <FileBarChart color="#6B7280" size={14} strokeWidth={2} />
          <Text style={styles.transactionCount}>{item.transaction_count} transactions</Text>
        </View>
      </View>

      {item.notes && (
        <View style={styles.notesContainer}>
          <FileBarChart color="#6B7280" size={14} strokeWidth={2} />
          <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
        </View>
      )}
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
            <Clipboard color="#6B7280" size={18} strokeWidth={2.5} />
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {stats.total_reconciliations}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <CheckCircle2 color="#10B981" size={18} strokeWidth={2.5} />
            <Text style={[styles.statValue, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit>
              {stats.balanced_count}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>Balanced</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp color="#3B82F6" size={18} strokeWidth={2.5} />
            <Text style={[styles.statValue, { color: '#3B82F6' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>
              ₱{stats.total_overage.toLocaleString()}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>Overage</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingDown color="#EF4444" size={18} strokeWidth={2.5} />
            <Text style={[styles.statValue, { color: '#EF4444' }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>
              ₱{Math.abs(stats.total_shortage).toLocaleString()}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>Shortage</Text>
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

      {/* Filter Dropdown */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={styles.dropdown}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          activeOpacity={0.7}
        >
          <Text style={styles.dropdownText}>
            {statusFilter === '' ? 'All Reconciliations' :
             statusFilter === 'balanced' ? 'Balanced' :
             statusFilter === 'overage' ? 'Overage' : 'Shortage'}
          </Text>
          <ChevronDown color="#6B7280" size={20} />
        </TouchableOpacity>
        
        {showFilterDropdown && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setStatusFilter('');
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === '' && styles.dropdownItemTextActive]}>
                All Reconciliations
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setStatusFilter('balanced');
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === 'balanced' && styles.dropdownItemTextActive]}>
                Balanced
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setStatusFilter('overage');
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === 'overage' && styles.dropdownItemTextActive]}>
                Overage
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setStatusFilter('shortage');
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === 'shortage' && styles.dropdownItemTextActive]}>
                Shortage
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
    maxWidth: '25%',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  amountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    position: 'relative',
    zIndex: 1000,
  },
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
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#374151',
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: '#ac3434',
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
    minHeight: 200,
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
    marginLeft: 4,
  },
  cashierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  amountsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  amountCol: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  varianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  varianceCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
  },
  varianceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
    marginLeft: 4,
  },
  varianceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  overageIconBg: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  varianceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  transactionBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  notesIcon: {
    fontSize: 14,
  },
  notes: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
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
