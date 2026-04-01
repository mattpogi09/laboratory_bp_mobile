import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    Building2,
    Mail,
    MapPin,
    Phone,
    Plus,
    User,
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
    type TextInputProps,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import { ConfirmDialog, SearchBar } from "@/components";
import { EmptyState } from "@/components";
import { getApiErrorMessage } from "@/utils";

type Supplier = {
    id: number;
    name: string;
    contact_person: string;
    phone: string;
    email: string;
    address: string;
    is_active: boolean;
    created_at: string;
};

const EMPTY_FORM = {
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
};

type SupplierFormField = {
    key: keyof typeof EMPTY_FORM;
    label: string;
    placeholder: string;
    keyboardType?: TextInputProps["keyboardType"];
    multiline?: boolean;
};

const SUPPLIER_FORM_FIELDS: SupplierFormField[] = [
    {
        key: "name",
        label: "Supplier Name",
        placeholder: "e.g. MedSupply Inc.",
    },
    {
        key: "contact_person",
        label: "Contact Person",
        placeholder: "e.g. Juan Dela Cruz",
    },
    {
        key: "phone",
        label: "Phone",
        placeholder: "09XXXXXXXXX",
        keyboardType: "phone-pad",
    },
    {
        key: "email",
        label: "Email",
        placeholder: "supplier@email.com",
        keyboardType: "email-address",
    },
    {
        key: "address",
        label: "Address",
        placeholder: "Full address",
        multiline: true,
    },
];

