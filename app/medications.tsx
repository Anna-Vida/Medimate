import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
  deleteReminder,
  getAllReminders,
  ReminderSchedule,
} from "../services/medicationStorage";
import { moderateScale, scale, verticalScale } from "../utils/responsive";

type FilterType = "week" | "month" | "year";

const PILL_ICONS: Record<string, string> = {
  cap: "💊",
  tab: "💊",
  capsule: "💊",
  vitamin: "🧬",
  syrup: "🧪",
  default: "💊",
};

function getMedicineEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(PILL_ICONS)) {
    if (lower.includes(key)) return emoji;
  }
  return PILL_ICONS.default;
}

function getFrequencyLabel(freq: string): string {
  switch (freq) {
    case "Everyday":
      return "1x daily";
    case "2x Daily":
      return "2x daily";
    case "3x Daily":
      return "3x daily";
    case "Weekly":
      return "Weekly";
    case "As Needed":
      return "As needed";
    default:
      return freq;
  }
}

export default function MedicationsScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("week");

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getAllReminders();
    setReminders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const data = await getAllReminders();
    setReminders(data);
    setRefreshing(false);
  }, []);

  // Filter reminders based on selected time range
  const filteredReminders = reminders.filter((r) => {
    const now = new Date();
    const start = new Date(r.startDate);
    const end = new Date(r.endDate);
    if (filter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return end >= weekAgo;
    }
    if (filter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return end >= monthAgo;
    }
    return true;
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove Reminder", `Delete reminder for ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteReminder(id);
          setReminders((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <View style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color="#334155" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Medicine Reminder</Text>
            <Text style={styles.headerSub}>
              {reminders.length} schedule{reminders.length !== 1 ? "s" : ""}{" "}
              active
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/inventory")}
            activeOpacity={0.7}
          >
            <View style={styles.headerBtn}>
              <Ionicons name="cube-outline" size={22} color="#334155" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {[
          { key: "week" as FilterType, label: "This Week" },
          { key: "month" as FilterType, label: "This Month" },
          { key: "year" as FilterType, label: "This Year" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              filter === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          filteredReminders.length === 0 && { flex: 1 },
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
        {/* Today Label */}
        {filteredReminders.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Today</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Medicine Cards Grid */}
        {filteredReminders.length > 0 ? (
          <View style={styles.grid}>
            {filteredReminders.map((reminder, index) => (
              <Animated.View
                key={reminder.id}
                entering={FadeInUp.duration(400).delay(index * 80)}
                style={styles.gridItem}
              >
                <TouchableOpacity
                  style={[
                    styles.medicineCard,
                    { backgroundColor: reminder.color },
                  ]}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/add-schedule",
                      params: { editId: reminder.id },
                    })
                  }
                  onLongPress={() =>
                    handleDelete(reminder.id, reminder.medicineName)
                  }
                >
                  <Text style={styles.cardEmoji}>
                    {getMedicineEmoji(reminder.medicineName)}
                  </Text>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {reminder.medicineName}
                  </Text>
                  <Text style={styles.cardFreq}>
                    {getFrequencyLabel(reminder.frequency)}
                  </Text>
                  {reminder.reminderTime ? (
                    <View style={styles.cardTimeRow}>
                      <Ionicons name="time-outline" size={12} color="#64748B" />
                      <Text style={styles.cardTime}>
                        {reminder.reminderTime}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="alarm-outline" size={56} color="#0D9488" />
            </View>
            <Text style={styles.emptyTitle}>No Reminders Yet</Text>
            <Text style={styles.emptySub}>
              Add a medicine schedule to never miss a dose
            </Text>
          </View>
        )}

        <View style={{ height: verticalScale(120) }} />
      </ScrollView>

      {/* Floating Add Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => router.push("/add-schedule")}
        >
          <Ionicons name="add-circle" size={22} color="#FFF" />
          <Text style={styles.fabText}>Add New Schedule</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingTop: verticalScale(48),
    paddingBottom: verticalScale(16),
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

  // Filter Tabs
  filterRow: {
    flexDirection: "row",
    gap: scale(8),
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(8),
  },
  filterTab: {
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  filterTabActive: {
    backgroundColor: "#0D9488",
  },
  filterTabText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#64748B",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },

  body: { flex: 1 },
  bodyContent: { paddingHorizontal: scale(20), paddingTop: verticalScale(12) },

  // Section Header
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#1E293B",
  },
  viewAll: { fontSize: moderateScale(14), fontWeight: "600", color: "#0D9488" },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(14),
  },
  gridItem: {
    width: "47%",
  },
  medicineCard: {
    borderRadius: 20,
    padding: scale(18),
    minHeight: verticalScale(140),
    justifyContent: "center",
    alignItems: "center",
  },
  cardEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardName: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  cardFreq: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#0D9488",
  },
  cardTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  cardTime: {
    fontSize: moderateScale(11),
    fontWeight: "500",
    color: "#64748B",
  },

  // Empty State
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

  // FAB
  fabContainer: {
    position: "absolute",
    bottom: verticalScale(30),
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D9488",
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(16),
    borderRadius: 28,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    gap: 10,
  },
  fabText: {
    color: "#FFF",
    fontSize: moderateScale(16),
    fontWeight: "700",
  },
});
