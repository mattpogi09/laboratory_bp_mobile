import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { TOKEN_STORAGE_KEY } from "@/app/services/api";
import { useAuth } from "@/contexts/AuthContext";

type AddressValue = {
  region_id?: string;
  province_id?: string;
  city_id?: string;
  barangay_code?: string;
  street?: string;
};

type AddressSelectProps = {
  value: AddressValue;
  onChange: (address: AddressValue) => void;
  errors?: {
    region_id?: string;
    province_id?: string;
    city_id?: string;
    barangay_code?: string;
    street?: string;
  };
  disabled?: boolean;
  required?: boolean;
};

type Region = { id: number; name: string; code: string; region_id: string };
type Province = {
  id: number;
  name: string;
  code: string;
  region_id: string;
  province_id: string;
};
type City = {
  id: number;
  name: string;
  code: string;
  province_id: string;
  city_id: string;
};
type Barangay = { id: number; name: string; code: string; city_id: string };

export default function AddressSelect({
  value = {},
  onChange,
  errors = {},
  disabled = false,
  required = false,
}: AddressSelectProps) {
  const { isAuthenticated } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  const [loading, setLoading] = useState({
    regions: false,
    provinces: false,
    cities: false,
    barangays: false,
  });

  const [selectedValues, setSelectedValues] = useState<AddressValue>({
    region_id: value.region_id || "",
    province_id: value.province_id || "",
    city_id: value.city_id || "",
    barangay_code: value.barangay_code || "",
    street: value.street || "",
  });

  const [showPicker, setShowPicker] = useState<{
    type: "region" | "province" | "city" | "barangay" | null;
  }>({ type: null });

  const loadedRef = useRef({ region: "", province: "", city: "" });
  const regionsLoadedRef = useRef(false);

  // Sync selectedValues when value prop changes
  useEffect(() => {
    setSelectedValues((prev) => {
      const newValues = {
        region_id: value.region_id || "",
        province_id: value.province_id || "",
        city_id: value.city_id || "",
        barangay_code: value.barangay_code || "",
        street: value.street || "",
      };

      const hasChanged =
        newValues.region_id !== prev.region_id ||
        newValues.province_id !== prev.province_id ||
        newValues.city_id !== prev.city_id ||
        newValues.barangay_code !== prev.barangay_code ||
        newValues.street !== prev.street;

      if (
        hasChanged &&
        (newValues.region_id !== prev.region_id ||
          newValues.province_id !== prev.province_id ||
          newValues.city_id !== prev.city_id)
      ) {
        if (newValues.region_id !== prev.region_id) {
          loadedRef.current.region = "";
        }
        if (newValues.province_id !== prev.province_id) {
          loadedRef.current.province = "";
        }
        if (newValues.city_id !== prev.city_id) {
          loadedRef.current.city = "";
        }
      }

      return hasChanged ? newValues : prev;
    });
  }, [
    value.region_id,
    value.province_id,
    value.city_id,
    value.barangay_code,
    value.street,
  ]);

  // Helper function to make API calls with retry on 401
  const apiCallWithRetry = useCallback(
    async (url: string, retries = 1): Promise<any> => {
      try {
        const response = await api.get(url);
        return response;
      } catch (error: any) {
        if (error.response?.status === 401 && retries > 0) {
          // Check if we still have a token - if so, it might just be a timing issue
          const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
          if (token) {
            console.log(
              `[AddressSelect] 401 received but token exists, retrying ${url}...`,
            );
            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 500));
            return apiCallWithRetry(url, retries - 1);
          }
        }
        throw error;
      }
    },
    [],
  );

  // Load regions on mount - only if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    if (regionsLoadedRef.current || regions.length > 0) return;

    const loadRegions = async () => {
      regionsLoadedRef.current = true;
      setLoading((prev) => ({ ...prev, regions: true }));

      try {
        const response = await apiCallWithRetry("/address/regions");
        if (
          response.data &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          setRegions(response.data);
        } else {
          setRegions([]);
          regionsLoadedRef.current = false;
        }
      } catch (error: any) {
        console.error("Failed to load regions:", error);
        if (error.response?.status === 401) {
          console.error("=== AUTHENTICATION ERROR DETAILS ===");
          console.error("Status:", error.response?.status);
          console.error(
            "Response Data:",
            JSON.stringify(error.response?.data, null, 2),
          );
          console.error("Request URL:", error.config?.url);
          console.error("Request Method:", error.config?.method);
          console.error(
            "Request Headers:",
            JSON.stringify(error.config?.headers, null, 2),
          );
          console.error(
            "Has Authorization Header:",
            !!error.config?.headers?.Authorization,
          );
          console.error(
            "Authorization Value:",
            error.config?.headers?.Authorization,
          );
          console.error("=====================================");
        }
        setRegions([]);
        regionsLoadedRef.current = false;
      } finally {
        setLoading((prev) => ({ ...prev, regions: false }));
      }
    };

    loadRegions();
  }, [isAuthenticated, apiCallWithRetry]);

  // Cascade loader
  useEffect(() => {
    if (selectedValues.region_id) {
      const needsProvinces =
        loadedRef.current.region !== selectedValues.region_id;
      const needsCities =
        loadedRef.current.province !== selectedValues.province_id;
      const needsBarangays = loadedRef.current.city !== selectedValues.city_id;

      if (needsProvinces || needsCities || needsBarangays) {
        if (needsProvinces) {
          loadProvinces(selectedValues.region_id).then(() => {
            loadedRef.current.region = selectedValues.region_id || "";
            if (selectedValues.province_id) {
              loadCities(selectedValues.province_id).then(() => {
                loadedRef.current.province = selectedValues.province_id || "";
                if (selectedValues.city_id) {
                  loadBarangays(selectedValues.city_id).then(() => {
                    loadedRef.current.city = selectedValues.city_id || "";
                  });
                }
              });
            }
          });
        } else if (needsCities && selectedValues.province_id) {
          loadCities(selectedValues.province_id).then(() => {
            loadedRef.current.province = selectedValues.province_id || "";
            if (selectedValues.city_id) {
              loadBarangays(selectedValues.city_id).then(() => {
                loadedRef.current.city = selectedValues.city_id || "";
              });
            }
          });
        } else if (needsBarangays && selectedValues.city_id) {
          loadBarangays(selectedValues.city_id).then(() => {
            loadedRef.current.city = selectedValues.city_id || "";
          });
        }
      } else if (
        selectedValues.region_id &&
        selectedValues.province_id &&
        selectedValues.city_id &&
        barangays.length === 0
      ) {
        loadBarangays(selectedValues.city_id).then(() => {
          loadedRef.current.city = selectedValues.city_id || "";
        });
      }
    }
  }, [
    selectedValues.region_id,
    selectedValues.province_id,
    selectedValues.city_id,
  ]);

  // Notify parent of changes - use ref to prevent infinite loops
  const onChangeRef = useRef(onChange);
  const prevValuesRef = useRef<AddressValue>(selectedValues);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    // Only call onChange if values actually changed
    const hasChanged =
      prevValuesRef.current.region_id !== selectedValues.region_id ||
      prevValuesRef.current.province_id !== selectedValues.province_id ||
      prevValuesRef.current.city_id !== selectedValues.city_id ||
      prevValuesRef.current.barangay_code !== selectedValues.barangay_code ||
      prevValuesRef.current.street !== selectedValues.street;

    if (hasChanged && onChangeRef.current) {
      prevValuesRef.current = { ...selectedValues };
      onChangeRef.current(selectedValues);
    }
  }, [
    selectedValues.region_id,
    selectedValues.province_id,
    selectedValues.city_id,
    selectedValues.barangay_code,
    selectedValues.street,
  ]);

  const loadProvinces = useCallback(
    async (regionId: string) => {
      setLoading((prev) => ({ ...prev, provinces: true }));
      try {
        const response = await apiCallWithRetry(
          `/address/provinces/${regionId}`,
        );
        setProvinces(response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to load provinces:", error);
        return [];
      } finally {
        setLoading((prev) => ({ ...prev, provinces: false }));
      }
    },
    [apiCallWithRetry],
  );

  const loadCities = useCallback(
    async (provinceId: string) => {
      setLoading((prev) => ({ ...prev, cities: true }));
      try {
        const response = await apiCallWithRetry(
          `/address/cities/${provinceId}`,
        );
        setCities(response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to load cities:", error);
        return [];
      } finally {
        setLoading((prev) => ({ ...prev, cities: false }));
      }
    },
    [apiCallWithRetry],
  );

  const loadBarangays = useCallback(
    async (cityId: string) => {
      setLoading((prev) => ({ ...prev, barangays: true }));
      try {
        const response = await apiCallWithRetry(`/address/barangays/${cityId}`);
        setBarangays(response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to load barangays:", error);
        return [];
      } finally {
        setLoading((prev) => ({ ...prev, barangays: false }));
      }
    },
    [apiCallWithRetry],
  );

  const handleChange = (field: keyof AddressValue, fieldValue: string) => {
    setSelectedValues((prev) => {
      const updated = { ...prev, [field]: fieldValue };

      // Reset dependent fields when parent changes
      if (field === "region_id") {
        updated.province_id = "";
        updated.city_id = "";
        updated.barangay_code = "";
        setProvinces([]);
        setCities([]);
        setBarangays([]);
      } else if (field === "province_id") {
        updated.city_id = "";
        updated.barangay_code = "";
        setCities([]);
        setBarangays([]);
      } else if (field === "city_id") {
        updated.barangay_code = "";
        setBarangays([]);
      }

      return updated;
    });
  };

  const getSelectedLabel = (
    type: "region" | "province" | "city" | "barangay",
  ) => {
    switch (type) {
      case "region":
        return (
          regions.find((r) => r.region_id === selectedValues.region_id)?.name ||
          "Select Region"
        );
      case "province":
        return (
          provinces.find((p) => p.province_id === selectedValues.province_id)
            ?.name || "Select Province"
        );
      case "city":
        return (
          cities.find((c) => c.city_id === selectedValues.city_id)?.name ||
          "Select City/Municipality"
        );
      case "barangay":
        return (
          barangays.find((b) => b.code === selectedValues.barangay_code)
            ?.name || "Select Barangay"
        );
    }
  };

  const renderPicker = () => {
    if (!showPicker.type) return null;

    let data: any[] = [];
    let isLoading = false;

    switch (showPicker.type) {
      case "region":
        data = regions;
        isLoading = loading.regions;
        break;
      case "province":
        data = provinces;
        isLoading = loading.provinces;
        break;
      case "city":
        data = cities;
        isLoading = loading.cities;
        break;
      case "barangay":
        data = barangays;
        isLoading = loading.barangays;
        break;
    }

    return (
      <Modal
        visible={true}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker({ type: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select{" "}
                {showPicker.type.charAt(0).toUpperCase() +
                  showPicker.type.slice(1)}
              </Text>
              <TouchableOpacity onPress={() => setShowPicker({ type: null })}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ac3434" />
              </View>
            ) : (
              <FlatList
                data={data}
                keyExtractor={(item) => {
                  if (showPicker.type === "region")
                    return (item as Region).region_id;
                  if (showPicker.type === "province")
                    return (item as Province).province_id;
                  if (showPicker.type === "city") return (item as City).city_id;
                  return (item as Barangay).code;
                }}
                renderItem={({ item }) => {
                  let id = "";
                  let name = "";
                  if (showPicker.type === "region") {
                    id = (item as Region).region_id;
                    name = (item as Region).name;
                  } else if (showPicker.type === "province") {
                    id = (item as Province).province_id;
                    name = (item as Province).name;
                  } else if (showPicker.type === "city") {
                    id = (item as City).city_id;
                    name = (item as City).name;
                  } else {
                    id = (item as Barangay).code;
                    name = (item as Barangay).name;
                  }

                  const isSelected =
                    (showPicker.type === "region" &&
                      selectedValues.region_id === id) ||
                    (showPicker.type === "province" &&
                      selectedValues.province_id === id) ||
                    (showPicker.type === "city" &&
                      selectedValues.city_id === id) ||
                    (showPicker.type === "barangay" &&
                      selectedValues.barangay_code === id);

                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerItem,
                        isSelected && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        if (showPicker.type === "region") {
                          handleChange("region_id", id);
                        } else if (showPicker.type === "province") {
                          handleChange("province_id", id);
                        } else if (showPicker.type === "city") {
                          handleChange("city_id", id);
                        } else {
                          handleChange("barangay_code", id);
                        }
                        setShowPicker({ type: null });
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && styles.pickerItemTextSelected,
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Region */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Region {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            errors.region_id && styles.pickerButtonError,
            disabled && styles.pickerButtonDisabled,
          ]}
          onPress={() => !disabled && setShowPicker({ type: "region" })}
          disabled={disabled || loading.regions}
        >
          <Text
            style={[
              styles.pickerButtonText,
              !selectedValues.region_id && styles.pickerButtonPlaceholder,
            ]}
          >
            {getSelectedLabel("region")}
          </Text>
          <ChevronDown color="#6B7280" size={20} />
        </TouchableOpacity>
        {errors.region_id && (
          <Text style={styles.errorText}>{errors.region_id}</Text>
        )}
      </View>

      {/* Province */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Province {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            errors.province_id && styles.pickerButtonError,
            (!selectedValues.region_id || disabled) &&
              styles.pickerButtonDisabled,
          ]}
          onPress={() =>
            !disabled &&
            selectedValues.region_id &&
            setShowPicker({ type: "province" })
          }
          disabled={!selectedValues.region_id || disabled || loading.provinces}
        >
          <Text
            style={[
              styles.pickerButtonText,
              !selectedValues.province_id && styles.pickerButtonPlaceholder,
            ]}
          >
            {getSelectedLabel("province")}
          </Text>
          <ChevronDown color="#6B7280" size={20} />
        </TouchableOpacity>
        {errors.province_id && (
          <Text style={styles.errorText}>{errors.province_id}</Text>
        )}
      </View>

      {/* City/Municipality */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          City/Municipality {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            errors.city_id && styles.pickerButtonError,
            (!selectedValues.province_id || disabled) &&
              styles.pickerButtonDisabled,
          ]}
          onPress={() =>
            !disabled &&
            selectedValues.province_id &&
            setShowPicker({ type: "city" })
          }
          disabled={!selectedValues.province_id || disabled || loading.cities}
        >
          <Text
            style={[
              styles.pickerButtonText,
              !selectedValues.city_id && styles.pickerButtonPlaceholder,
            ]}
          >
            {getSelectedLabel("city")}
          </Text>
          <ChevronDown color="#6B7280" size={20} />
        </TouchableOpacity>
        {errors.city_id && (
          <Text style={styles.errorText}>{errors.city_id}</Text>
        )}
      </View>

      {/* Barangay */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Barangay {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            errors.barangay_code && styles.pickerButtonError,
            (!selectedValues.city_id || disabled) &&
              styles.pickerButtonDisabled,
          ]}
          onPress={() =>
            !disabled &&
            selectedValues.city_id &&
            setShowPicker({ type: "barangay" })
          }
          disabled={!selectedValues.city_id || disabled || loading.barangays}
        >
          <Text
            style={[
              styles.pickerButtonText,
              !selectedValues.barangay_code && styles.pickerButtonPlaceholder,
            ]}
          >
            {getSelectedLabel("barangay")}
          </Text>
          <ChevronDown color="#6B7280" size={20} />
        </TouchableOpacity>
        {errors.barangay_code && (
          <Text style={styles.errorText}>{errors.barangay_code}</Text>
        )}
      </View>

      {/* Street Address */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>
          Street Address {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[
            styles.textInput,
            errors.street && styles.textInputError,
            disabled && styles.textInputDisabled,
          ]}
          value={selectedValues.street}
          onChangeText={(text) => handleChange("street", text)}
          placeholder="e.g., 123 Main Street, Building A"
          editable={!disabled}
        />
        {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
      </View>

      {renderPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  required: {
    color: "#DC2626",
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
    paddingVertical: 12,
    minHeight: 44,
  },
  pickerButtonError: {
    borderColor: "#DC2626",
  },
  pickerButtonDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  pickerButtonPlaceholder: {
    color: "#9CA3AF",
  },
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    minHeight: 44,
  },
  textInputError: {
    borderColor: "#DC2626",
  },
  textInputDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
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
  modalClose: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ac3434",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerItemSelected: {
    backgroundColor: "#FEF2F2",
  },
  pickerItemText: {
    fontSize: 16,
    color: "#111827",
  },
  pickerItemTextSelected: {
    color: "#ac3434",
    fontWeight: "600",
  },
});
