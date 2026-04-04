import React from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { ClipboardList } from "lucide-react-native";
import { StatCard } from "@/components/StatCard";
import { useResponsiveLayout } from "@/utils";
import { formatCurrency } from "@/utils/format";
import type { FinancialData } from "@/types/reports";

type FinancialTabProps = {
    data: FinancialData | null;
    refreshing: boolean;
    onRefresh: () => void;
};

export function FinancialTab({
    data,
    refreshing,
    onRefresh,
}: FinancialTabProps) {
    const responsive = useResponsiveLayout();

    const contentStyle =
        data?.rows.length === 0
            ? {
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: responsive.horizontalPadding,
                  paddingBottom: 64,
              }
            : {
                  paddingVertical: 8,
                  paddingHorizontal: responsive.horizontalPadding,
                  paddingBottom: 64,
              };

    if (!data) {
        return (
            <View style={styles.emptyWrapper}>
                <ClipboardList color="#D1D5DB" size={42} />
                <Text style={styles.emptyTitle}>No data available</Text>
            </View>
        );
    }

    return (
        <FlatList
            style={styles.tabContent}
            data={data.rows}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={contentStyle}
            nestedScrollEnabled={false}
            removeClippedSubviews={true}
            ListHeaderComponent={
                <>
                    <View
                        style={[
                            styles.cardsRow,
                            responsive.isCompact && styles.cardsRowCompact,
                        ]}
                    >
                        <StatCard
                            label="Total Revenue"
                            value={formatCurrency(data.totals.revenue)}
                            accent="#10B981"
                        />
                        <StatCard
                            label="Total Discounts"
                            value={formatCurrency(data.totals.discounts)}
                            accent="#F59E0B"
                        />
                    </View>
                    <View
                        style={[
                            styles.cardsRow,
                            responsive.isCompact && styles.cardsRowCompact,
                        ]}
                    >
                        <StatCard
                            label="Transactions"
                            value={data.totals.transactions.toString()}
                            accent="#1D4ED8"
                        />
                    </View>
                    <Text style={styles.sectionTitle}>Financial Report</Text>
                </>
            }
            renderItem={({ item }) => (
                <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.reportDate}>{item.date}</Text>
                        <Text style={styles.reportAmount}>
                            {formatCurrency(item.net_amount)}
                        </Text>
                    </View>
                    <Text style={styles.reportPatient}>{item.patient}</Text>
                    <Text style={styles.reportTests}>{item.tests}</Text>
                    <View style={styles.reportMeta}>
                        <Text style={styles.reportMetaText}>
                            Gross: {formatCurrency(item.amount)}
                        </Text>
                        {item.discount_amount > 0 && (
                            <Text style={styles.reportMetaText}>
                                Discount: -
                                {formatCurrency(item.discount_amount)}
                            </Text>
                        )}
                    </View>
                    <View style={styles.badgeRow}>
                        <View
                            style={[
                                styles.badge,
                                item.payment_status === "paid"
                                    ? styles.badgePaid
                                    : styles.badgePending,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    item.payment_status === "paid"
                                        ? { color: "#065F46" }
                                        : { color: "#991B1B" },
                                ]}
                            >
                                {item.payment_method}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
            ListEmptyComponent={
                <View style={styles.emptyWrapper}>
                    <ClipboardList color="#D1D5DB" size={42} />
                    <Text style={styles.emptyTitle}>No transactions found</Text>
                </View>
            }
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        />
    );
}

const styles = StyleSheet.create({
    tabContent: { flex: 1, backgroundColor: "#F3F4F6" },
    cardsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    cardsRowCompact: { flexDirection: "column" },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        marginVertical: 16,
    },
    reportCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    reportHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    reportDate: { color: "#6B7280", fontSize: 13 },
    reportAmount: { fontWeight: "700", color: "#111827", fontSize: 16 },
    reportPatient: { fontWeight: "600", color: "#111827", marginBottom: 4 },
    reportTests: { color: "#6B7280", fontSize: 14, marginBottom: 8 },
    reportMeta: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 8,
    },
    reportMetaText: { color: "#6B7280", fontSize: 13 },
    badgeRow: { flexDirection: "row", gap: 8 },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 999,
    },
    badgePaid: { backgroundColor: "#D1FAE5" },
    badgePending: { backgroundColor: "#FEE2E2" },
    badgeText: { fontWeight: "600", fontSize: 13, textTransform: "capitalize" },
    emptyWrapper: { alignItems: "center", paddingVertical: 80, gap: 6 },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
});
