import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    ChevronDown,
    Edit,
    Grid,
    Minus,
    Plus,
    Power,
    PowerOff,
    Settings2,
    SlidersHorizontal,
    TestTube,
    X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { router } from "expo-router";

import api from "@/app/services/api";
import type { GroupedServices, Service, ServicesResponse } from "@/types";
import { getApiErrorMessage, useResponsiveLayout } from "@/utils";
import {
    ConfirmDialog,
    SearchBar,
    SkeletonRow,
    SuccessDialog,
} from "@/components";

export default function ServicesScreen() {
    const responsive = useResponsiveLayout();
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [formCategories, setFormCategories] = useState<string[]>([]);
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

    // Interpretation settings
    const [showInterpretationModal, setShowInterpretationModal] =
        useState(false);
    const [interpretationForm, setInterpretationForm] = useState({
        engine_enabled: false,
        show_in_lab_entry: false,
        show_in_pdf: false,
    });
    const [savingInterpretation, setSavingInterpretation] = useState(false);

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

    const loadFormCategories = useCallback(async () => {
        try {
            const response = await api.get("/test-categories");
            const active: string[] = (response.data.data ?? response.data)
                .filter((c: any) => c.is_active)
                .sort(
                    (a: any, b: any) =>
                        a.display_order - b.display_order ||
                        a.name.localeCompare(b.name),
                )
                .map((c: any) => c.name);
            setFormCategories(active);
        } catch {
            // fallback: keep whatever was set before
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
            loadFormCategories();
            loadServices(1, true);
            // Load interpretation settings
            api.get("/settings")
                .then((res) => {
                    const s = res.data.interpretation_settings;
                    if (s)
                        setInterpretationForm({
                            engine_enabled: !!s.engine_enabled,
                            show_in_lab_entry: !!s.show_in_lab_entry,
                            show_in_pdf: !!s.show_in_pdf,
                        });
                })
                .catch(() => {});
        }, [loadCategories, loadFormCategories, loadServices]),
    );

    const handleSaveInterpretation = async () => {
        setSavingInterpretation(true);
        try {
            await api.post("/services/interpretation-settings", {
                engine_enabled: interpretationForm.engine_enabled,
                show_in_lab_entry: interpretationForm.show_in_lab_entry,
                show_in_pdf: interpretationForm.show_in_pdf,
            });
            setShowInterpretationModal(false);
            setSuccessDialog({
                visible: true,
                title: "Success",
                message: "Interpretation settings saved.",
                type: "success",
            });
        } catch (err: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(err, "Failed to save settings."),
                type: "error",
            });
        } finally {
            setSavingInterpretation(false);
        }
    };

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
        <View
            style={[
                styles.container,
                responsive.isTablet && {
                    width: "100%",
                    maxWidth: 1100,
                    alignSelf: "center",
                },
            ]}
        >
            <View style={styles.header}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search services..."
                    onSubmitEditing={() => loadServices(1, true)}
                    containerStyle={styles.searchContainer}
                />
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
                        <Settings2 color="#374151" size={15} />
                        <Text style={styles.manageCategoriesText}>
                            Manage Categories
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.manageCategoriesButton,
                            {
                                borderColor: "#D97706",
                                backgroundColor: "#FFFBEB",
                            },
                        ]}
                        onPress={() => setShowInterpretationModal(true)}
                    >
                        <SlidersHorizontal color="#D97706" size={15} />
                        <Text
                            style={[
                                styles.manageCategoriesText,
                                { color: "#92400E" },
                            ]}
                        >
                            Interpretation
                        </Text>
                    </TouchableOpacity>
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
                                            - {activeCount} active
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
                categories={formCategories}
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
                    categories={formCategories}
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

            {/* Interpretation Settings Modal */}
            <Modal
                visible={showInterpretationModal}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: "80%" }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Interpretation Settings
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    setShowInterpretationModal(false)
                                }
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <Text
                            style={{
                                fontSize: 13,
                                color: "#6B7280",
                                paddingHorizontal: 16,
                                marginBottom: 12,
                            }}
                        >
                            Choose where interpretation labels are shown.
                        </Text>
                        <View style={{ paddingHorizontal: 16, gap: 10 }}>
                            {[
                                {
                                    key: "engine_enabled" as const,
                                    label: "Interpretation Engine",
                                    desc: "Master switch for interpretation labels.",
                                },
                                {
                                    key: "show_in_lab_entry" as const,
                                    label: "Show in Lab Entry",
                                    desc: "Display labels during result encoding.",
                                },
                                {
                                    key: "show_in_pdf" as const,
                                    label: "Show in PDF",
                                    desc: "Display labels in generated PDFs.",
                                },
                            ].map(({ key, label, desc }) => (
                                <View
                                    key={key}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        borderWidth: 1,
                                        borderColor: "#E5E7EB",
                                        borderRadius: 10,
                                        padding: 12,
                                    }}
                                >
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text
                                            style={{
                                                fontSize: 14,
                                                fontWeight: "600",
                                                color: "#111827",
                                            }}
                                        >
                                            {label}
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: "#6B7280",
                                                marginTop: 2,
                                            }}
                                        >
                                            {desc}
                                        </Text>
                                    </View>
                                    <Switch
                                        value={interpretationForm[key]}
                                        disabled={
                                            key !== "engine_enabled" &&
                                            !interpretationForm.engine_enabled
                                        }
                                        onValueChange={(val) => {
                                            if (key === "engine_enabled") {
                                                setInterpretationForm({
                                                    engine_enabled: val,
                                                    show_in_lab_entry: val
                                                        ? interpretationForm.show_in_lab_entry
                                                        : false,
                                                    show_in_pdf: val
                                                        ? interpretationForm.show_in_pdf
                                                        : false,
                                                });
                                            } else {
                                                setInterpretationForm({
                                                    ...interpretationForm,
                                                    [key]: val,
                                                });
                                            }
                                        }}
                                        trackColor={{
                                            false: "#D1D5DB",
                                            true: "#22C55E",
                                        }}
                                        thumbColor="#fff"
                                    />
                                </View>
                            ))}
                        </View>
                        <View style={[styles.modalFooter, { marginTop: 16 }]}>
                            <TouchableOpacity
                                style={styles.modalButtonSecondary}
                                onPress={() =>
                                    setShowInterpretationModal(false)
                                }
                            >
                                <Text style={styles.modalButtonTextSecondary}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalButtonPrimary}
                                onPress={handleSaveInterpretation}
                                disabled={savingInterpretation}
                            >
                                {savingInterpretation ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonTextPrimary}>
                                        Save
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
                        <ScrollView style={styles.pickerList}>
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
                        </ScrollView>
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
    const [referenceRows, setReferenceRows] = useState<
        { key: string; value: string }[]
    >([{ key: "", value: "" }]);
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

    const buildReferenceConfig = (rows: { key: string; value: string }[]) =>
        rows.reduce((acc: Record<string, string>, row) => {
            if (row.key.trim() && row.value.trim())
                acc[row.key.trim()] = row.value.trim();
            return acc;
        }, {});

    const validate = () => {
        const errs: Record<string, string[]> = {};
        if (!formData.name.trim()) errs.name = ["Service name is required."];
        else if (formData.name.length > 100)
            errs.name = ["Service name cannot exceed 100 characters."];
        if (!formData.category) errs.category = ["Category is required."];
        if (!formData.price) errs.price = ["Price is required."];
        else if (
            isNaN(parseFloat(formData.price)) ||
            parseFloat(formData.price) < 0
        )
            errs.price = ["Enter a valid non-negative price."];
        else if (parseFloat(formData.price) > 99999.99)
            errs.price = ["Price cannot exceed ₱99,999.99."];
        if (formData.description && formData.description.length > 1000)
            errs.description = ["Description cannot exceed 1000 characters."];
        const filled = referenceRows.filter(
            (r) => r.key.trim() || r.value.trim(),
        );
        if (filled.some((r) => !r.key.trim() || !r.value.trim()))
            errs.reference_config = [
                "Each reference row needs both a key and value.",
            ];
        const keys = filled.map((r) => r.key.trim().toLowerCase());
        if (new Set(keys).size !== keys.length)
            errs.reference_config = [
                "Duplicate reference keys are not allowed.",
            ];
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
            const referenceConfig = buildReferenceConfig(referenceRows);
            await onSubmit({
                ...formData,
                price: parseFloat(formData.price),
                reference_config: referenceConfig,
            });
            setFormData({ name: "", category: "", price: "", description: "" });
            setReferenceRows([{ key: "", value: "" }]);
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

                    <ScrollView
                        style={styles.modalBody}
                        keyboardShouldPersistTaps="handled"
                    >
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
                                maxLength={100}
                            />
                            <View style={styles.fieldFooter}>
                                {errors.name?.[0] ? (
                                    <Text style={styles.errorText}>
                                        {errors.name[0]}
                                    </Text>
                                ) : (
                                    <Text style={styles.charCount}>
                                        {formData.name.length}/100
                                    </Text>
                                )}
                            </View>
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
                                categories={categories}
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
                                    const filtered = text
                                        .replace(/[^0-9.]/g, "")
                                        .replace(/(\..*)\./, "$1");
                                    setFormData({
                                        ...formData,
                                        price: filtered,
                                    });
                                    clearError("price");
                                }}
                                placeholder="Enter price"
                                keyboardType="decimal-pad"
                                maxLength={10}
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
                                maxLength={1000}
                            />
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#9CA3AF",
                                    textAlign: "right",
                                    marginTop: 2,
                                }}
                            >
                                {formData.description.length}/1000
                            </Text>
                            {errors.description?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.description[0]}
                                </Text>
                            )}
                        </View>

                        <ReferenceValuesEditor
                            rows={referenceRows}
                            onChange={setReferenceRows}
                            error={errors.reference_config?.[0]}
                        />
                    </ScrollView>

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
    const toRows = (cfg: Record<string, string> | null) =>
        cfg && Object.keys(cfg).length > 0
            ? Object.entries(cfg).map(([key, value]) => ({
                  key,
                  value: String(value ?? ""),
              }))
            : [{ key: "", value: "" }];

    const [formData, setFormData] = useState({
        name: service.name,
        category: service.category,
        price: service.price.toString(),
        description: service.description || "",
    });
    const [referenceRows, setReferenceRows] = useState<
        { key: string; value: string }[]
    >(toRows(service.reference_config ?? null));
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    // Sync form whenever the selected service changes
    useEffect(() => {
        setFormData({
            name: service.name,
            category: service.category,
            price: service.price.toString(),
            description: service.description || "",
        });
        setReferenceRows(toRows(service.reference_config ?? null));
        setErrors({});
    }, [service.id]);

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const buildReferenceConfig = (rows: { key: string; value: string }[]) =>
        rows.reduce((acc: Record<string, string>, row) => {
            if (row.key.trim() && row.value.trim())
                acc[row.key.trim()] = row.value.trim();
            return acc;
        }, {});

    const validate = () => {
        const errs: Record<string, string[]> = {};
        if (!formData.name.trim()) errs.name = ["Service name is required."];
        else if (formData.name.length > 100)
            errs.name = ["Service name cannot exceed 100 characters."];
        if (!formData.category) errs.category = ["Category is required."];
        if (!formData.price) errs.price = ["Price is required."];
        else if (
            isNaN(parseFloat(formData.price)) ||
            parseFloat(formData.price) < 0
        )
            errs.price = ["Enter a valid non-negative price."];
        else if (parseFloat(formData.price) > 99999.99)
            errs.price = ["Price cannot exceed ₱99,999.99."];
        if (formData.description && formData.description.length > 1000)
            errs.description = ["Description cannot exceed 1000 characters."];
        const filled = referenceRows.filter(
            (r) => r.key.trim() || r.value.trim(),
        );
        if (filled.some((r) => !r.key.trim() || !r.value.trim()))
            errs.reference_config = [
                "Each reference row needs both a key and value.",
            ];
        const keys = filled.map((r) => r.key.trim().toLowerCase());
        if (new Set(keys).size !== keys.length)
            errs.reference_config = [
                "Duplicate reference keys are not allowed.",
            ];
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
            const referenceConfig = buildReferenceConfig(referenceRows);
            await onSubmit(service.id, {
                ...formData,
                price: parseFloat(formData.price),
                reference_config: referenceConfig,
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

                    <ScrollView
                        style={styles.modalBody}
                        keyboardShouldPersistTaps="handled"
                    >
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
                                maxLength={100}
                            />
                            <View style={styles.fieldFooter}>
                                {errors.name?.[0] ? (
                                    <Text style={styles.errorText}>
                                        {errors.name[0]}
                                    </Text>
                                ) : (
                                    <Text style={styles.charCount}>
                                        {formData.name.length}/100
                                    </Text>
                                )}
                            </View>
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
                                categories={categories}
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
                                    const filtered = text
                                        .replace(/[^0-9.]/g, "")
                                        .replace(/(\..*)\./g, "$1");
                                    setFormData({
                                        ...formData,
                                        price: filtered,
                                    });
                                    clearError("price");
                                }}
                                placeholder="Enter price"
                                keyboardType="decimal-pad"
                                maxLength={10}
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
                                maxLength={1000}
                            />
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#9CA3AF",
                                    textAlign: "right",
                                    marginTop: 2,
                                }}
                            >
                                {formData.description.length}/1000
                            </Text>
                            {errors.description?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.description[0]}
                                </Text>
                            )}
                        </View>

                        <ReferenceValuesEditor
                            rows={referenceRows}
                            onChange={setReferenceRows}
                            error={errors.reference_config?.[0]}
                        />
                    </ScrollView>

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

