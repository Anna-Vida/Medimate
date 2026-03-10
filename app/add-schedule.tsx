import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/app-header";
import { Colors } from "../constants/Colors";
import {
    getAllReminders,
    saveReminder,
    updateReminder,
} from "../services/medicationStorage";
import { moderateScale, scale, verticalScale } from "../utils/responsive";

const FREQUENCIES = [
  "Everyday",
  "2x Daily",
  "3x Daily",
  "Weekly",
  "As Needed",
] as const;

export default function AddScheduleScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [medicineName, setMedicineName] = useState("");
  const [frequency, setFrequency] =
    useState<(typeof FREQUENCIES)[number]>("Everyday");
  const [reminderTime, setReminderTime] = useState("08:00");
  const [dose, setDose] = useState("");
  const [measurement, setMeasurement] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFreqPicker, setShowFreqPicker] = useState(false);

  const isEdit = !!editId;

  useEffect(() => {
    if (editId) {
      loadExisting(editId);
    } else {
      // Defaults
      const now = new Date();
      setStartDate(now.toISOString().split("T")[0]);
      const oneMonth = new Date(now);
      oneMonth.setMonth(oneMonth.getMonth() + 1);
      setEndDate(oneMonth.toISOString().split("T")[0]);
    }
  }, [editId]);

  const loadExisting = async (id: string) => {
    const all = await getAllReminders();
    const found = all.find((r) => r.id === id);
    if (found) {
      setMedicineName(found.medicineName);
      setFrequency(found.frequency);
      setReminderTime(found.reminderTime);
      setDose(found.dose);
      setMeasurement(found.measurement);
      setStartDate(found.startDate);
      setEndDate(found.endDate);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };

  const handleSave = async () => {
    if (!medicineName.trim()) {
      Alert.alert("Missing Info", "Please enter the medicine name.");
      return;
    }

    try {
      if (isEdit && editId) {
        await updateReminder(editId, {
          medicineName: medicineName.trim(),
          frequency,
          reminderTime,
          dose: dose.trim(),
          measurement: measurement.trim(),
          startDate,
          endDate,
        });
        Alert.alert("✓ Updated", "Schedule has been updated.");
      } else {
        await saveReminder({
          medicineName: medicineName.trim(),
          frequency,
          reminderTime,
          dose: dose.trim(),
          measurement: measurement.trim(),
          startDate,
          endDate,
        });
        Alert.alert("✓ Saved", "Medicine reminder added!");
      }
      router.back();
    } catch {
      Alert.alert("Error", "Could not save schedule.");
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      <AppHeader
        title={isEdit ? "Edit Schedule" : "Add Schedule"}
        subtitle={
          isEdit
            ? "Update your medicine reminder"
            : "Create a new medicine reminder"
        }
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Medicine Name */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.fieldLabel}>Medicine Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="medkit-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                value={medicineName}
                onChangeText={setMedicineName}
                placeholder="e.g. Probiotics Capsule"
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </Animated.View>

          {/* Frequency */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Text style={styles.fieldLabel}>Frequency</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowFreqPicker(!showFreqPicker)}
              activeOpacity={0.7}
            >
              <Ionicons name="repeat-outline" size={18} color="#94A3B8" />
              <Text style={styles.dropdownText}>{frequency}</Text>
              <Ionicons name="chevron-down" size={18} color="#94A3B8" />
            </TouchableOpacity>
            {showFreqPicker && (
              <View style={styles.pickerDropdown}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.pickerOption,
                      frequency === f && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setFrequency(f);
                      setShowFreqPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        frequency === f && styles.pickerOptionTextActive,
                      ]}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Reminder Time */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <Text style={styles.fieldLabel}>Reminder</Text>
            <View style={styles.inputRow}>
              <Ionicons name="time-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                value={reminderTime}
                onChangeText={setReminderTime}
                placeholder="08:00"
                placeholderTextColor="#CBD5E1"
              />
            </View>
          </Animated.View>

          {/* Measurement & Dose */}
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <View style={styles.twoCol}>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabel}>Measurement</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="flask-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    value={measurement}
                    onChangeText={setMeasurement}
                    placeholder="2 times"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
              </View>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabel}>Dose</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="medical-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    value={dose}
                    onChangeText={setDose}
                    placeholder="150mg"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Start & End Date */}
          <Animated.View entering={FadeInUp.duration(400).delay(500)}>
            <View style={styles.twoCol}>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabel}>Starting</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
              </View>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabel}>Finish</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#CBD5E1"
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Save Button */}
          <Animated.View entering={FadeInUp.duration(400).delay(600)}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              <Text style={styles.saveBtnText}>
                {isEdit ? "Update Schedule" : "Save Schedule"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: verticalScale(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: verticalScale(48),
    paddingBottom: verticalScale(16),
    paddingHorizontal: scale(20),
    backgroundColor: Colors.background,
  },
  headerBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: "700",
    color: "#1E293B",
  },
  body: { flex: 1 },
  bodyContent: {
    padding: scale(20),
    paddingTop: verticalScale(2),
  },

  fieldLabel: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#334155",
    marginBottom: verticalScale(8),
    marginTop: verticalScale(16),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    gap: scale(10),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  input: {
    flex: 1,
    fontSize: moderateScale(15),
    fontWeight: "500",
    color: "#1E293B",
  },
  dropdownText: {
    flex: 1,
    fontSize: moderateScale(15),
    fontWeight: "500",
    color: "#1E293B",
  },

  // Frequency Picker
  pickerDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: verticalScale(4),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pickerOption: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  pickerOptionActive: {
    backgroundColor: Colors.primaryBg,
  },
  pickerOptionText: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#64748B",
  },
  pickerOptionTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },

  // Two Column
  twoCol: {
    flexDirection: "row",
    gap: scale(12),
  },
  colHalf: {
    flex: 1,
  },

  // Save Button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(10),
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(18),
    borderRadius: 20,
    marginTop: verticalScale(32),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  saveBtnText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#FFF",
  },
});
