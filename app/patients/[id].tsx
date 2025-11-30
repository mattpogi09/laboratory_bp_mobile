import { useLocalSearchParams, router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, ChevronDown, Edit, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/app/services/api';
import AddressSelect from '@/components/AddressSelect';
import { useAuth } from '@/contexts/AuthContext';

type PatientDetail = {
  patient: {
    id: number;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    full_name: string;
    age: number;
    gender: string;
    contact_number: string;
    email: string | null;
    birth_date?: string | null;
    address: string | null;
    region_id?: string | null;
    province_id?: string | null;
    city_id?: string | null;
    barangay_code?: string | null;
    street?: string | null;
  };
  stats: {
    total_transactions: number;
    pending_tests: number;
    completed_tests: number;
  };
  recent_transactions: {
    id: number;
    transaction_number: string;
    net_total: number;
    payment_status: string;
    lab_status: string;
    created_at: string;
    tests: { id: number; name: string; status: string; price: number }[];
  }[];
};

export default function PatientDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOtherGender, setShowOtherGender] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    age: '',
    gender: '',
    contact_number: '',
    birth_date: '',
    region_id: '',
    province_id: '',
    city_id: '',
    barangay_code: '',
    street: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadDetails = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) return;
      const silent = options?.silent ?? false;
      try {
        if (!silent) setLoading(true);
        const response = await api.get(`/patients/${id}`);
        setData(response.data);
      } catch (error) {
        console.error('Failed to load patient details', error);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDetails({ silent: true });
  };

  const openEditModal = () => {
    if (!data?.patient) return;
    const patient = data.patient;
    setFormData({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      middle_name: patient.middle_name || '',
      email: patient.email || '',
      age: patient.age?.toString() || '',
      gender: patient.gender || '',
      contact_number: patient.contact_number || '',
      birth_date: patient.birth_date || '',
      region_id: patient.region_id || '',
      province_id: patient.province_id || '',
      city_id: patient.city_id || '',
      barangay_code: patient.barangay_code || '',
      street: patient.street || '',
    });
    setShowOtherGender(!!(patient.gender && !['Male', 'Female'].includes(patient.gender)));
    setErrors({});
    setShowEditModal(true);
  };

  const handleSubmit = async () => {
    setErrors({});
    setSubmitting(true);

    try {
      const payload: any = {
        email: formData.email || null,
        contact_number: formData.contact_number || null,
        region_id: formData.region_id || null,
        province_id: formData.province_id || null,
        city_id: formData.city_id || null,
        barangay_code: formData.barangay_code || null,
        street: formData.street || null,
      };

      if (user?.role === 'admin') {
        payload.first_name = formData.first_name;
        payload.last_name = formData.last_name;
        payload.middle_name = formData.middle_name || null;
        payload.age = parseInt(formData.age);
        payload.gender = formData.gender;
        payload.birth_date = formData.birth_date || null;
      }

      await api.put(`/patients/${id}`, payload);
      setShowEditModal(false);
      loadDetails();
      Alert.alert('Success', 'Patient updated successfully.');
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update patient.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenderChange = (value: string) => {
    if (value === 'Other') {
      setShowOtherGender(true);
      setFormData((prev) => ({ ...prev, gender: '' }));
    } else {
      setShowOtherGender(false);
      setFormData((prev) => ({ ...prev, gender: value }));
    }
  };

  const isAdmin = user?.role === 'admin';

  // Memoize address value and onChange callback to prevent infinite loops
  const addressValue = useMemo(
    () => ({
      region_id: formData.region_id,
      province_id: formData.province_id,
      city_id: formData.city_id,
      barangay_code: formData.barangay_code,
      street: formData.street,
    }),
    [formData.region_id, formData.province_id, formData.city_id, formData.barangay_code, formData.street]
  );

  const handleAddressChange = useCallback((address: any) => {
    setFormData((prev) => ({
      ...prev,
      region_id: address.region_id || '',
      province_id: address.province_id || '',
      city_id: address.city_id || '',
      barangay_code: address.barangay_code || '',
      street: address.street || '',
    }));
  }, []);

  if (loading && !data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#ac3434" size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loading}>
        <Text>Unable to load patient.</Text>
      </View>
    );
  }

  const patient = data.patient;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{patient.full_name}</Text>
              <Text style={styles.subtitle}>
                {patient.gender} • {patient.age} yrs
              </Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
              <Edit color="#ac3434" size={18} />
            </TouchableOpacity>
          </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Contact</Text>
          <Text style={styles.value}>{patient.contact_number || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{patient.email || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Address</Text>
          <Text style={[styles.value, { flex: 1, textAlign: 'right' }]}>
            {patient.address || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Transactions" value={data.stats.total_transactions} />
        <StatCard label="Pending Tests" value={data.stats.pending_tests} />
        <StatCard label="Completed Tests" value={data.stats.completed_tests} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {data.recent_transactions.map((txn) => (
          <View key={txn.id} style={styles.transaction}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionNumber}>{txn.transaction_number}</Text>
              <Text style={styles.transactionAmount}>
                ₱{txn.net_total.toLocaleString('en-PH')}
              </Text>
            </View>
            <Text style={styles.transactionMeta}>
              {new Date(txn.created_at).toLocaleString()} • {txn.payment_status}
            </Text>
            <View style={styles.testsList}>
              {txn.tests.map((test) => (
                <View key={test.id} style={styles.testRow}>
                  <Text style={styles.testName}>{test.name}</Text>
                  <View style={styles.testRight}>
                    <Text style={styles.testPrice}>₱{test.price}</Text>
                    <View style={styles.testStatus}>
                      <Text style={styles.testStatusText}>{test.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
        {!data.recent_transactions.length && (
          <Text style={styles.emptyState}>No transactions recorded yet.</Text>
        )}
      </View>
    </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Patient</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }}>
            {isAdmin && (
              <>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      First Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.first_name && styles.inputError]}
                      value={formData.first_name}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, first_name: text }))}
                      placeholder="Juan"
                    />
                    {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Last Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.last_name && styles.inputError]}
                      value={formData.last_name}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, last_name: text }))}
                      placeholder="Dela Cruz"
                    />
                    {errors.last_name && <Text style={styles.errorText}>{errors.last_name}</Text>}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Middle Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.middle_name}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, middle_name: text }))}
                    placeholder="Santos"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Age <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.age && styles.inputError]}
                      value={formData.age}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, age: text }))}
                      placeholder="45"
                      keyboardType="numeric"
                    />
                    {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Gender <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.pickerContainer}>
                      <TouchableOpacity
                        style={[styles.pickerButton, errors.gender && styles.inputError]}
                        onPress={() => {
                          Alert.alert(
                            'Select Gender',
                            '',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Male', onPress: () => handleGenderChange('Male') },
                              { text: 'Female', onPress: () => handleGenderChange('Female') },
                              { text: 'Other', onPress: () => handleGenderChange('Other') },
                            ],
                            { cancelable: true }
                          );
                        }}
                      >
                        <Text style={[styles.pickerText, !formData.gender && styles.placeholderText]}>
                          {showOtherGender ? 'Other (Specify)' : formData.gender || 'Select Gender'}
                        </Text>
                        <ChevronDown color="#6B7280" size={20} />
                      </TouchableOpacity>
                    </View>
                    {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                  </View>
                </View>

                {showOtherGender && isAdmin && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Please Specify Gender <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[styles.input, errors.gender && styles.inputError]}
                      value={formData.gender}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, gender: text }))}
                      placeholder="Enter gender..."
                    />
                    {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Birthdate</Text>
                  <View style={styles.dateInputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={formData.birth_date}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, birth_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Calendar color="#6B7280" size={20} style={styles.dateIcon} />
                  </View>
                  <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 2000-01-15)</Text>
                </View>
              </>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
                placeholder="juan@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone Number</Text>
              <TextInput
                style={[styles.input, errors.contact_number && styles.inputError]}
                value={formData.contact_number}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, contact_number: text }))}
                placeholder="09943333333"
                keyboardType="phone-pad"
                maxLength={11}
              />
              <Text style={styles.helperText}>
                Format: 09XXXXXXXXX (11 digits starting with 09)
              </Text>
              {errors.contact_number && <Text style={styles.errorText}>{errors.contact_number}</Text>}
            </View>

            <View style={styles.formGroup}>
              <AddressSelect
                value={addressValue}
                onChange={handleAddressChange}
                errors={{
                  region_id: errors.region_id,
                  province_id: errors.province_id,
                  city_id: errors.city_id,
                  barangay_code: errors.barangay_code,
                  street: errors.street,
                }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6B7280', marginTop: 4 },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  label: { color: '#6B7280', fontSize: 13 },
  value: { color: '#111827', fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 0,
  },
  statLabel: { color: '#6B7280', fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#111827' },
  transaction: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 12 },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  transactionNumber: { fontWeight: '600', color: '#111827' },
  transactionAmount: { fontWeight: '700', color: '#0EA5E9' },
  transactionMeta: { color: '#6B7280', fontSize: 12, marginBottom: 8 },
  testsList: { gap: 8 },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  testName: {
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  testRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  testPrice: { color: '#374151', fontWeight: '600' },
  testStatus: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  testStatusText: { textTransform: 'capitalize', fontSize: 12, color: '#111827' },
  emptyState: { textAlign: 'center', color: '#9CA3AF' },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroup: {
    flex: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    minHeight: 44,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    marginBottom: 0,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  dateInputWrapper: {
    position: 'relative',
  },
  dateIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    pointerEvents: 'none',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#ac3434',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

