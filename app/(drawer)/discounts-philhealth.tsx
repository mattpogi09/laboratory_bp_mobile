import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    Edit,
    List,
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
    Switch,
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
    PhilHealthDiscountRule,
} from "@/types";
import { getApiErrorMessage, useResponsiveLayout } from "@/utils";
import { ConfirmDialog, SuccessDialog } from "@/components";

type LabTest = { id: number; name: string; category: string };

type DraftRule = {
    _key: string; // local unique key for list rendering
    rule_type: "category" | "test";
    target_category: string;
    target_lab_test_id: number | null;
    discount_rate: string;
    is_active: boolean;
};

export default function DiscountsPhilhealthScreen() {
    const responsive = useResponsiveLayout();
    const [activeTab, setActiveTab] = useState<"discounts" | "philhealth">(
        "discounts",
    );

    // ── Discounts ──────────────────────────────────────────────────────────────
    const [discounts, setDiscounts] = useState<Discount[]>([]);

    // Send-out exclusions
    const [sendOutIds, setSendOutIds] = useState<number[]>([]);
    const [showSendOutModal, setShowSendOutModal] = useState(false);

    // ── PhilHealth Plans ───────────────────────────────────────────────────────
    const [philHealthPlans, setPhilHealthPlans] = useState<PhilHealthPlan[]>([]);
    const [showRulesModal, setShowRulesModal] = useState(false);
    const [selectedRulesPlan, setSelectedRulesPlan] = useState<PhilHealthPlan | null>(null);

    // ── Shared ─────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Discount | PhilHealthPlan | null>(null);
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
    const [ruleCategories, setRuleCategories] = useState<string[]>([]);

    // ── Data loading ───────────────────────────────────────────────────────────
    const loadDiscounts = useCallback(async () => {
        try {
            const response = await api.get("/discounts");
            const data: DiscountsResponse = response.data;
            setDiscounts(data.data);
        } catch (error: any) {
            setLoadError(getApiErrorMessage(error, "Failed to load discounts."));
        }
    }, []);

    const loadPhilHealthPlans = useCallback(async () => {
        try {
            const response = await api.get("/philhealth-plans");
            const data: PhilHealthPlansResponse = response.data;
            setPhilHealthPlans(data.data);
        } catch (error: any) {
            setLoadError(getApiErrorMessage(error, "Failed to load PhilHealth plans."));
        }
    }, []);

    const loadSendOutRules = useCallback(async () => {
        try {
            const response = await api.get("/discounts/send-out-rules");
            setSendOutIds(response.data.send_out_test_ids ?? []);
        } catch {
            // non-fatal
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
            const tests: LabTest[] = testsRes.data.data ?? [];
            setLabTests(tests);

            // derive unique categories for rules editor
            const cats = [...new Set(tests.map((t) => t.category).filter(Boolean))].sort();
            setRuleCategories(cats);

            await loadSendOutRules();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [loadDiscounts, loadPhilHealthPlans, loadSendOutRules]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData]),
    );

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // ── Discount CRUD ──────────────────────────────────────────────────────────
    const handleCreateDiscount = async (formData: any) => {
        try {
            await api.post("/discounts", formData);
            setSuccessDialog({ visible: true, title: "Success", message: "Discount created successfully", type: "success" });
            setShowCreateModal(false);
            loadDiscounts();
        } catch (error: any) {
            setSuccessDialog({ visible: true, title: "Error", message: error.response?.data?.message || "Failed to create discount", type: "error" });
        }
    };

    const handleUpdateDiscount = async (id: number, formData: any) => {
        try {
            await api.put(`/discounts/${id}`, formData);
            setSuccessDialog({ visible: true, title: "Success", message: "Discount updated successfully", type: "success" });
            setShowEditModal(false);
            setSelectedItem(null);
            loadDiscounts();
        } catch (error: any) {
            setSuccessDialog({ visible: true, title: "Error", message: error.response?.data?.message || "Failed to update discount", type: "error" });
        }
    };

    const handleToggleDiscount = async (discount: Discount) => {
        setConfirmDialog({
            visible: true,
            title: `${discount.is_active ? "Deactivate" : "Activate"} Discount`,
            message: `Are you sure you want to ${discount.is_active ? "deactivate" : "activate"} ${discount.name}?`,
            confirmText: discount.is_active ? "DEACTIVATE" : "ACTIVATE",
            type: discount.is_active ? "warning" : "info",
            onConfirm: async () => {
                setConfirmDialog((prev) => ({ ...prev, visible: false }));
                try {
                    await api.post(`/discounts/${discount.id}/toggle`);
                    setSuccessDialog({ visible: true, title: "Success", message: `Discount ${discount.is_active ? "deactivated" : "activated"} successfully`, type: "success" });
                    loadDiscounts();
                } catch (error: any) {
                    setSuccessDialog({ visible: true, title: "Error", message: error.response?.data?.message || "Failed to toggle discount status", type: "error" });
                }
            },
        });
    };

    // ── Send-out rules ─────────────────────────────────────────────────────────
    const handleSaveSendOut = async (ids: number[]) => {
        await api.post("/discounts/send-out-rules", { send_out_test_ids: ids });
        setSendOutIds(ids);
    };

    // ── PhilHealth CRUD ────────────────────────────────────────────────────────
    const handleCreatePlan = async (formData: any) => {
        try {
            await api.post("/philhealth-plans", formData);
            setSuccessDialog({ visible: true, title: "Success", message: "PhilHealth plan created successfully", type: "success" });
            setShowCreateModal(false);
            loadPhilHealthPlans();
        } catch (error: any) {
            setSuccessDialog({ visible: true, title: "Error", message: error.response?.data?.message || "Failed to create PhilHealth plan", type: "error" });
        }
    };

    const handleUpdatePlan = async (id: number, formData: any) => {
        try {
            await api.put(`/philhealth-plans/${id}`, formData);
            setSuccessDialog({ visible: true, title: "Success", message: "PhilHealth plan updated successfully", type: "success" });
            setShowEditModal(false);
            setSelectedItem(null);
            loadPhilHealthPlans();
        } catch (error: any) {
            setSuccessDialog({ visible: true, title: "Error", message: error.response?.data?.message || "Failed to update PhilHealth plan", type: "error" });
        }
    };

    const handleTogglePlan = async (plan: PhilHealthPlan) => {
        setConfirmDialog({
            visible: true,
            title: `${plan.is_active ? "Deactivate" : "Activate"} PhilHealth Plan`,
            message: `Are you sure you want to ${plan.is_active ? "deactivate" : "activate"} ${plan.name}?`,
            confirmText: plan.is_active ? "DEACTIVATE" : "ACTIVATE",
            type: plan.is_active ? "warning" : "info",
            onConfirm: async () => {
                setConfirmDialog((prev) => ({ ...prev, visible: false }));
                try {
                    await api.post(`/philhealth-plans/${plan.id}/toggle`);
                    setSuccessDialog({ visible: true, title: "Success", message: `PhilHealth plan ${plan.is_active ? "deactivated" : "activated"} successfully`, type: "success" });
                    loadPhilHealthPlans();
                } catch (error: any) {
                    setSuccessDialog({ visible: true, title: "Error", message: error.response?.data?.message || "Failed to toggle plan status", type: "error" });
                }
            },
        });
    };

    const handleUpdateRules = async (planId: number, formData: any) => {
        await api.put(`/philhealth-plans/${planId}`, formData);
        setSuccessDialog({ visible: true, title: "Success", message: "Non-free discount rules updated successfully", type: "success" });
        loadPhilHealthPlans();
    };

    // ── Loading / Error states ─────────────────────────────────────────────────
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
        <View
            style={[
                styles.container,
                responsive.isTablet && { width: "100%", maxWidth: 1100, alignSelf: "center" },
            ]}
        >
            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "discounts" && styles.tabActive]}
                    onPress={() => setActiveTab("discounts")}
                >
                    <Percent color={activeTab === "discounts" ? "#2563EB" : "#6B7280"} size={18} style={styles.tabIcon} />
                    <Text style={[styles.tabText, activeTab === "discounts" && styles.tabTextActive]}>Discounts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "philhealth" && styles.tabActive]}
                    onPress={() => setActiveTab("philhealth")}
                >
                    <Shield color={activeTab === "philhealth" ? "#2563EB" : "#6B7280"} size={18} style={styles.tabIcon} />
                    <Text style={[styles.tabText, activeTab === "philhealth" && styles.tabTextActive]}>PhilHealth Plans</Text>
                </TouchableOpacity>
            </View>

            {/* Header actions bar */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
                    <Plus color="#fff" size={18} />
                    <Text style={styles.addButtonText}>
                        Add {activeTab === "discounts" ? "Discount" : "Plan"}
                    </Text>
                </TouchableOpacity>
                {activeTab === "discounts" && (
                    <TouchableOpacity
                        style={styles.sendOutButton}
                        onPress={() => setShowSendOutModal(true)}
                    >
                        <List color="#374151" size={16} />
                        <Text style={styles.sendOutButtonText}>
                            Send-out Exclusions ({sendOutIds.length})
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Content */}
            {activeTab === "discounts" ? (
                <FlatList
                    data={discounts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemRate}>{item.rate}%</Text>
                                </View>
                                <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
                                    <Text style={[styles.statusText, item.is_active ? { color: "#065F46" } : { color: "#6B7280" }]}>
                                        {item.is_active ? "Active" : "Inactive"}
                                    </Text>
                                </View>
                            </View>
                            {item.description && (
                                <Text style={styles.itemDescription}>{item.description}</Text>
                            )}
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => { setSelectedItem(item); setShowEditModal(true); }}
                                >
                                    <Edit color="#2563EB" size={16} />
                                    <Text style={styles.actionButtonText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleToggleDiscount(item)}
                                >
                                    {item.is_active ? <PowerOff color="#DC2626" size={16} /> : <Power color="#059669" size={16} />}
                                    <Text style={[styles.actionButtonText, item.is_active ? { color: "#DC2626" } : { color: "#059669" }]}>
                                        {item.is_active ? "Deactivate" : "Activate"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyWrapper}>
                            <Percent color="#D1D5DB" size={42} />
                            <Text style={styles.emptyTitle}>No discounts found</Text>
                            <Text style={styles.emptySubtitle}>Add your first discount to get started</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                />
            ) : (
                <FlatList
                    data={philHealthPlans}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemRate}>{item.coverage_rate}%</Text>
                                </View>
                                <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
                                    <Text style={[styles.statusText, item.is_active ? { color: "#065F46" } : { color: "#6B7280" }]}>
                                        {item.is_active ? "Active" : "Inactive"}
                                    </Text>
                                </View>
                            </View>

                            {/* Summary badges */}
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryTag}>
                                    <Text style={styles.summaryTagText}>
                                        {item.free_tests?.length > 0
                                            ? `${item.free_tests.length} free test(s)`
                                            : "No free tests"}
                                    </Text>
                                </View>
                                <View style={styles.summaryTag}>
                                    <Text style={styles.summaryTagText}>
                                        {item.discount_rules?.length > 0
                                            ? `${item.discount_rules.length} non-free rule(s)`
                                            : "No non-free rules"}
                                    </Text>
                                </View>
                            </View>

                            {item.description && (
                                <Text style={styles.itemDescription}>{item.description}</Text>
                            )}
                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => { setSelectedItem(item); setShowEditModal(true); }}
                                >
                                    <Edit color="#2563EB" size={16} />
                                    <Text style={styles.actionButtonText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: "#EEF2FF" }]}
                                    onPress={() => { setSelectedRulesPlan(item); setShowRulesModal(true); }}
                                >
                                    <List color="#4F46E5" size={16} />
                                    <Text style={[styles.actionButtonText, { color: "#4F46E5" }]}>Rules</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={() => handleTogglePlan(item)}
                                >
                                    {item.is_active ? <PowerOff color="#DC2626" size={16} /> : <Power color="#059669" size={16} />}
                                    <Text style={[styles.actionButtonText, item.is_active ? { color: "#DC2626" } : { color: "#059669" }]}>
                                        {item.is_active ? "Deactivate" : "Activate"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyWrapper}>
                            <Shield color="#D1D5DB" size={42} />
                            <Text style={styles.emptyTitle}>No PhilHealth plans found</Text>
                            <Text style={styles.emptySubtitle}>Add your first PhilHealth plan to get started</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                />
            )}

            {/* ── Modals ── */}
            {activeTab === "discounts" ? (
                <>
                    <CreateDiscountModal
                        show={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        onSubmit={handleCreateDiscount}
                        onError={(message) => setSuccessDialog({ visible: true, title: "Error", message, type: "error" })}
                    />
                    {selectedItem && (
                        <EditDiscountModal
                            show={showEditModal}
                            discount={selectedItem as Discount}
                            onClose={() => { setShowEditModal(false); setSelectedItem(null); }}
                            onSubmit={handleUpdateDiscount}
                            onError={(message) => setSuccessDialog({ visible: true, title: "Error", message, type: "error" })}
                        />
                    )}
                    <SendOutRulesModal
                        show={showSendOutModal}
                        labTests={labTests}
                        selectedIds={sendOutIds}
                        onClose={() => setShowSendOutModal(false)}
                        onSave={async (ids) => {
                            await handleSaveSendOut(ids);
                            setShowSendOutModal(false);
                            setSuccessDialog({ visible: true, title: "Success", message: `Send-out exclusions updated. ${ids.length} test(s) selected.`, type: "success" });
                        }}
                        onError={(message) => setSuccessDialog({ visible: true, title: "Error", message, type: "error" })}
                    />
                </>
            ) : (
                <>
                    <CreatePhilHealthModal
                        show={showCreateModal}
                        labTests={labTests}
                        onClose={() => setShowCreateModal(false)}
                        onSubmit={handleCreatePlan}
                        onError={(message) => setSuccessDialog({ visible: true, title: "Error", message, type: "error" })}
                    />
                    {selectedItem && (
                        <EditPhilHealthModal
                            show={showEditModal}
                            plan={selectedItem as PhilHealthPlan}
                            labTests={labTests}
                            onClose={() => { setShowEditModal(false); setSelectedItem(null); }}
                            onSubmit={handleUpdatePlan}
                            onError={(message) => setSuccessDialog({ visible: true, title: "Error", message, type: "error" })}
                        />
                    )}
                    {selectedRulesPlan && (
                        <NonFreeRulesModal
                            show={showRulesModal}
                            plan={selectedRulesPlan}
                            labTests={labTests}
                            ruleCategories={ruleCategories}
                            onClose={() => { setShowRulesModal(false); setSelectedRulesPlan(null); }}
                            onSave={handleUpdateRules}
                            onError={(message) => setSuccessDialog({ visible: true, title: "Error", message, type: "error" })}
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
                onCancel={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
                type={confirmDialog.type}
            />

            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                autoClose={successDialog.type === "success"}
                onClose={() => setSuccessDialog((prev) => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Discount Modal
// ─────────────────────────────────────────────────────────────────────────────
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
    const [formData, setFormData] = useState({ name: "", rate: "", description: "" });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!formData.name || !formData.rate) {
            onError("Please fill in all required fields");
            return;
        }
        if (formData.name.length > 100) { onError("Discount name cannot exceed 100 characters."); return; }
        const rateVal = parseFloat(formData.rate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) { onError("Rate must be between 0 and 100."); return; }
        if (formData.description && formData.description.length > 500) { onError("Description cannot exceed 500 characters."); return; }

        setLoading(true);
        try {
            await onSubmit({ ...formData, rate: parseFloat(formData.rate) });
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
                        <TouchableOpacity onPress={onClose}><X color="#6B7280" size={24} /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Name</Text>
                            <TextInput style={styles.formInput} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Enter discount name" maxLength={100} />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Rate (%)</Text>
                            <TextInput style={styles.formInput} value={formData.rate} onChangeText={(text) => setFormData({ ...formData, rate: text })} placeholder="Enter discount rate" keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Description (Optional)</Text>
                            <TextInput style={[styles.formInput, styles.textArea]} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Enter description" multiline numberOfLines={4} maxLength={500} />
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}><Text style={styles.modalButtonTextSecondary}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Add Discount</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Discount Modal
// ─────────────────────────────────────────────────────────────────────────────
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
        if (!formData.name || !formData.rate) { onError("Please fill in all required fields"); return; }
        if (formData.name.length > 100) { onError("Discount name cannot exceed 100 characters."); return; }
        const rateVal = parseFloat(formData.rate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) { onError("Rate must be between 0 and 100."); return; }
        if (formData.description && formData.description.length > 500) { onError("Description cannot exceed 500 characters."); return; }

        setLoading(true);
        try {
            await onSubmit(discount.id, { ...formData, rate: parseFloat(formData.rate) });
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
                        <TouchableOpacity onPress={onClose}><X color="#6B7280" size={24} /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Name</Text>
                            <TextInput style={styles.formInput} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Enter discount name" maxLength={100} />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Rate (%)</Text>
                            <TextInput style={styles.formInput} value={formData.rate} onChangeText={(text) => setFormData({ ...formData, rate: text })} placeholder="Enter discount rate" keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Description (Optional)</Text>
                            <TextInput style={[styles.formInput, styles.textArea]} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Enter description" multiline numberOfLines={4} maxLength={500} />
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}><Text style={styles.modalButtonTextSecondary}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Update Discount</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Send-Out Rules Modal
// ─────────────────────────────────────────────────────────────────────────────
function SendOutRulesModal({
    show,
    labTests,
    selectedIds,
    onClose,
    onSave,
    onError,
}: {
    show: boolean;
    labTests: LabTest[];
    selectedIds: number[];
    onClose: () => void;
    onSave: (ids: number[]) => Promise<void>;
    onError: (message: string) => void;
}) {
    const [localIds, setLocalIds] = useState<number[]>(selectedIds);
    const [saving, setSaving] = useState(false);

    // Sync when modal opens
    const handleShow = useCallback(() => {
        setLocalIds(selectedIds);
    }, [selectedIds]);

    const toggle = (id: number) => {
        setLocalIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(localIds);
        } catch (error: any) {
            onError(error.response?.data?.message || "Failed to update send-out exclusions.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={show} animationType="slide" transparent onShow={handleShow}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: "90%" }]}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>Send-out Exclusions</Text>
                            <Text style={styles.modalSubtitle}>
                                Tests marked as send-out are excluded from discounts.
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><X color="#6B7280" size={24} /></TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {labTests.length === 0 ? (
                            <Text style={styles.emptySubtitle}>No lab tests available.</Text>
                        ) : (
                            labTests.map((t) => (
                                <TouchableOpacity key={t.id} style={styles.checkRow} onPress={() => toggle(t.id)}>
                                    <View style={[styles.checkbox, localIds.includes(t.id) && styles.checkboxChecked]}>
                                        {localIds.includes(t.id) && <Text style={styles.checkmark}>✓</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.checkLabel}>{t.name}</Text>
                                        <Text style={styles.checkSub}>{t.category}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}>
                            <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Save ({localIds.length})</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create PhilHealth Modal
// ─────────────────────────────────────────────────────────────────────────────
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
    const [formData, setFormData] = useState({ name: "", coverage_rate: "", other_tests_discount_rate: "", description: "" });
    const [freeTestIds, setFreeTestIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);

    const toggleTest = (id: number) =>
        setFreeTestIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    const handleSubmit = async () => {
        if (!formData.name || !formData.coverage_rate || !formData.other_tests_discount_rate) { onError("Please fill in all required fields"); return; }
        if (formData.name.length > 100) { onError("Plan name cannot exceed 100 characters."); return; }
        const rateVal = parseFloat(formData.coverage_rate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) { onError("Coverage rate must be between 0 and 100."); return; }
        const otherRate = parseFloat(formData.other_tests_discount_rate);
        if (isNaN(otherRate) || otherRate < 0 || otherRate > 100) { onError("Other tests discount rate must be between 0 and 100."); return; }
        if (formData.description && formData.description.length > 500) { onError("Description cannot exceed 500 characters."); return; }

        setLoading(true);
        try {
            await onSubmit({ ...formData, coverage_rate: parseFloat(formData.coverage_rate), other_tests_discount_rate: otherRate, free_test_ids: freeTestIds });
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
                        <Text style={styles.modalTitle}>Add New PhilHealth Plan</Text>
                        <TouchableOpacity onPress={onClose}><X color="#6B7280" size={24} /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Plan Name</Text>
                            <TextInput style={styles.formInput} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Enter plan name" maxLength={100} />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Coverage Rate (%)</Text>
                            <TextInput style={styles.formInput} value={formData.coverage_rate} onChangeText={(text) => setFormData({ ...formData, coverage_rate: text })} placeholder="Enter coverage rate" keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Other Tests Discount Rate (%)</Text>
                            <TextInput style={styles.formInput} value={formData.other_tests_discount_rate} onChangeText={(text) => setFormData({ ...formData, other_tests_discount_rate: text })} placeholder="Discount for non-covered tests" keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Covered Tests (Free)</Text>
                            {labTests.map((t) => (
                                <TouchableOpacity key={t.id} style={styles.checkRow} onPress={() => toggleTest(t.id)}>
                                    <View style={[styles.checkbox, freeTestIds.includes(t.id) && styles.checkboxChecked]}>
                                        {freeTestIds.includes(t.id) && <Text style={styles.checkmark}>✓</Text>}
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
                            <TextInput style={[styles.formInput, styles.textArea]} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Enter description" multiline numberOfLines={4} maxLength={500} />
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}><Text style={styles.modalButtonTextSecondary}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Add Plan</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit PhilHealth Modal
// ─────────────────────────────────────────────────────────────────────────────
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
        setFreeTestIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    const handleSubmit = async () => {
        if (!formData.name || !formData.coverage_rate || !formData.other_tests_discount_rate) { onError("Please fill in all required fields"); return; }
        if (formData.name.length > 100) { onError("Plan name cannot exceed 100 characters."); return; }
        const rateVal = parseFloat(formData.coverage_rate);
        if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) { onError("Coverage rate must be between 0 and 100."); return; }
        const otherRate = parseFloat(formData.other_tests_discount_rate);
        if (isNaN(otherRate) || otherRate < 0 || otherRate > 100) { onError("Other tests discount rate must be between 0 and 100."); return; }
        if (formData.description && formData.description.length > 500) { onError("Description cannot exceed 500 characters."); return; }

        setLoading(true);
        try {
            await onSubmit(plan.id, {
                ...formData,
                coverage_rate: parseFloat(formData.coverage_rate),
                other_tests_discount_rate: otherRate,
                free_test_ids: freeTestIds,
                // preserve existing rules - editing via NonFreeRulesModal
                non_free_discount_rules: (plan.discount_rules ?? []).map((r) => ({
                    rule_type: r.rule_type,
                    target_category: r.target_category,
                    target_lab_test_id: r.target_lab_test_id,
                    discount_rate: r.discount_rate,
                    sort_order: r.sort_order,
                    is_active: r.is_active,
                })),
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
                        <Text style={styles.modalTitle}>Edit PhilHealth Plan</Text>
                        <TouchableOpacity onPress={onClose}><X color="#6B7280" size={24} /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Plan Name</Text>
                            <TextInput style={styles.formInput} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Enter plan name" maxLength={100} />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Coverage Rate (%)</Text>
                            <TextInput style={styles.formInput} value={formData.coverage_rate} onChangeText={(text) => setFormData({ ...formData, coverage_rate: text })} placeholder="Enter coverage rate" keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Other Tests Discount Rate (%)</Text>
                            <TextInput style={styles.formInput} value={formData.other_tests_discount_rate} onChangeText={(text) => setFormData({ ...formData, other_tests_discount_rate: text })} placeholder="Discount for non-covered tests" keyboardType="decimal-pad" />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Covered Tests (Free)</Text>
                            {labTests.map((t) => (
                                <TouchableOpacity key={t.id} style={styles.checkRow} onPress={() => toggleTest(t.id)}>
                                    <View style={[styles.checkbox, freeTestIds.includes(t.id) && styles.checkboxChecked]}>
                                        {freeTestIds.includes(t.id) && <Text style={styles.checkmark}>✓</Text>}
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
                            <TextInput style={[styles.formInput, styles.textArea]} value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Enter description" multiline numberOfLines={4} maxLength={500} />
                        </View>
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}><Text style={styles.modalButtonTextSecondary}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Update Plan</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-Free Rules Modal
// ─────────────────────────────────────────────────────────────────────────────
function NonFreeRulesModal({
    show,
    plan,
    labTests,
    ruleCategories,
    onClose,
    onSave,
    onError,
}: {
    show: boolean;
    plan: PhilHealthPlan;
    labTests: LabTest[];
    ruleCategories: string[];
    onClose: () => void;
    onSave: (planId: number, formData: any) => Promise<void>;
    onError: (message: string) => void;
}) {
    const makeKey = () => `rule_${Date.now()}_${Math.random()}`;

    const toDraft = (r: PhilHealthDiscountRule): DraftRule => ({
        _key: makeKey(),
        rule_type: r.rule_type,
        target_category: r.target_category ?? "",
        target_lab_test_id: r.target_lab_test_id,
        discount_rate: r.discount_rate.toString(),
        is_active: r.is_active,
    });

    const [rules, setRules] = useState<DraftRule[]>(() =>
        (plan.discount_rules ?? []).map(toDraft),
    );
    const [saving, setSaving] = useState(false);
    const [catPickerKey, setCatPickerKey] = useState<string | null>(null); // which rule key has cat picker open
    const [testPickerKey, setTestPickerKey] = useState<string | null>(null);

    // Sync when plan changes and modal opens
    const handleShow = useCallback(() => {
        setRules((plan.discount_rules ?? []).map(toDraft));
    }, [plan]);

    const addRule = () =>
        setRules((prev) => [
            ...prev,
            { _key: makeKey(), rule_type: "category", target_category: "", target_lab_test_id: null, discount_rate: "", is_active: true },
        ]);

    const removeRule = (key: string) => setRules((prev) => prev.filter((r) => r._key !== key));

    const updateRule = (key: string, patch: Partial<DraftRule>) =>
        setRules((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));

    const handleSave = async () => {
        // Validate
        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            if (r.rule_type === "category" && !r.target_category.trim()) {
                onError(`Rule #${i + 1}: target category is required.`);
                return;
            }
            if (r.rule_type === "test" && !r.target_lab_test_id) {
                onError(`Rule #${i + 1}: target test is required.`);
                return;
            }
            const rate = parseFloat(r.discount_rate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
                onError(`Rule #${i + 1}: discount rate must be 0–100.`);
                return;
            }
        }

        const payload = rules.map((r, idx) => ({
            rule_type: r.rule_type,
            target_category: r.rule_type === "category" ? r.target_category.trim() : null,
            target_lab_test_id: r.rule_type === "test" ? r.target_lab_test_id : null,
            discount_rate: parseFloat(r.discount_rate),
            sort_order: (idx + 1) * 10,
            is_active: r.is_active,
        }));

        setSaving(true);
        try {
            await onSave(plan.id, {
                name: plan.name,
                coverage_rate: plan.coverage_rate,
                other_tests_discount_rate: plan.other_tests_discount_rate,
                description: plan.description,
                free_test_ids: plan.free_test_ids ?? [],
                non_free_discount_rules: payload,
            });
            onClose();
        } catch (error: any) {
            onError(error.response?.data?.message || "Failed to save rules.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={show} animationType="slide" transparent onShow={handleShow}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: "95%" }]}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>Non-Free Rules</Text>
                            <Text style={styles.modalSubtitle} numberOfLines={1}>{plan.name}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><X color="#6B7280" size={24} /></TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                        <Text style={styles.rulesHelp}>
                            Define discount rates for tests not covered as free. Rules are applied in order.
                        </Text>

                        {rules.map((rule, idx) => (
                            <View key={rule._key} style={styles.ruleCard}>
                                <View style={styles.ruleCardHeader}>
                                    <Text style={styles.ruleCardTitle}>Rule #{idx + 1}</Text>
                                    <View style={styles.ruleHeaderRight}>
                                        <Text style={styles.ruleActiveLabel}>Active</Text>
                                        <Switch
                                            value={rule.is_active}
                                            onValueChange={(v) => updateRule(rule._key, { is_active: v })}
                                            trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                                            thumbColor={rule.is_active ? "#2563EB" : "#9CA3AF"}
                                        />
                                        <TouchableOpacity onPress={() => removeRule(rule._key)} style={styles.ruleDel}>
                                            <X color="#EF4444" size={18} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Rule type toggle */}
                                <View style={styles.ruleTypeRow}>
                                    <TouchableOpacity
                                        style={[styles.ruleTypeBtn, rule.rule_type === "category" && styles.ruleTypeBtnActive]}
                                        onPress={() => updateRule(rule._key, { rule_type: "category", target_lab_test_id: null })}
                                    >
                                        <Text style={[styles.ruleTypeBtnText, rule.rule_type === "category" && styles.ruleTypeBtnTextActive]}>By Category</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.ruleTypeBtn, rule.rule_type === "test" && styles.ruleTypeBtnActive]}
                                        onPress={() => updateRule(rule._key, { rule_type: "test", target_category: "" })}
                                    >
                                        <Text style={[styles.ruleTypeBtnText, rule.rule_type === "test" && styles.ruleTypeBtnTextActive]}>By Test</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Category picker */}
                                {rule.rule_type === "category" && (
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>Category</Text>
                                        <TouchableOpacity
                                            style={[styles.formInput, styles.pickerTrigger]}
                                            onPress={() => setCatPickerKey(catPickerKey === rule._key ? null : rule._key)}
                                        >
                                            <Text style={[styles.pickerTriggerText, !rule.target_category && { color: "#9CA3AF" }]}>
                                                {rule.target_category || "Select category…"}
                                            </Text>
                                        </TouchableOpacity>
                                        {catPickerKey === rule._key && (
                                            <View style={styles.pickerDropdown}>
                                                <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                                                    {ruleCategories.map((cat) => (
                                                        <TouchableOpacity
                                                            key={cat}
                                                            style={[styles.pickerOption, rule.target_category === cat && styles.pickerOptionSelected]}
                                                            onPress={() => { updateRule(rule._key, { target_category: cat }); setCatPickerKey(null); }}
                                                        >
                                                            <Text style={[styles.pickerOptionText, rule.target_category === cat && styles.pickerOptionTextSelected]}>{cat}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                    {ruleCategories.length === 0 && (
                                                        <Text style={[styles.pickerOptionText, { paddingHorizontal: 12 }]}>No categories</Text>
                                                    )}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Test picker */}
                                {rule.rule_type === "test" && (
                                    <View style={styles.formGroup}>
                                        <Text style={styles.formLabel}>Test</Text>
                                        <TouchableOpacity
                                            style={[styles.formInput, styles.pickerTrigger]}
                                            onPress={() => setTestPickerKey(testPickerKey === rule._key ? null : rule._key)}
                                        >
                                            <Text style={[styles.pickerTriggerText, !rule.target_lab_test_id && { color: "#9CA3AF" }]}>
                                                {rule.target_lab_test_id
                                                    ? (labTests.find((t) => t.id === rule.target_lab_test_id)?.name ?? "Unknown")
                                                    : "Select test…"}
                                            </Text>
                                        </TouchableOpacity>
                                        {testPickerKey === rule._key && (
                                            <View style={styles.pickerDropdown}>
                                                <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                                                    {labTests.map((t) => (
                                                        <TouchableOpacity
                                                            key={t.id}
                                                            style={[styles.pickerOption, rule.target_lab_test_id === t.id && styles.pickerOptionSelected]}
                                                            onPress={() => { updateRule(rule._key, { target_lab_test_id: t.id }); setTestPickerKey(null); }}
                                                        >
                                                            <Text style={[styles.pickerOptionText, rule.target_lab_test_id === t.id && styles.pickerOptionTextSelected]}>{t.name}</Text>
                                                            <Text style={styles.checkSub}>{t.category}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                    {labTests.length === 0 && (
                                                        <Text style={[styles.pickerOptionText, { paddingHorizontal: 12 }]}>No tests</Text>
                                                    )}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Discount rate */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Discount Rate (%)</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={rule.discount_rate}
                                        onChangeText={(text) => updateRule(rule._key, { discount_rate: text })}
                                        placeholder="e.g. 50"
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.addRuleBtn} onPress={addRule}>
                            <Plus color="#2563EB" size={18} />
                            <Text style={styles.addRuleBtnText}>Add Rule</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalButtonSecondary} onPress={onClose}>
                            <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonTextPrimary}>Save Rules</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },
    tabs: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
    tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabActive: { borderBottomColor: "#2563EB" },
    tabIcon: { marginRight: 8 },
    tabText: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
    tabTextActive: { color: "#2563EB" },

    header: { backgroundColor: "#fff", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", flexDirection: "row", gap: 10 },
    addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2563EB", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 6 },
    addButtonText: { color: "#fff", fontWeight: "600", marginLeft: 6 },
    sendOutButton: { flexDirection: "row", alignItems: "center", flex: 1, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
    sendOutButtonText: { fontSize: 13, fontWeight: "600", color: "#374151", flex: 1 },

    card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
    itemName: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
    itemRate: { fontSize: 16, fontWeight: "600", color: "#059669" },
    itemDescription: { fontSize: 14, color: "#6B7280", marginBottom: 12, lineHeight: 20 },
    summaryRow: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
    summaryTag: { backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    summaryTagText: { fontSize: 12, color: "#1D4ED8", fontWeight: "500" },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    statusActive: { backgroundColor: "#D1FAE5" },
    statusInactive: { backgroundColor: "#F3F4F6" },
    statusText: { fontSize: 12, fontWeight: "600" },
    cardActions: { flexDirection: "row", gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6", flexWrap: "wrap" },
    actionButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#F9FAFB" },
    actionButtonText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },

    emptyWrapper: { alignItems: "center", paddingVertical: 80, gap: 6 },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
    emptySubtitle: { color: "#9CA3AF", fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "90%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
    modalSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
    modalBody: { marginBottom: 16, maxHeight: 450 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
    formInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, color: "#111827", backgroundColor: "#fff" },
    textArea: { minHeight: 100, textAlignVertical: "top" },
    modalFooter: { flexDirection: "row", gap: 12 },
    modalButtonSecondary: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center" },
    modalButtonTextSecondary: { fontSize: 16, fontWeight: "600", color: "#374151" },
    modalButtonPrimary: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center" },
    modalButtonTextPrimary: { fontSize: 16, fontWeight: "600", color: "#fff" },

    checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
    checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
    checkmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
    checkLabel: { fontSize: 14, color: "#111827", fontWeight: "500" },
    checkSub: { fontSize: 12, color: "#9CA3AF" },

    // Rules modal specific
    rulesHelp: { fontSize: 13, color: "#6B7280", marginBottom: 16, lineHeight: 18 },
    ruleCard: { backgroundColor: "#F9FAFB", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E5E7EB" },
    ruleCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    ruleCardTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
    ruleHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    ruleActiveLabel: { fontSize: 12, color: "#6B7280" },
    ruleDel: { padding: 4 },
    ruleTypeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    ruleTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", backgroundColor: "#fff" },
    ruleTypeBtnActive: { backgroundColor: "#EFF6FF", borderColor: "#2563EB" },
    ruleTypeBtnText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
    ruleTypeBtnTextActive: { color: "#2563EB" },
    pickerTrigger: { justifyContent: "center" },
    pickerTriggerText: { fontSize: 16, color: "#111827" },
    pickerDropdown: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, backgroundColor: "#fff", overflow: "hidden", marginTop: 4 },
    pickerOption: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    pickerOptionSelected: { backgroundColor: "#EFF6FF" },
    pickerOptionText: { fontSize: 14, color: "#111827" },
    pickerOptionTextSelected: { color: "#2563EB", fontWeight: "600" },
    addRuleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#2563EB", marginTop: 4, marginBottom: 8 },
    addRuleBtnText: { fontSize: 15, fontWeight: "600", color: "#2563EB" },

    errorContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    errorTitle: { fontSize: 17, fontWeight: "700", color: "#111827", textAlign: "center" },
    errorMessage: { fontSize: 14, color: "#6B7280", textAlign: "center" },
    retryBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: "#ac3434", borderRadius: 10 },
    retryBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
