import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { CheckCircle2, TrendingUp, TrendingDown, FileText } from 'lucide-react-native';
import api from '@/app/services/api';

interface Transaction {
  id: number;
  transaction_number: string;
  net_total: number;
  payment_method: string;
  payment_status: string;
  patient: {
    id: number;
    name: string;
  } | null;
  cashier: {
    id: number;
    name: string;
  } | null;
  created_at: string;
}

interface ReconciliationDetail {
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

export default function ReconciliationDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [reconciliation, setReconciliation] = useState<ReconciliationDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/reconciliations/${id}`);
      setReconciliation(response.data.reconciliation);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Error fetching reconciliation details:', error);
    } finally {
      setLoading(false);
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
        return <CheckCircle2 color="#10B981" size={24} />;
      case 'overage':
        return <TrendingUp color="#3B82F6" size={24} />;
      case 'shortage':
        return <TrendingDown color="#EF4444" size={24} />;
      default:
        return null;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionNumber}>{item.transaction_number}</Text>
        <Text style={styles.transactionAmount}>₱{item.net_total.toLocaleString()}</Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionPatient}>
          {item.patient?.name || 'Unknown Patient'}
        </Text>
        <Text style={styles.transactionTime}>
          {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Reconciliation Details' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ac3434" />
        </View>
      </SafeAreaView>
    );
  }

  if (!reconciliation) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Reconciliation Details' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Reconciliation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: `Reconciliation - ${new Date(reconciliation.reconciliation_date).toLocaleDateString()}`,
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            {getStatusIcon(reconciliation.status)}
            <Text style={[styles.statusTitle, { color: getStatusColor(reconciliation.status) }]}>
              {reconciliation.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.reconciliationDate}>
            {new Date(reconciliation.reconciliation_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {reconciliation.cashier && (
            <Text style={styles.cashierName}>by {reconciliation.cashier.name}</Text>
          )}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Expected Cash</Text>
            <Text style={styles.summaryValue}>₱{reconciliation.expected_cash.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Actual Cash</Text>
            <Text style={styles.summaryValue}>₱{reconciliation.actual_cash.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Variance</Text>
            <Text style={[styles.summaryValue, { color: getStatusColor(reconciliation.status) }]}>
              {reconciliation.variance >= 0 ? '+' : ''}₱{reconciliation.variance.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Transactions</Text>
            <Text style={styles.summaryValue}>{reconciliation.transaction_count}</Text>
          </View>
        </View>

        {/* Notes */}
        {reconciliation.notes && (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <FileText color="#6B7280" size={20} />
              <Text style={styles.notesTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{reconciliation.notes}</Text>
          </View>
        )}

        {/* Transactions List */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>
            Transactions ({transactions.length})
          </Text>
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <View key={transaction.id}>{renderTransaction({ item: transaction })}</View>
            ))
          ) : (
            <Text style={styles.noTransactionsText}>No transactions found</Text>
          )}
        </View>
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  content: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  reconciliationDate: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  cashierName: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  transactionsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ac3434',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionPatient: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noTransactionsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
