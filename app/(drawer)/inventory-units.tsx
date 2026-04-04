import { useFocusEffect } from "@react-navigation/native";
import { AlertCircle, Edit, Plus, Ruler, Trash2, X } from "lucide-react-native";
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
import { getApiErrorMessage, useResponsiveLayout } from "@/utils";
import { ConfirmDialog, SuccessDialog } from "@/components";

type InventoryUnit = {
    id: number;
    name: string;
    short_name: string;
};

export default function InventoryUnitsScreen() {
    const responsive = useResponsiveLayout();
    const [units, setUnits] = useState<InventoryUnit[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selected, setSelected] = useState<InventoryUnit | null>(null);

    const [form, setForm] = useState({ name: "", short_name: "" });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

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

    const loadUnits = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/inventory-units");
            setUnits(res.data.data ?? []);
        } catch (err: any) {
            setLoadError(getApiErrorMessage(err, "Failed to load units."));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadUnits();
        }, [loadUnits]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadUnits();
    };

    const openCreate = () => {
        setForm({ name: "", short_name: "" });
        setFormErrors({});
        setShowCreateModal(true);
    };

    const openEdit = (unit: InventoryUnit) => {
        setSelected(unit);
        setForm({ name: unit.name, short_name: unit.short_name });
        setFormErrors({});
        setShowEditModal(true);
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = "Unit name is required.";
        else if (form.name.length > 100) errs.name = "Cannot exceed 100 characters.";
        if (!form.short_name.trim()) errs.short_name = "Short name is required.";
        else if (form.short_name.length > 20) errs.short_name = "Cannot exceed 20 characters.";
        return errs;
    };

    const handleCreate = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
        setSubmitting(true);
        try {
            await api.post("/inventory-units", form);
            setShowCreateModal(false);
            setSuccessDialog({ visible: true, title: "Created", message: "Unit created successfully.", type: "success" });
            loadUnits();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                const serverErrs: Record<string, string> = {};
                for (const [k, v] of Object.entries(err.response.data.errors)) {
                    serverErrs[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
                }
                setFormErrors(serverErrs);
            } else {
                setSuccessDialog({ visible: true, title: "Error", message: getApiErrorMessage(err, "Failed to create unit."), type: "error" });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!selected) return;
        const errs = validate();
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
        setSubmitting(true);
        try {
            await api.put(`/inventory-units/${selected.id}`, form);
            setShowEditModal(false);
            setSelected(null);
            setSuccessDialog({ visible: true, title: "Updated", message: "Unit updated successfully.", type: "success" });
            loadUnits();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                const serverErrs: Record<string, string> = {};
                for (const [k, v] of Object.entries(err.response.data.errors)) {
                    serverErrs[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
                }
                setFormErrors(serverErrs);
            } else {
                setSuccessDialog({ visible: true, title: "Error", message: getApiErrorMessage(err, "Failed to update unit."), type: "error" });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (unit: InventoryUnit) => {
        setConfirmDialog({
            visible: true,
            title: "Delete Unit",
            message: `Delete "${unit.name}"? This cannot be undone and will fail if the unit is in use.`,
            confirmText: "DELETE",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.delete(`/inventory-units/${unit.id}`);
                    setSuccessDialog({ visible: true, title: "Deleted", message: "Unit deleted.", type: "success" });
                    loadUnits();
                } catch (err: any) {
                    setSuccessDialog({ visible: true, title: "Error", message: getApiErrorMessage(err, "Failed to delete unit."), type: "error" });
                }
            },
        });
    };

    const renderItem = ({ item }: { item: InventoryUnit }) => (
        <View style={styles.card}>
            <View style={styles.cardIcon}>
                <Ruler size={18} color="#ac3434" />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardShort}>{item.short_name}</Text>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                    <Edit size={16} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
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
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ruler size={22} color="#ac3434" />
                    <Text style={styles.headerTitle}>Inventory Units</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#ac3434" />
            ) : loadError && !units.length ? (
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>Unable to load units</Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoadError(null); loadUnits(); }}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={units}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#ac3434"]} />
                    }
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ruler size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No units yet. Add one to get started.</Text>
                        </View>
                    }
                />
            )}

            {/* Create / Edit Modal */}
            {[
                { visible: showCreateModal, onClose: () => setShowCreateModal(false), onSave: handleCreate, title: "New Inventory Unit" },
                { visible: showEditModal, onClose: () => { setShowEditModal(false); setSelected(null); }, onSave: handleUpdate, title: "Edit Inventory Unit" },
            ].map(({ visible, onClose, onSave, title }) => (
                <Modal key={title} visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                    <View style={styles.overlay}>
                        <View style={styles.modal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{title}</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <X size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Unit Name *</Text>
                            <TextInput
                                style={[styles.input, formErrors.name && styles.inputError]}
                                placeholder="e.g., Milliliter"
                                value={form.name}
                                onChangeText={(t) => { setForm((f) => ({ ...f, name: t })); setFormErrors((e) => ({ ...e, name: "" })); }}
                                maxLength={100}
                            />
                            {!!formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}

                            <Text style={styles.inputLabel}>Short Name *</Text>
                            <TextInput
                                style={[styles.input, formErrors.short_name && styles.inputError]}
                                placeholder="e.g., mL"
                                value={form.short_name}
                                onChangeText={(t) => { setForm((f) => ({ ...f, short_name: t })); setFormErrors((e) => ({ ...e, short_name: "" })); }}
                                maxLength={20}
                            />
                            {!!formErrors.short_name && <Text style={styles.errorText}>{formErrors.short_name}</Text>}

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={submitting}>
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.saveBtnText}>Save</Text>
                                    )}
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
                onCancel={() => setConfirmDialog((d) => ({ ...d, visible: false }))}
            />
            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                autoClose={successDialog.type === "success"}
                onClose={() => setSuccessDialog((d) => ({ ...d, visible: false }))}
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
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 14,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "#FEF2F2",
        alignItems: "center",
        justifyContent: "center",
    },
    cardInfo: { flex: 1 },
    cardName: { fontSize: 15, fontWeight: "600", color: "#111827" },
    cardShort: { fontSize: 13, color: "#6B7280", marginTop: 2 },
    cardActions: { flexDirection: "row", gap: 8 },
    iconBtn: { padding: 6 },
    empty: { flex: 1, alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: "#9CA3AF", textAlign: "center" },
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 12,
    },
    errorTitle: { fontSize: 17, fontWeight: "700", color: "#111827", textAlign: "center" },
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
    inputLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
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
    errorText: { fontSize: 12, color: "#EF4444", marginBottom: 12 },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
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
