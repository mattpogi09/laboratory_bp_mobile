import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Search, Users } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/app/services/api';

type Patient = {
  id: number;
  full_name: string;
  age: number;
  gender: string;
  contact_number: string;
  last_visit?: string | null;
  last_visit_amount?: number | null;
  total_transactions: number;
  total_spent: number;
};

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export default function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPatients = useCallback(
    async (page = 1, replace = false) => {
      try {
        if (page === 1 && !isRefreshing) setIsLoading(true);
        if (page > 1) setLoadingMore(true);

        const response = await api.get('/patients', {
          params: { page, per_page: 15, search: search.trim() || undefined },
        });

        setMeta(response.data.meta);
        setPatients((prev) =>
          replace || page === 1 ? response.data.data : [...prev, ...response.data.data],
        );
      } catch (error) {
        console.error('Failed to load patients', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isRefreshing, search],
  );

  useEffect(() => {
    const debounce = setTimeout(() => loadPatients(1, true), 350);
    return () => clearTimeout(debounce);
  }, [loadPatients, search]);

  useFocusEffect(
    useCallback(() => {
      loadPatients(1, true);
    }, [loadPatients]),
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    loadPatients(1, true);
  };

  const onEndReached = () => {
    if (loadingMore || isLoading) return;
    if (meta && meta.current_page < meta.last_page) {
      loadPatients(meta.current_page + 1);
    }
  };

  const renderItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/patients/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.meta}>
            {item.gender} • {item.age} yrs
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.total_transactions}{' '}
            {item.total_transactions === 1 ? 'visit' : 'visits'}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Contact</Text>
        <Text style={styles.value}>{item.contact_number || 'N/A'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Last Visit</Text>
        <Text style={styles.value}>
          {item.last_visit
            ? new Date(item.last_visit).toLocaleDateString()
            : 'No visits yet'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Lifetime Value</Text>
        <Text style={styles.value}>
          ₱{(item.total_spent ?? 0).toLocaleString('en-PH')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const header = useMemo(
    () => (
      <>
        <View style={styles.actionsRow}>
          <View style={[styles.searchContainer, { flex: 1 }]}>
            <Search color="#9CA3AF" size={18} />
            <TextInput
              placeholder="Search patients"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>
        </View>
      </>
    ),
    [search],
  );

  if (isLoading && !patients.length) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ac3434" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Users color="#D1D5DB" size={42} />
            <Text style={styles.emptyTitle}>No patients found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search keywords.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.2}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color="#ac3434" />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#111827',
    fontSize: 16,
  },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  meta: { color: '#6B7280', marginTop: 2 },
  badge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeText: { color: '#92400E', fontWeight: '600', fontSize: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { color: '#6B7280', fontSize: 13 },
  value: { color: '#111827', fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  emptySubtitle: { color: '#6B7280' },
});

