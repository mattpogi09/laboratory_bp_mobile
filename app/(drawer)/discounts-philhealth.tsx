import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    Edit,
    Percent,
    Plus,
    Power,
    PowerOff,
    Shield,
    X,
} from "lucide-react-native";
import { useCallback, useState } from "react";
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
} from "react-native";

import api from "@/app/services/api";
import type {
    Discount,
    DiscountsResponse,
    PhilHealthPlan,
    PhilHealthPlansResponse,
} from "@/types";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SuccessDialog } from "@/components";

type LabTest = { id: number; name: string; category: string };

export default function DiscountsPhilhealthScreen() {
    const [activeTab, setActiveTab] = useState<"discounts" | "philhealth">(
        "discounts",
    );
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [philHealthPlans, setPhilHealthPlans] = useState<PhilHealthPlan[]>(
        [],
    );
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<
        Discount | PhilHealthPlan | null
    >(null);
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
    const [labTests, setLabTests] = useState<LabTest[]>([]);

    const loadDiscounts = useCallback(async () => {
        try {
            const response = await api.get("/discounts");
            const data: DiscountsResponse = response.data;
            setDiscounts((prev) => data.data);
        } catch (error: any) {
            setLoadError(
                getApiErrorMessage(error, "Failed to load discounts."),
            );
        }
    }, []);

    const loadPhilHealthPlans = useCallback(async () => {
        try {
            const response = await api.get("/philhealth-plans");
            const data: PhilHealthPlansResponse = response.data;
            setPhilHealthPlans((prev) => data.data);
        } catch (error: any) {
            setLoadError(
                getApiErrorMessage(error, "Failed to load PhilHealth plans."),
            );
        }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [, , testsRes] = await Promise.all([
                loadDiscounts(),
                loadPhilHealthPlans(),
                api.get("/services?per_page=500"),
            ]);
            setLabTests(testsRes.data.data ?? []);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [loadDiscounts, loadPhilHealthPlans]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData]),
    );

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleCreateDiscount = async (formData: any) => {
        try {
            await api.post("/discounts", formData);
            setSuccessDialog({
                visible: true,
                title: "Success",
                message: "Discount created successfully",
                type: "success",
            });
            setShowCreateModal(false);
            loadDiscounts();
        } catch (error: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message:
                    error.response?.data?.message ||
                    "Failed to create discount",
                type: "error",
            });
        }
    };

    const handleCreatePlan = async (formData: any) => {
        try {
            await api.post("/philhealth-plans", formData);
            setSuccessDialog({
                visible: true,
                title: "Success",
                message: "PhilHealth plan created successfully",
                type: "success",
            });
            setShowCreateModal(false);
            loadPhilHealthPlans();
        } catch (error: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message:
                    error.response?.data?.message ||
                    "Failed to create PhilHealth plan",
                type: "error",
            });
        }
    };

    const handleUpdateDiscount = async (id: number, formData: any) => {
        try {
            await api.put(`/discounts/${id}`, formData);
            setSuccessDialog({
                visible: true,
                title: "Success",
                message: "Discount updated successfully",
                type: "success",
            });
            setShowEditModal(false);
            setSelectedItem(null);
            loadDiscounts();
        } catch (error: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message:
                    error.response?.data?.message ||
                    "Failed to update discount",
                type: "error",
            });
        }
    };

    const handleUpdatePlan = async (id: number, formData: any) => {
        try {
            await api.put(`/philhealth-plans/${id}`, formData);
            setSuccessDialog({
                visible: true,
                title: "Success",
                message: "PhilHealth plan updated successfully",
                type: "success",
            });
            setShowEditModal(false);
            setSelectedItem(null);
            loadPhilHealthPlans();
        } catch (error: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message:
                    error.response?.data?.message ||
                    "Failed to update PhilHealth plan",
                type: "error",
            });
        }
    };

    const handleToggleDiscount = async (discount: Discount) => {
        setConfirmDialog({
            visible: true,
            title: `${discount.is_active ? "Deactivate" : "Activate"} Discount`,
            message: `Are you sure you want to ${
                discount.is_active ? "deactivate" : "activate"
            } ${discount.name}?`,
            confirmText: discount.is_active ? "DEACTIVATE" : "ACTIVATE",
            type: discount.is_active ? "warning" : "info",
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, visible: false });
                try {
                    await api.post(`/discounts/${discount.id}/toggle`);
                    setSuccessDialog({
                        visible: true,
                        title: "Success",
                        message: `Discount ${
                            discount.is_active ? "deactivated" : "activated"
                        } successfully`,
                        type: "success",
                    });
                    loadDiscounts();
                } catch (error: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message:
                            error.response?.data?.message ||
                            "Failed to toggle discount status",
                        type: "error",
                    });
                }
            },
        });
    };

    const handleTogglePlan = async (plan: PhilHealthPlan) => {
        setConfirmDialog({
            visible: true,
            title: `${
                plan.is_active ? "Deactivate" : "Activate"
            } PhilHealth Plan`,
            message: `Are you sure you want to ${
                plan.is_active ? "deactivate" : "activate"
            } ${plan.name}?`,
            confirmText: plan.is_active ? "DEACTIVATE" : "ACTIVATE",
            type: plan.is_active ? "warning" : "info",
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, visible: false });
                try {
                    await api.post(`/philhealth-plans/${plan.id}/toggle`);
                    setSuccessDialog({
                        visible: true,
                        title: "Success",
                        message: `PhilHealth plan ${
                            plan.is_active ? "deactivated" : "activated"
                        } successfully`,
                        type: "success",
                    });
                    loadPhilHealthPlans();
                } catch (error: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message:
                            error.response?.data?.message ||
                            "Failed to toggle plan status",
                        type: "error",
                    });
                }
            },
        });
    };

    if (loading && !discounts.length && !philHealthPlans.length) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#ac3434" />
            </View>
        );
    }

    if (loadError && !discounts.length && !philHealthPlans.length) {
        return (
            <View style={styles.errorContainer}>
                <AlertCircle color="#EF4444" size={36} />
                <Text style={styles.errorTitle}>Unable to load data</Text>
                <Text style={styles.errorMessage}>{loadError}</Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => {
                        setLoadError(null);
                        loadData();
                    }}
                >
                    <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === "discounts" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("discounts")}
                >
                    <Percent
                        color={
                            activeTab === "discounts" ? "#2563EB" : "#6B7280"
                        }
                        size={18}
                        style={styles.tabIcon}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === "discounts" && styles.tabTextActive,
                        ]}
                    >
                        Discounts
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === "philhealth" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("philhealth")}
                >
                    <Shield
                        color={
                            activeTab === "philhealth" ? "#2563EB" : "#6B7280"
                        }
                        size={18}
                        style={styles.tabIcon}
                    />
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === "philhealth" && styles.tabTextActive,
                        ]}
                    >
                        PhilHealth Plans
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowCreateModal(true)}
                >
                    <Plus color="#fff" size={18} />
                    <Text style={styles.addButtonText}>
                        Add {activeTab === "discounts" ? "Discount" : "Plan"}
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === "discounts" ? (
                <FlatList
                    data={discounts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.itemRate}>
                                        {item.rate}%
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
                                                ? { color: "#065F46" }
                                                : { color: "#6B7280" },
                                        ]}
                                    >
                                        {item.is_active ? "Active" : "Inactive"}
                                    </Text>
                                </View>
                            </View>
                            {item.description && (
                                <Text style={styles.itemDescription}>
                                    {item.description}
                                </Text>
                            )}
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => {
                                        setSelectedItem(item);
                                        setShowEditModal(true);
                                    }}
                                >
                                    <Edit color="#2563EB" size={16} />
                                    <Text style={styles.actionButtonText}>
                                        Edit
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleToggleDiscount(item)}
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
                                        {item.is_active
                                            ? "Deactivate"
                                            : "Activate"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyWrapper}>
                            <Percent color="#D1D5DB" size={42} />
                            <Text style={styles.emptyTitle}>
                                No discounts found
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Add your first discount to get started
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
            ) : (
                <FlatList
                    data={philHealthPlans}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>
                                        {item.name}
                                    </Text>
                                    <Text style={styles.itemRate}>
                                        {item.coverage_rate}%
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
                                                ? { color: "#065F46" }
                                                : { color: "#6B7280" },
                                        ]}
                                    >
                                        {item.is_active ? "Active" : "Inactive"}
                                    </Text>
                                </View>
                            </View>
                            {item.description && (
                                <Text style={styles.itemDescription}>
                                    {item.description}
                                </Text>
                            )}
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => {
                                        setSelectedItem(item);
                                        setShowEditModal(true);
                                    }}
                                >
                                    <Edit color="#2563EB" size={16} />
                                    <Text style={styles.actionButtonText}>
                                        Edit
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleTogglePlan(item)}
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
                                        {item.is_active
                                            ? "Deactivate"
                                            : "Activate"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyWrapper}>
                            <Shield color="#D1D5DB" size={42} />
                            <Text style={styles.emptyTitle}>
                                No PhilHealth plans found
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Add your first PhilHealth plan to get started
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
            )}

            {activeTab === "discounts" ? (
                <>
                    <CreateDiscountModal
                        show={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        onSubmit={handleCreateDiscount}
                        onError={(message) =>
                            setSuccessDialog({
                                visible: true,
                                title: "Error",
                                message,
                                type: "error",
                            })
                        }
                    />
                    {selectedItem && (
                        <EditDiscountModal
                            show={showEditModal}
                            discount={selectedItem as Discount}
                            onClose={() => {
                                setShowEditModal(false);
                                setSelectedItem(null);
                            }}
                            onSubmit={handleUpdateDiscount}
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
                </>
            ) : (
                <>
                    <CreatePhilHealthModal
                        show={showCreateModal}
                        labTests={labTests}
                        onClose={() => setShowCreateModal(false)}
                        onSubmit={handleCreatePlan}
                        onError={(message) =>
                            setSuccessDialog({
                                visible: true,
                                title: "Error",
                                message,
                                type: "error",
                            })
                        }
                    />
                    {selectedItem && (
                        <EditPhilHealthModal
                            show={showEditModal}
                            plan={selectedItem as PhilHealthPlan}
                            labTests={labTests}
                            onClose={() => {
                                setShowEditModal(false);
                                setSelectedItem(null);
                            }}
                            onSubmit={handleUpdatePlan}
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
                </>
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

function CreateDiscountModal({
    show,
    onClose,
    onSubmit,
    onError,
}: {
    show: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        name: "",
        rate: "",
        description: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!formData.name || !formData.rate) {
            onError("Please fill in all required fields");
            return;
        }
        if (formData.name.length > 100) {
            onError("Discount name cannot exceed 100 characters.");
            return;
        }
        const rateVal = parseFloat(formData.rate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
            onError("Rate must be between 0 and 100.");
            return;
        }
        if (formData.description && formData.description.length > 500) {
            onError("Description cannot exceed 500 characters.");
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                rate: parseFloat(formData.rate),
            });
            setFormData({ name: "", rate: "", description: "" });
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
                        <Text style={styles.modalTitle}>Add New Discount</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Name</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.name}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, name: text })
                                }
                                placeholder="Enter discount name"
                                maxLength={100}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Rate (%)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.rate}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, rate: text })
                                }
                                placeholder="Enter discount rate"
                                keyboardType="decimal-pad"
                            />
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
                                maxLength={500}
                            />
                        </View>
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
                                    Add Discount
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function EditDiscountModal({
    show,
    discount,
    onClose,
    onSubmit,
    onError,
}: {
    show: boolean;
    discount: Discount;
    onClose: () => void;
    onSubmit: (id: number, data: any) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        name: discount.name,
        rate: discount.rate.toString(),
        description: discount.description || "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!formData.name || !formData.rate) {
            onError("Please fill in all required fields");
            return;
        }
        if (formData.name.length > 100) {
            onError("Discount name cannot exceed 100 characters.");
            return;
        }
        const rateVal = parseFloat(formData.rate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
            onError("Rate must be between 0 and 100.");
            return;
        }
        if (formData.description && formData.description.length > 500) {
            onError("Description cannot exceed 500 characters.");
            return;
        }
        setLoading(true);
        try {
            await onSubmit(discount.id, {
                ...formData,
                rate: parseFloat(formData.rate),
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
                        <Text style={styles.modalTitle}>Edit Discount</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Name</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.name}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, name: text })
                                }
                                placeholder="Enter discount name"
                                maxLength={100}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Rate (%)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.rate}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, rate: text })
                                }
                                placeholder="Enter discount rate"
                                keyboardType="decimal-pad"
                            />
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
                                maxLength={500}
                            />
                        </View>
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
                                    Update Discount
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function CreatePhilHealthModal({
    show,
    labTests,
    onClose,
    onSubmit,
    onError,
}: {
    show: boolean;
    labTests: LabTest[];
    onClose: () => void;
    onSubmit: (data: any) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        name: "",
        coverage_rate: "",
        other_tests_discount_rate: "",
        description: "",
    });
    const [freeTestIds, setFreeTestIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const toggleTest = (id: number) =>
        setFreeTestIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const handleSubmit = async () => {
        if (!formData.name || !formData.coverage_rate || !formData.other_tests_discount_rate) {
            onError("Please fill in all required fields");
            return;
        }
        if (formData.name.length > 100) {
            onError("Plan name cannot exceed 100 characters.");
            return;
        }
        const rateVal = parseFloat(formData.coverage_rate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
            onError("Coverage rate must be between 0 and 100.");
            return;
        }
        const otherRate = parseFloat(formData.other_tests_discount_rate);
        if (isNaN(otherRate) || otherRate < 0 || otherRate > 100) {
            onError("Other tests discount rate must be between 0 and 100.");
            return;
        }
        if (formData.description && formData.description.length > 500) {
            onError("Description cannot exceed 500 characters.");
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                coverage_rate: parseFloat(formData.coverage_rate),
                other_tests_discount_rate: otherRate,
                free_test_ids: freeTestIds,
            });
            setFormData({ name: "", coverage_rate: "", other_tests_discount_rate: "", description: "" });
            setFreeTestIds([]);
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
                        <Text style={styles.modalTitle}>
                            Add New PhilHealth Plan
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Plan Name</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.name}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, name: text })
                                }
                                placeholder="Enter plan name"
                                maxLength={100}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Coverage Rate (%)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.coverage_rate}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, coverage_rate: text })
                                }
                                placeholder="Enter coverage rate"
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Other Tests Discount Rate (%)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.other_tests_discount_rate}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, other_tests_discount_rate: text })
                                }
                                placeholder="Discount for non-covered tests"
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Covered Tests (Free)</Text>
                            {labTests.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    style={styles.checkRow}
                                    onPress={() => toggleTest(t.id)}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        freeTestIds.includes(t.id) && styles.checkboxChecked,
                                    ]}>
                                        {freeTestIds.includes(t.id) && (
                                            <Text style={styles.checkmark}>✓</Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.checkLabel}>{t.name}</Text>
                                        <Text style={styles.checkSub}>{t.category}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
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
                                maxLength={500}
                            />
                        </View>
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
                                    Add Plan
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function EditPhilHealthModal({
    show,
    plan,
    labTests,
    onClose,
    onSubmit,
    onError,
}: {
    show: boolean;
    plan: PhilHealthPlan;
    labTests: LabTest[];
    onClose: () => void;
    onSubmit: (id: number, data: any) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        name: plan.name,
        coverage_rate: plan.coverage_rate.toString(),
        other_tests_discount_rate: plan.other_tests_discount_rate.toString(),
        description: plan.description || "",
    });
    const [freeTestIds, setFreeTestIds] = useState<number[]>(plan.free_test_ids ?? []);
    const [loading, setLoading] = useState(false);

    const toggleTest = (id: number) =>
        setFreeTestIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );

    const handleSubmit = async () => {
        if (!formData.name || !formData.coverage_rate || !formData.other_tests_discount_rate) {
            onError("Please fill in all required fields");
            return;
        }
        if (formData.name.length > 100) {
            onError("Plan name cannot exceed 100 characters.");
            return;
        }
        const rateVal = parseFloat(formData.coverage_rate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
            onError("Coverage rate must be between 0 and 100.");
            return;
        }
        const otherRate = parseFloat(formData.other_tests_discount_rate);
        if (isNaN(otherRate) || otherRate < 0 || otherRate > 100) {
            onError("Other tests discount rate must be between 0 and 100.");
            return;
        }
        if (formData.description && formData.description.length > 500) {
            onError("Description cannot exceed 500 characters.");
            return;
        }
        setLoading(true);
        try {
            await onSubmit(plan.id, {
                ...formData,
                coverage_rate: parseFloat(formData.coverage_rate),
                other_tests_discount_rate: otherRate,
                free_test_ids: freeTestIds,
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
                        <Text style={styles.modalTitle}>
                            Edit PhilHealth Plan
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Plan Name</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.name}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, name: text })
                                }
                                placeholder="Enter plan name"
                                maxLength={100}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Coverage Rate (%)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.coverage_rate}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, coverage_rate: text })
                                }
                                placeholder="Enter coverage rate"
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Other Tests Discount Rate (%)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.other_tests_discount_rate}
                                onChangeText={(text) =>
                                    setFormData({ ...formData, other_tests_discount_rate: text })
                                }
                                placeholder="Discount for non-covered tests"
                                keyboardType="decimal-pad"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Covered Tests (Free)</Text>
                            {labTests.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    style={styles.checkRow}
                                    onPress={() => toggleTest(t.id)}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        freeTestIds.includes(t.id) && styles.checkboxChecked,
                                    ]}>
                                        {freeTestIds.includes(t.id) && (
                                            <Text style={styles.checkmark}>✓</Text>
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.checkLabel}>{t.name}</Text>
                                        <Text style={styles.checkSub}>{t.category}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
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
                                maxLength={500}
                            />
                        </View>
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
                                    Update Plan
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    tabs: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: {
        borderBottomColor: "#2563EB",
    },
    tabIcon: {
        marginRight: 8,
    },
    tabText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#2563EB",
    },
    header: {
        backgroundColor: "#fff",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
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
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    itemName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    itemRate: {
        fontSize: 16,
        fontWeight: "600",
        color: "#059669",
    },
    itemDescription: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 12,
        lineHeight: 20,
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
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
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
    modalBody: { marginBottom: 24, maxHeight: 400 },
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
    checkRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
    checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
    checkLabel: { fontSize: 14, color: "#111827", fontWeight: "500" },
    checkSub: { fontSize: 12, color: "#9CA3AF" },
});
