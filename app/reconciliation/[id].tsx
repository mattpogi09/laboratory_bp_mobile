import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2, TrendingUp, TrendingDown, FileText, ArrowLeft, Receipt, DollarSign, Wallet, BarChart3 } from 'lucide-react-native';
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
        return <CheckCircle2 color="#fff" size={32} />;
      case 'overage':
        return <TrendingUp color="#fff" size={32} />;
      case 'shortage':
        return <TrendingDown color="#fff" size={32} />;
      default:
        return null;
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionLeft}>
          <View style={styles.receiptIcon}>
            <Receipt color="#ac3434" size={16} />
          </View>
          <View>
            <Text style={styles.transactionNumber}>{item.transaction_number}</Text>
            <Text style={styles.transactionPatient}>
              {item.patient?.name || 'Unknown Patient'}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={styles.transactionAmount}>₱{item.net_total.toLocaleString()}</Text>
          <Text style={styles.transactionTime}>
            {new Date(item.created_at).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ac3434" />
        </View>
      </SafeAreaView>
    );
  }

  if (!reconciliation) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Reconciliation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Custom Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reconciliation Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Hero Card */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(reconciliation.status) }]}>
          <View style={styles.statusIconContainer}>
            {getStatusIcon(reconciliation.status)}
          </View>
          <Text style={styles.statusTitle}>
            {reconciliation.status === 'balanced' ? 'Perfectly Balanced' : 
             reconciliation.status === 'overage' ? 'Cash Overage' : 'Cash Shortage'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {new Date(reconciliation.reconciliation_date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          {reconciliation.cashier && (
            <Text style={styles.cashierName}>Reconciled by {reconciliation.cashier.name}</Text>
          )}
        </View>

        {/* Summary Grid */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <DollarSign color="#10B981" size={28} strokeWidth={2.5} />
              </View>
              <Text style={styles.summaryLabel}>Expected Cash</Text>
              <Text style={styles.summaryValue}>₱{reconciliation.expected_cash.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Wallet color="#3B82F6" size={28} strokeWidth={2.5} />
              </View>
              <Text style={styles.summaryLabel}>Actual Cash</Text>
              <Text style={styles.summaryValue}>₱{reconciliation.actual_cash.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.varianceCard]}>
              <View style={styles.summaryIconContainer}>
                {reconciliation.variance >= 0 ? (
                  <TrendingUp color={getStatusColor(reconciliation.status)} size={28} strokeWidth={2.5} />
                ) : (
                  <TrendingDown color={getStatusColor(reconciliation.status)} size={28} strokeWidth={2.5} />
                )}
              </View>
              <Text style={styles.summaryLabel}>Variance</Text>
              <Text style={[styles.summaryValue, { color: getStatusColor(reconciliation.status) }]}>
                {reconciliation.variance >= 0 ? '+' : ''}₱{Math.abs(reconciliation.variance).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <BarChart3 color="#8B5CF6" size={28} strokeWidth={2.5} />
              </View>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>{reconciliation.transaction_count}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {reconciliation.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <FileText color="#ac3434" size={20} />
              </View>
              <Text style={styles.notesText}>{reconciliation.notes}</Text>
            </View>
          </View>
        )}

        {/* Transactions List */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionsTitleRow}>
            <Text style={styles.sectionTitle}>Cash Transactions</Text>
            <View style={styles.transactionsBadge}>
              <Text style={styles.transactionsBadgeText}>{transactions.length}</Text>
            </View>
          </View>
          
          {transactions.length > 0 ? (
            <View style={styles.transactionsList}>
              {transactions.map((transaction) => (
                <View key={transaction.id}>{renderTransaction({ item: transaction })}</View>
              ))}
            </View>
          ) : (
            <View style={styles.noTransactionsContainer}>
              <Text style={styles.noTransactionsText}>No transactions found</Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
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
    paddingBottom: 32,
  },
  statusCard: {
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    textAlign: 'center',
  },
  cashierName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  varianceCard: {
    borderWidth: 2,
    borderColor: '#F3F4F6',
    minHeight: 130,
  },
  summaryIconContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  notesSection: {
    marginBottom: 24,
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notesHeader: {
    marginBottom: 12,
  },
  notesText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  transactionsSection: {
    marginBottom: 16,
  },
  transactionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  transactionsBadge: {
    backgroundColor: '#ac3434',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionsBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  transactionsList: {
    gap: 8,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  receiptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  transactionPatient: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ac3434',
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noTransactionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  noTransactionsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
