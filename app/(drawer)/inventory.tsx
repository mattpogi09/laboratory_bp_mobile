import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    AlertTriangle,
    ChevronDown,
    History,
    PackageSearch,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    Settings2,
    SlidersHorizontal,
    TrendingDown,
    TrendingUp,
    X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ConfirmDialog, SkeletonRow, SuccessDialog, TransactionLogTab } from "@/components";

type InventoryItem = {
    id: number;
    name: string;
    category: string;
    current_stock: number;
    minimum_stock: number;
    unit: string;
    status: "good" | "low_stock" | "out_of_stock";
    is_active: boolean;
    percentage: number;
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
    const [activeTab, setActiveTab] = useState<"items" | "transactions">(
        "items",
    );
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Key bumped after stock mutations to tell TransactionLogTab to reload
    const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showStockInModal, setShowStockInModal] = useState(false);
    const [showStockOutModal, setShowStockOutModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);

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

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
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
                </View>
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
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === "items" && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab("items")}
                >
                    <PackageSearch
                        color={activeTab === "items" ? "#ac3434" : "#6B7280"}
                        size={18}
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
                        size={18}
                    />
                    <Text
                        style={[
                            styles.tabLabel,
                            activeTab === "transactions" &&
                                styles.tabLabelActive,
                        ]}
                    >
                        Transaction Log
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === "items" ? (
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    ListHeaderComponent={
                        <>
                            {/* Manage Categories */}
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
                                    Manage Categories
                                </Text>
                            </TouchableOpacity>

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

                            {/* Status Summary 2x2 Grid */}
                            <View style={styles.summaryGrid}>
                                <View style={styles.summaryRow}>
                                    <View
                                        style={[
                                            styles.summaryCard,
                                            { borderLeftColor: "#1D4ED8" },
                                        ]}
                                    >
                                        <Text style={styles.summaryLabel}>
                                            Total Items
                                        </Text>
                                        <Text
                                            style={[
                                                styles.summaryValue,
                                                { color: "#1D4ED8" },
                                            ]}
                                        >
                                            {summary?.total_items ?? 0}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.summaryCard,
                                            { borderLeftColor: "#10B981" },
                                        ]}
                                    >
                                        <Text style={styles.summaryLabel}>
                                            Good
                                        </Text>
                                        <Text
                                            style={[
                                                styles.summaryValue,
                                                { color: "#10B981" },
                                            ]}
                                        >
                                            {summary?.good ?? 0}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.summaryRow}>
                                    <View
                                        style={[
                                            styles.summaryCard,
                                            { borderLeftColor: "#F59E0B" },
                                        ]}
                                    >
                                        <Text style={styles.summaryLabel}>
                                            Low Stock
                                        </Text>
                                        <Text
                                            style={[
                                                styles.summaryValue,
                                                { color: "#F59E0B" },
                                            ]}
                                        >
                                            {summary?.low_stock ?? 0}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.summaryCard,
                                            { borderLeftColor: "#DC2626" },
                                        ]}
                                    >
                                        <Text style={styles.summaryLabel}>
                                            Out of Stock
                                        </Text>
                                        <Text
                                            style={[
                                                styles.summaryValue,
                                                { color: "#DC2626" },
                                            ]}
                                        >
                                            {summary?.out_of_stock ?? 0}
                                        </Text>
                                    </View>
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
            ) : (
                <TransactionLogTab refreshTrigger={transactionRefreshKey} />
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
        initial_stock: "",
        unit: "",
        minimum_stock: "",
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
        if (!formData.name.trim()) errs.name = ["Item name is required."];
        else if (!/^[a-zA-Z\s\-().]+$/.test(formData.name.trim()))
            errs.name = [
                "Only letters, spaces, hyphens, parentheses, and periods are allowed.",
            ];
        else if (formData.name.length > 255)
            errs.name = ["Item name cannot exceed 255 characters."];
        if (!formData.category) errs.category = ["Category is required."];
        if (!formData.initial_stock)
            errs.initial_stock = ["Initial stock is required."];
        else if (
            isNaN(parseInt(formData.initial_stock)) ||
            parseInt(formData.initial_stock) < 0
        )
            errs.initial_stock = ["Enter a valid non-negative number."];
        else if (parseInt(formData.initial_stock) > 999999)
            errs.initial_stock = ["Initial stock cannot exceed 999,999."];
        if (!formData.unit) errs.unit = ["Unit is required."];
        if (!formData.minimum_stock && formData.minimum_stock !== "0")
            errs.minimum_stock = ["Minimum stock level is required."];
        else if (
            isNaN(parseInt(formData.minimum_stock)) ||
            parseInt(formData.minimum_stock) < 0
        )
            errs.minimum_stock = ["Minimum stock must be a positive number."];
        else if (parseInt(formData.minimum_stock) > 999999)
            errs.minimum_stock = ["Minimum stock cannot exceed 999,999."];
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
                initial_stock: parseInt(formData.initial_stock),
                minimum_stock: parseInt(formData.minimum_stock),
            });
            setFormData({
                name: "",
                category: "",
                initial_stock: "",
                unit: "",
                minimum_stock: "",
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

                        <View style={styles.formRow}>
                            <View style={styles.formGroupHalf}>
                                <Text style={styles.formLabel}>
                                    Initial Stock *
                                </Text>
                                <TextInput
                                    style={[
                                        styles.formInput,
                                        errors.initial_stock &&
                                            styles.inputError,
                                    ]}
                                    value={formData.initial_stock}
                                    onChangeText={(text) => {
                                        setFormData({
                                            ...formData,
                                            initial_stock: text.replace(
                                                /[^0-9]/g,
                                                "",
                                            ),
                                        });
                                        clearError("initial_stock");
                                    }}
                                    placeholder="0"
                                    keyboardType="number-pad"
                                    maxLength={6}
                                />
                                {errors.initial_stock?.[0] && (
                                    <Text style={styles.errorText}>
                                        {errors.initial_stock[0]}
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
                                        clearError("unit");
                                    }}
                                    placeholder="Select unit"
                                    hasError={!!errors.unit}
                                />
                                {errors.unit?.[0] && (
                                    <Text style={styles.errorText}>
                                        {errors.unit[0]}
                                    </Text>
                                )}
                            </View>
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
                                this threshold
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
        quantity: "",
        reason: "",
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

    const validateStockIn = () => {
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
        const validationErrors = validateStockIn();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        try {
            await onSubmit({
                ...formData,
                quantity: parseInt(formData.quantity),
            });
            setFormData({ item_id: "", quantity: "", reason: "" });
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
                                Quantity to Add *
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
                            {selectedItem &&
                                formData.quantity &&
                                !isNaN(parseInt(formData.quantity)) && (
                                    <View style={styles.stockPreviewGreen}>
                                        <Text style={styles.stockPreviewLabel}>
                                            New Stock After Addition:
                                        </Text>
                                        <Text
                                            style={
                                                styles.stockPreviewValueGreen
                                            }
                                        >
                                            {selectedItem.current_stock +
                                                parseInt(
                                                    formData.quantity,
                                                )}{" "}
                                            {selectedItem.unit}
                                        </Text>
                                    </View>
                                )}
                        </View>

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
                                placeholder="e.g., New delivery from supplier, Restocking, Emergency purchase"
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

                        <View style={styles.infoNote}>
                            <Text style={styles.infoNoteText}>
                                Note: A unique transaction code will be
                                automatically generated for this stock movement.
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
                ...formData,
                quantity: parseInt(formData.quantity),
            });
            setFormData({ item_id: "", quantity: "", reason: "" });
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
    const qty = parseInt(formData.quantity);
    const insufficientStock =
        selectedItem && formData.quantity && !isNaN(qty)
            ? qty > selectedItem.current_stock
            : false;
    const newStock =
        selectedItem && formData.quantity && !isNaN(qty) && !insufficientStock
            ? selectedItem.current_stock - qty
            : null;
    const willBeLowStock =
        newStock !== null &&
        selectedItem &&
        newStock < selectedItem.minimum_stock;

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
                                            Cannot remove {formData.quantity}{" "}
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
                                            Remaining Stock After Removal:
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
                                                minimum level (
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
                                placeholder="e.g., Used for patient testing, Consumed in procedure, Damaged items disposal"
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

                        <View style={styles.infoNote}>
                            <Text style={styles.infoNoteText}>
                                Note: A unique transaction code will be
                                automatically generated for this stock movement.
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
                            style={[
                                styles.modalButtonPrimary,
                                { backgroundColor: "#DC2626" },
                            ]}
                            onPress={handleSubmit}
                            disabled={loading}
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
    onSubmit: (data: { new_quantity: number; reason: string }) => Promise<void>;
    onError: (message: string) => void;
}) {
    const [newQuantity, setNewQuantity] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const reset = () => {
        setNewQuantity("");
        setReason("");
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
                        {/* Item Info */}
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
                                    Category:
                                </Text>
                                <Text style={styles.adjustInfoValue}>
                                    {item.category}
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
                                placeholder="e.g., Physical inventory count correction, Expired items removed, Found additional stock"
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
        marginBottom: 12,
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
        paddingVertical: 12,
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
        gap: 10,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: "row",
        gap: 10,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        borderLeftWidth: 4,
    },
    summaryLabel: { color: "#6B7280", fontSize: 12, textAlign: "center" },
    summaryValue: { fontSize: 22, fontWeight: "700", textAlign: "center" },
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
});
