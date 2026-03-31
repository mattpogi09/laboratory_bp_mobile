import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    AlertTriangle,
    CalendarClock,
    ChevronDown,
    ChevronRight,
    Flag,
    History,
    PackageSearch,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Ruler,
    Search,
    Settings2,
    ShieldAlert,
    SlidersHorizontal,
    TrendingDown,
    TrendingUp,
    X,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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

import { router } from "expo-router";

import api from "@/app/services/api";
import { getApiErrorMessage } from "@/utils";
import {
    ConfirmDialog,
    SkeletonRow,
    SuccessDialog,
    TransactionLogTab,
} from "@/components";

type InventoryUnit = {
    id: number;
    name: string;
    short_name: string;
};

type InventoryBatch = {
    id: number;
    batch_number: string;
    item_id: number;
    item_name?: string;
    supplier_id: number | null;
    supplier_name?: string | null;
    expiry_date: string | null;
    received_date: string | null;
    purchase_unit_id: number;
    purchase_unit?: InventoryUnit | null;
    purchase_quantity: number;
    conversion_factor: number;
    current_quantity: number;
    status: "active" | "unusable" | "depleted";
    display_status?: string;
};

type Supplier = {
    id: number;
    name: string;
};

type InventoryItem = {
    id: number;
    name: string;
    category: string;
    current_stock: number;
    minimum_stock: number;
    unit: string;
    base_unit_id: number | null;
    base_unit?: InventoryUnit | null;
    status: "good" | "low_stock" | "out_of_stock";
    is_active: boolean;
    percentage: number;
    batches?: InventoryBatch[];
    available_units?: number;
    earliest_batch_expiry?: string | null;
};

type Summary = {
    total_items: number;
    good: number;
    low_stock: number;
    out_of_stock: number;
    by_category?: Record<string, number>;
};

type InventoryTransaction = {
    id: number;
    date: string;
    transaction_code: string;
    item: string;
    type: string;
    quantity: number;
    previous_stock: number | null;
    new_stock: number | null;
    reason: string;
    performed_by: string;
};

const filters = [
    { label: "All", value: "all" },
    { label: "Good", value: "good" },
    { label: "Low Stock", value: "low_stock" },
    { label: "Out of Stock", value: "out_of_stock" },
];

