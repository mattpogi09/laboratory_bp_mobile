import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, History, PackageSearch, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/app/services/api';

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  status: 'good' | 'low_stock' | 'out_of_stock';
  is_active: boolean;
  percentage: number;
};

type Summary = {
  total_items: number;
  good: number;
  low_stock: number;
  out_of_stock: number;
};

type InventoryTransaction = {
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

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Good', value: 'good' },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
];

export default function InventoryScreen() {
  const [activeTab, setActiveTab] = useState<'items' | 'transactions'>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const response = await api.get('/inventory', {
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: search.trim() || undefined,
        },
      });
      setItems(response.data.items);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to load inventory', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, search, statusFilter]);

  const loadTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      const response = await api.get('/inventory/transactions');
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Failed to load transactions', error);
    } finally {
      setTransactionsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => loadInventory(), 300);
    return () => clearTimeout(debounce);
  }, [loadInventory]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'items') {
        loadInventory();
      } else {
        loadTransactions();
      }
    }, [activeTab, loadInventory, loadTransactions]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'items') {
      loadInventory();
    } else {
      loadTransactions();
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  const summaryCards = useMemo(
    () => [
      {
        label: 'Total Items',
        value: summary?.total_items ?? 0,
        color: '#1D4ED8',
      },
      { label: 'Good', value: summary?.good ?? 0, color: '#10B981' },
      { label: 'Low Stock', value: summary?.low_stock ?? 0, color: '#F59E0B' },
      {
        label: 'Out of Stock',
        value: summary?.out_of_stock ?? 0,
        color: '#DC2626',
      },
    ],
    [summary],
  );

  const renderItem = ({ item }: { item: InventoryItem }) => {
    let progressColor = '#10B981';
    if (item.status === 'low_stock') progressColor = '#F59E0B';
    if (item.status === 'out_of_stock') progressColor = '#DC2626';

    const percentage = Math.min(100, Math.max(0, item.percentage));

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: progressColor + '22' }]}>
            <Text style={[styles.statusText, { color: progressColor }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <View style={styles.row}>
          <Text style={styles.label}>On-hand</Text>
          <Text style={styles.value}>
            {item.current_stock} {item.unit}
          </Text>
        </View>
        <View style={styles.progressBg}>
          <View
            style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: progressColor }]}
          />
        </View>
        <Text style={styles.stockMeta}>
          Minimum required: {item.minimum_stock} {item.unit}
        </Text>
      </View>
    );
  };

  if (loading && !items.length && activeTab === 'items') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ac3434" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'items' && styles.tabActive]}
          onPress={() => setActiveTab('items')}
        >
          <PackageSearch
            color={activeTab === 'items' ? '#ac3434' : '#6B7280'}
            size={18}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'items' && styles.tabLabelActive,
            ]}
          >
            Stock Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <History
            color={activeTab === 'transactions' ? '#ac3434' : '#6B7280'}
            size={18}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'transactions' && styles.tabLabelActive,
            ]}
          >
            Transaction Log
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'items' ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              <View style={styles.summaryRow}>
                {summaryCards.map((card) => (
                  <View key={card.label} style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>{card.label}</Text>
                    <Text style={[styles.summaryValue, { color: card.color }]}>
                      {card.value}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.searchContainer}>
                <Search color="#6B7280" size={20} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search inventory..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Status:</Text>
                <StatusDropdown
                  selectedValue={statusFilter}
                  onValueChange={setStatusFilter}
                />
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <PackageSearch color="#D1D5DB" size={42} />
              <Text style={styles.emptyTitle}>No inventory items</Text>
              <Text style={styles.emptySubtitle}>Everything might be filtered out.</Text>
            </View>
          }
          contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Transaction Log</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.transactionCard}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionDate}>{item.date}</Text>
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
              <Text style={styles.transactionItem}>{item.item}</Text>
              <Text style={styles.transactionCode}>
                Code: {item.transaction_code}
              </Text>
              <View style={styles.transactionRow}>
                <Text style={styles.transactionLabel}>Quantity:</Text>
                <Text style={styles.transactionValue}>
                  {item.type === 'IN' ? '+' : '-'}
                  {item.quantity}
                </Text>
              </View>
              <View style={styles.transactionRow}>
                <Text style={styles.transactionLabel}>Stock:</Text>
                <Text style={styles.transactionValue}>
                  {item.previous_stock ?? '—'} → {item.new_stock ?? '—'}
                </Text>
              </View>
              <Text style={styles.transactionReason}>Reason: {item.reason}</Text>
              <Text style={styles.performedBy}>
                Performed by: {item.performed_by}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <History color="#D1D5DB" size={42} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing || transactionsLoading}
              onRefresh={handleRefresh}
            />
          }
        />
      )}
    </View>
  );
}

function StatusDropdown({
  selectedValue,
  onValueChange,
}: {
  selectedValue: string;
  onValueChange: (value: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const getDisplayText = () => {
    const filter = filters.find(f => f.value === selectedValue);
    return filter ? filter.label : 'All';
  };

  return (
    <>
      <TouchableOpacity
        style={styles.statusDropdownButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.statusDropdownText}>
          {getDisplayText()}
        </Text>
        <ChevronDown color="#6B7280" size={20} />
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerList}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.pickerOption,
                    selectedValue === filter.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    onValueChange(filter.value);
                    setShowPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedValue === filter.value &&
                        styles.pickerOptionTextSelected,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#ac3434' },
  tabLabel: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  tabLabelActive: { color: '#ac3434' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
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
  summaryLabel: { color: '#6B7280', fontSize: 12, textAlign: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { 
    flex: 1, 
    paddingVertical: 12,
    color: '#111827', 
    fontSize: 16 
  },
  filterRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12, 
    marginBottom: 16 
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  statusDropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  statusDropdownText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { textTransform: 'capitalize', fontSize: 12, fontWeight: '600' },
  itemCategory: { color: '#6B7280', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: '#6B7280', fontSize: 13 },
  value: { color: '#111827', fontWeight: '600' },
  progressBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },
  stockMeta: { marginTop: 8, color: '#9CA3AF', fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  emptySubtitle: { color: '#6B7280' },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionDate: { color: '#6B7280', fontSize: 12 },
  transactionItem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  transactionCode: { color: '#6B7280', fontSize: 12, marginBottom: 8 },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  transactionLabel: { color: '#6B7280', fontSize: 13 },
  transactionValue: { color: '#111827', fontWeight: '600', fontSize: 13 },
  transactionReason: { color: '#6B7280', fontSize: 12, marginTop: 8 },
  performedBy: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: { fontWeight: '600', fontSize: 12 },
});

