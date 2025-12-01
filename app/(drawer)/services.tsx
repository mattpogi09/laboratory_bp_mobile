import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ChevronDown,
  Edit,
  Grid,
  Plus,
  Power,
  PowerOff,
  Search,
  TestTube,
  X,
} from "lucide-react-native";
import { useCallback, useState } from "react";

import api from "@/app/services/api";

type Service = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
};

type ServicesResponse = {
  data: Service[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type CategoriesResponse = string[];

const SERVICE_CATEGORIES = [
  "Hematology",
  "Clinical Microscopy",
  "Serology/Immunology",
  "Blood Chemistry",
  "Others",
  "Procedure Ultra Sound",
];

type GroupedServices = {
  [category: string]: Service[];
};

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [meta, setMeta] = useState<{
    current_page: number;
    last_page: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get("/services/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to load categories", error);
    }
  }, []);

  const loadServices = useCallback(
    async (page = 1, replace = false) => {
      try {
        if (page === 1 && !refreshing) setLoading(true);
        const params: any = { page, per_page: 200 }; // Increased to get all services for grouping
        if (searchQuery) params.search = searchQuery;
        if (selectedCategory !== "all") params.category = selectedCategory;

        const response = await api.get("/services", { params });
        const data: ServicesResponse = response.data;
        setMeta({ current_page: data.current_page, last_page: data.last_page });
        const servicesData = replace || page === 1 ? data.data : [...(services || []), ...data.data];
        setServices(servicesData);
        
        // Auto-expand all categories on first load
        if (page === 1 && servicesData.length > 0) {
          const uniqueCategories = new Set(servicesData.map(s => s.category));
          setExpandedCategories(uniqueCategories);
        }
      } catch (error: any) {
        console.error("Failed to load services", error);
        Alert.alert(
          "Error",
          error.response?.data?.message || "Failed to load services",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [refreshing, searchQuery, selectedCategory],
  );

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadServices(1, true);
    }, [loadCategories, loadServices]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadServices(1, true);
  };

  const handleCreate = async (formData: any) => {
    try {
      await api.post("/services", formData);
      Alert.alert("Success", "Service created successfully");
      setShowCreateModal(false);
      loadServices(1, true);
      loadCategories();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create service",
      );
    }
  };

  const handleUpdate = async (id: number, formData: any) => {
    try {
      await api.put(`/services/${id}`, formData);
      Alert.alert("Success", "Service updated successfully");
      setShowEditModal(false);
      setSelectedService(null);
      loadServices(1, true);
      loadCategories();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update service",
      );
    }
  };

  const handleToggle = async (service: Service) => {
    try {
      await api.post(`/services/${service.id}/toggle`);
      Alert.alert(
        "Success",
        `Service ${service.is_active ? "deactivated" : "activated"} successfully`,
      );
      loadServices(1, true);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to toggle service status",
      );
    }
  };

  const formatCurrency = (value: number) => {
    return `₱${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const groupedServices: GroupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as GroupedServices);

  if (loading && !services.length) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ac3434" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search color="#6B7280" size={18} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => loadServices(1, true)}
          />
        </View>
        <View style={styles.filterRow}>
          <View style={styles.categoryFilter}>
            <Text style={styles.filterLabel}>Category:</Text>
            <CategoryDropdown
              selectedValue={selectedCategory}
              categories={['all', ...categories]}
              onValueChange={(value) => {
                setSelectedCategory(value);
                loadServices(1, true);
              }}
            />
          </View>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus color="#fff" size={18} />
          <Text style={styles.addButtonText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={Object.keys(groupedServices).sort()}
        keyExtractor={(category) => category}
        renderItem={({ item: category }) => {
          const categoryServices = groupedServices[category];
          const isExpanded = expandedCategories.has(category);
          const activeCount = categoryServices.filter(s => s.is_active).length;
          const totalCount = categoryServices.length;

          return (
            <View style={styles.categoryGroup}>
              <TouchableOpacity
                style={styles.categoryHeader}
                onPress={() => toggleCategory(category)}
              >
                <View style={styles.categoryHeaderLeft}>
                  <Grid color="#2563EB" size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryName}>{category}</Text>
                    <Text style={styles.categoryCount}>
                      {totalCount} {totalCount === 1 ? 'service' : 'services'} • {activeCount} active
                    </Text>
                  </View>
                </View>
                <ChevronDown
                  color="#6B7280"
                  size={20}
                  style={{
                    transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                  }}
                />
              </TouchableOpacity>

              {isExpanded && categoryServices.map((item) => (
                <View key={item.id} style={styles.serviceItem}>
                  <View style={styles.serviceItemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{item.name}</Text>
                      <Text style={styles.servicePrice}>
                        {formatCurrency(item.price)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        item.is_active ? styles.statusActive : styles.statusInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.is_active
                            ? { color: "#065F46" }
                            : { color: "#6B7280" },
                        ]}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text style={styles.serviceDescription}>{item.description}</Text>
                  )}
                  <View style={styles.serviceItemActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setSelectedService(item);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit color="#2563EB" size={16} />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleToggle(item)}
                    >
                      {item.is_active ? (
                        <PowerOff color="#DC2626" size={16} />
                      ) : (
                        <Power color="#059669" size={16} />
                      )}
                      <Text
                        style={[
                          styles.actionButtonText,
                          item.is_active
                            ? { color: "#DC2626" }
                            : { color: "#059669" },
                        ]}
                      >
                        {item.is_active ? "Deactivate" : "Activate"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <TestTube color="#D1D5DB" size={42} />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || selectedCategory !== "all"
                ? "Try a different search term or category"
                : "Add your first service to get started"}
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      <CreateServiceModal
        show={showCreateModal}
        categories={categories}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      {selectedService && (
        <EditServiceModal
          show={showEditModal}
          service={selectedService}
          categories={categories}
          onClose={() => {
            setShowEditModal(false);
            setSelectedService(null);
          }}
          onSubmit={handleUpdate}
        />
      )}
    </View>
  );
}

function CategoryDropdown({
  selectedValue,
  categories,
  onValueChange,
}: {
  selectedValue: string;
  categories: string[];
  onValueChange: (value: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const getDisplayText = () => {
    if (selectedValue === 'all') return 'All Categories';
    return selectedValue;
  };

  return (
    <>
      <TouchableOpacity
        style={styles.categoryDropdownButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.categoryDropdownText}>
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
              <Text style={styles.pickerTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.pickerOption,
                    selectedValue === category && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    onValueChange(category);
                    setShowPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedValue === category &&
                        styles.pickerOptionTextSelected,
                    ]}
                  >
                    {category === 'all' ? 'All Categories' : category}
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

function CreateServiceModal({
  show,
  categories,
  onClose,
  onSubmit,
}: {
  show: boolean;
  categories: string[];
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.price) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        price: parseFloat(formData.price),
      });
      setFormData({ name: "", category: "", price: "", description: "" });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={show} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Service</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service Name</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="Enter service name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <CategoryPicker
                selectedValue={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                categories={SERVICE_CATEGORIES}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Price</Text>
              <TextInput
                style={styles.formInput}
                value={formData.price}
                onChangeText={(text) =>
                  setFormData({ ...formData, price: text })
                }
                placeholder="Enter price"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="Enter description"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={onClose}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonTextPrimary}>Add Service</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EditServiceModal({
  show,
  service,
  categories,
  onClose,
  onSubmit,
}: {
  show: boolean;
  service: Service;
  categories: string[];
  onClose: () => void;
  onSubmit: (id: number, data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: service.name,
    category: service.category,
    price: service.price.toString(),
    description: service.description || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.price) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await onSubmit(service.id, {
        ...formData,
        price: parseFloat(formData.price),
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={show} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Service</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Service Name</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="Enter service name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <CategoryPicker
                selectedValue={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                categories={SERVICE_CATEGORIES}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Price</Text>
              <TextInput
                style={styles.formInput}
                value={formData.price}
                onChangeText={(text) =>
                  setFormData({ ...formData, price: text })
                }
                placeholder="Enter price"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="Enter description"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={onClose}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonTextPrimary}>
                  Update Service
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CategoryPicker({
  selectedValue,
  onValueChange,
  categories,
}: {
  selectedValue: string;
  onValueChange: (value: string) => void;
  categories: string[];
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setShowPicker(true)}
      >
        <Text
          style={[
            styles.pickerButtonText,
            !selectedValue && styles.pickerButtonPlaceholder,
          ]}
        >
          {selectedValue || "Select category"}
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
              <Text style={styles.pickerTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerList}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.pickerOption,
                    selectedValue === category && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    onValueChange(category);
                    setShowPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedValue === category &&
                        styles.pickerOptionTextSelected,
                    ]}
                  >
                    {category}
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
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  filterRow: {
    marginBottom: 12,
  },
  categoryFilter: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
  },
  categoryChipActive: {
    backgroundColor: "#ac3434",
    borderColor: "#ac3434",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  categoryDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  categoryDropdownText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
    flex: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  categoryGroup: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 13,
    color: "#6B7280",
  },
  serviceItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  serviceItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  serviceItemActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  serviceCategory: { fontSize: 14, color: "#6B7280" },
  serviceDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#059669",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusActive: { backgroundColor: "#D1FAE5" },
  statusInactive: { backgroundColor: "#F3F4F6" },
  statusText: { fontSize: 12, fontWeight: "600" },
  cardActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  emptyWrapper: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  emptySubtitle: { color: "#9CA3AF", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  modalBody: { marginBottom: 24 },
  formGroup: { marginBottom: 20 },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  pickerButtonText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  pickerButtonPlaceholder: {
    color: "#9CA3AF",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "80%",
    maxHeight: "60%",
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerOptionSelected: {
    backgroundColor: "#EFF6FF",
  },
  pickerOptionText: {
    fontSize: 16,
    color: "#111827",
  },
  pickerOptionTextSelected: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