export default function InventoryScreen() {
    const [activeTab, setActiveTab] = useState<
        "items" | "transactions" | "batch_issues" | "expiring_soon"
    >("items");
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
        {},
    );

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStockInModal, setShowStockInModal] = useState(false);
    const [showStockOutModal, setShowStockOutModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagItem, setFlagItem] = useState<InventoryItem | null>(null);

    // Dialogs
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
    const [allCategories, setAllCategories] = useState<string[]>([]);

    const loadAllCategories = useCallback(async () => {
        try {
            const res = await api.get("/inventory-categories");
            const data: any[] = res.data.data ?? res.data;
            const names = data
                .filter((c) => c.is_active)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => c.name as string);
            setAllCategories(names);
        } catch {
            // silently fail — filter will just show All Categories
        }
    }, []);

    const loadInventory = useCallback(async () => {
        try {
            if (!refreshing) setLoading(true);
            const response = await api.get("/inventory", {
                params: {
                    status: statusFilter === "all" ? undefined : statusFilter,
                    category:
                        categoryFilter === "all" ? undefined : categoryFilter,
                    search: search.trim() || undefined,
                },
            });
            setItems(response.data.items);
            setSummary(response.data.summary);
        } catch (error: any) {
            setLoadError(
                getApiErrorMessage(error, "Failed to load inventory."),
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing, search, statusFilter, categoryFilter]);

    const handleCreateStock = async (formData: any) => {
        const response = await api.post("/inventory", formData);
        setSuccessDialog({
            visible: true,
            title: "Success",
            message: response.data.message || "Stock item created successfully",
            type: "success",
        });
        loadInventory();
    };

    const handleStockIn = async (formData: any) => {
        const response = await api.post("/inventory/stock-in", {
            item_id: formData.item_id,
            quantity: formData.quantity,
            reason: formData.reason,
            supplier_id: formData.supplier_id || null,
            expiry_date: formData.expiry_date || null,
            purchased_date: formData.purchased_date || null,
            purchase_unit_id: formData.purchase_unit_id || null,
            purchase_quantity: formData.purchase_quantity || null,
            conversion_factor: formData.conversion_factor || null,
        });
        setSuccessDialog({
            visible: true,
            title: "Success",
            message: response.data.message || "Stock added successfully",
            type: "success",
        });
        loadInventory();
        setTransactionRefreshKey((k) => k + 1);
    };

    const handleStockOut = async (formData: any) => {
        setConfirmDialog({
            visible: true,
            title: "Remove Stock",
            message: `Are you sure you want to remove ${formData.quantity} unit(s) from inventory?`,
            confirmText: "Remove Stock",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, visible: false });
                try {
                    const response = await api.post("/inventory/stock-out", {
                        item_id: formData.item_id,
                        quantity: formData.quantity,
                        reason: formData.reason,
                        unit_id: formData.unit_id ?? null,
                    });
                    setSuccessDialog({
                        visible: true,
                        title: "Success",
                        message:
                            response.data.message ||
                            "Stock removed successfully",
                        type: "success",
                    });
                    setShowStockOutModal(false);
                    loadInventory();
                    setTransactionRefreshKey((k) => k + 1);
                } catch (error: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message:
                            error.response?.data?.message ||
                            "Failed to remove stock",
                        type: "error",
                    });
                }
            },
        });
    };

    const handleAdjustStock = async (formData: {
        new_quantity: number;
        reason: string;
        batch_id?: number | null;
    }) => {
        const response = await api.post(
            `/inventory/${adjustItem!.id}/adjust`,
            formData,
        );
        setSuccessDialog({
            visible: true,
            title: "Success",
            message: response.data.message || "Stock adjusted successfully",
            type: "success",
        });
        loadInventory();
    };

    const handleEditItem = async (formData: any) => {
        const response = await api.put(`/inventory/${editItem!.id}`, formData);
        setSuccessDialog({
            visible: true,
            title: "Success",
            message: response.data.message || "Item updated successfully",
            type: "success",
        });
        loadInventory();
    };

    const handleFlagBatch = async (formData: {
        batch_id: number;
        reason_type: string;
        reason_details: string;
    }) => {
        const response = await api.post(
            `/inventory/batches/${formData.batch_id}/flag`,
            {
                reason: `${formData.reason_type}${
                    formData.reason_details
                        ? ": " + formData.reason_details
                        : ""
                }`,
            },
        );
        setSuccessDialog({
            visible: true,
            title: "Success",
            message:
                response.data.message || "Batch flagged as unusable",
            type: "success",
        });
        loadInventory();
        setTransactionRefreshKey((k) => k + 1);
    };

    const handleToggleItem = (item: InventoryItem) => {
        setConfirmDialog({
            visible: true,
            title: `${item.is_active ? "Deactivate" : "Activate"} Item`,
            message: `${item.is_active ? "Deactivate" : "Activate"} "${item.name}" from inventory?`,
            confirmText: item.is_active ? "DEACTIVATE" : "ACTIVATE",
            type: item.is_active ? "warning" : "info",
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, visible: false });
                try {
                    await api.post(`/inventory/${item.id}/toggle`);
                    setSuccessDialog({
                        visible: true,
                        title: "Success",
                        message: `Item ${item.is_active ? "deactivated" : "activated"} successfully`,
                        type: "success",
                    });
                    loadInventory();
                } catch (error: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message:
                            error.response?.data?.message ||
                            "Failed to toggle item status",
                        type: "error",
                    });
                }
            },
        });
    };

    // Stable refs so effects never hold stale function closures
    const loadInventoryRef = useRef(loadInventory);
    loadInventoryRef.current = loadInventory;
    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    // Load categories once on mount
    useEffect(() => {
        loadAllCategories();
    }, []);

    // Load inventory whenever the tab switches to items
    useEffect(() => {
        if (activeTab === "items") {
            loadInventoryRef.current();
        }
    }, [activeTab]);

    // Reload when the drawer screen regains focus
    useFocusEffect(
        useCallback(() => {
            if (activeTabRef.current === "items") {
                loadInventoryRef.current();
            }
        }, []),
    );

    // Debounce search/filter changes — items tab only
    useEffect(() => {
        const debounce = setTimeout(() => {
            if (activeTabRef.current === "items") {
                loadInventoryRef.current();
            }
        }, 400);
        return () => clearTimeout(debounce);
    }, [search, statusFilter, categoryFilter]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadInventory();
    };

    const renderItem = ({ item }: { item: InventoryItem }) => {
        let progressColor = "#10B981";
        if (item.status === "low_stock") progressColor = "#F59E0B";
        if (item.status === "out_of_stock") progressColor = "#DC2626";

        const percentage = Math.min(100, Math.max(0, item.percentage));
        const isExpanded = !!expandedItems[item.id];
        const activeBatches = (item.batches ?? []).filter(
            (b) => b.status === "active",
        );

        const getBatchStatusColor = (b: InventoryBatch) => {
            if (b.status === "unusable") return "#EF4444";
            if (b.status === "depleted") return "#F59E0B";
            if (b.expiry_date && new Date(b.expiry_date) < new Date())
                return "#EF4444";
            return "#10B981";
        };

        return (
            <View style={styles.card}>
                {/* Header row with chevron */}
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() =>
                        setExpandedItems((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                        }))
                    }
                    activeOpacity={0.7}
                >
                    <Text style={styles.itemName}>{item.name}</Text>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: progressColor + "22" },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusText,
                                    { color: progressColor },
                                ]}
                            >
                                {item.status.replace("_", " ")}
                            </Text>
                        </View>
                        {isExpanded ? (
                            <ChevronDown size={16} color="#6B7280" />
                        ) : (
                            <ChevronRight size={16} color="#6B7280" />
                        )}
                    </View>
                </TouchableOpacity>

                <Text style={styles.itemCategory}>{item.category}</Text>
                <View style={styles.row}>
                    <Text style={styles.label}>On-hand</Text>
                    <Text style={styles.value}>
                        {item.current_stock} {item.unit}
                    </Text>
                </View>
                <View style={styles.progressBg}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${percentage}%`,
                                backgroundColor: progressColor,
                            },
                        ]}
                    />
                </View>
                <Text style={styles.stockMeta}>
                    Minimum required: {item.minimum_stock} {item.unit}
                </Text>
                {item.earliest_batch_expiry && (
                    <Text style={styles.stockMeta}>
                        Earliest expiry:{" "}
                        <Text style={{ color: "#D97706", fontWeight: "600" }}>
                            {item.earliest_batch_expiry}
                        </Text>
                    </Text>
                )}

                {/* Expanded batch details */}
                {isExpanded && (
                    <View style={styles.batchSection}>
                        <Text style={styles.batchSectionTitle}>
                            Batch Details ({item.batches?.length ?? 0})
                        </Text>
                        {(item.batches ?? []).length === 0 ? (
                            <Text style={styles.batchEmpty}>
                                No batch records available.
                            </Text>
                        ) : (
                            (item.batches ?? []).map((b) => {
                                const statusColor = getBatchStatusColor(b);
                                return (
                                    <View key={b.id} style={styles.batchRow}>
                                        <View style={styles.batchRowHeader}>
                                            <Text style={styles.batchNumber}>
                                                {b.batch_number}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    {
                                                        backgroundColor:
                                                            statusColor + "22",
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.statusText,
                                                        { color: statusColor },
                                                    ]}
                                                >
                                                    {b.status}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.batchGrid}>
                                            <View style={styles.batchCell}>
                                                <Text
                                                    style={
                                                        styles.batchCellLabel
                                                    }
                                                >
                                                    Purchased
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.batchCellValue
                                                    }
                                                >
                                                    {b.purchase_quantity}{" "}
                                                    {b.purchase_unit?.name ??
                                                        ""}
                                                </Text>
                                                <Text
                                                    style={styles.batchCellSub}
                                                >
                                                    1{" "}
                                                    {b.purchase_unit?.name ??
                                                        "unit"}{" "}
                                                    = {b.conversion_factor}{" "}
                                                    {item.unit}
                                                </Text>
                                            </View>
                                            <View style={styles.batchCell}>
                                                <Text
                                                    style={
                                                        styles.batchCellLabel
                                                    }
                                                >
                                                    Remaining
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.batchCellValue
                                                    }
                                                >
                                                    {Math.floor(
                                                        b.current_quantity,
                                                    )}{" "}
                                                    {item.unit}
                                                </Text>
                                            </View>
                                            <View style={styles.batchCell}>
                                                <Text
                                                    style={
                                                        styles.batchCellLabel
                                                    }
                                                >
                                                    Supplier
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.batchCellValue
                                                    }
                                                >
                                                    {b.supplier_name ?? "—"}
                                                </Text>
                                            </View>
                                            <View style={styles.batchCell}>
                                                <Text
                                                    style={
                                                        styles.batchCellLabel
                                                    }
                                                >
                                                    Received
                                                </Text>
                                                <Text
                                                    style={
                                                        styles.batchCellValue
                                                    }
                                                >
                                                    {b.received_date ?? "—"}
                                                </Text>
                                            </View>
                                            <View style={styles.batchCell}>
                                                <Text
                                                    style={
                                                        styles.batchCellLabel
                                                    }
                                                >
                                                    Expiry
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.batchCellValue,
                                                        !b.expiry_date && {
                                                            color: "#9CA3AF",
                                                        },
                                                    ]}
                                                >
                                                    {b.expiry_date ??
                                                        "No expiry"}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() => {
                            setEditItem(item);
                            setShowEditModal(true);
                        }}
                    >
                        <Pencil size={14} color="#4F46E5" />
                        <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.adjustBtn}
                        onPress={() => {
                            setAdjustItem(item);
                            setShowAdjustModal(true);
                        }}
                    >
                        <SlidersHorizontal size={14} color="#2563EB" />
                        <Text style={styles.adjustBtnText}>Adjust</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.flagBtn}
                        onPress={() => {
                            setFlagItem(item);
                            setShowFlagModal(true);
                        }}
                    >
                        <Flag size={14} color="#EF4444" />
                        <Text style={styles.flagBtnText}>Flag</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.toggleBtn}
                        onPress={() => handleToggleItem(item)}
                    >
                        {item.is_active ? (
                            <PowerOff size={14} color="#EF4444" />
                        ) : (
                            <Power size={14} color="#10B981" />
                        )}
                        <Text
                            style={[
                                styles.toggleBtnText,
                                {
                                    color: item.is_active
                                        ? "#EF4444"
                                        : "#10B981",
                                },
                            ]}
                        >
                            {item.is_active ? "Deactivate" : "Activate"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading && !items.length && activeTab === "items") {
        return (
            <View style={styles.container}>
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <SkeletonRow count={6} />
                </View>
            </View>
        );
    }

    if (loadError && !items.length && activeTab === "items") {
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>
                        Unable to load inventory
                    </Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setLoadError(null);
                            loadInventory();
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
            {/* Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabContainer}
            >
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === "items" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("items")}
                >
                    <PackageSearch
                        color={activeTab === "items" ? "#ac3434" : "#6B7280"}
                        size={16}
                    />
                    <Text
                        style={[
                            styles.tabLabel,
                            activeTab === "items" && styles.tabLabelActive,
                        ]}
                    >
                        Stock Items
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === "transactions" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("transactions")}
                >
                    <History
                        color={
                            activeTab === "transactions" ? "#ac3434" : "#6B7280"
                        }
                        size={16}
                    />
                    <Text
                        style={[
                            styles.tabLabel,
                            activeTab === "transactions" &&
                                styles.tabLabelActive,
                        ]}
                    >
                        Transactions
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === "batch_issues" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("batch_issues")}
                >
                    <ShieldAlert
                        color={
                            activeTab === "batch_issues" ? "#ac3434" : "#6B7280"
                        }
                        size={16}
                    />
                    <Text
                        style={[
                            styles.tabLabel,
                            activeTab === "batch_issues" &&
                                styles.tabLabelActive,
                        ]}
                    >
                        Batch Issues
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === "expiring_soon" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("expiring_soon")}
                >
                    <CalendarClock
                        color={
                            activeTab === "expiring_soon"
                                ? "#ac3434"
                                : "#6B7280"
                        }
                        size={16}
                    />
                    <Text
                        style={[
                            styles.tabLabel,
                            activeTab === "expiring_soon" &&
                                styles.tabLabelActive,
                        ]}
                    >
                        Expiring Soon
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {activeTab === "items" ? (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    ListHeaderComponent={
                        <>
                            {/* Manage Categories / Units */}
                            <View style={styles.manageButtonsRow}>
                                <TouchableOpacity
                                    style={styles.manageCategoriesButton}
                                    onPress={() =>
                                        router.push(
                                            "/(drawer)/inventory-categories",
                                        )
                                    }
                                >
                                    <Settings2 color="#374151" size={16} />
                                    <Text style={styles.manageCategoriesText}>
                                        Categories
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.manageCategoriesButton}
                                    onPress={() =>
                                        router.push("/(drawer)/inventory-units")
                                    }
                                >
                                    <Ruler color="#374151" size={16} />
                                    <Text style={styles.manageCategoriesText}>
                                        Units
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.createBtn]}
                                    onPress={() => setShowCreateModal(true)}
                                >
                                    <Plus color="#fff" size={18} />
                                    <Text style={styles.actionBtnText}>
                                        Create Stock
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        styles.stockInBtn,
                                    ]}
                                    onPress={() => setShowStockInModal(true)}
                                >
                                    <TrendingUp color="#fff" size={18} />
                                    <Text style={styles.actionBtnText}>
                                        Stock In
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.actionBtn,
                                        styles.stockOutBtn,
                                    ]}
                                    onPress={() => setShowStockOutModal(true)}
                                >
                                    <TrendingDown color="#fff" size={18} />
                                    <Text style={styles.actionBtnText}>
                                        Stock Out
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Status Summary Grid */}
                            <View style={styles.summaryGrid}>
                                <View
                                    style={[
                                        styles.summaryCard,
                                        styles.summaryCardTotal,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.summaryValue,
                                            { color: "#1E3A8A" },
                                        ]}
                                    >
                                        {summary?.total_items ?? 0}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryLabel,
                                            { color: "#1E40AF" },
                                        ]}
                                    >
                                        Total Items
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.summaryCard,
                                        styles.summaryCardGood,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.summaryValue,
                                            { color: "#065F46" },
                                        ]}
                                    >
                                        {summary?.good ?? 0}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryLabel,
                                            { color: "#047857" },
                                        ]}
                                    >
                                        Good
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.summaryCard,
                                        styles.summaryCardLowStock,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.summaryValue,
                                            { color: "#92400E" },
                                        ]}
                                    >
                                        {summary?.low_stock ?? 0}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryLabel,
                                            { color: "#78350F" },
                                        ]}
                                    >
                                        Low Stock
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.summaryCard,
                                        styles.summaryCardOutOfStock,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.summaryValue,
                                            { color: "#991B1B" },
                                        ]}
                                    >
                                        {summary?.out_of_stock ?? 0}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.summaryLabel,
                                            { color: "#B91C1C" },
                                        ]}
                                    >
                                        Out of Stock
                                    </Text>
                                </View>
                            </View>

                            {/* By Category Chips */}
                            {allCategories.length > 0 && (
                                <View style={styles.categorySummarySection}>
                                    <Text style={styles.categorySummaryTitle}>
                                        By Category
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={
                                            styles.categorySummaryScroll
                                        }
                                    >
                                        {allCategories.map((cat) => {
                                            const count =
                                                summary?.by_category?.[cat] ??
                                                0;
                                            const isActive =
                                                categoryFilter === cat;
                                            return (
                                                <TouchableOpacity
                                                    key={cat}
                                                    style={[
                                                        styles.categoryChip,
                                                        isActive &&
                                                            styles.categoryChipActive,
                                                        count === 0 &&
                                                            !isActive &&
                                                            styles.categoryChipEmpty,
                                                    ]}
                                                    onPress={() =>
                                                        setCategoryFilter(
                                                            isActive
                                                                ? "all"
                                                                : cat,
                                                        )
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            styles.categoryChipLabel,
                                                            isActive &&
                                                                styles.categoryChipLabelActive,
                                                            count === 0 &&
                                                                !isActive &&
                                                                styles.categoryChipLabelEmpty,
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {cat}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.categoryChipCount,
                                                            isActive &&
                                                                styles.categoryChipCountActive,
                                                        ]}
                                                    >
                                                        {count}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>
                            )}
                            <View style={styles.searchContainer}>
                                <Search
                                    color="#6B7280"
                                    size={20}
                                    style={styles.searchIcon}
                                />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search inventory..."
                                    placeholderTextColor="#9CA3AF"
                                    value={search}
                                    onChangeText={setSearch}
                                />
                            </View>
                            <View style={styles.filtersRow}>
                                <View style={styles.filterGroup}>
                                    <Text style={styles.filterLabel}>
                                        Category:
                                    </Text>
                                    <CategoryDropdown
                                        selectedValue={categoryFilter}
                                        onValueChange={setCategoryFilter}
                                        categories={allCategories}
                                    />
                                </View>
                                <View style={styles.filterGroup}>
                                    <Text style={styles.filterLabel}>
                                        Status:
                                    </Text>
                                    <StatusDropdown
                                        selectedValue={statusFilter}
                                        onValueChange={setStatusFilter}
                                    />
                                </View>
                            </View>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <PackageSearch color="#D1D5DB" size={42} />
                            <Text style={styles.emptyTitle}>
                                No inventory items
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                Everything might be filtered out.
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
            ) : activeTab === "transactions" ? (
                <TransactionLogTab refreshTrigger={transactionRefreshKey} />
            ) : activeTab === "batch_issues" ? (
                <BatchIssuesTab />
            ) : (
                <ExpiringSoonTab />
            )}

            {/* Modals */}
            <CreateStockModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreateStock}
                categories={allCategories}
                onError={(message) =>
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message,
                        type: "error",
                    })
                }
            />

            <StockInModal
                show={showStockInModal}
                items={items}
                onClose={() => setShowStockInModal(false)}
                onSubmit={handleStockIn}
                onError={(message) =>
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message,
                        type: "error",
                    })
                }
            />

            <FlagBatchModal
                show={showFlagModal}
                item={flagItem}
                onClose={() => {
                    setShowFlagModal(false);
                    setFlagItem(null);
                }}
                onSubmit={handleFlagBatch}
                onError={(message) =>
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message,
                        type: "error",
                    })
                }
            />

            <StockOutModal
                show={showStockOutModal}
                items={items}
                onClose={() => setShowStockOutModal(false)}
                onSubmit={handleStockOut}
                onError={(message) =>
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message,
                        type: "error",
                    })
                }
            />

            <AdjustStockModal
                show={showAdjustModal}
                item={adjustItem}
                onClose={() => {
                    setShowAdjustModal(false);
                    setAdjustItem(null);
                }}
                onSubmit={handleAdjustStock}
                onError={(message) =>
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message,
                        type: "error",
                    })
                }
            />

            <EditItemModal
                show={showEditModal}
                item={editItem}
                categories={allCategories}
                onClose={() => {
                    setShowEditModal(false);
                    setEditItem(null);
                }}
                onSubmit={handleEditItem}
                onError={(message) =>
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message,
                        type: "error",
                    })
                }
            />

            {/* Dialogs */}
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

function StatusDropdown({
    selectedValue,
    onValueChange,
}: {
    selectedValue: string;
    onValueChange: (value: string) => void;
}) {
    const [showPicker, setShowPicker] = useState(false);

    const getDisplayText = () => {
        const filter = filters.find((f) => f.value === selectedValue);
        return filter ? filter.label : "All";
    };

    return (
        <>
            <TouchableOpacity
                style={styles.statusDropdownButton}
                onPress={() => setShowPicker(true)}
            >
                <Text style={styles.statusDropdownText}>
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
                                Select Status
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerList}>
                            {filters.map((filter) => (
                                <TouchableOpacity
                                    key={filter.value}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === filter.value &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(filter.value);
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            selectedValue === filter.value &&
                                                styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {filter.label}
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

function CategoryDropdown({
    selectedValue,
    onValueChange,
    categories,
}: {
    selectedValue: string;
    onValueChange: (value: string) => void;
    categories: string[];
}) {
    const [showPicker, setShowPicker] = useState(false);

    const displayText =
        selectedValue === "all" ? "All Categories" : selectedValue;

    return (
        <>
            <TouchableOpacity
                style={styles.categoryDropdownButton}
                onPress={() => setShowPicker(true)}
            >
                <Text style={styles.categoryDropdownText}>{displayText}</Text>
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
                        <ScrollView
                            style={styles.pickerList}
                            showsVerticalScrollIndicator={true}
                            bounces={true}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    selectedValue === "all" &&
                                        styles.pickerOptionSelected,
                                ]}
                                onPress={() => {
                                    onValueChange("all");
                                    setShowPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.pickerOptionText,
                                        selectedValue === "all" &&
                                            styles.pickerOptionTextSelected,
                                    ]}
                                >
                                    All Categories
                                </Text>
                            </TouchableOpacity>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === cat &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(cat);
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            selectedValue === cat &&
                                                styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {cat}
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

function CreateStockModal({
    show,
    onClose,
    onSubmit,
    onError,
    categories: categoryOptions,
}: {
    show: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    onError: (message: string) => void;
    categories: string[];
}) {
    const [formData, setFormData] = useState({
        name: "",
        category: "",
        initial_quantity: "0",
        minimum_stock: "",
        base_unit_id: "",
    });
    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (show) {
            api.get("/inventory-units")
                .then((r) => setUnits(r.data.data ?? []))
                .catch(() => {});
        }
    }, [show]);

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const [showPrecheck, setShowPrecheck] = useState(false);

    const validate = () => {
        const errs: Record<string, string[]> = {};
        if (!formData.name.trim()) errs.name = ["Item name is required."];
        else if (!/^[a-zA-Z\s\-().]+$/.test(formData.name.trim()))
            errs.name = [
                "Item name may only contain letters, spaces, hyphens, and parentheses.",
            ];
        else if (formData.name.length > 120)
            errs.name = ["Item name cannot exceed 120 characters."];
        if (!formData.category) errs.category = ["Category is required."];
        if (formData.initial_quantity === "")
            errs.initial_quantity = ["Initial stock is required."];
        else if (
            isNaN(parseInt(formData.initial_quantity)) ||
            parseInt(formData.initial_quantity) < 0
        )
            errs.initial_quantity = ["Quantity must be a whole number of 0 or greater."];
        else if (parseInt(formData.initial_quantity) > 999999)
            errs.initial_quantity = ["Quantity cannot exceed 999,999."];
        if (!formData.minimum_stock && formData.minimum_stock !== "0")
            errs.minimum_stock = ["Minimum stock level is required."];
        else if (
            isNaN(parseInt(formData.minimum_stock)) ||
            parseInt(formData.minimum_stock) < 0
        )
            errs.minimum_stock = ["Minimum stock must be a whole number of 0 or greater."];
        else if (parseInt(formData.minimum_stock) > 999999)
            errs.minimum_stock = ["Minimum stock cannot exceed 999,999."];
        if (!formData.base_unit_id)
            errs.base_unit_id = ["Base unit is required."];
        return errs;
    };

    const handleSubmit = async () => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setShowPrecheck(true);
    };

    const handleConfirmCreate = async () => {
        setShowPrecheck(false);
        setLoading(true);
        try {
            await onSubmit({
                name: formData.name.trim(),
                category: formData.category,
                initial_quantity: parseInt(formData.initial_quantity),
                minimum_stock: parseInt(formData.minimum_stock),
                base_unit_id: formData.base_unit_id
                    ? parseInt(formData.base_unit_id)
                    : null,
            });
            setFormData({
                name: "",
                category: "",
                initial_quantity: "0",
                minimum_stock: "",
                base_unit_id: "",
            });
            setErrors({});
            onClose();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                onError(
                    err.response?.data?.message ||
                        "Failed to create stock item",
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const categories =
        categoryOptions.length > 0
            ? categoryOptions
            : [
                  "Reagents",
                  "Consumables",
                  "Equipment",
                  "Safety Items",
                  "Chemicals",
                  "Cleaning Supplies",
                  "Office Supplies",
                  "Other",
              ];

    return (
        <Modal visible={show} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Create New Stock Item
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Item Name *</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.name && styles.inputError,
                                ]}
                                value={formData.name}
                                onChangeText={(text) => {
                                    const filtered = text.replace(
                                        /[^a-zA-Z\s\-().]/g,
                                        "",
                                    );
                                    setFormData({
                                        ...formData,
                                        name: filtered,
                                    });
                                    clearError("name");
                                }}
                                placeholder="e.g., Blood Collection Tubes"
                                maxLength={255}
                            />
                            {errors.name?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.name[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Category *</Text>
                            <PickerSelect
                                items={categories}
                                selectedValue={formData.category}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        category: value,
                                    });
                                    clearError("category");
                                }}
                                placeholder="Select category"
                                hasError={!!errors.category}
                            />
                            {errors.category?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.category[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Initial Stock *</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.initial_quantity && styles.inputError,
                                ]}
                                value={formData.initial_quantity}
                                onChangeText={(text) => {
                                    setFormData({
                                        ...formData,
                                        initial_quantity: text.replace(/[^0-9]/g, ""),
                                    });
                                    clearError("initial_quantity");
                                }}
                                placeholder="0"
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                            {errors.initial_quantity?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.initial_quantity[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Minimum Stock Level *
                            </Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.minimum_stock && styles.inputError,
                                ]}
                                value={formData.minimum_stock}
                                onChangeText={(text) => {
                                    setFormData({
                                        ...formData,
                                        minimum_stock: text.replace(
                                            /[^0-9]/g,
                                            "",
                                        ),
                                    });
                                    clearError("minimum_stock");
                                }}
                                placeholder="Alert when stock falls below this level"
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                            {errors.minimum_stock?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.minimum_stock[0]}
                                </Text>
                            )}
                            <Text style={styles.formHint}>
                                You'll receive alerts when stock falls below
                                this threshold. This does not add stock.
                            </Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Base Unit *</Text>
                            <UnitPickerSelect
                                units={units as InventoryUnit[]}
                                selectedValue={formData.base_unit_id}
                                onValueChange={(val) => {
                                    setFormData({
                                        ...formData,
                                        base_unit_id: val,
                                    });
                                    clearError("base_unit_id");
                                }}
                                placeholder="Select base unit"
                                hasError={!!errors.base_unit_id}
                            />
                            {errors.base_unit_id?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.base_unit_id[0]}
                                </Text>
                            )}
                            <Text style={styles.formHint}>
                                Choose the smallest usage unit (e.g. Piece, mL).
                                If 1 Box = 50 Pieces, set base unit to Piece.
                            </Text>
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
                                    Create Stock Item
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ConfirmDialog
                visible={showPrecheck}
                title="Confirm New Stock Item"
                message={[
                    `Item Name: ${formData.name || "-"}`,
                    `Category: ${formData.category || "-"}`,
                    `Initial Stock: ${formData.initial_quantity || "0"} ${units.find((u) => String(u.id) === formData.base_unit_id)?.short_name ?? ""}`,
                    `Minimum Stock: ${formData.minimum_stock || "0"} ${units.find((u) => String(u.id) === formData.base_unit_id)?.short_name ?? ""}`,
                    `Base Unit: ${units.find((u) => String(u.id) === formData.base_unit_id)?.name ?? "-"}`,
                ].join("\n")}
                confirmText="Confirm and Save"
                onConfirm={handleConfirmCreate}
                onCancel={() => setShowPrecheck(false)}
                type="info"
            />
        </Modal>
    );
}

function StockInModal({
    show,
    items,
    onClose,
    onSubmit,
    onError,
}: {
    show: boolean;
    items: InventoryItem[];
    onClose: () => void;
    onSubmit: (data: any) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        item_id: "",
        reason: "",
        supplier_id: "",
        expiry_date: "",
        purchased_date: new Date().toLocaleDateString("en-CA"),
        purchase_unit_id: "",
        purchase_quantity: "",
        conversion_factor: "",
    });
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [showPrecheck, setShowPrecheck] = useState(false);

    useEffect(() => {
        if (show) {
            api.get("/suppliers")
                .then((r) => setSuppliers(r.data.data ?? r.data))
                .catch(() => {});
            api.get("/inventory-units")
                .then((r) => setUnits(r.data.data ?? []))
                .catch(() => {});
        }
    }, [show]);

    const clearError = (field: string) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validateStockIn = () => {
        const errs: Record<string, string[]> = {};
        const today = new Date().toLocaleDateString("en-CA");
        if (!formData.item_id) errs.item_id = ["Please select an item."];
        if (!formData.supplier_id) errs.supplier_id = ["Supplier is required."];
        if (!formData.purchase_unit_id)
            errs.purchase_unit_id = ["Purchase unit is required."];
        if (!formData.reason.trim()) errs.reason = ["Reason is required."];
        else if (formData.reason.length > 500)
            errs.reason = ["Reason cannot exceed 500 characters."];
        if (!formData.expiry_date)
            errs.expiry_date = ["Expiry date is required."];
        else if (formData.expiry_date < today)
            errs.expiry_date = ["Expiry date cannot be in the past."];
        if (formData.purchased_date && formData.purchased_date > today)
            errs.purchased_date = ["Purchased date cannot be in the future."];
        if (
            formData.expiry_date &&
            formData.purchased_date &&
            formData.purchased_date > formData.expiry_date
        )
            errs.purchased_date = [
                "Purchased date cannot be later than expiry date.",
            ];
        if (
            formData.purchase_quantity &&
            (isNaN(parseFloat(formData.purchase_quantity)) ||
                parseFloat(formData.purchase_quantity) <= 0)
        )
            errs.purchase_quantity = [
                "Purchase quantity must be greater than 0.",
            ];
        if (
            !formData.purchase_quantity ||
            parseFloat(formData.purchase_quantity) <= 0
        )
            errs.purchase_quantity = [
                "Purchase quantity must be greater than 0.",
            ];
        if (
            !formData.conversion_factor ||
            parseFloat(formData.conversion_factor) <= 0
        )
            errs.conversion_factor = [
                "Conversion factor must be greater than 0.",
            ];
        else {
            const converted =
                parseFloat(formData.purchase_quantity || "0") *
                parseFloat(formData.conversion_factor);
            if (converted < 1)
                errs.purchase_quantity = [
                    "Converted base quantity must be at least 1.",
                ];
            else if (Math.abs(converted - Math.round(converted)) > 0.0001)
                errs.purchase_quantity = [
                    "Converted base quantity must be a whole number.",
                ];
        }
        return errs;
    };

    const handleSubmit = async () => {
        if (looksReversedScale) {
            setErrors((prev) => ({
                ...prev,
                purchase_unit_id: [
                    `Reversed unit setup: base unit (${baseUnitName}) should be smaller than purchase unit. Edit the item's base unit first.`,
                ],
            }));
            return;
        }
        const validationErrors = validateStockIn();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        // Show pre-check confirmation before submitting (mirrors web)
        setShowPrecheck(true);
    };

    const handleConfirmStockIn = async () => {
        setShowPrecheck(false);
        setLoading(true);
        try {
            await onSubmit({
                item_id: parseInt(formData.item_id),
                quantity: convertedBase ?? 0,
                reason: formData.reason,
                supplier_id: formData.supplier_id
                    ? parseInt(formData.supplier_id)
                    : null,
                expiry_date: formData.expiry_date || null,
                purchased_date: formData.purchased_date || null,
                purchase_unit_id: formData.purchase_unit_id
                    ? parseInt(formData.purchase_unit_id)
                    : null,
                purchase_quantity: formData.purchase_quantity
                    ? parseFloat(formData.purchase_quantity)
                    : null,
                conversion_factor: formData.conversion_factor
                    ? parseFloat(formData.conversion_factor)
                    : null,
            });
            setFormData({
                item_id: "",
                reason: "",
                supplier_id: "",
                expiry_date: "",
                purchased_date: "",
                purchase_unit_id: "",
                purchase_quantity: "",
                conversion_factor: "",
            });
            setErrors({});
            onClose();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                onError(err.response?.data?.message || "Failed to add stock");
            }
        } finally {
            setLoading(false);
        }
    };

    const selectedItem = items.find((i) => String(i.id) === formData.item_id);
    const selectedPurchaseUnit = units.find(
        (u) => String(u.id) === formData.purchase_unit_id,
    );
    const baseUnitName =
        selectedItem?.base_unit?.name ?? selectedItem?.unit ?? "base unit";
    const purchaseUnitName = selectedPurchaseUnit?.name ?? "purchase unit";
    const sameAsBase =
        selectedItem &&
        selectedPurchaseUnit &&
        String(selectedItem.base_unit_id) === String(selectedPurchaseUnit.id);

    // Reversed scale guard — mirrors web
    const getUnitScale = (name: string) => {
        const u = name.trim().toLowerCase();
        const small = ["piece", "pieces", "pc", "pcs", "ml", "milliliter", "milliliters", "g", "gram", "grams"];
        const large = ["box", "boxes", "bottle", "bottles", "pack", "packs", "case", "cases", "carton", "cartons"];
        if (small.includes(u)) return 1;
        if (large.includes(u)) return 2;
        return 0;
    };
    const baseScale = getUnitScale(baseUnitName);
    const purchaseScale = getUnitScale(purchaseUnitName);
    const looksReversedScale =
        selectedItem && selectedPurchaseUnit && baseScale > 0 && purchaseScale > 0
            ? baseScale > purchaseScale
            : false;
    const convertedBase =
        formData.purchase_quantity && formData.conversion_factor
            ? Math.round(
                  parseFloat(formData.purchase_quantity) *
                      parseFloat(formData.conversion_factor),
              )
            : null;

    return (
        <Modal visible={show} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>
                                Stock In - Add Inventory
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                Receive new stock into inventory
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Select Item *</Text>
                            <ItemPickerSelect
                                items={items}
                                selectedValue={formData.item_id}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        item_id: value,
                                    });
                                    clearError("item_id");
                                }}
                                hasError={!!errors.item_id}
                            />
                            {errors.item_id?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.item_id[0]}
                                </Text>
                            )}
                            {selectedItem && (
                                <View style={styles.stockPreviewBlue}>
                                    <Text style={styles.stockPreviewLabel}>
                                        Current Stock:
                                    </Text>
                                    <Text style={styles.stockPreviewValueBlue}>
                                        {selectedItem.current_stock}{" "}
                                        {selectedItem.unit}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Supplier *
                            </Text>
                            <SupplierPickerSelect
                                suppliers={suppliers}
                                selectedValue={formData.supplier_id}
                                onValueChange={(val) => {
                                    setFormData({
                                        ...formData,
                                        supplier_id: val,
                                    });
                                    clearError("supplier_id");
                                }}
                            />
                        </View>

                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>
                                    Purchase Date
                                </Text>
                                <DatePickerField
                                    value={formData.purchased_date}
                                    onChange={(val) => {
                                        setFormData({
                                            ...formData,
                                            purchased_date: val,
                                        });
                                        clearError("purchased_date");
                                    }}
                                    placeholder="Select date"
                                    hasError={!!errors.purchased_date}
                                    maximumDate={new Date()}
                                />
                                {errors.purchased_date?.[0] && (
                                    <Text style={styles.errorText}>
                                        {errors.purchased_date[0]}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>
                                    Expiry Date *
                                </Text>
                                <DatePickerField
                                    value={formData.expiry_date}
                                    onChange={(val) => {
                                        setFormData({
                                            ...formData,
                                            expiry_date: val,
                                        });
                                        clearError("expiry_date");
                                    }}
                                    placeholder="Select date"
                                    hasError={!!errors.expiry_date}
                                    minimumDate={new Date()}
                                />
                                {errors.expiry_date?.[0] && (
                                    <Text style={styles.errorText}>
                                        {errors.expiry_date[0]}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Purchase Unit *
                            </Text>
                            <UnitPickerSelect
                                units={units}
                                selectedValue={formData.purchase_unit_id}
                                onValueChange={(val) => {
                                    const isSame =
                                        selectedItem &&
                                        String(selectedItem.base_unit_id) ===
                                            val;
                                    // Pre-fill conversion factor from most recent batch with this unit
                                    let prefilled = "";
                                    if (!isSame && selectedItem) {
                                        const existingBatch = (
                                            selectedItem.batches ?? []
                                        )
                                            .filter(
                                                (b) =>
                                                    String(
                                                        b.purchase_unit_id,
                                                    ) === val &&
                                                    b.conversion_factor > 0,
                                            )
                                            .sort((a, b) => b.id - a.id)[0];
                                        if (existingBatch)
                                            prefilled = String(
                                                existingBatch.conversion_factor,
                                            );
                                    }
                                    setFormData({
                                        ...formData,
                                        purchase_unit_id: val,
                                        conversion_factor: isSame
                                            ? "1"
                                            : prefilled ||
                                              formData.conversion_factor,
                                    });
                                    clearError("purchase_unit_id");
                                    clearError("conversion_factor");
                                }}
                                placeholder="Select purchase unit"
                                hasError={!!errors.purchase_unit_id}
                            />
                            {errors.purchase_unit_id?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.purchase_unit_id[0]}
                                </Text>
                            )}
                            <Text style={styles.formHint}>
                                Example: choose Box if the supplier sold this
                                item by box.
                            </Text>
                        </View>

                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>
                                    Quantity Bought *
                                </Text>
                                <TextInput
                                    style={[
                                        styles.formInput,
                                        errors.purchase_quantity &&
                                            styles.inputError,
                                    ]}
                                    value={formData.purchase_quantity}
                                    onChangeText={(t) => {
                                        setFormData({
                                            ...formData,
                                            purchase_quantity: t.replace(
                                                /[^0-9.]/g,
                                                "",
                                            ),
                                        });
                                        clearError("purchase_quantity");
                                    }}
                                    placeholder="e.g. 10"
                                    keyboardType="decimal-pad"
                                />
                                {errors.purchase_quantity?.[0] && (
                                    <Text style={styles.errorText}>
                                        {errors.purchase_quantity[0]}
                                    </Text>
                                )}
                                <Text style={styles.formHint}>
                                    How many {purchaseUnitName} were delivered.
                                </Text>
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>
                                    Conversion Factor
                                </Text>
                                <TextInput
                                    style={[
                                        styles.formInput,
                                        errors.conversion_factor &&
                                            styles.inputError,
                                        sameAsBase
                                            ? {
                                                  backgroundColor: "#F9FAFB",
                                                  color: "#9CA3AF",
                                              }
                                            : undefined,
                                    ]}
                                    value={
                                        sameAsBase
                                            ? "1"
                                            : formData.conversion_factor
                                    }
                                    onChangeText={(t) => {
                                        if (sameAsBase) return;
                                        setFormData({
                                            ...formData,
                                            conversion_factor: t.replace(
                                                /[^0-9.]/g,
                                                "",
                                            ),
                                        });
                                        clearError("conversion_factor");
                                    }}
                                    placeholder="e.g. 50"
                                    keyboardType="decimal-pad"
                                    editable={!sameAsBase}
                                />
                                {errors.conversion_factor?.[0] && (
                                    <Text style={styles.errorText}>
                                        {errors.conversion_factor[0]}
                                    </Text>
                                )}
                                <Text style={styles.formHint}>
                                    {sameAsBase
                                        ? `Fixed to 1 (purchase unit matches base unit).`
                                        : `E.g. 1 ${purchaseUnitName} = 50 ${baseUnitName}`}
                                </Text>
                                {!sameAsBase &&
                                    formData.conversion_factor &&
                                    (() => {
                                        const prefillBatch = (
                                            selectedItem?.batches ?? []
                                        )
                                            .filter(
                                                (b) =>
                                                    String(
                                                        b.purchase_unit_id,
                                                    ) ===
                                                        formData.purchase_unit_id &&
                                                    b.conversion_factor > 0,
                                            )
                                            .sort((a, b) => b.id - a.id)[0];
                                        return prefillBatch ? (
                                            <Text
                                                style={[
                                                    styles.formHint,
                                                    { color: "#2563EB" },
                                                ]}
                                            >
                                                ✓ Pre-filled from previous
                                                stock-in. Adjust if this
                                                delivery differs.
                                            </Text>
                                        ) : null;
                                    })()}
                            </View>
                        </View>

                        {looksReversedScale && (
                            <View style={[styles.stockWarnRed, { marginBottom: 8 }]}>
                                <AlertTriangle size={16} color="#DC2626" style={{ marginTop: 1 }} />
                                <Text style={[styles.stockWarnRedText, { flex: 1 }]}>
                                    Reversed unit setup: base unit ({baseUnitName}) should be smaller than purchase unit. Edit the item's base unit first.
                                </Text>
                            </View>
                        )}

                        {convertedBase !== null && selectedItem && (
                            <View style={styles.stockPreviewGreen}>
                                <Text style={styles.stockPreviewLabel}>
                                    You are adding:
                                </Text>
                                <Text style={styles.stockPreviewValueGreen}>
                                    {formData.purchase_quantity}{" "}
                                    {purchaseUnitName} = {convertedBase}{" "}
                                    {baseUnitName}
                                </Text>
                            </View>
                        )}

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Reason *</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    styles.textArea,
                                    errors.reason && styles.inputError,
                                ]}
                                value={formData.reason}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, reason: text });
                                    clearError("reason");
                                }}
                                placeholder="e.g., New delivery from supplier"
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#9CA3AF",
                                    textAlign: "right",
                                    marginTop: 2,
                                }}
                            >
                                {formData.reason.length}/500
                            </Text>
                            {errors.reason?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.reason[0]}
                                </Text>
                            )}
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
                            style={[
                                styles.modalButtonPrimary,
                                { backgroundColor: "#10B981" },
                            ]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalButtonTextPrimary}>
                                    Add Stock
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Pre-check confirmation — mirrors web ConfirmModal */}
            <ConfirmDialog
                visible={showPrecheck}
                title="Confirm Stock In Entry"
                message={[
                    `Item: ${selectedItem?.name ?? "-"}`,
                    `Supplier: ${suppliers.find((s) => String(s.id) === formData.supplier_id)?.name ?? "-"}`,
                    `Batch: Auto-generated`,
                    `Purchase Date: ${formData.purchased_date || "-"}`,
                    `Expiry Date: ${formData.expiry_date || "-"}`,
                    `Qty Bought: ${formData.purchase_quantity || "0"} ${purchaseUnitName}`,
                    `Conversion: 1 ${purchaseUnitName} = ${sameAsBase ? "1" : formData.conversion_factor || "0"} ${baseUnitName}`,
                    `Adding: ${convertedBase ?? 0} ${baseUnitName}`,
                    `Reason: ${formData.reason || "-"}`,
                ].join("\n")}
                confirmText="Confirm and Add"
                onConfirm={handleConfirmStockIn}
                onCancel={() => setShowPrecheck(false)}
                type="info"
            />
        </Modal>
    );
}

