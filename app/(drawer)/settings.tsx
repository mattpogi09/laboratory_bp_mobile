import { useFocusEffect } from "@react-navigation/native";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { CheckCircle2, Settings2, Upload, XCircle } from "lucide-react-native";
import { useCallback, useState } from "react";

import api from "@/app/services/api";
import { showApiError } from "@/app/utils";
import { SuccessDialog } from "@/components";
import type { ClinicSettings, LabStaffUser } from "@/app/types";

const PDF_OPTIONS = [
    { label: "Birthdate (DDMMYYYY)", value: "birthdate" },
    { label: "Last Name", value: "last_name" },
    { label: "No Password", value: "none" },
];

export default function SettingsScreen() {
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [labStaff, setLabStaff] = useState<LabStaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [successDialog, setSuccessDialog] = useState({
        visible: false, title: "", message: "",
        type: "success" as "success" | "error" | "info" | "warning",
    });

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get("/settings");
            setSettings(res.data.settings);
            setLabStaff(res.data.lab_staff ?? []);
        } catch (err: any) {
            showApiError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

    const handleSave = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            await api.post("/settings", {
                email_sending_enabled: settings.email_sending_enabled,
                email_notification_enabled: settings.email_notification_enabled,
                notification_enabled: settings.notification_enabled,
                pdf_password_format: settings.pdf_password_format,
                pathologist_name: settings.pathologist_name,
                pathologist_license: settings.pathologist_license,
                pathologist_title: settings.pathologist_title,
                chief_med_tech_name: settings.chief_med_tech_name,
                chief_med_tech_license: settings.chief_med_tech_license,
                chief_med_tech_title: settings.chief_med_tech_title,
                med_tech_name: settings.med_tech_name,
                med_tech_license: settings.med_tech_license,
                med_tech_title: settings.med_tech_title,
            });
            setSuccessDialog({ visible: true, title: "Saved", message: "Settings saved successfully.", type: "success" });
        } catch (err: any) {
            showApiError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveSignature = (type: string, userId?: number) => {
        Alert.alert(
            "Remove Signature",
            `Remove the ${type.replace("_", " ")} signature?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.post("/settings/remove-signature", { type, user_id: userId });
                            setSuccessDialog({ visible: true, title: "Removed", message: "Signature removed.", type: "success" });
                            loadSettings();
                        } catch (err: any) {
                            showApiError(err);
                        }
                    },
                },
            ]
        );
    };

    if (loading || !settings) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#ac3434" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.sectionHeader}>
                    <Settings2 size={18} color="#ac3434" />
                    <Text style={styles.sectionTitle}>System Settings</Text>
                </View>

                {/* Toggles */}
                <View style={styles.card}>
                    {[
                        { key: "email_sending_enabled" as const, label: "Email Sending", desc: "Enable/disable all outbound emails" },
                        { key: "email_notification_enabled" as const, label: "Email Notifications", desc: "Send email alerts to users" },
                        { key: "notification_enabled" as const, label: "In-App Notifications", desc: "Show in-app notification banners" },
                    ].map(({ key, label, desc }, idx, arr) => (
                        <View key={key} style={[styles.toggleRow, idx < arr.length - 1 && styles.rowBorder]}>
                            <View style={styles.toggleInfo}>
                                <Text style={styles.toggleLabel}>{label}</Text>
                                <Text style={styles.toggleDesc}>{desc}</Text>
                            </View>
                            <Switch
                                value={!!settings[key]}
                                onValueChange={(v) => setSettings((s) => s ? { ...s, [key]: v } : s)}
                                trackColor={{ false: "#E5E7EB", true: "#ac343480" }}
                                thumbColor={settings[key] ? "#ac3434" : "#9CA3AF"}
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
                            style={[styles.radioRow, idx < arr.length - 1 && styles.rowBorder]}
                            onPress={() => setSettings((s) => s ? { ...s, pdf_password_format: opt.value as any } : s)}
                        >
                            <View style={[styles.radioCircle, settings.pdf_password_format === opt.value && styles.radioCircleSelected]}>
                                {settings.pdf_password_format === opt.value && <View style={styles.radioInner} />}
                            </View>
                            <Text style={styles.radioLabel}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Pathologist */}
                <SignatureSection
                    title="Pathologist"
                    hasSignature={settings.pathologist_signature_exists}
                    onRemove={() => handleRemoveSignature("pathologist")}
                    note="To upload a signature, use the web admin panel."
                >
                    <SettingsInput label="Name" value={settings.pathologist_name} onChange={(v) => setSettings((s) => s ? { ...s, pathologist_name: v } : s)} />
                    <SettingsInput label="License #" value={settings.pathologist_license} onChange={(v) => setSettings((s) => s ? { ...s, pathologist_license: v } : s)} />
                    <SettingsInput label="Title" value={settings.pathologist_title} onChange={(v) => setSettings((s) => s ? { ...s, pathologist_title: v } : s)} />
                </SignatureSection>

                {/* Chief Med Tech */}
                <SignatureSection
                    title="Chief Medical Technologist"
                    hasSignature={settings.chief_med_tech_signature_exists}
                    onRemove={() => handleRemoveSignature("chief_med_tech")}
                    note="To upload a signature, use the web admin panel."
                >
                    <SettingsInput label="Name" value={settings.chief_med_tech_name} onChange={(v) => setSettings((s) => s ? { ...s, chief_med_tech_name: v } : s)} />
                    <SettingsInput label="License #" value={settings.chief_med_tech_license} onChange={(v) => setSettings((s) => s ? { ...s, chief_med_tech_license: v } : s)} />
                    <SettingsInput label="Title" value={settings.chief_med_tech_title} onChange={(v) => setSettings((s) => s ? { ...s, chief_med_tech_title: v } : s)} />
                </SignatureSection>

                {/* Med Tech */}
                <SignatureSection
                    title="Medical Technologist"
                    hasSignature={settings.med_tech_signature_exists}
                    onRemove={() => handleRemoveSignature("med_tech")}
                    note="To upload a signature, use the web admin panel."
                >
                    <SettingsInput label="Name" value={settings.med_tech_name} onChange={(v) => setSettings((s) => s ? { ...s, med_tech_name: v } : s)} />
                    <SettingsInput label="License #" value={settings.med_tech_license} onChange={(v) => setSettings((s) => s ? { ...s, med_tech_license: v } : s)} />
                    <SettingsInput label="Title" value={settings.med_tech_title} onChange={(v) => setSettings((s) => s ? { ...s, med_tech_title: v } : s)} />
                </SignatureSection>

                {/* Lab Staff */}
                {labStaff.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Lab Staff Signatures</Text>
                        </View>
                        <View style={styles.card}>
                            {labStaff.map((u, idx) => (
                                <View key={u.id} style={[styles.staffRow, idx > 0 && styles.rowBorder]}>
                                    <View style={styles.staffInfo}>
                                        <Text style={styles.staffName}>{u.name}</Text>
                                        {u.professional_title ? <Text style={styles.staffSub}>{u.professional_title}</Text> : null}
                                        {u.license_number ? <Text style={styles.staffSub}>Lic: {u.license_number}</Text> : null}
                                    </View>
                                    <View style={styles.sigStatus}>
                                        {u.has_signature ? (
                                            <>
                                                <CheckCircle2 size={16} color="#22C55E" />
                                                <Text style={styles.sigStatusText}>Uploaded</Text>
                                                <TouchableOpacity onPress={() => handleRemoveSignature("lab_staff", u.id)}>
                                                    <XCircle size={16} color="#EF4444" />
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={16} color="#9CA3AF" />
                                                <Text style={[styles.sigStatusText, { color: "#9CA3AF" }]}>No signature</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.uploadHint}>To upload lab staff signatures, use the web admin panel.</Text>
                    </>
                )}

                {/* Save button */}
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
                </TouchableOpacity>
            </ScrollView>

            <SuccessDialog
                visible={successDialog.visible}
                title={successDialog.title}
                message={successDialog.message}
                type={successDialog.type}
                onClose={() => setSuccessDialog((d) => ({ ...d, visible: false }))}
            />
        </View>
    );
}

// Small helper components
function SignatureSection({ title, hasSignature, onRemove, note, children }: {
    title: string; hasSignature: boolean; onRemove: () => void; note: string; children: React.ReactNode;
}) {
    return (
        <>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.card}>
                {children}
                <View style={[styles.sigRow, styles.rowBorder]}>
                    <View style={styles.sigInfo}>
                        {hasSignature ? (
                            <View style={styles.sigBadge}>
                                <CheckCircle2 size={14} color="#22C55E" />
                                <Text style={styles.sigBadgeText}>Signature uploaded</Text>
                            </View>
                        ) : (
                            <View style={[styles.sigBadge, { backgroundColor: "#FEE2E2" }]}>
                                <XCircle size={14} color="#EF4444" />
                                <Text style={[styles.sigBadgeText, { color: "#EF4444" }]}>No signature</Text>
                            </View>
                        )}
                        <Text style={styles.uploadNote}>{note}</Text>
                    </View>
                    {hasSignature && (
                        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
                            <Text style={styles.removeBtnText}>Remove</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </>
    );
}

function SettingsInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <View style={[styles.inputRow, styles.rowBorder]}>
            <Text style={styles.inputRowLabel}>{label}</Text>
            <TextInput
                style={styles.inlineInput}
                value={value}
                onChangeText={onChange}
                placeholder={label}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { padding: 16, paddingBottom: 32 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, marginTop: 16 },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
    card: {
        backgroundColor: "#fff", borderRadius: 12, overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
        shadowRadius: 4, elevation: 2,
    },
    toggleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
    rowBorder: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
    toggleInfo: { flex: 1 },
    toggleLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
    toggleDesc: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
    radioRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", justifyContent: "center", alignItems: "center" },
    radioCircleSelected: { borderColor: "#ac3434" },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#ac3434" },
    radioLabel: { fontSize: 14, color: "#374151" },
    inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
    inputRowLabel: { width: 90, fontSize: 13, color: "#6B7280", fontWeight: "500" },
    inlineInput: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 4 },
    sigRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    sigInfo: { flex: 1 },
    sigBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#D1FAE5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, alignSelf: "flex-start", marginBottom: 4 },
    sigBadgeText: { fontSize: 12, fontWeight: "600", color: "#22C55E" },
    uploadNote: { fontSize: 11, color: "#9CA3AF" },
    removeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#FEE2E2", borderRadius: 8 },
    removeBtnText: { fontSize: 13, color: "#EF4444", fontWeight: "600" },
    staffRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
    staffInfo: { flex: 1 },
    staffName: { fontSize: 14, fontWeight: "600", color: "#111827" },
    staffSub: { fontSize: 12, color: "#6B7280" },
    sigStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
    sigStatusText: { fontSize: 12, color: "#22C55E", fontWeight: "600" },
    uploadHint: { fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 8, marginBottom: 4 },
    saveBtn: {
        backgroundColor: "#ac3434", paddingVertical: 14, borderRadius: 10, alignItems: "center",
        marginTop: 24,
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
