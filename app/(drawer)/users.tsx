import { useFocusEffect } from "@react-navigation/native";
import {
    AlertCircle,
    ChevronDown,
    Edit,
    Eye,
    EyeOff,
    Plus,
    Power,
    PowerOff,
    Search,
    UserCog,
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
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SkeletonRow, SuccessDialog } from "@/components";
import { useAuth } from "@/contexts/AuthContext";

type User = {
    id: number;
    name: string;
    username: string;
    email: string;
    role: "admin" | "lab_staff" | "cashier";
    is_active: boolean;
    license_number: string | null;
    professional_title: string | null;
    test_categories: string[];
    created_at: string;
};

type UsersResponse = {
    data: User[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

export default function UsersScreen() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [meta, setMeta] = useState<{
        current_page: number;
        last_page: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showPassword, setShowPassword] = useState(false);
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

    const loadUsers = useCallback(
        async (page = 1, replace = false, filterOverride?: string) => {
            try {
                if (page === 1 && !refreshing) setLoading(true);
                const params: any = { page, per_page: 20 };
                if (searchQuery) params.search = searchQuery;
                const activeFilter = filterOverride !== undefined ? filterOverride : roleFilter;
                if (activeFilter) params.role = activeFilter;

                const response = await api.get("/users", { params });
                const data: UsersResponse = response.data;
                setMeta({
                    current_page: data.current_page,
                    last_page: data.last_page,
                });
                setUsers((prev) =>
                    replace || page === 1 ? data.data : [...prev, ...data.data],
                );
            } catch (error: any) {
                if (page === 1) {
                    setLoadError(
                        getApiErrorMessage(error, "Failed to load users."),
                    );
                } else {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            error,
                            "Failed to load users.",
                        ),
                        type: "error",
                    });
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [refreshing, searchQuery, roleFilter],
    );

    useFocusEffect(
        useCallback(() => {
            loadUsers(1, true);
        }, [loadUsers]),
    );

    useEffect(() => {
        const t = setTimeout(() => loadUsers(1, true), 400);
        return () => clearTimeout(t);
    }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRefresh = () => {
        setRefreshing(true);
        loadUsers(1, true);
    };

    const handleCreate = async (formData: any) => {
        await api.post("/users", formData);
        setSuccessDialog({
            visible: true,
            title: "Success",
            message: "User created successfully",
            type: "success",
        });
        loadUsers(1, true);
    };

    const handleUpdate = async (id: number, formData: any) => {
        await api.put(`/users/${id}`, formData);
        setSuccessDialog({
            visible: true,
            title: "Success",
            message: "User updated successfully",
            type: "success",
        });
        loadUsers(1, true);
    };

    const handleToggle = async (user: User) => {
        if (user.username === "superadmin") {
            setSuccessDialog({
                visible: true,
                title: "Action Not Allowed",
                message: "Cannot deactivate the super admin account",
                type: "warning",
            });
            return;
        }
        setConfirmDialog({
            visible: true,
            title: `${user.is_active ? "Deactivate" : "Activate"} User`,
            message: `Are you sure you want to ${
                user.is_active ? "deactivate" : "activate"
            } ${user.name}?`,
            confirmText: user.is_active ? "DEACTIVATE" : "ACTIVATE",
            type: user.is_active ? "warning" : "info",
            onConfirm: async () => {
                setConfirmDialog({ ...confirmDialog, visible: false });
                try {
                    await api.post(`/users/${user.id}/toggle`);
                    setSuccessDialog({
                        visible: true,
                        title: "Success",
                        message: `User ${
                            user.is_active ? "deactivated" : "activated"
                        } successfully`,
                        type: "success",
                    });
                    loadUsers(1, true);
                } catch (error: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message:
                            error.response?.data?.message ||
                            "Failed to toggle user status",
                        type: "error",
                    });
                }
            },
        });
    };

    const formatRole = (role: string) => {
        switch (role) {
            case "admin":
                return "Admin";
            case "lab_staff":
                return "Lab Staff";
            case "cashier":
                return "Cashier";
            default:
                return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "admin":
                return { bg: "#FEE2E2", text: "#991B1B" };
            case "lab_staff":
                return { bg: "#DBEAFE", text: "#1E40AF" };
            case "cashier":
                return { bg: "#D1FAE5", text: "#065F46" };
            default:
                return { bg: "#F3F4F6", text: "#374151" };
        }
    };

    if (loading && !users.length) {
        return (
            <View style={styles.container}>
                <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                    <SkeletonRow count={6} />
                </View>
            </View>
        );
    }

    if (loadError && !users.length) {
        return (
            <View style={styles.container}>
                <View style={styles.errorContainer}>
                    <AlertCircle color="#EF4444" size={36} />
                    <Text style={styles.errorTitle}>Unable to load users</Text>
                    <Text style={styles.errorMessage}>{loadError}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                            setLoadError(null);
                            loadUsers(1, true);
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
                <View style={styles.headerRow}>
                    <View style={styles.searchContainer}>
                        <Search
                            color="#6B7280"
                            size={18}
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search users..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowCreateModal(true)}
                    >
                        <Plus color="#fff" size={18} />
                        <Text style={styles.addButtonText}>Add User</Text>
                    </TouchableOpacity>
                </View>

                {/* Role filter pills */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.pillsRow}
                    contentContainerStyle={{
                        gap: 6,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                    }}
                >
                    {[
                        { label: "All", value: "" },
                        { label: "Admin", value: "admin" },
                        { label: "Lab Staff", value: "lab_staff" },
                        { label: "Cashier", value: "cashier" },
                    ].map((r) => (
                        <TouchableOpacity
                            key={r.value}
                            style={[
                                styles.pill,
                                roleFilter === r.value && styles.pillActive,
                            ]}
                            onPress={() => {
                                    setRoleFilter(r.value);
                                    loadUsers(1, true, r.value);
                                }}
                        >
                            <Text
                                style={[
                                    styles.pillText,
                                    roleFilter === r.value &&
                                        styles.pillTextActive,
                                ]}
                            >
                                {r.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.userName}>{item.name}</Text>
                                <Text style={styles.userEmail}>
                                    {item.email}
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
                        <View style={styles.cardBody}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Username:</Text>
                                <Text style={styles.infoValue}>
                                    {item.username}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Role:</Text>
                                <View
                                    style={[
                                        styles.roleBadge,
                                        {
                                            backgroundColor: getRoleColor(
                                                item.role,
                                            ).bg,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.roleText,
                                            {
                                                color: getRoleColor(item.role)
                                                    .text,
                                            },
                                        ]}
                                    >
                                        {formatRole(item.role)}
                                    </Text>
                                </View>
                            </View>
                            {item.professional_title ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Title:</Text>
                                    <Text style={styles.infoValue}>
                                        {item.professional_title}
                                    </Text>
                                </View>
                            ) : null}
                            {item.license_number ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>
                                        License #:
                                    </Text>
                                    <Text style={styles.infoValue}>
                                        {item.license_number}
                                    </Text>
                                </View>
                            ) : null}
                            {item.role === "lab_staff" &&
                            item.test_categories?.length > 0 ? (
                                <View
                                    style={[
                                        styles.infoRow,
                                        {
                                            flexWrap: "wrap",
                                            alignItems: "flex-start",
                                        },
                                    ]}
                                >
                                    <Text style={styles.infoLabel}>
                                        Categories:
                                    </Text>
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            flexWrap: "wrap",
                                            gap: 4,
                                            flex: 1,
                                        }}
                                    >
                                        {item.test_categories.map((cat) => (
                                            <View
                                                key={cat}
                                                style={styles.catChip}
                                            >
                                                <Text
                                                    style={styles.catChipText}
                                                >
                                                    {cat}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ) : null}
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                    setSelectedUser(item);
                                    setShowEditModal(true);
                                }}
                            >
                                <Edit color="#2563EB" size={16} />
                                <Text style={styles.actionButtonText}>
                                    Edit
                                </Text>
                            </TouchableOpacity>
                            {item.id !== currentUser?.id &&
                                item.username !== "superadmin" && (
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => handleToggle(item)}
                                    >
                                        {item.is_active ? (
                                            <PowerOff
                                                color="#DC2626"
                                                size={16}
                                            />
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
                                )}
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyWrapper}>
                        <UserCog color="#D1D5DB" size={42} />
                        <Text style={styles.emptyTitle}>No users found</Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery
                                ? "Try a different search term"
                                : "Add your first user to get started"}
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

            <CreateUserModal
                show={showCreateModal}
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

            {selectedUser && (
                <EditUserModal
                    show={showEditModal}
                    user={selectedUser}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                    onSubmit={handleUpdate}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
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

function CreateUserModal({
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
        username: "",
        email: "",
        password: "",
        role: "",
        license_number: "",
        professional_title: "",
        test_categories: [] as string[],
    });
    const [showPassword, setShowPassword] = useState(false);
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
        if (!formData.name.trim()) errs.name = ["Name is required."];
        if (!formData.username.trim())
            errs.username = ["Username is required."];
        else if (/\s/.test(formData.username))
            errs.username = ["Username must not contain spaces."];
        if (!formData.email.trim()) errs.email = ["Email is required."];
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
            errs.email = ["Enter a valid email address."];
        if (!formData.password) errs.password = ["Password is required."];
        else if (formData.password.length < 8)
            errs.password = ["Password must be at least 8 characters."];
        if (!formData.role) errs.role = ["Role is required."];
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
            await onSubmit(formData);
            setFormData({
                name: "",
                username: "",
                email: "",
                password: "",
                role: "",
                license_number: "",
                professional_title: "",
                test_categories: [],
            });
            setErrors({});
            onClose();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                onError(getApiErrorMessage(err, "Failed to create user."));
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
                        <Text style={styles.modalTitle}>Add New User</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.modalBody}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Name</Text>
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
                                placeholder="Enter full name"
                            />
                            {errors.name?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.name[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Username</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.username && styles.inputError,
                                ]}
                                value={formData.username}
                                onChangeText={(text) => {
                                    setFormData({
                                        ...formData,
                                        username: text,
                                    });
                                    clearError("username");
                                }}
                                placeholder="Enter username"
                                autoCapitalize="none"
                            />
                            {errors.username?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.username[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Email</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.email && styles.inputError,
                                ]}
                                value={formData.email}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, email: text });
                                    clearError("email");
                                }}
                                placeholder="Enter email address"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {errors.email?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.email[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[
                                        styles.formInput,
                                        errors.password && styles.inputError,
                                    ]}
                                    value={formData.password}
                                    onChangeText={(text) => {
                                        setFormData({
                                            ...formData,
                                            password: text,
                                        });
                                        clearError("password");
                                    }}
                                    placeholder="Enter password"
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    style={styles.passwordToggle}
                                    onPress={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff color="#6B7280" size={20} />
                                    ) : (
                                        <Eye color="#6B7280" size={20} />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {errors.password?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.password[0]}
                                </Text>
                            )}
                            <PasswordStrengthChecker
                                password={formData.password}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Role</Text>
                            <RolePicker
                                selectedValue={formData.role}
                                hasError={!!errors.role}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        role: value as
                                            | "admin"
                                            | "lab_staff"
                                            | "cashier",
                                    });
                                    clearError("role");
                                }}
                            />
                            {errors.role?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.role[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Professional Title{" "}
                                <Text style={{ color: "#9CA3AF" }}>
                                    (optional)
                                </Text>
                            </Text>
                            <TitlePicker
                                value={formData.professional_title}
                                onChange={(text) =>
                                    setFormData({
                                        ...formData,
                                        professional_title: text,
                                    })
                                }
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                License Number{" "}
                                <Text style={{ color: "#9CA3AF" }}>
                                    (optional)
                                </Text>
                            </Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.license_number}
                                onChangeText={(text) =>
                                    setFormData({
                                        ...formData,
                                        license_number: text,
                                    })
                                }
                                placeholder="e.g. 0083687"
                            />
                        </View>

                        {formData.role === "lab_staff" && (
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>
                                    Test Categories
                                </Text>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        flexWrap: "wrap",
                                        gap: 6,
                                    }}
                                >
                                    {[
                                        "Blood Chemistry",
                                        "Hematology",
                                        "Clinical Microscopy",
                                        "Serology / Immunology",
                                        "Procedure Ultrasound",
                                        "X-ray",
                                        "Drug Test",
                                        "Others",
                                    ].map((cat) => {
                                        const selected =
                                            formData.test_categories.includes(
                                                cat,
                                            );
                                        return (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.catChip,
                                                    selected && {
                                                        backgroundColor:
                                                            "#ac3434",
                                                    },
                                                ]}
                                                onPress={() =>
                                                    setFormData({
                                                        ...formData,
                                                        test_categories:
                                                            selected
                                                                ? formData.test_categories.filter(
                                                                      (c) =>
                                                                          c !==
                                                                          cat,
                                                                  )
                                                                : [
                                                                      ...formData.test_categories,
                                                                      cat,
                                                                  ],
                                                    })
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.catChipText,
                                                        selected && {
                                                            color: "#fff",
                                                        },
                                                    ]}
                                                >
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}
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
                                    Add User
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const PASSWORD_CHECKS = [
    { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
    { label: "At least 1 number", test: (p: string) => /\d/.test(p) },
    {
        label: "At least 1 lowercase letter",
        test: (p: string) => /[a-z]/.test(p),
    },
    {
        label: "At least 1 uppercase letter",
        test: (p: string) => /[A-Z]/.test(p),
    },
];

function PasswordStrengthChecker({ password }: { password: string }) {
    if (!password) return null;
    const passed = PASSWORD_CHECKS.filter((c) => c.test(password)).length;
    const strength =
        passed <= 1
            ? "Weak"
            : passed === 2
              ? "Fair"
              : passed === 3
                ? "Good"
                : "Strong";
    const strengthColor =
        passed <= 1
            ? "#EF4444"
            : passed === 2
              ? "#F59E0B"
              : passed === 3
                ? "#3B82F6"
                : "#10B981";
    return (
        <View style={styles.strengthContainer}>
            <Text style={[styles.strengthLabel, { color: strengthColor }]}>
                {strength} password. Must contain:
            </Text>
            {PASSWORD_CHECKS.map((c) => {
                const ok = c.test(password);
                return (
                    <View key={c.label} style={styles.strengthRow}>
                        <View
                            style={[
                                styles.strengthDot,
                                { backgroundColor: ok ? "#10B981" : "#D1D5DB" },
                            ]}
                        />
                        <Text
                            style={[
                                styles.strengthCheck,
                                { color: ok ? "#10B981" : "#6B7280" },
                            ]}
                        >
                            {c.label}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const TITLE_PRESETS = [
    "Chief Medical Technologist",
    "Medical Technologist",
    "Senior Medical Technologist",
    "Laboratory Technician",
];
const OTHER_TITLE = "Other (type manually)";

function TitlePicker({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const [showPicker, setShowPicker] = useState(false);
    const isPreset = TITLE_PRESETS.includes(value);
    const displayLabel =
        value === "" ? "Select title" : isPreset ? value : OTHER_TITLE;

    return (
        <>
            <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowPicker(true)}
            >
                <Text
                    style={[
                        styles.pickerButtonText,
                        !value && styles.pickerButtonPlaceholder,
                    ]}
                >
                    {displayLabel}
                </Text>
                <ChevronDown color="#6B7280" size={20} />
            </TouchableOpacity>
            {!isPreset && value !== "" && (
                <TextInput
                    style={[styles.formInput, { marginTop: 8 }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Type title manually..."
                />
            )}
            <Modal visible={showPicker} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPicker(false)}
                >
                    <View style={styles.pickerModal}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>
                                Professional Title
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerList}>
                            {TITLE_PRESETS.map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.pickerOption,
                                        value === t &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onChange(t);
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            value === t &&
                                                styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[
                                    styles.pickerOption,
                                    !isPreset &&
                                        value !== "" &&
                                        styles.pickerOptionSelected,
                                ]}
                                onPress={() => {
                                    onChange("");
                                    setShowPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.pickerOptionText,
                                        !isPreset &&
                                            value !== "" &&
                                            styles.pickerOptionTextSelected,
                                    ]}
                                >
                                    {OTHER_TITLE}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

function RolePicker({
    selectedValue,
    onValueChange,
    hasError = false,
}: {
    selectedValue: string;
    onValueChange: (value: string) => void;
    hasError?: boolean;
}) {
    const [showPicker, setShowPicker] = useState(false);

    const roles = [
        { value: "admin", label: "Admin" },
        { value: "lab_staff", label: "Lab Staff" },
        { value: "cashier", label: "Cashier" },
    ];

    const getSelectedLabel = () => {
        const role = roles.find((r) => r.value === selectedValue);
        return role ? role.label : "Select role";
    };

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
                    {getSelectedLabel()}
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
                            <Text style={styles.pickerTitle}>Select Role</Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(false)}
                            >
                                <X color="#6B7280" size={24} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pickerList}>
                            {roles.map((role) => (
                                <TouchableOpacity
                                    key={role.value}
                                    style={[
                                        styles.pickerOption,
                                        selectedValue === role.value &&
                                            styles.pickerOptionSelected,
                                    ]}
                                    onPress={() => {
                                        onValueChange(role.value);
                                        setShowPicker(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.pickerOptionText,
                                            selectedValue === role.value &&
                                                styles.pickerOptionTextSelected,
                                        ]}
                                    >
                                        {role.label}
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

function EditUserModal({
    show,
    user,
    onClose,
    onSubmit,
    showPassword,
    setShowPassword,
    onError,
}: {
    show: boolean;
    user: User;
    onClose: () => void;
    onSubmit: (id: number, data: any) => void;
    showPassword: boolean;
    setShowPassword: (show: boolean) => void;
    onError: (message: string) => void;
}) {
    const [formData, setFormData] = useState({
        name: user.name,
        username: user.username,
        email: user.email,
        password: "",
        role: user.role,
        license_number: user.license_number ?? "",
        professional_title: user.professional_title ?? "",
        test_categories: user.test_categories ?? [],
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
        if (!formData.name.trim()) errs.name = ["Name is required."];
        if (!formData.username.trim())
            errs.username = ["Username is required."];
        else if (/\s/.test(formData.username))
            errs.username = ["Username must not contain spaces."];
        if (!formData.email.trim()) errs.email = ["Email is required."];
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
            errs.email = ["Enter a valid email address."];
        if (formData.password && formData.password.length < 8)
            errs.password = ["Password must be at least 8 characters."];
        if (!formData.role) errs.role = ["Role is required."];
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
            const submitData: any = { ...formData };
            if (!submitData.password) {
                delete submitData.password;
            }
            await onSubmit(user.id, submitData);
            setErrors({});
            setFormData({ ...formData, password: "" });
            onClose();
        } catch (err: any) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                onError(getApiErrorMessage(err, "Failed to update user."));
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
                        <Text style={styles.modalTitle}>Edit User</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X color="#6B7280" size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.modalBody}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Name</Text>
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
                                placeholder="Enter full name"
                            />
                            {errors.name?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.name[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Username</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.username && styles.inputError,
                                ]}
                                value={formData.username}
                                onChangeText={(text) => {
                                    setFormData({
                                        ...formData,
                                        username: text,
                                    });
                                    clearError("username");
                                }}
                                placeholder="Enter username"
                                autoCapitalize="none"
                            />
                            {errors.username?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.username[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Email</Text>
                            <TextInput
                                style={[
                                    styles.formInput,
                                    errors.email && styles.inputError,
                                ]}
                                value={formData.email}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, email: text });
                                    clearError("email");
                                }}
                                placeholder="Enter email address"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {errors.email?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.email[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Role</Text>
                            <RolePicker
                                selectedValue={formData.role}
                                hasError={!!errors.role}
                                onValueChange={(value) => {
                                    setFormData({
                                        ...formData,
                                        role: value as
                                            | "admin"
                                            | "lab_staff"
                                            | "cashier",
                                    });
                                    clearError("role");
                                }}
                            />
                            {errors.role?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.role[0]}
                                </Text>
                            )}
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                Professional Title{" "}
                                <Text style={{ color: "#9CA3AF" }}>
                                    (optional)
                                </Text>
                            </Text>
                            <TitlePicker
                                value={formData.professional_title}
                                onChange={(text) =>
                                    setFormData({
                                        ...formData,
                                        professional_title: text,
                                    })
                                }
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                License Number{" "}
                                <Text style={{ color: "#9CA3AF" }}>
                                    (optional)
                                </Text>
                            </Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.license_number}
                                onChangeText={(text) =>
                                    setFormData({
                                        ...formData,
                                        license_number: text,
                                    })
                                }
                                placeholder="e.g. 0083687"
                            />
                        </View>

                        {formData.role === "lab_staff" && (
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>
                                    Test Categories
                                </Text>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        flexWrap: "wrap",
                                        gap: 6,
                                    }}
                                >
                                    {[
                                        "Blood Chemistry",
                                        "Hematology",
                                        "Clinical Microscopy",
                                        "Serology / Immunology",
                                        "Procedure Ultrasound",
                                        "X-ray",
                                        "Drug Test",
                                        "Others",
                                    ].map((cat) => {
                                        const selected =
                                            formData.test_categories.includes(
                                                cat,
                                            );
                                        return (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.catChip,
                                                    selected && {
                                                        backgroundColor:
                                                            "#ac3434",
                                                    },
                                                ]}
                                                onPress={() =>
                                                    setFormData({
                                                        ...formData,
                                                        test_categories:
                                                            selected
                                                                ? formData.test_categories.filter(
                                                                      (c) =>
                                                                          c !==
                                                                          cat,
                                                                  )
                                                                : [
                                                                      ...formData.test_categories,
                                                                      cat,
                                                                  ],
                                                    })
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.catChipText,
                                                        selected && {
                                                            color: "#fff",
                                                        },
                                                    ]}
                                                >
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>
                                New Password (Leave blank to keep current)
                            </Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[
                                        styles.formInput,
                                        errors.password && styles.inputError,
                                    ]}
                                    value={formData.password}
                                    onChangeText={(text) => {
                                        setFormData({
                                            ...formData,
                                            password: text,
                                        });
                                        clearError("password");
                                    }}
                                    placeholder="Enter new password"
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    style={styles.passwordToggle}
                                    onPress={() =>
                                        setShowPassword(!showPassword)
                                    }
                                >
                                    {showPassword ? (
                                        <EyeOff color="#6B7280" size={20} />
                                    ) : (
                                        <Eye color="#6B7280" size={20} />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {errors.password?.[0] && (
                                <Text style={styles.errorText}>
                                    {errors.password[0]}
                                </Text>
                            )}
                            <PasswordStrengthChecker
                                password={formData.password}
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
                                    Update User
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
    header: {
        backgroundColor: "#fff",
        padding: 16,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 0,
    },
    searchContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
        color: "#111827",
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#2563EB",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        gap: 4,
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
        marginBottom: 12,
    },
    userName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    userEmail: { fontSize: 14, color: "#6B7280" },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusActive: { backgroundColor: "#D1FAE5" },
    statusInactive: { backgroundColor: "#F3F4F6" },
    statusText: { fontSize: 12, fontWeight: "600" },
    cardBody: { marginBottom: 12 },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    infoLabel: { fontSize: 14, color: "#6B7280", marginRight: 8, minWidth: 80 },
    infoValue: { fontSize: 14, color: "#111827", fontWeight: "500" },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    roleText: { fontSize: 12, fontWeight: "600" },
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
        flex: 1,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
    modalBody: { flex: 1, marginBottom: 16 },
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
    passwordContainer: {
        position: "relative",
    },
    passwordToggle: {
        position: "absolute",
        right: 12,
        top: 12,
    },
    selectContainer: {
        position: "relative",
    },
    modalFooter: {
        flexDirection: "row",
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
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
    pillsRow: {
        marginTop: 8,
        marginHorizontal: -16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    pillActive: { backgroundColor: "#ac3434", borderColor: "#ac3434" },
    pillText: { fontSize: 13, fontWeight: "600", color: "#374151" },
    pillTextActive: { color: "#fff" },
    inputError: { borderColor: "#EF4444" },
    errorText: { color: "#EF4444", fontSize: 12, marginTop: 4 },
    pickerButtonError: { borderColor: "#EF4444" },
    catChip: {
        backgroundColor: "#EFF6FF",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    catChipText: { fontSize: 11, fontWeight: "600", color: "#1D4ED8" },
    strengthContainer: { marginTop: 8, gap: 4 },
    strengthLabel: { fontSize: 12, fontWeight: "700", marginBottom: 2 },
    strengthRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    strengthDot: { width: 6, height: 6, borderRadius: 3 },
    strengthCheck: { fontSize: 12 },
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
