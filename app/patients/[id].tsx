import { useLocalSearchParams, Stack, router } from "expo-router";
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
  Image,
  Dimensions,
} from "react-native";
import {
  Edit,
  X,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import api, { API_BASE_URL } from "@/app/services/api";
import AddressSelect from "@/components/AddressSelect";
import { useAuth } from "@/contexts/AuthContext";

type PatientDetail = {
  patient: {
    id: number;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    full_name: string;
    age?: number;
    gender?: string;
    contact_number?: string;
    email?: string;
    birth_date?: string;
    address?: string;
    region_id?: string;
    province_id?: string;
    city_id?: string;
    barangay_code?: string;
    street?: string;
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

type TestDetail = {
  id: number;
  test_name: string;
  category: string;
  price: number;
  status: string;
  processed_by: string;
  completed_at?: string;
  released_at?: string;
  result_values?: Record<string, any>;
  normal_range?: string;
  notes?: string;
  images?: string[];
};

export default function PatientDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOtherGender, setShowOtherGender] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Test Detail Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    middle_name: "",
    email: "",
    age: "",
    gender: "",
    contact_number: "",
    region_id: "",
    province_id: "",
    city_id: "",
    barangay_code: "",
    street: "",
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
        console.error("Failed to load patient details", error);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  const loadTestDetails = async (testId: number) => {
    try {
      setLoadingTest(true);
      setShowTestModal(true);
      const response = await api.get(`/tests/${testId}`);
      setSelectedTest(response.data);
    } catch (error) {
      console.error("Failed to load test details", error);
      Alert.alert("Error", "Failed to load test details. Please try again.");
      setShowTestModal(false);
    } finally {
      setLoadingTest(false);
    }
  };

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
      first_name: patient.first_name || "",
      last_name: patient.last_name || "",
      middle_name: patient.middle_name || "",
      email: patient.email || "",
      age: patient.age?.toString() || "",
      gender: patient.gender || "",
      contact_number: patient.contact_number || "",
      region_id: patient.region_id || "",
      province_id: patient.province_id || "",
      city_id: patient.city_id || "",
      barangay_code: patient.barangay_code || "",
      street: patient.street || "",
    });
    setShowOtherGender(
      !!(patient.gender && !["Male", "Female"].includes(patient.gender)),
    );
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

      if (user?.role === "admin") {
        payload.first_name = formData.first_name;
        payload.last_name = formData.last_name;
        payload.middle_name = formData.middle_name || null;
        payload.age = parseInt(formData.age) || 0;
        payload.gender = formData.gender;
      }

      await api.put(`/patients/${id}`, payload);
      setShowEditModal(false);
      loadDetails();
      Alert.alert("Success", "Patient updated successfully.");
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message || "Failed to update patient.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenderChange = (value: string) => {
    if (value === "Other") {
      setShowOtherGender(true);
      setFormData((prev) => ({ ...prev, gender: "" }));
    } else {
      setShowOtherGender(false);
      setFormData((prev) => ({ ...prev, gender: value }));
    }
  };

  const isAdmin = user?.role === "admin";

  // Memoize address value and onChange callback to prevent infinite loops
  const addressValue = useMemo(
    () => ({
      region_id: formData.region_id,
      province_id: formData.province_id,
      city_id: formData.city_id,
      barangay_code: formData.barangay_code,
      street: formData.street,
    }),
    [
      formData.region_id,
      formData.province_id,
      formData.city_id,
      formData.barangay_code,
      formData.street,
    ],
  );

  const handleAddressChange = useCallback((address: any) => {
    setFormData((prev) => ({
      ...prev,
      region_id: address.region_id || "",
      province_id: address.province_id || "",
      city_id: address.city_id || "",
      barangay_code: address.barangay_code || "",
      street: address.street || "",
    }));
  }, []);

  if (loading) {
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
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F3F4F6" }}
      edges={["top", "bottom"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
            <Text style={styles.value}>{patient.contact_number || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{patient.email || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Address</Text>
            <Text style={[styles.value, { flex: 1, textAlign: "right" }]}>
              {patient.address || "N/A"}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Transactions"
            value={data.stats.total_transactions}
          />
          <StatCard label="Pending Tests" value={data.stats.pending_tests} />
          <StatCard
            label="Completed Tests"
            value={data.stats.completed_tests}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {data.recent_transactions.map((txn) => (
            <View key={txn.id} style={styles.transaction}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionNumber}>
                  {txn.transaction_number}
                </Text>
                <Text style={styles.transactionAmount}>
                  ₱{txn.net_total.toLocaleString("en-PH")}
                </Text>
              </View>
              <Text style={styles.transactionMeta}>
                {new Date(txn.created_at).toLocaleString()} •{" "}
                {txn.payment_status}
              </Text>
              <View style={styles.testsList}>
                {txn.tests.map((test) => (
                  <TouchableOpacity
                    key={test.id}
                    style={styles.testRow}
                    onPress={() => loadTestDetails(test.id)}
                  >
                    <Text style={styles.testName}>{test.name}</Text>
                    <View style={styles.testRight}>
                      <Text style={styles.testPrice}>₱{test.price}</Text>
                      <View style={styles.testStatus}>
                        <Text style={styles.testStatusText}>{test.status}</Text>
                      </View>
                      <ChevronRight size={16} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
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

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {isAdmin && (
              <>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      First Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.first_name && styles.inputError,
                      ]}
                      value={formData.first_name}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, first_name: text }))
                      }
                      placeholder="Juan"
                    />
                    {errors.first_name && (
                      <Text style={styles.errorText}>{errors.first_name}</Text>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Last Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.last_name && styles.inputError,
                      ]}
                      value={formData.last_name}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, last_name: text }))
                      }
                      placeholder="Dela Cruz"
                    />
                    {errors.last_name && (
                      <Text style={styles.errorText}>{errors.last_name}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Middle Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.middle_name}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, middle_name: text }))
                    }
                    placeholder="Optional"
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
                      onChangeText={(text) =>
                        setFormData((prev) => ({
                          ...prev,
                          age: text.replace(/[^0-9]/g, ""),
                        }))
                      }
                      placeholder="25"
                      keyboardType="numeric"
                    />
                    {errors.age && (
                      <Text style={styles.errorText}>{errors.age}</Text>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Gender <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.pickerContainer}>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          errors.gender && styles.inputError,
                        ]}
                        onPress={() => {
                          Alert.alert("Select Gender", "", [
                            {
                              text: "Male",
                              onPress: () => handleGenderChange("Male"),
                            },
                            {
                              text: "Female",
                              onPress: () => handleGenderChange("Female"),
                            },
                            { text: "Cancel", style: "cancel" },
                          ]);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            !formData.gender && styles.placeholderText,
                          ]}
                        >
                          {formData.gender || "Select Gender"}
                        </Text>
                        <ChevronDown color="#6B7280" size={20} />
                      </TouchableOpacity>
                    </View>
                    {errors.gender && (
                      <Text style={styles.errorText}>{errors.gender}</Text>
                    )}
                  </View>
                </View>
              </>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, email: text }))
                }
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Contact Number</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.contact_number && styles.inputError,
                ]}
                value={formData.contact_number}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, contact_number: text }))
                }
                placeholder="09123456789"
                keyboardType="phone-pad"
              />
              {errors.contact_number && (
                <Text style={styles.errorText}>{errors.contact_number}</Text>
              )}
            </View>

            <AddressSelect
              value={addressValue}
              onChange={handleAddressChange}
              errors={errors}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
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

      {/* Test Detail Modal */}
      <Modal
        visible={showTestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Test Result Details</Text>
            <TouchableOpacity onPress={() => setShowTestModal(false)}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>

          {loadingTest ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#ac3434" size="large" />
            </View>
          ) : selectedTest ? (
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View>
                    <Text style={styles.resultTestName}>
                      {selectedTest.test_name}
                    </Text>
                    <Text style={styles.resultCategory}>
                      {selectedTest.category}
                    </Text>
                  </View>
                  <View
                    style={[styles.testStatus, { alignSelf: "flex-start" }]}
                  >
                    <Text style={styles.testStatusText}>
                      {selectedTest.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.resultMetaRow}>
                  <View>
                    <Text style={styles.metaLabel}>Processed By</Text>
                    <Text style={styles.metaValue}>
                      {selectedTest.processed_by}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Price</Text>
                    <Text style={styles.metaValue}>₱{selectedTest.price}</Text>
                  </View>
                </View>

                <View style={styles.resultMetaRow}>
                  <View>
                    <Text style={styles.metaLabel}>Completed</Text>
                    <Text style={styles.metaValue}>
                      {selectedTest.completed_at || "-"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Released</Text>
                    <Text style={styles.metaValue}>
                      {selectedTest.released_at || "-"}
                    </Text>
                  </View>
                </View>

                {selectedTest.result_values &&
                  Object.keys(selectedTest.result_values).length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionHeader}>Result Values</Text>
                      {Object.entries(selectedTest.result_values).map(
                        ([key, value]: [string, any]) => (
                          <View key={key} style={styles.resultRow}>
                            <Text style={styles.resultLabel}>{key}</Text>
                            <Text style={styles.resultValue}>
                              {String(value)}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  )}

                {selectedTest.normal_range && (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Normal Range</Text>
                    <Text style={styles.notesText}>
                      {selectedTest.normal_range}
                    </Text>
                  </View>
                )}

                {selectedTest.notes && (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Notes & Remarks</Text>
                    <View style={styles.notesBox}>
                      <Text style={styles.notesText}>{selectedTest.notes}</Text>
                    </View>
                  </View>
                )}

                {selectedTest.images && selectedTest.images.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionHeader}>
                      Uploaded Images ({selectedTest.images.length})
                    </Text>
                    {selectedTest.images.map((img, index) => (
                      <View key={index} style={styles.imageContainer}>
                        <Image
                          source={{ uri: `${baseUrl}${img}` }}
                          style={styles.resultImage}
                          resizeMode="contain"
                        />
                      </View>
                    ))}
                  </View>
                )}

                {selectedTest.status === "pending" && (
                  <View style={styles.pendingState}>
                    <FileText size={48} color="#9CA3AF" />
                    <Text style={styles.pendingText}>Results pending</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.loading}>
              <Text>Failed to load test details.</Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", flex: 1 },
  subtitle: { color: "#6B7280", marginTop: 2 },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  label: { color: "#6B7280", fontSize: 14 },
  value: { color: "#111827", fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minWidth: 100,
  },
  statLabel: { color: "#6B7280", fontSize: 10, textAlign: "center" },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111827",
  },
  transaction: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 12,
  },
  transactionHeader: { flexDirection: "row", justifyContent: "space-between" },
  transactionNumber: { fontWeight: "600", color: "#111827" },
  transactionAmount: { fontWeight: "700", color: "#0EA5E9" },
  transactionMeta: { color: "#6B7280", fontSize: 12, marginBottom: 8 },
  testsList: { gap: 8 },
  testRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  testName: {
    color: "#111827",
    fontWeight: "500",
    flex: 1,
    flexShrink: 1,
  },
  testRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  testPrice: { color: "#374151", fontWeight: "600" },
  testStatus: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  testStatusText: {
    textTransform: "capitalize",
    fontSize: 12,
    color: "#111827",
  },
  emptyState: { textAlign: "center", color: "#9CA3AF" },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formGroup: {
    flex: 1,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    minHeight: 44,
  },
  inputError: {
    borderColor: "#DC2626",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    marginBottom: 0,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#ac3434",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Result Modal Styles
  resultCard: {
    gap: 20,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  resultTestName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  resultCategory: {
    color: "#6B7280",
    fontSize: 14,
  },
  resultMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
  },
  metaLabel: {
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 2,
  },
  metaValue: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 14,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resultLabel: {
    color: "#4B5563",
    fontSize: 15,
  },
  resultValue: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 15,
  },
  notesBox: {
    backgroundColor: "#FEF9C3",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEF08A",
  },
  notesText: {
    color: "#854D0E",
    fontSize: 14,
    lineHeight: 20,
  },
  imageContainer: {
    height: 200,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  pendingState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  pendingText: {
    color: "#9CA3AF",
    fontSize: 16,
  },
});
