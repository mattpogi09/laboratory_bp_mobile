import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    Edit,
    FolderOpen,
    Plus,
    Power,
    PowerOff,
    Trash2,
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

import api from "@/app/services/api";
import type { TestCategory } from "@/types";
import { getApiErrorMessage, useResponsiveLayout } from "@/utils";
import { ConfirmDialog, SuccessDialog } from "@/components";

export default function TestCategoriesScreen() {
    const responsive = useResponsiveLayout();
    const [categories, setCategories] = useState<TestCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selected, setSelected] = useState<TestCategory | null>(null);

    const [form, setForm] = useState({ name: "", description: "" });
    const [formErrors, setFormErrors] = useState<{ name?: string; description?: string }>({});

    const validateForm = () => {
        const errs: { name?: string; description?: string } = {};
        if (!form.name.trim()) errs.name = "Category name is required.";
        else if (form.name.length > 50) errs.name = "Category name cannot exceed 50 characters.";
        if (form.description && form.description.length > 500)
            errs.description = "Description cannot exceed 500 characters.";
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

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

    const loadCategories = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/test-categories");
            setCategories(res.data.data ?? res.data);
        } catch (err: any) {
            setLoadError(getApiErrorMessage(err, "Failed to load categories."));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadCategories();
        }, [loadCategories]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadCategories();
    };

    const openCreate = () => {
        setForm({ name: "", description: "" });
        setFormErrors({});
        setShowCreateModal(true);
    };

    const openEdit = (cat: TestCategory) => {
        setSelected(cat);
        setForm({ name: cat.name, description: cat.description ?? "" });
        setFormErrors({});
        setShowEditModal(true);
    };

    const handleCreate = async () => {
        if (!validateForm()) return;
        try {
            await api.post("/test-categories", form);
            setShowCreateModal(false);
            setFormErrors({});
            setSuccessDialog({
                visible: true,
                title: "Created",
                message: "Test category created.",
                type: "success",
            });
            loadCategories();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setFormErrors(err.response.data.errors);
            } else {
                setSuccessDialog({
                    visible: true,
                    title: "Error",
                    message: getApiErrorMessage(err, "Failed to create category."),
                    type: "error",
                });
            }
        }
    };

    const handleUpdate = async () => {
        if (!selected || !validateForm()) return;
        try {
            await api.put(`/test-categories/${selected.id}`, form);
            setShowEditModal(false);
            setSelected(null);
            setFormErrors({});
            setSuccessDialog({
                visible: true,
                title: "Updated",
                message: "Test category updated.",
                type: "success",
            });
            loadCategories();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setFormErrors(err.response.data.errors);
            } else {
                setSuccessDialog({
                    visible: true,
                    title: "Error",
                    message: getApiErrorMessage(err, "Failed to update category."),
                    type: "error",
                });
            }
        }
    };

    const handleToggle = (cat: TestCategory) => {
        setConfirmDialog({
            visible: true,
            title: cat.is_active ? "Deactivate Category" : "Activate Category",
            message: `${cat.is_active ? "Deactivate" : "Activate"} "${cat.name}"?`,
            confirmText: cat.is_active ? "DEACTIVATE" : "ACTIVATE",
            type: "warning",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.post(`/test-categories/${cat.id}/toggle`);
                    setSuccessDialog({
                        visible: true,
                        title: "Done",
                        message: "Status updated.",
                        type: "success",
                    });
                    loadCategories();
                } catch (err: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to update status.",
                        ),
                        type: "error",
                    });
                }
            },
        });
    };

    const handleDelete = (cat: TestCategory) => {
        setConfirmDialog({
            visible: true,
            title: "Delete Category",
            message: `Delete "${cat.name}"? This cannot be undone.`,
            confirmText: "DELETE",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.delete(`/test-categories/${cat.id}`);
                    setSuccessDialog({
                        visible: true,
                        title: "Deleted",
                        message: "Category deleted.",
                        type: "success",
                    });
                    loadCategories();
                } catch (err: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to delete category.",
                        ),
                        type: "error",
                    });
                }
            },
        });
    };

    const renderItem = ({ item }: { item: TestCategory }) => (
        <View style={styles.card}>
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}
                <View
                    style={[
                        styles.badge,
                        item.is_active
                            ? styles.badgeActive
                            : styles.badgeInactive,
                    ]}
                >
                    <Text style={styles.badgeText}>
                        {item.is_active ? "Active" : "Inactive"}
                    </Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openEdit(item)}
                >
                    <Edit size={16} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleToggle(item)}
                >
                    {item.is_active ? (
                        <PowerOff size={16} color="#EF4444" />
                    ) : (
                        <Power size={16} color="#22C55E" />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete(item)}
                >
                    <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

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
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <FolderOpen size={22} color="#ac3434" />
                    <Text style={styles.headerTitle}>Test Categories</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator
                    style={{ marginTop: 40 }}
                    size="large"
                    color="#ac3434"
                />
            ) : loadError && !categories.length ? (
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>
                        Unable to load categories
                    </Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setLoadError(null);
                            loadCategories();
                        }}
                    >
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={["#ac3434"]}
                        />
                    }
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <FolderOpen size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>
                                No test categories yet
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Create / Edit Modal */}
            {[
                {
                    visible: showCreateModal,
                    onClose: () => setShowCreateModal(false),
                    onSave: handleCreate,
                    title: "New Test Category",
                },
                {
                    visible: showEditModal,
                    onClose: () => setShowEditModal(false),
                    onSave: handleUpdate,
                    title: "Edit Test Category",
                },
            ].map(({ visible, onClose, onSave, title }) => (
                <Modal
                    key={title}
                    visible={visible}
                    transparent
                    animationType="slide"
                    onRequestClose={onClose}
                >
                    <View style={styles.overlay}>
                        <View style={styles.modal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{title}</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <X size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[
                                    styles.input,
                                    formErrors.name && styles.inputError,
                                ]}
                                placeholder="Category name *"
                                value={form.name}
                                onChangeText={(t) => {
                                    setForm((f) => ({ ...f, name: t }));
                                    if (formErrors.name)
                                        setFormErrors((e) => ({ ...e, name: undefined }));
                                }}
                                maxLength={50}
                            />
                            <View style={styles.fieldFooter}>
                                {formErrors.name ? (
                                    <Text style={styles.errorText}>
                                        {formErrors.name}
                                    </Text>
                                ) : (
                                    <Text style={styles.charCount}>
                                        {form.name.length}/50
                                    </Text>
                                )}
                            </View>
                            <TextInput
                                style={[
                                    styles.input,
                                    { height: 80 },
                                    formErrors.description && styles.inputError,
                                ]}
                                placeholder="Description (optional)"
                                value={form.description}
                                onChangeText={(t) => {
                                    setForm((f) => ({ ...f, description: t }));
                                    if (formErrors.description)
                                        setFormErrors((e) => ({ ...e, description: undefined }));
                                }}
                                multiline
                                maxLength={500}
                            />
                            <View style={styles.fieldFooter}>
                                {formErrors.description ? (
                                    <Text style={styles.errorText}>
                                        {formErrors.description}
                                    </Text>
                                ) : (
                                    <Text style={styles.charCount}>
                                        {form.description.length}/500
                                    </Text>
                                )}
                            </View>
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={onClose}
                                >
                                    <Text style={styles.cancelBtnText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.saveBtn}
                                    onPress={onSave}
                                >
                                    <Text style={styles.saveBtnText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            ))}

            <ConfirmDialog
                visible={confirmDialog.visible}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() =>
                    setConfirmDialog((d) => ({ ...d, visible: false }))
                }
            />
            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                autoClose={successDialog.type === "success"}
                onClose={() =>
                    setSuccessDialog((d) => ({ ...d, visible: false }))
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#ac3434",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
    list: { padding: 16, gap: 10 },
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 14,
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    colorDot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
    cardInfo: { flex: 1 },
    cardName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 2,
    },
    cardDesc: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
    badge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 99,
    },
    badgeActive: { backgroundColor: "#D1FAE5" },
    badgeInactive: { backgroundColor: "#FEE2E2" },
    badgeText: { fontSize: 12, fontWeight: "600", color: "#374151" },
    cardActions: { flexDirection: "column", gap: 8 },
    iconBtn: { padding: 4 },
    empty: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: "#9CA3AF" },
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
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modal: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: "#111827",
        marginBottom: 4,
    },
    inputError: { borderColor: "#EF4444" },
    fieldFooter: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 12 },
    errorText: { fontSize: 12, color: "#EF4444" },
    charCount: { fontSize: 12, color: "#9CA3AF" },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: "center",
    },
    cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
    saveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: "#ac3434",
        alignItems: "center",
    },
    saveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
