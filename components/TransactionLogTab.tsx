import { AlertCircle, History } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import api from "@/app/services/api";
import { getApiErrorMessage } from "@/utils";

type Transaction = {
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

type Props = {
    refreshTrigger?: number;
};

export default function TransactionLogTab({ refreshTrigger = 0 }: Props) {
    const [data, setData] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);
        try {
            const response = await api.get("/inventory/transactions");
            setData(
                Array.isArray(response.data.data) ? response.data.data : [],
            );
        } catch (err: any) {
            setError(getApiErrorMessage(err, "Failed to load transactions."));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        load();
    }, [refreshTrigger]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#ac3434" />
                <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <AlertCircle color="#EF4444" size={36} />
                <Text style={styles.errorTitle}>Failed to load transactions</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
                    <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
                <Text style={styles.sectionTitle}>Transaction Log</Text>
            }
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <History color="#D1D5DB" size={42} />
                    <Text style={styles.emptyTitle}>No transactions found</Text>
                </View>
            }
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => load(true)}
                />
            }
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.date}>{item.date}</Text>
                        <View
                            style={[
                                styles.badge,
                                item.type === "IN"
                                    ? { backgroundColor: "#D1FAE5" }
                                    : { backgroundColor: "#FEE2E2" },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    item.type === "IN"
                                        ? { color: "#065F46" }
                                        : { color: "#991B1B" },
                                ]}
                            >
                                {item.type}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.itemName}>{item.item}</Text>
                    <Text style={styles.code}>
                        Code: {item.transaction_code}
                    </Text>

                    <View style={styles.row}>
                        <Text style={styles.label}>Quantity:</Text>
                        <Text style={styles.value}>
                            {item.type === "IN" ? "+" : "-"}
                            {item.quantity}
                        </Text>
                    </View>

                    <View style={styles.row}>
                        <Text style={styles.label}>Stock:</Text>
                        <Text style={styles.value}>
                            {item.previous_stock ?? "—"} →{" "}
                            {item.new_stock ?? "—"}
                        </Text>
                    </View>

                    {!!item.reason && (
                        <Text style={styles.reason} numberOfLines={3}>
                            Reason: {item.reason}
                        </Text>
                    )}

                    <Text style={styles.performedBy}>
                        Performed by: {item.performed_by}
                    </Text>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    center: {
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
    errorTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        textAlign: "center",
    },
    errorMessage: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
    },
    retryBtn: {
        marginTop: 4,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: "#ac3434",
        borderRadius: 10,
    },
    retryBtnText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 15,
    },
    listContent: {
        padding: 20,
        paddingBottom: 64,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
        color: "#111827",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 80,
        gap: 6,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    date: {
        color: "#6B7280",
        fontSize: 12,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: {
        fontWeight: "600",
        fontSize: 12,
    },
    itemName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    code: {
        color: "#6B7280",
        fontSize: 12,
        marginBottom: 8,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },
    label: {
        color: "#6B7280",
        fontSize: 13,
    },
    value: {
        color: "#111827",
        fontWeight: "600",
        fontSize: 13,
    },
    reason: {
        color: "#6B7280",
        fontSize: 12,
        marginTop: 8,
    },
    performedBy: {
        color: "#6B7280",
        fontSize: 12,
        marginTop: 8,
        fontStyle: "italic",
    },
});