function StockOutModal({
    show,
    items,
    onClose,
    onSubmit,
    onError,
}: {
    show: boolean;
    items: InventoryItem[];
    onClose: () => void;
    onSubmit: (data: any) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        item_id: "",
        quantity: "",
        reason: "",
        unit_id: "",
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

    const validateStockOut = () => {
        const errs: Record<string, string[]> = {};
        if (!formData.item_id) errs.item_id = ["Please select an item."];
        if (!formData.quantity) errs.quantity = ["Quantity is required."];
        else if (
            isNaN(parseInt(formData.quantity)) ||
            parseInt(formData.quantity) < 1
        )
            errs.quantity = ["Quantity must be at least 1."];
        else if (parseInt(formData.quantity) > 999999)
            errs.quantity = ["Quantity cannot exceed 999,999."];
        if (!formData.reason.trim()) errs.reason = ["Reason is required."];
        else if (formData.reason.length > 500)
            errs.reason = ["Reason cannot exceed 500 characters."];
        return errs;
    };

    const handleSubmit = async () => {
        const validationErrors = validateStockOut();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                item_id: parseInt(formData.item_id),
                quantity: parseInt(formData.quantity),
                reason: formData.reason,
                unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
            });
            setFormData({ item_id: "", quantity: "", reason: "", unit_id: "" });
            setErrors({});
            onClose();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                onError(
                    err.response?.data?.message || "Failed to remove stock",
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const selectedItem = items.find((i) => String(i.id) === formData.item_id);

    // Build unit options from item's active batches — collect all batches per unit for FEFO
    const availableUnits = (() => {
        if (!selectedItem) return [];
        const seen = new Map<
            string,
            { id: string; name: string; short_name: string; conversion_factor: number }
        >();
        (selectedItem.batches ?? [])
            .filter((b) => b.status === "active")
            .forEach((b) => {
                const key = String(b.purchase_unit_id);
                // Store first encountered factor per unit for display; mixed-factor note handled separately
                if (!seen.has(key) && b.purchase_unit) {
                    seen.set(key, {
                        id: key,
                        name: b.purchase_unit.name,
                        short_name: b.purchase_unit.short_name,
                        conversion_factor: b.conversion_factor,
                    });
                }
            });
        return Array.from(seen.values());
    })();

    const selectedUnit = availableUnits.find((u) => u.id === formData.unit_id);
    const qty = parseInt(formData.quantity);

    // FEFO walk: collect active batches for the selected unit sorted by expiry (nulls last)
    const fefoBatches = (() => {
        if (!selectedItem || !formData.unit_id) return [];
        return (selectedItem.batches ?? [])
            .filter((b) => b.status === "active" && String(b.purchase_unit_id) === formData.unit_id)
            .sort((a, b) => {
                if (!a.expiry_date && !b.expiry_date) return 0;
                if (!a.expiry_date) return 1;
                if (!b.expiry_date) return -1;
                return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
            });
    })();

    // Per-batch FEFO check: walk batches and accumulate base units needed
    const fefoResult = (() => {
        if (!selectedItem || !formData.unit_id || isNaN(qty) || qty < 1)
            return { canFulfill: true, baseNeeded: 0 };
        let remaining = qty;
        let baseNeeded = 0;
        for (const b of fefoBatches) {
            if (remaining <= 0) break;
            const batchCapacityInUnits = b.conversion_factor > 0
                ? Math.floor(b.current_quantity / b.conversion_factor)
                : 0;
            const take = Math.min(remaining, batchCapacityInUnits);
            baseNeeded += take * b.conversion_factor;
            remaining -= take;
        }
        return { canFulfill: remaining <= 0, baseNeeded: Math.round(baseNeeded) };
    })();

    // Fallback for base-unit (no unit selected) path
    const effectiveFactor = selectedUnit?.conversion_factor ?? 1;
    const normalizedBase = !isNaN(qty)
        ? (formData.unit_id ? fefoResult.baseNeeded : Math.round(qty * effectiveFactor))
        : 0;
    const insufficientStock =
        selectedItem && formData.quantity && !isNaN(qty)
            ? (formData.unit_id ? !fefoResult.canFulfill : normalizedBase > selectedItem.current_stock)
            : false;
    const newStock =
        selectedItem && formData.quantity && !isNaN(qty) && !insufficientStock
            ? selectedItem.current_stock - normalizedBase
            : null;
    const willBeLowStock =
        newStock !== null &&
        selectedItem &&
        newStock < selectedItem.minimum_stock;

    // Remaining equivalent in selected unit (FEFO-based)
    const remainingInUnit = (() => {
        if (!selectedUnit || fefoBatches.length === 0) return null;
        const totalBase = fefoBatches.reduce((sum, b) => sum + b.current_quantity, 0);
        return selectedUnit.conversion_factor > 0
            ? Math.floor(totalBase / selectedUnit.conversion_factor)
            : null;
    })();

    // Detect mixed conversion factors for the same unit across batches
    const hasMixedFactors = (() => {
        if (fefoBatches.length < 2) return false;
        const first = fefoBatches[0].conversion_factor;
        return fefoBatches.some((b) => b.conversion_factor !== first);
    })();

    return (
        <Modal visible={show} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>
                                Stock Out - Remove Inventory
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                Remove used or consumed stock
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Select Item *</Text>
                            <ItemPickerSelect
                                items={items}
                                selectedValue={formData.item_id}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        item_id: value,
                                        unit_id: "",
                                    });
                                    clearError("item_id");
                                }}
                                hasError={!!errors.item_id}
                            />
                            {errors.item_id?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.item_id[0]}
                                </Text>
                            )}
                            {selectedItem && (
                                <View style={styles.stockPreviewBlue}>
                                    <Text style={styles.stockPreviewLabel}>
                                        Available Stock:
                                    </Text>
                                    <Text style={styles.stockPreviewValueBlue}>
                                        {selectedItem.current_stock}{" "}
                                        {selectedItem.unit}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Unit *</Text>
                            {availableUnits.length > 0 ? (
                                <UnitPickerSelect
                                    units={availableUnits.map((u) => ({
                                        id: parseInt(u.id),
                                        name: u.name,
                                        short_name: u.short_name,
                                    }))}
                                    selectedValue={formData.unit_id}
                                    onValueChange={(val) => {
                                        setFormData({
                                            ...formData,
                                            unit_id: val,
                                        });
                                        clearError("unit_id");
                                    }}
                                    placeholder="Choose unit"
                                    hasError={!!errors.unit_id}
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.pickerButton,
                                        { backgroundColor: "#F9FAFB" },
                                    ]}
                                >
                                    <Text
                                        style={styles.pickerButtonPlaceholder}
                                    >
                                        {selectedItem
                                            ? "No active batches available"
                                            : "Select an item first"}
                                    </Text>
                                </View>
                            )}
                            {errors.unit_id?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.unit_id[0]}
                                </Text>
                            )}
                            {selectedItem && (
                                <Text style={styles.formHint}>
                                    Units are based on the item's active batch
                                    stock-in setup.
                                </Text>
                            )}
                        </View>

                        {selectedUnit && effectiveFactor !== 1 && (
                            <View style={styles.infoNote}>
                                <Text style={styles.infoNoteText}>
                                    Conversion: 1 {selectedUnit.name} ={" "}
                                    {effectiveFactor} {selectedItem?.unit}
                                </Text>
                            </View>
                        )}
                        {remainingInUnit !== null && selectedUnit && (
                            <View style={[styles.infoNote, { marginTop: 6 }]}>
                                <Text style={styles.infoNoteText}>
                                    Available: {remainingInUnit} {selectedUnit.name}{remainingInUnit !== 1 ? "s" : ""}
                                </Text>
                            </View>
                        )}
                        {hasMixedFactors && selectedUnit && (
                            <View style={[styles.infoNote, { marginTop: 6, borderLeftColor: "#F59E0B", backgroundColor: "#FFFBEB" }]}>
                                <Text style={[styles.infoNoteText, { color: "#92400E" }]}>
                                    Note: Different suppliers have different conversion factors for {selectedUnit.name}. Stock will be deducted per batch (FEFO).
                                </Text>
                            </View>
                        )}

                        {selectedItem &&
                            formData.quantity &&
                            !isNaN(parseInt(formData.quantity)) &&
                            selectedUnit &&
                            effectiveFactor !== 1 && (
                                <View style={styles.stockPreviewBlue}>
                                    <Text style={styles.stockPreviewLabel}>
                                        Converted quantity:
                                    </Text>
                                    <Text style={styles.stockPreviewValueBlue}>
                                        {normalizedBase} {selectedItem.unit}{" "}
                                        (from {formData.quantity}{" "}
                                        {selectedUnit.name})
                                    </Text>
                                </View>
                            )}

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Quantity to Remove *
                            </Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.quantity && styles.inputError,
                                ]}
                                value={formData.quantity}
                                onChangeText={(text) => {
                                    setFormData({
                                        ...formData,
                                        quantity: text.replace(/[^0-9]/g, ""),
                                    });
                                    clearError("quantity");
                                }}
                                placeholder="Enter quantity"
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                            {errors.quantity?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.quantity[0]}
                                </Text>
                            )}
                            {insufficientStock && (
                                <View style={styles.stockWarnRed}>
                                    <AlertTriangle
                                        size={16}
                                        color="#DC2626"
                                        style={{ marginTop: 1 }}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.stockWarnRedTitle}>
                                            Insufficient Stock
                                        </Text>
                                        <Text style={styles.stockWarnRedText}>
                                            Cannot remove {normalizedBase}{" "}
                                            {selectedItem!.unit}. Only{" "}
                                            {selectedItem!.current_stock}{" "}
                                            {selectedItem!.unit} available.
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {newStock !== null && selectedItem && (
                                <View
                                    style={
                                        willBeLowStock
                                            ? styles.stockPreviewYellow
                                            : styles.stockPreviewRed
                                    }
                                >
                                    <View style={styles.stockPreviewRow}>
                                        <Text style={styles.stockPreviewLabel}>
                                            Remaining After Removal:
                                        </Text>
                                        <Text
                                            style={
                                                willBeLowStock
                                                    ? styles.stockPreviewValueYellow
                                                    : styles.stockPreviewValueRed
                                            }
                                        >
                                            {newStock} {selectedItem.unit}
                                        </Text>
                                    </View>
                                    {willBeLowStock && (
                                        <View
                                            style={styles.stockWarnYellowInner}
                                        >
                                            <AlertTriangle
                                                size={14}
                                                color="#92400E"
                                                style={{ marginTop: 1 }}
                                            />
                                            <Text
                                                style={
                                                    styles.stockWarnYellowText
                                                }
                                            >
                                                Warning: Stock will be below
                                                minimum (
                                                {selectedItem.minimum_stock}{" "}
                                                {selectedItem.unit})
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Reason for Removal *
                            </Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    styles.textArea,
                                    errors.reason && styles.inputError,
                                ]}
                                value={formData.reason}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, reason: text });
                                    clearError("reason");
                                }}
                                placeholder="e.g., Used for patient testing"
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#9CA3AF",
                                    textAlign: "right",
                                    marginTop: 2,
                                }}
                            >
                                {formData.reason.length}/500
                            </Text>
                            {errors.reason?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.reason[0]}
                                </Text>
                            )}
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
                            style={[
                                styles.modalButtonPrimary,
                                { backgroundColor: "#DC2626" },
                                !!insufficientStock && { opacity: 0.5 },
                            ]}
                            onPress={handleSubmit}
                            disabled={loading || !!insufficientStock}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalButtonTextPrimary}>
                                    Remove Stock
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function FlagBatchModal({
    show,
    item,
    onClose,
    onSubmit,
    onError,
}: {
    show: boolean;
    item: InventoryItem | null;
    onClose: () => void;
    onSubmit: (data: {
        batch_id: number;
        reason_type: string;
        reason_details: string;
    }) => Promise<void>;
    onError: (message: string) => void;
}) {
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [reasonType, setReasonType] = useState("damaged");
    const [reasonDetails, setReasonDetails] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const eligibleBatches = (item?.batches ?? []).filter(
        (b) => b.status === "active" && b.current_quantity > 0,
    );

    const isPastExpiry = (date: string | null) => {
        if (!date) return false;
        const expiry = new Date(date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expiry < today;
    };

    const selectedBatch = eligibleBatches.find(
        (b) => String(b.id) === selectedBatchId,
    );
    const batchIsExpired = selectedBatch
        ? isPastExpiry(selectedBatch.expiry_date)
        : false;

    useEffect(() => {
        if (show && item) {
            const first = eligibleBatches[0];
            setSelectedBatchId(first ? String(first.id) : "");
            setReasonType(first && isPastExpiry(first.expiry_date) ? "expired" : "damaged");
            setReasonDetails("");
            setErrors({});
        }
    }, [show, item?.id]);

    useEffect(() => {
        if (selectedBatch) {
            setReasonType(batchIsExpired ? "expired" : "damaged");
            setReasonDetails("");
            setErrors({});
        }
    }, [selectedBatchId]);

    const handleSubmit = async () => {
        const errs: Record<string, string> = {};
        if (!selectedBatchId) errs.batch_id = "Please select a batch.";
        if (reasonType === "expired" && !batchIsExpired)
            errs.reason_type =
                "Expired can only be selected for batches past their expiry date.";
        if (reasonType !== "expired" && !reasonDetails.trim())
            errs.reason_details = "Please provide details for this reason.";
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                batch_id: parseInt(selectedBatchId),
                reason_type: reasonType,
                reason_details: reasonDetails.trim(),
            });
            onClose();
        } catch (err: any) {
            onError(err.response?.data?.message || "Failed to flag batch");
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;

    const reasonTypes = [
        { value: "expired", label: "Expired" },
        { value: "damaged", label: "Damaged" },
        { value: "contaminated", label: "Contaminated" },
        { value: "other", label: "Other" },
    ];

    return (
        <Modal visible={show} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.modalTitle}>
                                Flag Batch as Unusable
                            </Text>
                            <Text style={styles.modalSubtitle} numberOfLines={2}>
                                {item.name}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {eligibleBatches.length === 0 ? (
                            <View style={[styles.infoNote, { borderLeftColor: "#F59E0B", backgroundColor: "#FFFBEB" }]}>
                                <Text style={[styles.infoNoteText, { color: "#92400E" }]}>
                                    No active batch with remaining quantity available for this item.
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Select Batch *</Text>
                                    <BatchPickerSelect
                                        batches={eligibleBatches}
                                        selectedValue={selectedBatchId}
                                        onValueChange={(val) => {
                                            setSelectedBatchId(val);
                                            setErrors((e) => ({ ...e, batch_id: "" }));
                                        }}
                                    />
                                    {!!errors.batch_id && (
                                        <Text style={styles.errorText}>{errors.batch_id}</Text>
                                    )}
                                    {selectedBatch && (
                                        <View style={styles.stockPreviewBlue}>
                                            <Text style={styles.stockPreviewLabel}>
                                                Qty: {Math.floor(selectedBatch.current_quantity)} {item.unit}
                                                {" · "}Expiry: {selectedBatch.expiry_date ?? "No expiry"}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Reason Type *</Text>
                                    <PickerSelect
                                        items={reasonTypes
                                            .filter((r) => r.value !== "expired" || batchIsExpired)
                                            .map((r) => r.label)}
                                        selectedValue={
                                            reasonTypes.find((r) => r.value === reasonType)?.label ?? ""
                                        }
                                        onValueChange={(label) => {
                                            const found = reasonTypes.find((r) => r.label === label);
                                            if (found) {
                                                setReasonType(found.value);
                                                setErrors((e) => ({ ...e, reason_type: "" }));
                                            }
                                        }}
                                        placeholder="Select reason type"
                                        hasError={!!errors.reason_type}
                                    />
                                    {!!errors.reason_type && (
                                        <Text style={styles.errorText}>{errors.reason_type}</Text>
                                    )}
                                    {!batchIsExpired && (
                                        <Text style={styles.formHint}>
                                            "Expired" is only available for batches past their expiry date.
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>
                                        Reason Details{reasonType === "expired" ? " (optional)" : " *"}
                                    </Text>
                                    <TextInput
                                        style={[
                                            styles.formInput,
                                            styles.textArea,
                                            errors.reason_details && styles.inputError,
                                        ]}
                                        value={reasonDetails}
                                        onChangeText={(t) => {
                                            setReasonDetails(t);
                                            setErrors((e) => ({ ...e, reason_details: "" }));
                                        }}
                                        placeholder={
                                            reasonType === "expired"
                                                ? "Optional note (e.g., found during stock check)"
                                                : "Provide a clear reason (e.g., broken seal, contamination risk)"
                                        }
                                        multiline
                                        numberOfLines={3}
                                        maxLength={500}
                                    />
                                    {!!errors.reason_details && (
                                        <Text style={styles.errorText}>{errors.reason_details}</Text>
                                    )}
                                </View>

                                <View style={styles.stockWarnRed}>
                                    <AlertTriangle size={16} color="#DC2626" style={{ marginTop: 1 }} />
                                    <Text style={[styles.stockWarnRedText, { flex: 1 }]}>
                                        This will mark the selected batch as unusable and exclude it from stock availability and FEFO deduction.
                                    </Text>
                                </View>
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.modalButtonSecondary}
                            onPress={onClose}
                        >
                            <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
                        </TouchableOpacity>
                        {eligibleBatches.length > 0 && (
                            <TouchableOpacity
                                style={[
                                    styles.modalButtonPrimary,
                                    { backgroundColor: "#EF4444" },
                                    (!selectedBatchId || loading) && { opacity: 0.5 },
                                ]}
                                onPress={handleSubmit}
                                disabled={loading || !selectedBatchId}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonTextPrimary}>
                                        Flag as Unusable
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function PickerSelect({
    items,
    selectedValue,
    onValueChange,
    placeholder,
    hasError = false,
}: {
    items: string[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    placeholder: string;
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
                    {selectedValue || placeholder}
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
                                {placeholder}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {items.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === item &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(item);
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            selectedValue === item &&
                                                styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {item}
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

function ItemPickerSelect({
    items,
    selectedValue,
    onValueChange,
    hasError = false,
}: {
    items: InventoryItem[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    hasError?: boolean;
}) {
    const [showPicker, setShowPicker] = useState(false);

    const selectedItem = items.find(
        (item) => item.id.toString() === selectedValue,
    );

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
                    {selectedItem ? selectedItem.name : "Choose an item"}
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
                            <Text style={styles.pickerTitle}>Select Item</Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            {items.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === item.id.toString() &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(item.id.toString());
                                        setShowPicker(false);
                                    }}
                                >
                                    <View>
                                        <Text
                                            style={[
                                                styles.pickerOptionText,
                                                selectedValue ===
                                                    item.id.toString() &&
                                                    styles.pickerOptionTextSelected,
                                            ]}
                                        >
                                            {item.name}
                                        </Text>
                                        <Text
                                            style={styles.pickerOptionSubtext}
                                        >
                                            {item.category} • Stock:{" "}
                                            {item.current_stock} {item.unit}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

function AdjustStockModal({
    show,
    item,
    onClose,
    onSubmit,
    onError,
}: {
    show: boolean;
    item: InventoryItem | null;
    onClose: () => void;
    onSubmit: (data: {
        new_quantity: number;
        reason: string;
        batch_id?: number | null;
    }) => Promise<void>;
    onError: (message: string) => void;
}) {
    const [newQuantity, setNewQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [batchId, setBatchId] = useState("");
    const [batches, setBatches] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (show && item) {
            api.get(`/inventory/${item.id}/batches`)
                .then((r) =>
                    setBatches(
                        (r.data.data ?? []).filter(
                            (b: InventoryBatch) => b.status === "active",
                        ),
                    ),
                )
                .catch(() => setBatches([]));
        }
    }, [show, item?.id]);

    const reset = () => {
        setNewQuantity("");
        setReason("");
        setBatchId("");
        setBatches([]);
        setErrors({});
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!newQuantity.trim())
            errs.new_quantity = "New quantity is required.";
        else if (isNaN(parseInt(newQuantity)) || parseInt(newQuantity) < 0)
            errs.new_quantity = "Enter a valid non-negative number.";
        else if (parseInt(newQuantity) > 999999)
            errs.new_quantity = "Quantity cannot exceed 999,999.";
        if (!reason.trim()) errs.reason = "Reason for adjustment is required.";
        else if (reason.length > 500)
            errs.reason = "Reason cannot exceed 500 characters.";
        return errs;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                new_quantity: parseInt(newQuantity),
                reason: reason.trim(),
                batch_id: batchId ? parseInt(batchId) : null,
            });
            reset();
            onClose();
        } catch (err: any) {
            onError(
                err.response?.data?.message ||
                    getApiErrorMessage(err, "Failed to adjust stock."),
            );
        } finally {
            setLoading(false);
        }
    };

    const selectedBatch = batches.find((b) => String(b.id) === batchId);

    if (!item) return null;

    return (
        <Modal visible={show} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>
                                Adjust Stock Level
                            </Text>
                            <Text style={styles.modalSubtitle}>
                                Manual adjustment for {item.name}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.adjustInfoBox}>
                            <View style={styles.adjustInfoRow}>
                                <Text style={styles.adjustInfoLabel}>
                                    Item:
                                </Text>
                                <Text style={styles.adjustInfoValue}>
                                    {item.name}
                                </Text>
                            </View>
                            <View style={styles.adjustInfoRow}>
                                <Text style={styles.adjustInfoLabel}>
                                    Current Stock:
                                </Text>
                                <Text
                                    style={[
                                        styles.adjustInfoValue,
                                        { color: "#2563EB", fontWeight: "700" },
                                    ]}
                                >
                                    {item.current_stock} {item.unit}
                                </Text>
                            </View>
                            <View style={styles.adjustInfoRow}>
                                <Text style={styles.adjustInfoLabel}>
                                    Minimum Stock:
                                </Text>
                                <Text style={styles.adjustInfoValue}>
                                    {item.minimum_stock} {item.unit}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Batch (optional)
                            </Text>
                            <BatchPickerSelect
                                batches={batches}
                                selectedValue={batchId}
                                onValueChange={(val) => {
                                    setBatchId(val);
                                    if (val) {
                                        const b = batches.find(
                                            (b) => String(b.id) === val,
                                        );
                                        if (b)
                                            setNewQuantity(
                                                String(
                                                    Math.floor(
                                                        b.current_quantity,
                                                    ),
                                                ),
                                            );
                                    }
                                }}
                            />
                            {selectedBatch && (
                                <View style={styles.stockPreviewBlue}>
                                    <Text style={styles.stockPreviewLabel}>
                                        Batch current qty:
                                    </Text>
                                    <Text style={styles.stockPreviewValueBlue}>
                                        {selectedBatch.current_quantity}{" "}
                                        {item.unit}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.formHint}>
                                Select a batch to adjust that batch's quantity
                                specifically
                            </Text>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                New Stock Quantity *
                            </Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.new_quantity && styles.inputError,
                                ]}
                                value={newQuantity}
                                onChangeText={(t) => {
                                    setNewQuantity(t.replace(/[^0-9]/g, ""));
                                    if (errors.new_quantity)
                                        setErrors((e) => ({
                                            ...e,
                                            new_quantity: "",
                                        }));
                                }}
                                placeholder="Enter new quantity"
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                            {!!errors.new_quantity && (
                                <Text style={styles.errorText}>
                                    {errors.new_quantity}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Reason for Adjustment *
                            </Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    styles.textArea,
                                    errors.reason && styles.inputError,
                                ]}
                                value={reason}
                                onChangeText={(t) => {
                                    setReason(t);
                                    if (errors.reason)
                                        setErrors((e) => ({
                                            ...e,
                                            reason: "",
                                        }));
                                }}
                                placeholder="e.g., Physical inventory count correction"
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#9CA3AF",
                                    textAlign: "right",
                                    marginTop: 2,
                                }}
                            >
                                {reason.length}/500
                            </Text>
                            {!!errors.reason && (
                                <Text style={styles.errorText}>
                                    {errors.reason}
                                </Text>
                            )}
                        </View>

                        <View style={styles.warningNote}>
                            <AlertCircle size={16} color="#D97706" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.warningNoteTitle}>
                                    Manual Adjustment
                                </Text>
                                <Text style={styles.warningNoteText}>
                                    This will directly update the stock level.
                                    For normal stock movements, use Stock In/Out
                                    instead.
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.modalButtonSecondary}
                            onPress={handleClose}
                        >
                            <Text style={styles.modalButtonTextSecondary}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modalButtonPrimary,
                                { backgroundColor: "#2563EB" },
                            ]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalButtonTextPrimary}>
                                    Adjust Stock
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function EditItemModal({
    show,
    item,
    onClose,
    onSubmit,
    onError,
    categories: categoryOptions,
}: {
    show: boolean;
    item: InventoryItem | null;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    onError: (message: string) => void;
    categories: string[];
}) {
    const units = [
        "pieces",
        "boxes",
        "bottles",
        "tubes",
        "kits",
        "liters",
        "grams",
        "units",
    ];
    const categories = categoryOptions.length > 0 ? categoryOptions : [];

    const [formData, setFormData] = useState({
        name: "",
        category: "",
        minimum_stock: "",
        unit: "",
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Populate when item changes
    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name ?? "",
                category: item.category ?? "",
                minimum_stock: String(item.minimum_stock ?? ""),
                unit: item.unit ?? "",
            });
            setErrors({});
        }
    }, [item?.id]);

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!formData.name.trim()) errs.name = "Item name is required.";
        else if (!/^[a-zA-Z\s\-().]+$/.test(formData.name.trim()))
            errs.name =
                "Only letters, spaces, hyphens, parentheses, and periods allowed.";
        else if (formData.name.length > 255)
            errs.name = "Item name cannot exceed 255 characters.";
        if (!formData.category) errs.category = "Category is required.";
        if (formData.minimum_stock === "")
            errs.minimum_stock = "Minimum stock level is required.";
        else if (
            isNaN(parseInt(formData.minimum_stock)) ||
            parseInt(formData.minimum_stock) < 0
        )
            errs.minimum_stock = "Enter a valid non-negative number.";
        else if (parseInt(formData.minimum_stock) > 999999)
            errs.minimum_stock = "Minimum stock cannot exceed 999,999.";
        if (!formData.unit) errs.unit = "Unit is required.";
        return errs;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                name: formData.name.trim(),
                category: formData.category,
                minimum_stock: parseInt(formData.minimum_stock),
                unit: formData.unit,
            });
            onClose();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                const serverErrs: Record<string, string> = {};
                for (const [key, val] of Object.entries(
                    err.response.data.errors,
                )) {
                    serverErrs[key] = Array.isArray(val)
                        ? (val as string[])[0]
                        : String(val);
                }
                setErrors(serverErrs);
            } else {
                onError(err.response?.data?.message || "Failed to update item");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!item) return null;

    return (
        <Modal visible={show} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.modalTitle}>
                                Edit Item Details
                            </Text>
                            <Text
                                style={styles.modalSubtitle}
                                numberOfLines={2}
                            >
                                Editing: {item.name}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {/* Note */}
                        <View style={styles.infoNote}>
                            <Text style={styles.infoNoteText}>
                                Note: To change the stock quantity use Adjust
                                Stock. This form only edits item details.
                            </Text>
                        </View>

                        {/* Name */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Item Name *</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.name && styles.inputError,
                                ]}
                                value={formData.name}
                                onChangeText={(text) => {
                                    const filtered = text.replace(
                                        /[^a-zA-Z\s\-().]/g,
                                        "",
                                    );
                                    setFormData({
                                        ...formData,
                                        name: filtered,
                                    });
                                    if (errors.name)
                                        setErrors((e) => ({ ...e, name: "" }));
                                }}
                                placeholder="e.g., Blood Collection Tubes"
                                maxLength={255}
                            />
                            {!!errors.name && (
                                <Text style={styles.errorText}>
                                    {errors.name}
                                </Text>
                            )}
                        </View>

                        {/* Category */}
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Category *</Text>
                            <PickerSelect
                                items={categories}
                                selectedValue={formData.category}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        category: value,
                                    });
                                    if (errors.category)
                                        setErrors((e) => ({
                                            ...e,
                                            category: "",
                                        }));
                                }}
                                placeholder="Select category"
                                hasError={!!errors.category}
                            />
                            {!!errors.category && (
                                <Text style={styles.errorText}>
                                    {errors.category}
                                </Text>
                            )}
                        </View>

                        {/* Minimum Stock + Unit */}
                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>
                                    Minimum Stock *
                                </Text>
                                <TextInput
                                    style={[
                                        styles.formInput,
                                        errors.minimum_stock &&
                                            styles.inputError,
                                    ]}
                                    value={formData.minimum_stock}
                                    onChangeText={(text) => {
                                        setFormData({
                                            ...formData,
                                            minimum_stock: text.replace(
                                                /[^0-9]/g,
                                                "",
                                            ),
                                        });
                                        if (errors.minimum_stock)
                                            setErrors((e) => ({
                                                ...e,
                                                minimum_stock: "",
                                            }));
                                    }}
                                    placeholder="0"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                                {!!errors.minimum_stock && (
                                    <Text style={styles.errorText}>
                                        {errors.minimum_stock}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>Unit *</Text>
                                <PickerSelect
                                    items={units}
                                    selectedValue={formData.unit}
                                    onValueChange={(value) => {
                                        setFormData({
                                            ...formData,
                                            unit: value,
                                        });
                                        if (errors.unit)
                                            setErrors((e) => ({
                                                ...e,
                                                unit: "",
                                            }));
                                    }}
                                    placeholder="Select unit"
                                    hasError={!!errors.unit}
                                />
                                {!!errors.unit && (
                                    <Text style={styles.errorText}>
                                        {errors.unit}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Current stock read-only */}
                        <View style={styles.adjustInfoBox}>
                            <View style={styles.adjustInfoRow}>
                                <Text style={styles.adjustInfoLabel}>
                                    Current Stock (read-only):
                                </Text>
                                <Text
                                    style={[
                                        styles.adjustInfoValue,
                                        { color: "#2563EB", fontWeight: "700" },
                                    ]}
                                >
                                    {item.current_stock} {item.unit}
                                </Text>
                            </View>
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
                            style={[
                                styles.modalButtonPrimary,
                                { backgroundColor: "#4F46E5" },
                            ]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalButtonTextPrimary}>
                                    Save Changes
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function DatePickerField({
    value,
    onChange,
    placeholder = "Select date",
    hasError = false,
    minimumDate,
    maximumDate,
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    hasError?: boolean;
    minimumDate?: Date;
    maximumDate?: Date;
}) {
    const [show, setShow] = useState(false);
    const date = value ? new Date(value) : new Date();

    const formatDisplay = (d: Date) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.pickerButton,
                    hasError && styles.pickerButtonError,
                ]}
                onPress={() => setShow(true)}
            >
                <Text
                    style={[
                        styles.pickerButtonText,
                        !value && styles.pickerButtonPlaceholder,
                    ]}
                >
                    {value ? formatDisplay(new Date(value)) : placeholder}
                </Text>
                <CalendarClock color="#6B7280" size={18} />
            </TouchableOpacity>
            {show && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    onChange={(_, selected) => {
                        setShow(false);
                        if (selected) {
                            onChange(selected.toLocaleDateString("en-CA"));
                        }
                    }}
                />
            )}
        </>
    );
}

