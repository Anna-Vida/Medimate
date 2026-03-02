import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import {
    getActiveMedications,
    markMedicationTaken,
    MedicationRecord,
} from "../services/medicationStorage";
import { moderateScale, scale, verticalScale } from "../utils/responsive";

export default function InventoryScreen() {
    const router = useRouter();
    const [meds, setMeds] = useState<MedicationRecord[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        const active = await getActiveMedications();
        // Only show meds that have inventory set
        setMeds(
            active.filter(
                (m) => m.inventoryCount !== undefined && m.inventoryCount !== null
            )
        );
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    const handleTakeDose = (med: MedicationRecord) => {
        Alert.alert(
            "💊 Take Dose",
            `Mark one dose of ${med.analysis.medicineName} as taken?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Take",
                    onPress: async () => {
                        await markMedicationTaken(med.id);
                        await loadData(); // Refresh to show updated count
                    },
                },
            ]
        );
    };

    const getStockStatus = (med: MedicationRecord) => {
        const count = med.inventoryCount || 0;
        const daily = med.dailyDoseCount || 1;
        const daysLeft = daily > 0 ? Math.floor(count / daily) : count;

        if (daysLeft <= 0)
            return {
                label: "Out of Stock",
                color: "#DC2626",
                bgColor: "#FEF2F2",
                icon: "close-circle" as const,
            };
        if (daysLeft <= 3)
            return {
                label: "Low Stock",
                color: "#F59E0B",
                bgColor: "#FFFBEB",
                icon: "warning" as const,
            };
        if (daysLeft <= 7)
            return {
                label: "Moderate",
                color: "#0D9488",
                bgColor: "#F0FDFA",
                icon: "checkmark-circle" as const,
            };
        return {
            label: "Well Stocked",
            color: "#10B981",
            bgColor: "#ECFDF5",
            icon: "checkmark-circle" as const,
        };
    };

    const totalPills = meds.reduce((sum, m) => sum + (m.inventoryCount || 0), 0);
    const lowStockCount = meds.filter((m) => {
        const days =
            (m.dailyDoseCount || 1) > 0
                ? Math.floor((m.inventoryCount || 0) / (m.dailyDoseCount || 1))
                : 0;
        return days <= 3;
    }).length;

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar barStyle="dark-content" />

            <Stack.Screen options={{ title: "My Inventory" }} />

            {/* Summary Cards */}
            {meds.length > 0 && (
                <Animated.View
                    entering={FadeInUp.duration(400)}
                    style={styles.summaryRow}
                >
                    <View style={[styles.summaryCard, { backgroundColor: "#F0FDFA" }]}>
                        <Text style={[styles.summaryNum, { color: "#0D9488" }]}>
                            {totalPills}
                        </Text>
                        <Text style={styles.summaryLabel}>Total Pills</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: "#FFFBEB" }]}>
                        <Text style={[styles.summaryNum, { color: "#F59E0B" }]}>
                            {lowStockCount}
                        </Text>
                        <Text style={styles.summaryLabel}>Low Stock</Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: "#EFF6FF" }]}>
                        <Text style={[styles.summaryNum, { color: "#3B82F6" }]}>
                            {meds.length}
                        </Text>
                        <Text style={styles.summaryLabel}>Medicines</Text>
                    </View>
                </Animated.View>
            )}

            <ScrollView
                style={styles.body}
                contentContainerStyle={[
                    styles.bodyContent,
                    meds.length === 0 && { flex: 1 },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#0D9488"]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {meds.length > 0 ? (
                    meds.map((med, index) => {
                        const count = med.inventoryCount || 0;
                        const daily = med.dailyDoseCount || 1;
                        const daysLeft = daily > 0 ? Math.floor(count / daily) : count;
                        const status = getStockStatus(med);

                        return (
                            <Animated.View
                                key={med.id}
                                entering={FadeInUp.duration(400).delay(index * 80)}
                            >
                                <View style={styles.medCard}>
                                    {/* Top: Name + Status Badge */}
                                    <View style={styles.cardTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.medName} numberOfLines={1}>
                                                {med.analysis.medicineName}
                                            </Text>
                                            <Text style={styles.medDosage}>
                                                {med.analysis.dosage || "Dosage not set"}
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                { backgroundColor: status.bgColor },
                                            ]}
                                        >
                                            <Ionicons
                                                name={status.icon}
                                                size={14}
                                                color={status.color}
                                            />
                                            <Text
                                                style={[styles.statusText, { color: status.color }]}
                                            >
                                                {status.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Stats Row */}
                                    <View style={styles.statsRow}>
                                        <View style={styles.statItem}>
                                            <Text
                                                style={[
                                                    styles.statNum,
                                                    daysLeft <= 3 && { color: "#DC2626" },
                                                ]}
                                            >
                                                {count}
                                            </Text>
                                            <Text style={styles.statLabel}>Pills Left</Text>
                                        </View>
                                        <View style={styles.statDivider} />
                                        <View style={styles.statItem}>
                                            <Text
                                                style={[
                                                    styles.statNum,
                                                    daysLeft <= 3 && { color: "#DC2626" },
                                                ]}
                                            >
                                                {daysLeft}
                                            </Text>
                                            <Text style={styles.statLabel}>Days Left</Text>
                                        </View>
                                        <View style={styles.statDivider} />
                                        <View style={styles.statItem}>
                                            <Text style={styles.statNum}>{daily}</Text>
                                            <Text style={styles.statLabel}>Per Day</Text>
                                        </View>
                                    </View>

                                    {/* Progress Bar */}
                                    <View style={styles.progressBg}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                {
                                                    width: `${Math.min(
                                                        100,
                                                        Math.max(5, (daysLeft / 30) * 100)
                                                    )}%`,
                                                    backgroundColor: status.color,
                                                },
                                            ]}
                                        />
                                    </View>

                                    {/* Low stock warning */}
                                    {daysLeft <= 3 && daysLeft > 0 && (
                                        <View style={styles.warningBanner}>
                                            <Ionicons name="warning" size={16} color="#F59E0B" />
                                            <Text style={styles.warningText}>
                                                Restock soon — only {daysLeft} day
                                                {daysLeft !== 1 ? "s" : ""} left!
                                            </Text>
                                        </View>
                                    )}
                                    {daysLeft <= 0 && (
                                        <View
                                            style={[
                                                styles.warningBanner,
                                                { backgroundColor: "#FEF2F2" },
                                            ]}
                                        >
                                            <Ionicons name="close-circle" size={16} color="#DC2626" />
                                            <Text style={[styles.warningText, { color: "#DC2626" }]}>
                                                Out of stock! Please refill immediately.
                                            </Text>
                                        </View>
                                    )}

                                    {/* Take Dose Button */}
                                    {count > 0 && (
                                        <TouchableOpacity
                                            style={styles.takeBtn}
                                            onPress={() => handleTakeDose(med)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons
                                                name="checkmark-circle"
                                                size={18}
                                                color="#FFF"
                                            />
                                            <Text style={styles.takeBtnText}>Take Dose</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </Animated.View>
                        );
                    })
                ) : (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="cube-outline" size={56} color="#0D9488" />
                        </View>
                        <Text style={styles.emptyTitle}>No Inventory Yet</Text>
                        <Text style={styles.emptySub}>
                            Scan a medicine and set its inventory in the Virtual Pillbox to
                            see it here
                        </Text>
                    </View>
                )}

                <View style={{ height: verticalScale(40) }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F8FAFC" },
    header: {
        paddingTop: verticalScale(48),
        paddingBottom: verticalScale(12),
        paddingHorizontal: scale(20),
        backgroundColor: "#F8FAFC",
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: scale(14) },
    headerBtn: {
        width: scale(44),
        height: scale(44),
        borderRadius: 14,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: moderateScale(22),
        fontWeight: "700",
        color: "#1E293B",
    },
    headerSub: {
        fontSize: moderateScale(14),
        color: "#64748B",
        fontWeight: "500",
        marginTop: 2,
    },

    // Summary
    summaryRow: {
        flexDirection: "row",
        gap: scale(10),
        paddingHorizontal: scale(20),
        marginTop: verticalScale(12),
        marginBottom: verticalScale(8),
    },
    summaryCard: {
        flex: 1,
        alignItems: "center",
        paddingVertical: verticalScale(14),
        borderRadius: 16,
    },
    summaryNum: { fontSize: moderateScale(24), fontWeight: "800" },
    summaryLabel: {
        fontSize: moderateScale(11),
        fontWeight: "600",
        color: "#64748B",
        marginTop: 2,
    },

    body: { flex: 1 },
    bodyContent: { paddingHorizontal: scale(20), paddingTop: verticalScale(8) },

    // Medicine Card
    medCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: scale(18),
        marginBottom: verticalScale(14),
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    cardTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 14,
    },
    medName: { fontSize: moderateScale(17), fontWeight: "700", color: "#1E293B" },
    medDosage: {
        fontSize: moderateScale(13),
        color: "#64748B",
        fontWeight: "500",
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusText: { fontSize: moderateScale(11), fontWeight: "700" },

    // Stats
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        marginBottom: 14,
    },
    statItem: { alignItems: "center", flex: 1 },
    statNum: { fontSize: moderateScale(26), fontWeight: "800", color: "#1E293B" },
    statLabel: {
        fontSize: moderateScale(11),
        fontWeight: "600",
        color: "#94A3B8",
        marginTop: 2,
    },
    statDivider: { width: 1, height: 36, backgroundColor: "#F1F5F9" },

    // Progress
    progressBg: {
        height: 6,
        backgroundColor: "#F1F5F9",
        borderRadius: 3,
        marginBottom: 12,
        overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 3 },

    // Warning
    warningBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#FFFBEB",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    warningText: {
        fontSize: moderateScale(12),
        fontWeight: "600",
        color: "#92400E",
        flex: 1,
    },

    // Take Button
    takeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#0D9488",
        paddingVertical: verticalScale(12),
        borderRadius: 14,
    },
    takeBtnText: {
        color: "#FFF",
        fontSize: moderateScale(14),
        fontWeight: "700",
    },

    // Empty
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingBottom: 80,
    },
    emptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 24,
        backgroundColor: "#F0FDFA",
        alignItems: "center",
        justifyContent: "center",
    },
    emptyTitle: {
        fontSize: moderateScale(20),
        fontWeight: "700",
        color: "#1E293B",
    },
    emptySub: {
        fontSize: moderateScale(14),
        color: "#94A3B8",
        textAlign: "center",
        paddingHorizontal: 40,
    },
});
