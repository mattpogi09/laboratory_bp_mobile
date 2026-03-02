import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    ChevronDown,
    Edit,
    Grid,
    Plus,
    Power,
    PowerOff,
    Search,
    Settings2,
    TestTube,
    X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { router } from "expo-router";

import api from "@/app/services/api";
import type { GroupedServices, Service, ServicesResponse } from "@/types";
import { SERVICE_CATEGORIES } from "@/types";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SkeletonRow, SuccessDialog } from "@/components";

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
    const [selectedService, setSelectedService] = useState<Service | null>(
        null,
    );
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(),
    );

    // Dialog states
    const [confirmDialog, setConfirmDialog] = useState({
        visible: false,
        title: "",
        message: "",
        confirmText: "",
        onConfirm: () => {},
        type: "warning" as "warning" | "info" | "danger",
    });
    const [successDialog, setSuccessDialog] = useState({
        visible: false,
        title: "",
        message: "",
        type: "success" as "success" | "error" | "info" | "warning",
    });
    const [loadError, setLoadError] = useState<string | null>(null);

    const loadCategories = useCallback(async () => {
        try {
            const response = await api.get("/services/categories");
            setCategories(response.data);
        } catch (error: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(
                    error,
                    "Failed to load categories.",
                ),
                type: "error",
            });
        }
    }, []);

    const loadServices = useCallback(
        async (page = 1, replace = false) => {
            try {
                if (page === 1 && !refreshing) setLoading(true);
                const params: any = { page, per_page: 200 }; // Increased to get all services for grouping
                if (searchQuery) params.search = searchQuery;
                if (selectedCategory !== "all")
                    params.category = selectedCategory;

                const response = await api.get("/services", { params });
                const data: ServicesResponse = response.data;
                setMeta({
                    current_page: data.current_page,
                    last_page: data.last_page,
                });
                const servicesData =
                    replace || page === 1
                        ? data.data
                        : [...(services || []), ...data.data];
                setServices(servicesData);

                // Auto-expand all categories on first load
                if (page === 1 && servicesData.length > 0) {
                    const uniqueCategories = new Set(
                        servicesData.map((s) => s.category),
                    );
                    setExpandedCategories(uniqueCategories);
                }
            } catch (error: any) {
                if (page === 1) {
                    setLoadError(
                        getApiErrorMessage(error, "Failed to load services."),
                    );
                } else {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            error,
                            "Failed to load services.",
                        ),
                        type: "error",
                    });
                }
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
        await api.post("/services", formData);
        setSuccessDialog({
            visible: true,
            title: "Success",
            message: "Service created successfully",
            type: "success",
        });
        loadServices(1, true);
        loadCategories();
    };

    const handleUpdate = async (id: number, formData: any) => {
        await api.put(`/services/${id}`, formData);
        setSuccessDialog({
            visible: true,
            title: "Success",
            message: "Service updated successfully",
            type: "success",
        });
        loadServices(1, true);
        loadCategories();
    };

    const handleToggle = async (service: Service) => {
        setConfirmDialog({
            visible: true,
            title: `${service.is_active ? "Deactivate" : "Activate"} Lab Test`,
            message: `This lab test will be ${
                service.is_active
                    ? "marked as inactive and will not appear in the cashier's test selection"
                    : "reactivated and will appear in the cashier's test selection again"
            }.\n\nAre you sure you want to ${
                service.is_active ? "deactivate" : "activate"
            } ${service.name}?`,
            confirmText: service.is_active ? "DEACTIVATE" : "ACTIVATE",
            type: service.is_active ? "warning" : "info",
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, visible: false });
                try {
                    await api.post(`/services/${service.id}/toggle`);
                    setSuccessDialog({
                        visible: true,
                        title: "Success",
                        message: `Service ${
                            service.is_active ? "deactivated" : "activated"
                        } successfully`,
                        type: "success",
                    });
                    loadServices(1, true);
                } catch (error: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message:
                            error.response?.data?.message ||
                            "Failed to toggle service status",
                        type: "error",
                    });
                }
            },
        });
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
            <View style={styles.container}>
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <SkeletonRow count={6} />
                </View>
            </View>
        );
    }

    if (loadError && !services.length) {
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>
                        Unable to load services
                    </Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setLoadError(null);
                            loadServices(1, true);
                        }}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <Search
                        color="#6B7280"
                        size={18}
                        style={styles.searchIcon}
                    />
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
                            categories={["all", ...categories]}
                            onValueChange={(value) => {
                                setSelectedCategory(value);
                                loadServices(1, true);
                            }}
                        />
                    </View>
                </View>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.manageCategoriesButton}
                        onPress={() => router.push("/(drawer)/test-categories")}
                    >
                        <Settings2 color="#374151" size={16} />
                        <Text style={styles.manageCategoriesText}>
                            Manage Categories
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowCreateModal(true)}
                    >
                        <Plus color="#fff" size={18} />
                        <Text style={styles.addButtonText}>Add Service</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={Object.keys(groupedServices).sort()}
                keyExtractor={(category) => category}
                renderItem={({ item: category }) => {
                    const categoryServices = groupedServices[category];
                    const isExpanded = expandedCategories.has(category);
                    const activeCount = categoryServices.filter(
                        (s) => s.is_active,
                    ).length;
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
                                        <Text style={styles.categoryName}>
                                            {category}
                                        </Text>
                                        <Text style={styles.categoryCount}>
                                            {totalCount}{" "}
                                            {totalCount === 1
                                                ? "service"
                                                : "services"}{" "}
                                            • {activeCount} active
                                        </Text>
                                    </View>
                                </View>
                                <ChevronDown
                                    color="#6B7280"
                                    size={20}
                                    style={{
                                        transform: [
                                            {
                                                rotate: isExpanded
                                                    ? "180deg"
                                                    : "0deg",
                                            },
                                        ],
                                    }}
                                />
                            </TouchableOpacity>

                            {isExpanded &&
                                categoryServices.map((item) => (
                                    <View
                                        key={item.id}
                                        style={styles.serviceItem}
                                    >
                                        <View style={styles.serviceItemHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={styles.serviceName}
                                                >
                                                    {item.name}
                                                </Text>
                                                <Text
                                                    style={styles.servicePrice}
                                                >
                                                    {formatCurrency(item.price)}
                                                </Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    item.is_active
                                                        ? styles.statusActive
                                                        : styles.statusInactive,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusText,
                                                        item.is_active
                                                            ? {
                                                                  color: "#065F46",
                                                              }
                                                            : {
                                                                  color: "#6B7280",
                                                              },
                                                    ]}
                                                >
                                                    {item.is_active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </Text>
                                            </View>
                                        </View>
                                        {item.description && (
                                            <Text
                                                style={
                                                    styles.serviceDescription
                                                }
                                            >
                                                {item.description}
                                            </Text>
                                        )}
                                        <View style={styles.serviceItemActions}>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => {
                                                    setSelectedService(item);
                                                    setShowEditModal(true);
                                                }}
                                            >
                                                <Edit
                                                    color="#2563EB"
                                                    size={16}
                                                />
                                                <Text
                                                    style={
                                                        styles.actionButtonText
                                                    }
                                                >
                                                    Edit
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() =>
                                                    handleToggle(item)
                                                }
                                            >
                                                {item.is_active ? (
                                                    <PowerOff
                                                        color="#DC2626"
                                                        size={16}
                                                    />
                                                ) : (
                                                    <Power
                                                        color="#059669"
                                                        size={16}
                                                    />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.actionButtonText,
                                                        item.is_active
                                                            ? {
                                                                  color: "#DC2626",
                                                              }
                                                            : {
                                                                  color: "#059669",
                                                              },
                                                    ]}
                                                >
                                                    {item.is_active
                                                        ? "Deactivate"
                                                        : "Activate"}
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
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                    />
                }
            />

            <CreateServiceModal
                show={showCreateModal}
                categories={categories}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreate}
                onError={(message) =>
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message,
                        type: "error",
                    })
                }
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
                    onError={(message) =>
                        setSuccessDialog({
                            visible: true,
                            title: "Error",
                            message,
                            type: "error",
                        })
                    }
                />
            )}

            <ConfirmDialog
                visible={confirmDialog.visible}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() =>
                    setConfirmDialog({ ...confirmDialog, visible: false })
                }
                type={confirmDialog.type}
            />

            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                autoClose={successDialog.type === "success"}
                onClose={() =>
                    setSuccessDialog({ ...successDialog, visible: false })
                }
            />
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
        if (selectedValue === "all") return "All Categories";
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
                            <Text style={styles.pickerTitle}>
                                Select Category
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerList}>
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === category &&
                                            styles.pickerOptionSelected,
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
                                        {category === "all"
                                            ? "All Categories"
                                            : category}
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
    onError,
}: {
    show: boolean;
    categories: string[];
    onClose: () => void;
    onSubmit: (data: any) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        price: "",
        description: "",
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validate = () => {
        const errs: Record<string, string[]> = {};
        if (!formData.name.trim()) errs.name = ["Service name is required."];
        if (!formData.category) errs.category = ["Category is required."];
        if (!formData.price) errs.price = ["Price is required."];
        else if (
            isNaN(parseFloat(formData.price)) ||
            parseFloat(formData.price) < 0
        )
            errs.price = ["Enter a valid non-negative price."];
        return errs;
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                price: parseFloat(formData.price),
            });
            setFormData({ name: "", category: "", price: "", description: "" });
            setErrors({});
            onClose();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                onError(getApiErrorMessage(err, "Failed to create service."));
            }
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
                                style={[
                                    styles.formInput,
                                    errors.name && styles.inputError,
                                ]}
                                value={formData.name}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, name: text });
                                    clearError("name");
                                }}
                                placeholder="Enter service name"
                            />
                            {errors.name?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.name[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Category</Text>
                            <CategoryPicker
                                selectedValue={formData.category}
                                hasError={!!errors.category}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        category: value,
                                    });
                                    clearError("category");
                                }}
                                categories={SERVICE_CATEGORIES}
                            />
                            {errors.category?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.category[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Price</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.price && styles.inputError,
                                ]}
                                value={formData.price}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, price: text });
                                    clearError("price");
                                }}
                                placeholder="Enter price"
                                keyboardType="decimal-pad"
                            />
                            {errors.price?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.price[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Description (Optional)
                            </Text>
                            <TextInput
                                style={[styles.formInput, styles.textArea]}
                                value={formData.description}
                                onChangeText={(text) =>
                                    setFormData({
                                        ...formData,
                                        description: text,
                                    })
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
                            <Text style={styles.modalButtonTextSecondary}>
                                Cancel
                            </Text>
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
                                    Add Service
                                </Text>
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
    onError,
}: {
    show: boolean;
    service: Service;
    categories: string[];
    onClose: () => void;
    onSubmit: (id: number, data: any) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        name: service.name,
        category: service.category,
        price: service.price.toString(),
        description: service.description || "",
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validate = () => {
        const errs: Record<string, string[]> = {};
        if (!formData.name.trim()) errs.name = ["Service name is required."];
        if (!formData.category) errs.category = ["Category is required."];
        if (!formData.price) errs.price = ["Price is required."];
        else if (
            isNaN(parseFloat(formData.price)) ||
            parseFloat(formData.price) < 0
        )
            errs.price = ["Enter a valid non-negative price."];
        return errs;
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        try {
            await onSubmit(service.id, {
                ...formData,
                price: parseFloat(formData.price),
            });
            setErrors({});
            onClose();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                onError(getApiErrorMessage(err, "Failed to update service."));
            }
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
                                style={[
                                    styles.formInput,
                                    errors.name && styles.inputError,
                                ]}
                                value={formData.name}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, name: text });
                                    clearError("name");
                                }}
                                placeholder="Enter service name"
                            />
                            {errors.name?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.name[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Category</Text>
                            <CategoryPicker
                                selectedValue={formData.category}
                                hasError={!!errors.category}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        category: value,
                                    });
                                    clearError("category");
                                }}
                                categories={SERVICE_CATEGORIES}
                            />
                            {errors.category?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.category[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Price</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.price && styles.inputError,
                                ]}
                                value={formData.price}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, price: text });
                                    clearError("price");
                                }}
                                placeholder="Enter price"
                                keyboardType="decimal-pad"
                            />
                            {errors.price?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.price[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Description (Optional)
                            </Text>
                            <TextInput
                                style={[styles.formInput, styles.textArea]}
                                value={formData.description}
                                onChangeText={(text) =>
                                    setFormData({
                                        ...formData,
                                        description: text,
                                    })
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
                            <Text style={styles.modalButtonTextSecondary}>
                                Cancel
                            </Text>
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
    hasError = false,
}: {
    selectedValue: string;
    onValueChange: (value: string) => void;
    categories: string[];
    hasError?: boolean;
}) {
    const [showPicker, setShowPicker] = useState(false);

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    hasError && styles.pickerButtonError,
                ]}
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
                            <Text style={styles.pickerTitle}>
                                Select Category
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerList}>
                            {categories.map((category) => (
                                <TouchableOpacity
                                    key={category}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === category &&
                                            styles.pickerOptionSelected,
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
        flex: 1,
    },
    actionRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    manageCategoriesButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        gap: 6,
    },
    manageCategoriesText: {
        color: "#374151",
        fontWeight: "600",
        fontSize: 14,
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
    inputError: { borderColor: "#EF4444" },
    errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
    pickerButtonError: { borderColor: "#EF4444" },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
    },
    errorTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        textAlign: "center",
    },
    errorMessage: { fontSize: 14, color: "#6B7280", textAlign: "center" },
    retryBtn: {
        marginTop: 4,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: "#ac3434",
        borderRadius: 10,
    },
    retryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