export default function SupplierScreen() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<Supplier | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const [confirmToggle, setConfirmToggle] = useState<Supplier | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);

    const fetchSuppliers = useCallback(
        async (pageNum = 1, searchVal = search, append = false) => {
            try {
                if (!append) setLoading(true);
                const res = await api.get("/suppliers", {
                    params: { search: searchVal, page: pageNum, per_page: 20 },
                });
                const data: Supplier[] = res.data.data;
                setSuppliers(append ? (prev) => [...prev, ...data] : data);
                setLastPage(res.data.last_page);
                setPage(pageNum);
                setError(null);
            } catch (e: any) {
                setError(getApiErrorMessage(e, "Failed to load suppliers."));
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [search],
    );

    useFocusEffect(
        useCallback(() => {
            fetchSuppliers(1, search);
        }, []),
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSuppliers(1, search);
    };

    const handleSearch = (val: string) => {
        setSearch(val);
        fetchSuppliers(1, val);
    };

    const handleLoadMore = () => {
        if (loadingMore || page >= lastPage) return;
        setLoadingMore(true);
        fetchSuppliers(page + 1, search, true);
    };

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setModalVisible(true);
    };

    const openEdit = (s: Supplier) => {
        setEditing(s);
        setForm({
            name: s.name,
            contact_person: s.contact_person,
            phone: s.phone,
            email: s.email,
            address: s.address,
        });
        setFormErrors({});
        setModalVisible(true);
    };

    const handleSave = async () => {
        setSaving(true);
        setFormErrors({});
        try {
            if (editing) {
                await api.put(`/suppliers/${editing.id}`, form);
            } else {
                await api.post("/suppliers", form);
            }
            setModalVisible(false);
            fetchSuppliers(1, search);
        } catch (e: any) {
            if (e.response?.status === 422) {
                const errs = e.response.data.errors ?? {};
                const flat: Record<string, string> = {};
                Object.keys(errs).forEach((k) => {
                    flat[k] = Array.isArray(errs[k]) ? errs[k][0] : errs[k];
                });
                setFormErrors(flat);
            } else {
                setFormErrors({
                    general: getApiErrorMessage(e, "Failed to save supplier."),
                });
            }
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (s: Supplier) => {
        try {
            await api.post(`/suppliers/${s.id}/toggle`);
            fetchSuppliers(1, search);
        } catch (e: any) {
            setError(getApiErrorMessage(e, "Failed to update status."));
        } finally {
            setConfirmToggle(null);
        }
    };

    const handleDelete = async (s: Supplier) => {
        try {
            await api.delete(`/suppliers/${s.id}`);
            fetchSuppliers(1, search);
        } catch (e: any) {
            setError(getApiErrorMessage(e, "Failed to delete supplier."));
        } finally {
            setConfirmDelete(null);
        }
    };

    const renderItem = ({ item }: { item: Supplier }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                    <Building2 color="#ac3434" size={18} />
                    <Text style={styles.cardName}>{item.name}</Text>
                </View>
                <View
                    style={[
                        styles.badge,
                        item.is_active
                            ? styles.badgeActive
                            : styles.badgeInactive,
                    ]}
                >
                    <Text
                        style={[
                            styles.badgeText,
                            { color: item.is_active ? "#065F46" : "#991B1B" },
                        ]}
                    >
                        {item.is_active ? "Active" : "Inactive"}
                    </Text>
                </View>
            </View>

            <View style={styles.infoRow}>
                <User color="#6B7280" size={14} />
                <Text style={styles.infoText}>{item.contact_person}</Text>
            </View>
            <View style={styles.infoRow}>
                <Phone color="#6B7280" size={14} />
                <Text style={styles.infoText}>{item.phone}</Text>
            </View>
            <View style={styles.infoRow}>
                <Mail color="#6B7280" size={14} />
                <Text style={styles.infoText}>{item.email}</Text>
            </View>
            <View style={styles.infoRow}>
                <MapPin color="#6B7280" size={14} />
                <Text style={styles.infoText}>{item.address}</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.btnEdit}
                    onPress={() => openEdit(item)}
                >
                    <Text style={styles.btnEditText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.btnToggle,
                        item.is_active
                            ? styles.btnDeactivate
                            : styles.btnActivate,
                    ]}
                    onPress={() => setConfirmToggle(item)}
                >
                    <Text style={styles.btnToggleText}>
                        {item.is_active ? "Deactivate" : "Activate"}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.btnDelete}
                    onPress={() => setConfirmDelete(item)}
                >
                    <Text style={styles.btnDeleteText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Search + Add */}
            <View style={styles.topBar}>
                <View style={styles.searchBox}>
                    <SearchBar
                        value={search}
                        onChangeText={handleSearch}
                        placeholder="Search suppliers..."
                        onClear={() => handleSearch("")}
                    />
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                    <Plus color="#fff" size={20} />
                </TouchableOpacity>
            </View>

            {error && (
                <View style={styles.errorBanner}>
                    <AlertCircle color="#991B1B" size={16} />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#ac3434" />
                </View>
            ) : (
                <FlatList
                    data={suppliers}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator
                                color="#ac3434"
                                style={{ marginVertical: 12 }}
                            />
                        ) : null
                    }
                    ListEmptyComponent={
                        <EmptyState
                            icon={Building2}
                            title="No suppliers found"
                            message="Add your first supplier using the + button."
                        />
                    }
                />
            )}

            {/* Create / Edit Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editing ? "Edit Supplier" : "Add Supplier"}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            {formErrors.general && (
                                <Text style={styles.fieldError}>
                                    {formErrors.general}
                                </Text>
                            )}

                            {SUPPLIER_FORM_FIELDS.map((field) => (
                                <View key={field.key} style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>
                                        {field.label}
                                    </Text>
                                    <TextInput
                                        style={[
                                            styles.fieldInput,
                                            field.multiline &&
                                                styles.fieldInputMulti,
                                            formErrors[field.key] &&
                                                styles.fieldInputError,
                                        ]}
                                        placeholder={field.placeholder}
                                        placeholderTextColor="#9CA3AF"
                                        value={form[field.key]}
                                        onChangeText={(v) =>
                                            setForm((f) => ({
                                                ...f,
                                                [field.key]: v,
                                            }))
                                        }
                                        keyboardType={
                                            field.keyboardType ?? "default"
                                        }
                                        multiline={field.multiline}
                                        numberOfLines={
                                            field.multiline ? 3 : undefined
                                        }
                                        autoCapitalize="none"
                                    />
                                    {formErrors[field.key] && (
                                        <Text style={styles.fieldError}>
                                            {formErrors[field.key]}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.btnCancel}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.btnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.btnSave,
                                    saving && styles.btnDisabled,
                                ]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator
                                        color="#fff"
                                        size="small"
                                    />
                                ) : (
                                    <Text style={styles.btnSaveText}>
                                        {editing ? "Update" : "Create"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ConfirmDialog
                visible={!!confirmToggle}
                title={
                    confirmToggle?.is_active
                        ? "Deactivate Supplier"
                        : "Activate Supplier"
                }
                message={`Are you sure you want to ${confirmToggle?.is_active ? "deactivate" : "activate"} ${confirmToggle?.name}?`}
                confirmText={
                    confirmToggle?.is_active ? "Deactivate" : "Activate"
                }
                type={confirmToggle?.is_active ? "danger" : "info"}
                onConfirm={() => confirmToggle && handleToggle(confirmToggle)}
                onCancel={() => setConfirmToggle(null)}
            />

            <ConfirmDialog
                visible={!!confirmDelete}
                title="Delete Supplier"
                message={`Are you sure you want to delete ${confirmDelete?.name}? This cannot be undone.`}
                confirmText="Delete"
                type="danger"
                onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
                onCancel={() => setConfirmDelete(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F3F4F6" },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    searchBox: {
        flex: 1,
    },
    addBtn: {
        backgroundColor: "#ac3434",
        borderRadius: 8,
        padding: 10,
    },
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FEE2E2",
        padding: 12,
        margin: 12,
        borderRadius: 8,
    },
    errorText: { color: "#991B1B", fontSize: 13, flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: 12, paddingBottom: 40 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    cardTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    cardName: { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    badgeActive: { backgroundColor: "#D1FAE5" },
    badgeInactive: { backgroundColor: "#FEE2E2" },
    badgeText: { fontSize: 12, fontWeight: "600" },
    infoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 6,
    },
    infoText: { fontSize: 13, color: "#374151", flex: 1 },
    actions: {
        flexDirection: "row",
        gap: 8,
        marginTop: 12,
        flexWrap: "wrap",
    },
    btnEdit: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        alignItems: "center",
    },
    btnEditText: { fontSize: 13, fontWeight: "600", color: "#374151" },
    btnToggle: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    btnActivate: { backgroundColor: "#D1FAE5" },
    btnDeactivate: { backgroundColor: "#FEF3C7" },
    btnToggleText: { fontSize: 13, fontWeight: "600", color: "#374151" },
    btnDelete: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: "#FEE2E2",
        alignItems: "center",
    },
    btnDeleteText: { fontSize: 13, fontWeight: "600", color: "#991B1B" },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalBox: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "90%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
    modalBody: { padding: 16 },
    modalFooter: {
        flexDirection: "row",
        gap: 10,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    fieldGroup: { marginBottom: 14 },
    fieldLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 6,
    },
    fieldInput: {
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#D1D5DB",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: "#111827",
    },
    fieldInputMulti: { minHeight: 80, textAlignVertical: "top" },
    fieldInputError: { borderColor: "#EF4444" },
    fieldError: { fontSize: 12, color: "#EF4444", marginTop: 4 },
    btnCancel: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#D1D5DB",
        alignItems: "center",
    },
    btnCancelText: { fontSize: 15, fontWeight: "600", color: "#374151" },
    btnSave: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#ac3434",
        alignItems: "center",
    },
    btnSaveText: { fontSize: 15, fontWeight: "600", color: "#fff" },
    btnDisabled: { opacity: 0.6 },
});
