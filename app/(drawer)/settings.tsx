import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import {
    AlertCircle,
    CheckCircle2,
    Settings2,
    Upload,
    XCircle,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import type { ClinicSettings, LabStaffUser } from "@/types";
import { getApiErrorMessage } from "@/utils";
import { ConfirmDialog, SuccessDialog } from "@/components";

const PDF_OPTIONS = [
    { label: "Birthdate (DDMMYYYY)", value: "birthdate" },
    { label: "Last Name", value: "last_name" },
    { label: "No Password", value: "none" },
];

export default function SettingsScreen() {
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [labStaff, setLabStaff] = useState<LabStaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingSignature, setUploadingSignature] = useState<string | null>(
        null,
    );

    const [successDialog, setSuccessDialog] = useState({
        visible: false,
        title: "",
        message: "",
        type: "success" as "success" | "error" | "info" | "warning",
    });

    const [confirmDialog, setConfirmDialog] = useState({
        visible: false,
        title: "",
        message: "",
        confirmText: "Confirm",
        type: "danger" as "danger" | "warning" | "info",
        onConfirm: async () => {},
    });

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/settings");
            setSettings(res.data.settings);
            setLabStaff(res.data.lab_staff ?? []);
        } catch (err: any) {
            setLoadError(getApiErrorMessage(err, "Failed to load settings."));
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadSettings();
        }, [loadSettings]),
    );

    const handleSave = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            await api.post("/settings", {
                patient_portal_enabled: settings.patient_portal_enabled,
                email_sending_enabled: settings.email_sending_enabled,
                email_notification_enabled: settings.email_notification_enabled,
                notification_enabled: settings.notification_enabled,
                pdf_password_format: settings.pdf_password_format,
            });
            setSuccessDialog({
                visible: true,
                title: "Saved",
                message: "Settings saved successfully.",
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
            setSaving(false);
        }
    };

    const handleUploadSignature = async (type: string, userId?: number) => {
        const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            setSuccessDialog({
                visible: true,
                title: "Permission Required",
                message:
                    "Allow access to your photo library to upload a signature.",
                type: "warning",
            });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 1],
            quality: 0.8,
        });
        if (result.canceled) return;

        const asset = result.assets[0];
        const uri = asset.uri;
        const mimeType = asset.mimeType || "image/jpeg";
        const fileName = uri.split("/").pop() || "signature.jpg";

        const formData = new FormData();
        formData.append("signature", {
            uri,
            type: mimeType,
            name: fileName,
        } as any);
        formData.append("type", userId ? "lab_staff" : type);
        if (userId) formData.append("user_id", String(userId));

        const key = userId ? `lab_staff_${userId}` : type;
        setUploadingSignature(key);
        try {
            await api.post("/settings/upload-signature", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setSuccessDialog({
                visible: true,
                title: "Uploaded",
                message: "Signature uploaded successfully.",
                type: "success",
            });
            loadSettings();
        } catch (err: any) {
            setSuccessDialog({
                visible: true,
                title: "Error",
                message: getApiErrorMessage(err, "Failed to upload signature."),
                type: "error",
            });
        } finally {
            setUploadingSignature(null);
        }
    };

    const handleRemoveSignature = (type: string, userId?: number) => {
        setConfirmDialog({
            visible: true,
            title: "Remove Signature",
            message: `Remove the ${type.replace("_", " ")} signature?`,
            confirmText: "REMOVE",
            type: "danger",
            onConfirm: async () => {
                setConfirmDialog((d) => ({ ...d, visible: false }));
                try {
                    await api.post("/settings/remove-signature", {
                        type,
                        user_id: userId,
                    });
                    setSuccessDialog({
                        visible: true,
                        title: "Removed",
                        message: "Signature removed.",
                        type: "success",
                    });
                    loadSettings();
                } catch (err: any) {
                    setSuccessDialog({
                        visible: true,
                        title: "Error",
                        message: getApiErrorMessage(
                            err,
                            "Failed to remove signature.",
                        ),
                        type: "error",
                    });
                }
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#ac3434" />
            </View>
        );
    }

    if (loadError || !settings) {
        return (
            <View style={styles.errorContainer}>
                <AlertCircle color="#EF4444" size={36} />
                <Text style={styles.errorTitle}>Unable to load settings</Text>
                <Text style={styles.errorMessage}>{loadError ?? "Settings could not be loaded."}</Text>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => {
                        setLoadError(null);
                        loadSettings();
                    }}
                >
                    <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.sectionHeader}>
                    <Settings2 size={18} color="#ac3434" />
                    <Text style={styles.sectionTitle}>System Settings</Text>
                </View>

                {/* Toggles */}
                <View style={styles.card}>
                    {[
                        {
                            key: "patient_portal_enabled" as const,
                            label: "Patient Portal",
                            desc: "Enable/disable public booking, walk-in & results tracking",
                        },
                        {
                            key: "email_sending_enabled" as const,
                            label: "Email Sending",
                            desc: "Enable/disable all outbound emails",
                        },
                        {
                            key: "email_notification_enabled" as const,
                            label: "Email Notifications",
                            desc: "Send email alerts to users",
                        },
                        {
                            key: "notification_enabled" as const,
                            label: "In-App Notifications",
                            desc: "Show in-app notification banners",
                        },
                    ].map(({ key, label, desc }, idx, arr) => (
                        <View
                            key={key}
                            style={[
                                styles.toggleRow,
                                idx < arr.length - 1 && styles.rowBorder,
                            ]}
                        >
                            <View style={styles.toggleInfo}>
                                <Text style={styles.toggleLabel}>{label}</Text>
                                <Text style={styles.toggleDesc}>{desc}</Text>
                            </View>
                            <Switch
                                value={!!settings[key]}
                                onValueChange={(v) =>
                                    setSettings((s) =>
                                        s ? { ...s, [key]: v } : s,
                                    )
                                }
                                trackColor={{
                                    false: "#E5E7EB",
                                    true: "#ac343480",
                                }}
                                thumbColor={
                                    settings[key] ? "#ac3434" : "#9CA3AF"
                                }
                            />
                        </View>
                    ))}
                </View>

                {/* PDF Password Format */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>PDF Password Format</Text>
                </View>
                <View style={styles.card}>
                    {PDF_OPTIONS.map((opt, idx, arr) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[
                                styles.radioRow,
                                idx < arr.length - 1 && styles.rowBorder,
                            ]}
                            onPress={() =>
                                setSettings((s) =>
                                    s
                                        ? {
                                              ...s,
                                              pdf_password_format:
                                                  opt.value as any,
                                          }
                                        : s,
                                )
                            }
                        >
                            <View
                                style={[
                                    styles.radioCircle,
                                    settings.pdf_password_format ===
                                        opt.value && styles.radioCircleSelected,
                                ]}
                            >
                                {settings.pdf_password_format === opt.value && (
                                    <View style={styles.radioInner} />
                                )}
                            </View>
                            <Text style={styles.radioLabel}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Lab Personnel Signatures — all lab staff by rank */}
                {labStaff.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                Lab Personnel Signatures
                            </Text>
                        </View>
                        <Text style={styles.uploadHint}>
                            All lab personnel are lab staff accounts. Name,
                            license, and title are managed in User Management.
                            PDF slot is set by each person's role.
                        </Text>
                        {labStaff.map((u) => {
                            const ROLE_STYLE: Record<
                                string,
                                {
                                    color: string;
                                    bg: string;
                                    border: string;
                                    label: string;
                                }
                            > = {
                                pathologist: {
                                    color: "#4338CA",
                                    bg: "#EEF2FF",
                                    border: "#C7D2FE",
                                    label: "Pathologist · Left Signature",
                                },
                                chief_med_tech: {
                                    color: "#1D4ED8",
                                    bg: "#EFF6FF",
                                    border: "#BFDBFE",
                                    label: "Chief Medical Technologist · Middle Signature",
                                },
                                staff: {
                                    color: "#059669",
                                    bg: "#ECFDF5",
                                    border: "#A7F3D0",
                                    label: "Lab Staff",
                                },
                            };
                            const rs =
                                ROLE_STYLE[u.lab_role ?? "staff"] ??
                                ROLE_STYLE.staff;
                            const uploading =
                                uploadingSignature === `lab_staff_${u.id}`;
                            return (
                                <View
                                    key={u.id}
                                    style={[
                                        styles.personnelCard,
                                        {
                                            backgroundColor: rs.bg,
                                            borderColor: rs.border,
                                        },
                                    ]}
                                >
                                    {/* Role badge + name row */}
                                    <View style={styles.personnelHeader}>
                                        <View
                                            style={[
                                                styles.roleBadge,
                                                { borderColor: rs.border },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.roleBadgeText,
                                                    { color: rs.color },
                                                ]}
                                            >
                                                {rs.label}
                                            </Text>
                                        </View>
                                    </View>
                                    {/* Read-only info */}
                                    <Text
                                        style={[
                                            styles.personnelName,
                                            { color: rs.color },
                                        ]}
                                    >
                                        {u.name}
                                    </Text>
                                    {u.professional_title ? (
                                        <Text style={styles.personnelSub}>
                                            {u.professional_title}
                                        </Text>
                                    ) : null}
                                    {u.license_number ? (
                                        <Text style={styles.personnelSub}>
                                            Lic: {u.license_number}
                                        </Text>
                                    ) : null}
                                    {/* Signature row */}
                                    <View style={styles.personnelSigRow}>
                                        {u.has_signature ? (
                                            <View style={styles.sigBadge}>
                                                <CheckCircle2
                                                    size={13}
                                                    color="#22C55E"
                                                />
                                                <Text
                                                    style={styles.sigBadgeText}
                                                >
                                                    Signature uploaded
                                                </Text>
                                            </View>
                                        ) : (
                                            <View
                                                style={[
                                                    styles.sigBadge,
                                                    {
                                                        backgroundColor:
                                                            "#FEE2E2",
                                                    },
                                                ]}
                                            >
                                                <XCircle
                                                    size={13}
                                                    color="#EF4444"
                                                />
                                                <Text
                                                    style={[
                                                        styles.sigBadgeText,
                                                        { color: "#EF4444" },
                                                    ]}
                                                >
                                                    No signature
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.sigActions}>
                                            {u.has_signature && (
                                                <TouchableOpacity
                                                    style={styles.removeBtn}
                                                    onPress={() =>
                                                        handleRemoveSignature(
                                                            "lab_staff",
                                                            u.id,
                                                        )
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.removeBtnText
                                                        }
                                                    >
                                                        Remove
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={[
                                                    styles.uploadBtn,
                                                    uploading &&
                                                        styles.uploadBtnDisabled,
                                                ]}
                                                onPress={() =>
                                                    handleUploadSignature(
                                                        "lab_staff",
                                                        u.id,
                                                    )
                                                }
                                                disabled={uploading}
                                            >
                                                {uploading ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color="#fff"
                                                    />
                                                ) : (
                                                    <Upload
                                                        size={13}
                                                        color="#fff"
                                                    />
                                                )}
                                                <Text
                                                    style={styles.uploadBtnText}
                                                >
                                                    {u.has_signature
                                                        ? "Replace"
                                                        : "Upload"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}

                {/* Save button */}
                <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Settings</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                onClose={() =>
                    setSuccessDialog((d) => ({ ...d, visible: false }))
                }
            />
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    scroll: { padding: 16, paddingBottom: 32 },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
        marginTop: 16,
    },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
    toggleDesc: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        justifyContent: "center",
        alignItems: "center",
    },
    radioCircleSelected: { borderColor: "#ac3434" },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#ac3434",
    },
    radioLabel: { fontSize: 14, color: "#374151" },
    sigActions: { flexDirection: "row", gap: 8, alignItems: "center" },
    uploadBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: "#2563EB",
        borderRadius: 8,
        minWidth: 82,
        justifyContent: "center",
    },
    uploadBtnText: { fontSize: 13, color: "#fff", fontWeight: "600" },
    uploadBtnDisabled: { opacity: 0.6 },
    sigBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#D1FAE5",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        alignSelf: "flex-start",
        marginBottom: 4,
    },
    sigBadgeText: { fontSize: 12, fontWeight: "600", color: "#22C55E" },
    removeBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "#FEE2E2",
        borderRadius: 8,
    },
    removeBtnText: { fontSize: 13, color: "#EF4444", fontWeight: "600" },
    personnelCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
    },
    personnelHeader: {
        marginBottom: 6,
    },
    roleBadge: {
        borderWidth: 1,
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: "flex-start",
    },
    roleBadgeText: { fontSize: 11, fontWeight: "700" },
    personnelName: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
    personnelSub: { fontSize: 12, color: "#6B7280", marginBottom: 1 },
    personnelSigRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 10,
    },
    uploadHint: {
        fontSize: 12,
        color: "#9CA3AF",
        textAlign: "center",
        marginTop: 8,
        marginBottom: 4,
    },
    saveBtn: {
        backgroundColor: "#ac3434",
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 24,
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
