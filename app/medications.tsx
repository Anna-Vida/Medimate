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
import { Colors } from "../constants/Colors";
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
  const [takenMeds, setTakenMeds] = useState<Set<string>>(new Set());

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

  // Toggle medication as taken
  const toggleMedicationTaken = (id: string) => {
    setTakenMeds(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

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
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Today Label */}
        {filteredReminders.length > 0 && (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <Text style={styles.reminderCount}>{filteredReminders.length}</Text>
          </View>
        )}

        {/* Medication List View */}
        {filteredReminders.length > 0 ? (
          <View style={styles.listContainer}>
            {filteredReminders.map((reminder, index) => {
              const isTaken = takenMeds.has(reminder.id);
              return (
                <Animated.View
                  key={reminder.id}
                  entering={FadeInUp.duration(400).delay(index * 80)}
                >
                  <TouchableOpacity
                    style={[styles.medicineListItem, isTaken && styles.medicineListItemTaken]}
                    activeOpacity={0.7}
                    onPress={() => router.push({
                      pathname: "/add-schedule",
                      params: { editId: reminder.id },
                    })}
                  >
                    {/* Checkbox */}
                    <TouchableOpacity
                      style={[styles.checkbox, isTaken && styles.checkboxChecked]}
                      onPress={() => toggleMedicationTaken(reminder.id)}
                      activeOpacity={0.7}
                    >
                      {isTaken && (
                        <Ionicons name="checkmark-sharp" size={16} color="#FFF" />
                      )}
                    </TouchableOpacity>

                    {/* Rx Badge */}
                    <View style={styles.rxBadge}>
                      <Text style={styles.rxText}>Rx</Text>
                    </View>

                    {/* Medicine Info */}
                    <View style={styles.medicineInfo}>
                      <View style={styles.medicineNameRow}>
                        <Text style={styles.medicineName} numberOfLines={1}>
                          {reminder.medicineName}
                        </Text>
                        {/* Status Badge */}
                        <View style={[styles.statusBadge, isTaken && styles.statusBadgeTaken]}>
                          <Text style={[styles.statusLabel, isTaken && styles.statusLabelTaken]}>
                            {reminder.dose ? 'Caution' : 'Info'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.medicineDetails} numberOfLines={2}>
                        {reminder.dose ? `${reminder.dose} ${reminder.measurement}` : 'No dosage'} • {getFrequencyLabel(reminder.frequency)}
                      </Text>
                      <View style={styles.medicineFooter}>
                        {reminder.reminderTime && (
                          <Text style={styles.medicineTime}>
                            {reminder.reminderTime}
                          </Text>
                        )}
                        <Text style={styles.dayLabel}>Thu</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="alarm-outline" size={56} color={Colors.primary} />
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
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: verticalScale(48),
    paddingBottom: verticalScale(16),
    paddingHorizontal: scale(20),
    backgroundColor: Colors.background,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: scale(14) },
  headerBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: 14,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surface,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: Colors.textSecondary,
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
  reminderCount: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: Colors.primary,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: 20,
  },
  viewAll: { fontSize: moderateScale(14), fontWeight: "600", color: Colors.primary },

  // List View
  listContainer: {
    gap: verticalScale(12),
    marginBottom: verticalScale(20),
  },
  medicineListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  medicineListItemTaken: {
    opacity: 0.65,
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  checkbox: {
    width: scale(28),
    height: scale(28),
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: '#FFF',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
    borderWidth: 2,
  },
  rxBadge: {
    width: scale(36),
    height: scale(36),
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  rxText: {
    fontSize: moderateScale(14),
    fontWeight: "800",
    color: "#FFF",
  },
  medicineInfo: {
    flex: 1,
    justifyContent: "center",
  },
  medicineNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(6),
    gap: scale(8),
  },
  medicineName: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  medicineDetails: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: Colors.textSecondary,
    marginBottom: verticalScale(6),
    lineHeight: 16,
  },
  medicineFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medicineTime: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: Colors.primary,
  },
  dayLabel: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: Colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: 6,
    backgroundColor: Colors.warningBg,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeTaken: {
    backgroundColor: Colors.successBg,
  },
  statusLabel: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: Colors.warning,
  },
  statusLabelTaken: {
    color: Colors.success,
  },

  // Grid (kept for reference but not used)
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
    color: Colors.primary,
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
    backgroundColor: Colors.primaryBg,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(16),
    borderRadius: 28,
    shadowColor: Colors.primary,
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