function UnitPickerSelect({
    units,
    selectedValue,
    onValueChange,
    placeholder = "Select unit",
    hasError = false,
}: {
    units: InventoryUnit[];
    selectedValue: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    hasError?: boolean;
}) {
    const [showPicker, setShowPicker] = useState(false);
    const selected = units.find((u) => String(u.id) === selectedValue);
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
                    {selected
                        ? `${selected.name} (${selected.short_name})`
                        : placeholder}
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
                                {placeholder}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    !selectedValue &&
                                        styles.pickerOptionSelected,
                                ]}
                                onPress={() => {
                                    onValueChange("");
                                    setShowPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.pickerOptionText,
                                        !selectedValue &&
                                            styles.pickerOptionTextSelected,
                                    ]}
                                >
                                    — None —
                                </Text>
                            </TouchableOpacity>
                            {units.map((u) => (
                                <TouchableOpacity
                                    key={u.id}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === String(u.id) &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(String(u.id));
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            selectedValue === String(u.id) &&
                                                styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {u.name} ({u.short_name})
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

function SupplierPickerSelect({
    suppliers,
    selectedValue,
    onValueChange,
}: {
    suppliers: Supplier[];
    selectedValue: string;
    onValueChange: (value: string) => void;
}) {
    const [showPicker, setShowPicker] = useState(false);
    const selected = suppliers.find((s) => String(s.id) === selectedValue);
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
                    {selected ? selected.name : "Select supplier (optional)"}
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
                                Select Supplier
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    !selectedValue &&
                                        styles.pickerOptionSelected,
                                ]}
                                onPress={() => {
                                    onValueChange("");
                                    setShowPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.pickerOptionText,
                                        !selectedValue &&
                                            styles.pickerOptionTextSelected,
                                    ]}
                                >
                                    — None —
                                </Text>
                            </TouchableOpacity>
                            {suppliers.map((s) => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === String(s.id) &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(String(s.id));
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            selectedValue === String(s.id) &&
                                                styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {s.name}
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

function BatchPickerSelect({
    batches,
    selectedValue,
    onValueChange,
}: {
    batches: InventoryBatch[];
    selectedValue: string;
    onValueChange: (value: string) => void;
}) {
    const [showPicker, setShowPicker] = useState(false);
    const selected = batches.find((b) => String(b.id) === selectedValue);
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
                    {selected
                        ? `${selected.batch_number} (qty: ${selected.current_quantity})`
                        : "Select batch (optional)"}
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
                            <Text style={styles.pickerTitle}>Select Batch</Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    !selectedValue &&
                                        styles.pickerOptionSelected,
                                ]}
                                onPress={() => {
                                    onValueChange("");
                                    setShowPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.pickerOptionText,
                                        !selectedValue &&
                                            styles.pickerOptionTextSelected,
                                    ]}
                                >
                                    — Adjust item total —
                                </Text>
                            </TouchableOpacity>
                            {batches.map((b) => (
                                <TouchableOpacity
                                    key={b.id}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === String(b.id) &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(String(b.id));
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            selectedValue === String(b.id) &&
                                                styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {b.batch_number}
                                    </Text>
                                    <Text style={styles.pickerOptionSubtext}>
                                        Qty: {b.current_quantity} • Exp:{" "}
                                        {b.expiry_date ?? "N/A"}
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

function BatchIssueRow({
    batch,
    onFlag,
}: {
    batch: InventoryBatch;
    onFlag?: (b: InventoryBatch) => void;
}) {
    // Use server-computed display_status if available, otherwise derive client-side
    const isExpired = !!(
        batch.expiry_date &&
        new Date(batch.expiry_date + "T00:00:00") < new Date()
    );
    const displayStatus =
        batch.display_status ??
        (batch.current_quantity <= 0
            ? "depleted"
            : isExpired && batch.status === "active"
              ? "expired"
              : batch.status);

    const badgeStyle: Record<string, { bg: string; text: string }> = {
        active: { bg: "#D1FAE5", text: "#065F46" },
        expired: { bg: "#FEE2E2", text: "#991B1B" },
        unusable: { bg: "#FFE4E6", text: "#9F1239" },
        depleted: { bg: "#FEF3C7", text: "#92400E" },
    };
    const colors = badgeStyle[displayStatus] ?? {
        bg: "#F3F4F6",
        text: "#374151",
    };

    const rowBg =
        displayStatus === "expired"
            ? "#FFF5F5"
            : displayStatus === "unusable"
              ? "#FFF1F2"
              : displayStatus === "depleted"
                ? "#FFFBEB"
                : "#fff";

    const rowBorder =
        displayStatus === "expired"
            ? "#FECACA"
            : displayStatus === "unusable"
              ? "#FECDD3"
              : displayStatus === "depleted"
                ? "#FDE68A"
                : "#E5E7EB";

    return (
        <View
            style={[
                batchStyles.row,
                { backgroundColor: rowBg, borderColor: rowBorder },
            ]}
        >
            {/* Item + Batch */}
            <View style={batchStyles.rowHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={batchStyles.itemName} numberOfLines={1}>
                        {batch.item_name ?? "—"}
                    </Text>
                    <Text style={batchStyles.batchNum}>
                        {batch.batch_number}
                    </Text>
                </View>
                <View
                    style={[batchStyles.badge, { backgroundColor: colors.bg }]}
                >
                    <Text
                        style={[batchStyles.badgeText, { color: colors.text }]}
                    >
                        {displayStatus}
                    </Text>
                </View>
            </View>
            {/* Details grid */}
            <View style={batchStyles.grid}>
                <View style={batchStyles.cell}>
                    <Text style={batchStyles.cellLabel}>Supplier</Text>
                    <Text style={batchStyles.cellValue} numberOfLines={1}>
                        {batch.supplier_name ?? "—"}
                    </Text>
                </View>
                <View style={batchStyles.cell}>
                    <Text style={batchStyles.cellLabel}>Remaining</Text>
                    <Text style={batchStyles.cellValue}>
                        {Math.floor(batch.current_quantity)}
                    </Text>
                </View>
                <View style={batchStyles.cell}>
                    <Text style={batchStyles.cellLabel}>Expiration Date</Text>
                    <Text
                        style={[
                            batchStyles.cellValue,
                            isExpired && { color: "#DC2626" },
                        ]}
                    >
                        {batch.expiry_date ?? "No expiry"}
                    </Text>
                </View>
                <View style={batchStyles.cell}>
                    <Text style={batchStyles.cellLabel}>Received</Text>
                    <Text style={batchStyles.cellValue}>
                        {batch.received_date ?? "—"}
                    </Text>
                </View>
            </View>
            {/* Flag button — only for active batches (not yet flagged) */}
            {onFlag && batch.status === "active" && (
                <TouchableOpacity
                    style={batchStyles.flagBtn}
                    onPress={() => onFlag(batch)}
                >
                    <ShieldAlert size={13} color="#EF4444" />
                    <Text style={batchStyles.flagBtnText}>Flag Unusable</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function ExpiringSoonRow({ batch }: { batch: InventoryBatch }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = batch.expiry_date
        ? new Date(batch.expiry_date + "T00:00:00")
        : null;
    const daysLeft = expiry
        ? Math.ceil(
              (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          )
        : null;
    const isUrgent = daysLeft !== null && daysLeft <= 7;

    return (
        <View
            style={[
                batchStyles.row,
                {
                    borderColor: isUrgent ? "#FECACA" : "#FDE68A",
                    backgroundColor: isUrgent ? "#FFF5F5" : "#FFFBEB",
                },
            ]}
        >
            <View style={batchStyles.rowHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={batchStyles.itemName} numberOfLines={1}>
                        {batch.item_name ?? "—"}
                    </Text>
                    <Text style={batchStyles.batchNum}>
                        {batch.batch_number}
                    </Text>
                </View>
                <View
                    style={[
                        batchStyles.badge,
                        { backgroundColor: isUrgent ? "#FEE2E2" : "#FEF3C7" },
                    ]}
                >
                    <Text
                        style={[
                            batchStyles.badgeText,
                            { color: isUrgent ? "#991B1B" : "#92400E" },
                        ]}
                    >
                        {daysLeft !== null
                            ? `${daysLeft}d left`
                            : "expiring soon"}
                    </Text>
                </View>
            </View>
            <View style={batchStyles.grid}>
                <View style={batchStyles.cell}>
                    <Text style={batchStyles.cellLabel}>Supplier</Text>
                    <Text style={batchStyles.cellValue} numberOfLines={1}>
                        {batch.supplier_name ?? "—"}
                    </Text>
                </View>
                <View style={batchStyles.cell}>
                    <Text style={batchStyles.cellLabel}>Remaining</Text>
                    <Text style={batchStyles.cellValue}>
                        {Math.floor(batch.current_quantity)}
                    </Text>
                </View>
                <View style={batchStyles.cell}>
                    <Text style={batchStyles.cellLabel}>Expiration Date</Text>
                    <Text
                        style={[
                            batchStyles.cellValue,
                            {
                                color: isUrgent ? "#DC2626" : "#D97706",
                                fontWeight: "700",
                            },
                        ]}
                    >
                        {batch.expiry_date}
                    </Text>
                </View>
                <View style={batchStyles.cell}>
                    <Text style={batchStyles.cellLabel}>Received</Text>
                    <Text style={batchStyles.cellValue}>
                        {batch.received_date ?? "—"}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const batchStyles = StyleSheet.create({
    row: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    rowHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 10,
    },
    itemName: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111827",
    },
    batchNum: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        marginLeft: 8,
        alignSelf: "flex-start",
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    cell: {
        minWidth: "45%",
        flex: 1,
    },
    cellLabel: {
        fontSize: 10,
        color: "#9CA3AF",
        marginBottom: 2,
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    cellValue: {
        fontSize: 12,
        fontWeight: "600",
        color: "#111827",
    },
    flagBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-end",
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FECACA",
        backgroundColor: "#FEF2F2",
    },
    flagBtnText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#EF4444",
    },
});

function BatchIssuesTab() {
    const [batches, setBatches] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [successDialog, setSuccessDialog] = useState({
        visible: false,
        title: "",
        message: "",
        type: "success" as "success" | "error",
    });
    const [flagReason, setFlagReason] = useState("");
    const [flagReasonError, setFlagReasonError] = useState("");
    const [flagBatch, setFlagBatch] = useState<InventoryBatch | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get("/inventory/batch-issues");
            setBatches(r.data.data ?? []);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const handleFlag = (batch: InventoryBatch) => {
        setFlagBatch(batch);
        setFlagReason("");
        setFlagReasonError("");
    };

    const submitFlag = async () => {
        if (!flagBatch) return;
        if (!flagReason.trim()) {
            setFlagReasonError("Reason is required.");
            return;
        }
        if (flagReason.length > 500) {
            setFlagReasonError("Reason cannot exceed 500 characters.");
            return;
        }
        try {
            await api.post(`/inventory/batches/${flagBatch.id}/flag`, {
                reason: flagReason,
            });
            setFlagBatch(null);
            setSuccessDialog({
                visible: true,
                title: "Success",
                message: "Batch flagged as unusable",
                type: "success",
            });
            load();
        } catch (e: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: e.response?.data?.message || "Failed to flag batch",
                type: "error",
            });
        }
    };

    if (loading)
        return (
            <View style={styles.emptyState}>
                <ActivityIndicator color="#ac3434" />
            </View>
        );

    return (
        <>
            <FlatList
                data={batches}
                keyExtractor={(b) => String(b.id)}
                renderItem={({ item }) => (
                    <BatchIssueRow batch={item} onFlag={handleFlag} />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <ShieldAlert color="#D1D5DB" size={42} />
                        <Text style={styles.emptyTitle}>No batch issues</Text>
                        <Text style={styles.emptySubtitle}>
                            No expired or unusable batches found.
                        </Text>
                    </View>
                }
                contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
            />
            {/* Flag reason modal */}
            <Modal visible={!!flagBatch} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { borderRadius: 16 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                Flag as Unusable
                            </Text>
                            <TouchableOpacity
                                onPress={() => setFlagBatch(null)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ padding: 20 }}>
                            <Text style={styles.formLabel}>Reason *</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    styles.textArea,
                                    flagReasonError
                                        ? styles.inputError
                                        : undefined,
                                ]}
                                value={flagReason}
                                onChangeText={(t) => {
                                    setFlagReason(t);
                                    if (flagReasonError) setFlagReasonError("");
                                }}
                                placeholder="e.g., Contaminated, damaged packaging"
                                multiline
                                numberOfLines={3}
                                maxLength={500}
                            />
                            {!!flagReasonError && (
                                <Text style={styles.errorText}>
                                    {flagReasonError}
                                </Text>
                            )}
                        </View>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalButtonSecondary}
                                onPress={() => setFlagBatch(null)}
                            >
                                <Text style={styles.modalButtonTextSecondary}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButtonPrimary,
                                    { backgroundColor: "#EF4444" },
                                ]}
                                onPress={submitFlag}
                            >
                                <Text style={styles.modalButtonTextPrimary}>
                                    Flag Unusable
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        </>
    );
}

function ExpiringSoonTab() {
    const [batches, setBatches] = useState<InventoryBatch[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get("/inventory/expiring-soon", {
                params: { days: 30 },
            });
            setBatches(r.data.data ?? []);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    if (loading)
        return (
            <View style={styles.emptyState}>
                <ActivityIndicator color="#ac3434" />
            </View>
        );

    return (
        <FlatList
            data={batches}
            keyExtractor={(b) => String(b.id)}
            renderItem={({ item }) => <ExpiringSoonRow batch={item} />}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <CalendarClock color="#D1D5DB" size={42} />
                    <Text style={styles.emptyTitle}>No expiring batches</Text>
                    <Text style={styles.emptySubtitle}>
                        No batches expiring within 30 days.
                    </Text>
                </View>
            }
            contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    loading: { flex: 1, alignItems: "center", justifyContent: "center" },

    // Action Buttons
    actionButtonsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 16,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 6,
    },
    createBtn: { backgroundColor: "#2563EB" },
    stockInBtn: { backgroundColor: "#10B981" },
    stockOutBtn: { backgroundColor: "#DC2626" },
    actionBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 13,
    },
    manageButtonsRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    manageCategoriesButton: {
        flex: 1,
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

    // Category Dropdown
    categoryDropdownButton: {
        flex: 1,
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

    // Filter Rows
    filtersRow: {
        gap: 12,
        marginBottom: 16,
    },
    filterGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
    },
    modalSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 2,
    },
    modalBody: {
        padding: 20,
        maxHeight: 500,
    },
    modalFooter: {
        flexDirection: "row",
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
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

    // Form Styles
    formGroup: {
        marginBottom: 20,
    },
    formGroupHalf: {
        flex: 1,
    },
    formRow: {
        flexDirection: "row",
        gap: 12,
    },
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
    formHint: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 6,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    infoNote: {
        backgroundColor: "#EFF6FF",
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#3B82F6",
    },
    infoNoteText: {
        fontSize: 13,
        color: "#1E40AF",
    },

    // Stock preview boxes (StockIn / StockOut modals)
    stockPreviewBlue: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
    },
    stockPreviewGreen: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F0FDF4",
        borderWidth: 1,
        borderColor: "#BBF7D0",
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
    },
    stockPreviewRed: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
    },
    stockPreviewYellow: {
        backgroundColor: "#FFFBEB",
        borderWidth: 1,
        borderColor: "#FDE68A",
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
    },
    stockPreviewRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    stockPreviewLabel: {
        fontSize: 13,
        color: "#374151",
    },
    stockPreviewValueBlue: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1E3A8A",
    },
    stockPreviewValueGreen: {
        fontSize: 13,
        fontWeight: "700",
        color: "#14532D",
    },
    stockPreviewValueRed: {
        fontSize: 13,
        fontWeight: "700",
        color: "#7F1D1D",
    },
    stockPreviewValueYellow: {
        fontSize: 13,
        fontWeight: "700",
        color: "#78350F",
    },
    stockWarnRed: {
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-start",
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 8,
        padding: 10,
        marginTop: 8,
    },
    stockWarnRedTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#7F1D1D",
    },
    stockWarnRedText: {
        fontSize: 12,
        color: "#B91C1C",
        marginTop: 2,
    },
    stockWarnYellowInner: {
        flexDirection: "row",
        gap: 6,
        alignItems: "flex-start",
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "#FDE68A",
    },
    stockWarnYellowText: {
        fontSize: 12,
        color: "#78350F",
        flex: 1,
    },

    // Picker Button
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
    pickerOptionSubtext: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },

    tabContainer: {
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        maxHeight: 48,
    },
    tab: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: "#ac3434" },
    tabLabel: { color: "#6B7280", fontWeight: "600", fontSize: 14 },
    tabLabelActive: { color: "#ac3434" },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
        color: "#111827",
    },
    summaryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
    },
    summaryCard: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        width: "46%",
        flexGrow: 1,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    summaryCardTotal: {
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    summaryCardGood: {
        backgroundColor: "#ECFDF5",
        borderWidth: 1,
        borderColor: "#A7F3D0",
    },
    summaryCardLowStock: {
        backgroundColor: "#FFFBEB",
        borderWidth: 1,
        borderColor: "#FDE68A",
    },
    summaryCardOutOfStock: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    summaryLabel: { color: "#6B7280", fontSize: 11, marginTop: 2 },
    summaryValue: { fontSize: 22, fontWeight: "700" },
    categorySummarySection: {
        marginBottom: 16,
    },
    categorySummaryTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    categorySummaryScroll: {
        gap: 8,
        paddingRight: 4,
    },
    categoryChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    categoryChipActive: {
        backgroundColor: "#ac3434",
        borderColor: "#ac3434",
    },
    categoryChipLabel: {
        fontSize: 13,
        fontWeight: "500",
        color: "#374151",
        maxWidth: 120,
    },
    categoryChipLabelActive: {
        color: "#fff",
    },
    categoryChipEmpty: {
        borderColor: "#E5E7EB",
        opacity: 0.6,
    },
    categoryChipLabelEmpty: {
        color: "#9CA3AF",
    },
    categoryChipCount: {
        fontSize: 12,
        fontWeight: "700",
        color: "#6B7280",
        backgroundColor: "#F3F4F6",
        borderRadius: 999,
        paddingHorizontal: 7,
        paddingVertical: 1,
    },
    categoryChipCountActive: {
        color: "#ac3434",
        backgroundColor: "#fff",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchIcon: { marginRight: 10 },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        color: "#111827",
        fontSize: 16,
    },
    filterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    filterLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
    },
    statusDropdownButton: {
        flex: 1,
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
    statusDropdownText: {
        fontSize: 15,
        color: "#111827",
        fontWeight: "500",
        flex: 1,
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
        marginBottom: 6,
    },
    itemName: {
        flex: 1,
        flexShrink: 1,
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        marginRight: 10,
    },
    statusBadge: {
        flexShrink: 0,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusText: {
        textTransform: "capitalize",
        fontSize: 12,
        fontWeight: "600",
    },
    itemCategory: { color: "#6B7280", marginBottom: 10 },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    label: { color: "#6B7280", fontSize: 13 },
    value: { color: "#111827", fontWeight: "600" },
    progressBg: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 999,
        overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 999 },
    stockMeta: { marginTop: 8, color: "#9CA3AF", fontSize: 12 },
    cardActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 10,
    },
    editBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: "#EEF2FF",
        borderWidth: 1,
        borderColor: "#C7D2FE",
    },
    editBtnText: { fontSize: 12, fontWeight: "600", color: "#4F46E5" },
    adjustBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: "#EFF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    adjustBtnText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
    toggleBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    toggleBtnText: { fontSize: 12, fontWeight: "600" },
    emptyState: { alignItems: "center", paddingVertical: 80, gap: 6 },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
    emptySubtitle: { color: "#6B7280" },
    transactionCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    transactionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    transactionDate: { color: "#6B7280", fontSize: 12 },
    transactionItem: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    transactionCode: { color: "#6B7280", fontSize: 12, marginBottom: 8 },
    transactionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },
    transactionLabel: { color: "#6B7280", fontSize: 13 },
    transactionValue: { color: "#111827", fontWeight: "600", fontSize: 13 },
    transactionReason: { color: "#6B7280", fontSize: 12, marginTop: 8 },
    performedBy: {
        color: "#6B7280",
        fontSize: 12,
        marginTop: 8,
        fontStyle: "italic",
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    typeBadgeText: { fontWeight: "600", fontSize: 12 },
    inputError: { borderColor: "#EF4444" },
    errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
    flagBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FECACA",
        backgroundColor: "#FEF2F2",
        gap: 4,
    },
    flagBtnText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#EF4444",
    },
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
    centerContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 8,
    },
    // Tab styles
    tabScrollContent: {
        flexDirection: "row",
        alignItems: "stretch",
    },
    // AdjustStockModal styles
    adjustInfoBox: {
        backgroundColor: "#EFF6FF",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    adjustInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
    },
    adjustInfoLabel: { fontSize: 13, color: "#6B7280" },
    adjustInfoValue: { fontSize: 13, color: "#111827", fontWeight: "500" },
    warningNote: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: "#FFFBEB",
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: "#FDE68A",
        marginBottom: 16,
    },
    warningNoteTitle: { fontSize: 13, fontWeight: "700", color: "#D97706" },
    warningNoteText: { fontSize: 12, color: "#92400E", marginTop: 2 },
    batchSection: {
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 10,
    },
    batchSectionTitle: {
        fontSize: 11,
        fontWeight: "700",
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    batchEmpty: { fontSize: 13, color: "#9CA3AF" },
    batchRow: {
        backgroundColor: "#F9FAFB",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 10,
        marginBottom: 8,
    },
    batchRowHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    batchNumber: { fontSize: 13, fontWeight: "700", color: "#111827" },
    batchGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    batchCell: { minWidth: "45%", flex: 1 },
    batchCellLabel: { fontSize: 10, color: "#9CA3AF", marginBottom: 2 },
    batchCellValue: { fontSize: 12, fontWeight: "600", color: "#111827" },
    batchCellSub: { fontSize: 10, color: "#6B7280", marginTop: 1 },
});