// ─── helpers ────────────────────────────────────────────────────────────────

type Variant = { variant: string; label: string; text: string };

function parseVariants(value: string): Variant[] {
    if (!value || !value.includes("|")) {
        return [{ variant: "single", label: "", text: value || "" }];
    }
    const parts = value.split("|").map((p) => p.trim());
    const isGender = parts.some((p) => /^(M|F|Child)\s*:/.test(p));
    if (isGender) {
        return parts.map((part) => {
            const m = part.match(/^(M|F|Child)\s*:\s*(.+)$/);
            return m
                ? { variant: m[1], label: m[1], text: m[2].trim() }
                : { variant: "unknown", label: "", text: part };
        });
    }
    return parts.map((part, idx) => {
        const u = part.match(
            /(mmol\/L|mg\/dl|g\/L|U\/L|umol\/L|mm\/hr|x10\d|%)/i,
        );
        return {
            variant: `unit_${idx}`,
            label: u ? `(${u[0]})` : `#${idx + 1}`,
            text: part,
        };
    });
}

function reconstructValue(variants: Variant[]): string {
    return variants
        .filter((v) => v.text.trim())
        .map((v) => {
            if (v.variant === "single") return v.text;
            if (/^(M|F|Child)$/.test(v.variant))
                return `${v.variant}: ${v.text}`;
            return v.text;
        })
        .join(" | ");
}

// ─── ReferenceValuesEditor ───────────────────────────────────────────────────

function ReferenceValuesEditor({
    rows,
    onChange,
    error,
}: {
    rows: { key: string; value: string }[];
    onChange: (rows: { key: string; value: string }[]) => void;
    error?: string;
}) {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});

    const updateRow = (index: number, field: "key" | "value", text: string) => {
        onChange(
            rows.map((r, i) => (i === index ? { ...r, [field]: text } : r)),
        );
        // collapse expand panel when user edits the raw value directly
        if (field === "value") setExpanded((p) => ({ ...p, [index]: false }));
    };

    const updateVariant = (
        rowIndex: number,
        variantIdx: number,
        text: string,
    ) => {
        const variants = parseVariants(rows[rowIndex].value);
        variants[variantIdx].text = text;
        onChange(
            rows.map((r, i) =>
                i === rowIndex
                    ? { ...r, value: reconstructValue(variants) }
                    : r,
            ),
        );
    };

    const addVariant = (rowIndex: number) => {
        const variants = parseVariants(rows[rowIndex].value);
        // add a blank unit variant
        variants.push({
            variant: `unit_${variants.length}`,
            label: `#${variants.length + 1}`,
            text: "",
        });
        onChange(
            rows.map((r, i) =>
                i === rowIndex
                    ? { ...r, value: reconstructValue(variants) }
                    : r,
            ),
        );
    };

    const removeVariant = (rowIndex: number, variantIdx: number) => {
        const variants = parseVariants(rows[rowIndex].value);
        if (variants.length <= 1) return;
        variants.splice(variantIdx, 1);
        onChange(
            rows.map((r, i) =>
                i === rowIndex
                    ? { ...r, value: reconstructValue(variants) }
                    : r,
            ),
        );
    };

    const addRow = () => onChange([...rows, { key: "", value: "" }]);
    const removeRow = (index: number) => {
        if (rows.length === 1) return;
        onChange(rows.filter((_, i) => i !== index));
        setExpanded((p) => {
            const next = { ...p };
            delete next[index];
            return next;
        });
    };

    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
            }}
        >
            {/* Header */}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                }}
            >
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                        style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: "#374151",
                        }}
                    >
                        Reference Values
                    </Text>
                    <Text
                        style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}
                    >
                        Tap the expand icon on a row to edit variants (M/F/Child
                        or unit) separately.
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={addRow}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        borderRadius: 8,
                    }}
                >
                    <Plus size={13} color="#374151" />
                    <Text
                        style={{
                            fontSize: 12,
                            color: "#374151",
                            fontWeight: "600",
                        }}
                    >
                        Add Row
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Rows */}
            {rows.map((row, index) => {
                const variants = parseVariants(row.value);
                const hasVariants = variants.length > 1;
                const isExpanded = !!expanded[index];

                return (
                    <View
                        key={index}
                        style={{
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 8,
                            marginBottom: 8,
                            overflow: "hidden",
                            backgroundColor: "#F9FAFB",
                        }}
                    >
                        {/* Key + Value + controls */}
                        <View style={{ padding: 10, gap: 6 }}>
                            <TextInput
                                style={{
                                    borderWidth: 1,
                                    borderColor: "#D1D5DB",
                                    borderRadius: 8,
                                    paddingHorizontal: 10,
                                    paddingVertical: 8,
                                    fontSize: 13,
                                    color: "#111827",
                                    backgroundColor: "#fff",
                                }}
                                value={row.key}
                                onChangeText={(t) => updateRow(index, "key", t)}
                                placeholder="Parameter key (e.g. fbs, rbc)"
                                placeholderTextColor="#9CA3AF"
                            />
                            <View
                                style={{
                                    flexDirection: "row",
                                    gap: 6,
                                    alignItems: "center",
                                }}
                            >
                                <TextInput
                                    style={{
                                        flex: 1,
                                        borderWidth: 1,
                                        borderColor: "#D1D5DB",
                                        borderRadius: 8,
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        fontSize: 13,
                                        color: "#111827",
                                        backgroundColor: "#fff",
                                    }}
                                    value={row.value}
                                    onChangeText={(t) =>
                                        updateRow(index, "value", t)
                                    }
                                    placeholder="Normal value (e.g. 70-104 mg/dl)"
                                    placeholderTextColor="#9CA3AF"
                                />
                                {/* Expand variants toggle */}
                                {hasVariants && (
                                    <TouchableOpacity
                                        onPress={() =>
                                            setExpanded((p) => ({
                                                ...p,
                                                [index]: !p[index],
                                            }))
                                        }
                                        style={{
                                            padding: 8,
                                            borderWidth: 1,
                                            borderColor: isExpanded
                                                ? "#2563EB"
                                                : "#D1D5DB",
                                            borderRadius: 8,
                                            backgroundColor: isExpanded
                                                ? "#EFF6FF"
                                                : "#fff",
                                        }}
                                    >
                                        <ChevronDown
                                            size={15}
                                            color={
                                                isExpanded
                                                    ? "#2563EB"
                                                    : "#6B7280"
                                            }
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
                                )}
                                {/* Remove row */}
                                <TouchableOpacity
                                    onPress={() => removeRow(index)}
                                    disabled={rows.length === 1}
                                    style={{
                                        padding: 8,
                                        borderWidth: 1,
                                        borderColor: "#D1D5DB",
                                        borderRadius: 8,
                                        backgroundColor: "#fff",
                                        opacity: rows.length === 1 ? 0.4 : 1,
                                    }}
                                >
                                    <Minus size={15} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Expanded variant editor */}
                        {hasVariants && isExpanded && (
                            <View
                                style={{
                                    borderTopWidth: 1,
                                    borderTopColor: "#E5E7EB",
                                    backgroundColor: "#fff",
                                    padding: 10,
                                    gap: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "600",
                                        color: "#374151",
                                        marginBottom: 2,
                                    }}
                                >
                                    Edit variants separately:
                                </Text>
                                {variants.map((v, vi) => (
                                    <View
                                        key={vi}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        {/* Label badge */}
                                        <View
                                            style={{
                                                minWidth: 36,
                                                paddingHorizontal: 6,
                                                paddingVertical: 4,
                                                backgroundColor: "#F3F4F6",
                                                borderRadius: 6,
                                                alignItems: "center",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: "700",
                                                    color: "#374151",
                                                }}
                                            >
                                                {v.label || `#${vi + 1}`}
                                            </Text>
                                        </View>
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                borderWidth: 1,
                                                borderColor: "#D1D5DB",
                                                borderRadius: 8,
                                                paddingHorizontal: 10,
                                                paddingVertical: 7,
                                                fontSize: 13,
                                                color: "#111827",
                                                backgroundColor: "#F9FAFB",
                                            }}
                                            value={v.text}
                                            onChangeText={(t) =>
                                                updateVariant(index, vi, t)
                                            }
                                            placeholder="e.g. 0-45"
                                            placeholderTextColor="#9CA3AF"
                                        />
                                        <TouchableOpacity
                                            onPress={() =>
                                                removeVariant(index, vi)
                                            }
                                            disabled={variants.length <= 1}
                                            style={{
                                                padding: 6,
                                                opacity:
                                                    variants.length <= 1
                                                        ? 0.3
                                                        : 1,
                                            }}
                                        >
                                            <Minus size={13} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                {/* Add variant button */}
                                <TouchableOpacity
                                    onPress={() => addVariant(index)}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 4,
                                        alignSelf: "flex-start",
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderWidth: 1,
                                        borderColor: "#D1D5DB",
                                        borderRadius: 8,
                                        marginTop: 2,
                                    }}
                                >
                                    <Plus size={12} color="#374151" />
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: "#374151",
                                        }}
                                    >
                                        Add Variant
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}

            {error && (
                <Text style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>
                    {error}
                </Text>
            )}
        </View>
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
                        <ScrollView style={styles.pickerList}>
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
                        </ScrollView>
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
        marginBottom: 12,
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
        backgroundColor: "#ac3434",
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 6,
        marginTop: 8,
    },
    actionRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 4,
    },
    manageCategoriesButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 5,
    },
    manageCategoriesText: {
        color: "#374151",
        fontWeight: "600",
        fontSize: 13,
    },
    addButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
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
        maxHeight: "70%",
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
    fieldFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 2,
    },
    charCount: { fontSize: 12, color: "#9CA3AF" },
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
