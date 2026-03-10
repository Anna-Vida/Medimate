import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import * as SMS from "expo-sms";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/app-header";
import * as AppTheme from "../constants/Colors";
import { getProfileStorageKey } from "../services/userProfile";
import { getUserScopedKey } from "../services/userScopedStorage";

const Colors: any = (AppTheme as any).Colors ?? (AppTheme as any);

const CONTACTS_KEY = "emergency_contacts";
const MEDICAL_ID_KEY = "medical_id";

type TriageLevel = "red" | "orange" | "yellow" | "green";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

interface MedicalInfo {
  name: string;
  bloodType: string;
  allergies: string;
  conditions: string;
  medications: string;
}

interface HospitalUnit {
  name: string;
  phone: string;
  mapQuery: string;
  service: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const calcDistanceKm = (a: Coordinates, b: Coordinates) => {
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const p1 = toRad(a.lat);
  const p2 = toRad(b.lat);
  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(p1) * Math.cos(p2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return earthKm * c;
};

const HOSPITAL_UNITS: HospitalUnit[] = [
  {
    name: "Philippine General Hospital ER",
    phone: "8554-8400",
    mapQuery: "Philippine General Hospital Emergency Room Manila",
    service: "Adult trauma and emergency medicine",
  },
  {
    name: "East Avenue Medical Center ER",
    phone: "8928-0611",
    mapQuery: "East Avenue Medical Center Emergency Room Quezon City",
    service: "Critical care and public emergency unit",
  },
  {
    name: "St. Lukes BGC Emergency",
    phone: "8789-7700",
    mapQuery: "St Lukes Medical Center BGC Emergency Room",
    service: "24/7 emergency and acute response",
  },
];

const TRIAGE_OPTIONS: {
  level: TriageLevel;
  label: string;
  detail: string;
  color: string;
  bg: string;
}[] = [
  {
    level: "red",
    label: "Red",
    detail: "Immediate intervention",
    color: "#B91C1C",
    bg: "#FEE2E2",
  },
  {
    level: "orange",
    label: "Orange",
    detail: "Very urgent",
    color: "#C2410C",
    bg: "#FFEDD5",
  },
  {
    level: "yellow",
    label: "Yellow",
    detail: "Urgent but stable",
    color: "#A16207",
    bg: "#FEF9C3",
  },
  {
    level: "green",
    label: "Green",
    detail: "Minor injuries",
    color: "#166534",
    bg: "#DCFCE7",
  },
];

export default function Emergency() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRefreshRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo>({
    name: "",
    bloodType: "",
    allergies: "",
    conditions: "",
    medications: "",
  });
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [isSmsAvailable, setIsSmsAvailable] = useState(false);
  const [triageLevel, setTriageLevel] = useState<TriageLevel>("yellow");
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(
    null,
  );
  const [hospitalCoords, setHospitalCoords] = useState<
    Record<string, Coordinates>
  >({});
  const [lastHospitalUpdate, setLastHospitalUpdate] = useState<string>("--");

  useEffect(() => {
    void loadData();
    void checkSmsAvailability();
    void Location.requestForegroundPermissionsAsync();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (locationRefreshRef.current) {
        clearInterval(locationRefreshRef.current);
      }
    };
  }, []);

  // Keep handoff synced with latest profile edits whenever user opens this page.
  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, []),
  );

  useEffect(() => {
    const loadRealtimeHospitalData = async () => {
      await refreshCurrentLocation();
      await resolveHospitalCoordinates();
    };

    void loadRealtimeHospitalData();
    locationRefreshRef.current = setInterval(() => {
      void refreshCurrentLocation();
    }, 15000);

    return () => {
      if (locationRefreshRef.current) {
        clearInterval(locationRefreshRef.current);
      }
    };
  }, []);

  const triageState = useMemo(
    () => TRIAGE_OPTIONS.find((item) => item.level === triageLevel),
    [triageLevel],
  );

  const formatDistanceKm = (value: number | null) => {
    if (value === null) {
      return "Distance unavailable";
    }
    if (value < 1) {
      return `${Math.round(value * 1000)} m away`;
    }
    return `${value.toFixed(1)} km away`;
  };

  const realtimeUnits = useMemo(() => {
    const enriched = HOSPITAL_UNITS.map((unit) => {
      const unitCoord = hospitalCoords[unit.name];
      const distanceKm =
        currentLocation && unitCoord
          ? calcDistanceKm(currentLocation, unitCoord)
          : null;

      return {
        ...unit,
        distanceKm,
      };
    });

    return enriched.sort((a, b) => {
      const aDist = a.distanceKm ?? Number.MAX_SAFE_INTEGER;
      const bDist = b.distanceKm ?? Number.MAX_SAFE_INTEGER;
      return aDist - bDist;
    });
  }, [currentLocation, hospitalCoords]);

  const loadData = async () => {
    try {
      const storedContacts = await AsyncStorage.getItem(
        getUserScopedKey(CONTACTS_KEY),
      );
      if (storedContacts) {
        setContacts(JSON.parse(storedContacts));
      }

      const storedMedical = await AsyncStorage.getItem(
        getUserScopedKey(MEDICAL_ID_KEY),
      );
      const storedProfile = await AsyncStorage.getItem(getProfileStorageKey());

      const medicalBase: MedicalInfo = storedMedical
        ? JSON.parse(storedMedical)
        : {
            name: "",
            bloodType: "",
            allergies: "",
            conditions: "",
            medications: "",
          };

      if (!storedProfile) {
        setMedicalInfo(medicalBase);
        return;
      }

      const profile = JSON.parse(storedProfile) as Record<string, string>;
      const profileName =
        `${profile.firstName || ""} ${profile.lastName || ""}`.trim();

      setMedicalInfo({
        ...medicalBase,
        // Profile fields should be the source of truth for shared identity/medical basics.
        name: profileName || medicalBase.name,
        bloodType: profile.bloodType || medicalBase.bloodType,
        allergies: profile.allergies || medicalBase.allergies,
        conditions: profile.conditions || medicalBase.conditions,
      });
    } catch (error) {
      console.error("Failed to load emergency data", error);
    }
  };

  const refreshCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCurrentLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });

      setLastHospitalUpdate(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      // Keep existing data if a location update fails.
    }
  };

  const resolveHospitalCoordinates = async () => {
    try {
      const pairs = await Promise.all(
        HOSPITAL_UNITS.map(async (unit) => {
          const res = await Location.geocodeAsync(unit.mapQuery);
          const first = res[0];
          if (!first) return null;
          return {
            name: unit.name,
            coord: { lat: first.latitude, lng: first.longitude },
          };
        }),
      );

      const mapped: Record<string, Coordinates> = {};
      pairs.forEach((item) => {
        if (item) {
          mapped[item.name] = item.coord;
        }
      });

      setHospitalCoords(mapped);
    } catch {
      // Hospital coordinates are optional; cards still render with call/map actions.
    }
  };

  const saveContacts = async (next: EmergencyContact[]) => {
    await AsyncStorage.setItem(
      getUserScopedKey(CONTACTS_KEY),
      JSON.stringify(next),
    );
    setContacts(next);
  };

  const saveMedicalInfo = async () => {
    try {
      await AsyncStorage.setItem(
        getUserScopedKey(MEDICAL_ID_KEY),
        JSON.stringify(medicalInfo),
      );

      // Keep shared profile fields aligned with handoff edits.
      const existingProfileRaw = await AsyncStorage.getItem(
        getProfileStorageKey(),
      );
      const existingProfile = existingProfileRaw
        ? JSON.parse(existingProfileRaw)
        : {};

      const nameParts = medicalInfo.name.trim().split(/\s+/);
      const firstName = nameParts[0] || existingProfile.firstName || "";
      const lastName =
        nameParts.slice(1).join(" ") || existingProfile.lastName || "";

      await AsyncStorage.setItem(
        getProfileStorageKey(),
        JSON.stringify({
          ...existingProfile,
          firstName,
          lastName,
          bloodType: medicalInfo.bloodType,
          allergies: medicalInfo.allergies,
          conditions: medicalInfo.conditions,
        }),
      );

      setIsEditingMedical(false);
      Alert.alert(
        "Medical profile saved",
        "Your hospital handoff profile is updated.",
      );
    } catch {
      Alert.alert("Save failed", "Unable to save medical profile right now.");
    }
  };

  const checkSmsAvailability = async () => {
    try {
      setIsSmsAvailable(await SMS.isAvailableAsync());
    } catch {
      setIsSmsAvailable(false);
    }
  };

  const getLocationLink = async (): Promise<string> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return "";
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return `https://maps.google.com/?q=${current.coords.latitude},${current.coords.longitude}`;
    } catch {
      return "";
    }
  };

  const startSOSCountdown = () => {
    if (sosCountdown !== null) {
      return;
    }

    setSosCountdown(8);
    let remaining = 8;

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setSosCountdown(remaining);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setSosCountdown(null);
        void executeSos();
      }
    }, 1000);
  };

  const cancelSOS = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setSosCountdown(null);
  };

  const sendHospitalAlertSms = async () => {
    if (!isSmsAvailable || contacts.length === 0) {
      Alert.alert(
        "SMS unavailable",
        "Add contacts and enable SMS capability on this device.",
      );
      return;
    }

    const locationLink = await getLocationLink();
    const triage = triageState?.label ?? "Unknown";
    const message = [
      "Hospital alert from ClarifyApp.",
      `Patient: ${medicalInfo.name || "Unknown"}`,
      `Triage: ${triage}`,
      `Blood type: ${medicalInfo.bloodType || "Not set"}`,
      `Allergies: ${medicalInfo.allergies || "None listed"}`,
      `Conditions: ${medicalInfo.conditions || "None listed"}`,
      `Meds: ${medicalInfo.medications || "None listed"}`,
      locationLink ? `Location: ${locationLink}` : "Location: unavailable",
    ].join("\n");

    try {
      await SMS.sendSMSAsync(
        contacts.map((contact: EmergencyContact) => contact.phone),
        message,
      );
    } catch {
      Alert.alert("SMS error", "Could not send hospital alert to contacts.");
    }
  };

  const executeSos = async () => {
    await sendHospitalAlertSms();
    setTimeout(() => {
      void Linking.openURL("tel:911");
    }, 350);
  };

  const addContact = () => {
    const name = newName.trim();
    const phone = newPhone.trim();

    if (!name || !phone) {
      Alert.alert("Missing information", "Enter a name and a phone number.");
      return;
    }

    void saveContacts([
      ...contacts,
      {
        id: Date.now().toString(),
        name,
        phone,
      },
    ]);

    setNewName("");
    setNewPhone("");
    setIsAddingContact(false);
  };

  const removeContact = (id: string) => {
    Alert.alert("Remove contact", "Delete this emergency contact?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void saveContacts(contacts.filter((contact) => contact.id !== id));
        },
      },
    ]);
  };

  const openHospitalMap = async (query: string) => {
    const locationLink = await getLocationLink();
    const encodedQuery = encodeURIComponent(query);

    const searchUrl = locationLink
      ? `https://www.google.com/maps/search/${encodedQuery}/@${locationLink.split("=")[1]}`
      : `https://www.google.com/maps/search/${encodedQuery}`;

    void Linking.openURL(searchUrl);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B4A6F" />

      {sosCountdown !== null && (
        <Animated.View entering={FadeIn.duration(160)} style={styles.overlay}>
          <View style={styles.overlayBadge}>
            <Ionicons name="pulse" size={26} color={Colors.white} />
            <Text style={styles.overlayBadgeText}>TRAUMA RESPONSE</Text>
          </View>
          <Text style={styles.overlayTitle}>Dispatching emergency call</Text>
          <Text style={styles.overlayLabel}>Calling 911 in</Text>
          <Text style={styles.overlayCount}>{sosCountdown}</Text>
          <TouchableOpacity
            style={styles.overlayCancel}
            onPress={cancelSOS}
            activeOpacity={0.9}
          >
            <Ionicons name="close-circle" size={18} color="#0F172A" />
            <Text style={styles.overlayCancelText}>Cancel alert</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <AppHeader
        title="Hospital Emergency Desk"
        subtitle="Rapid triage, dispatch, and patient handoff"
        onBack={() => router.back()}
        rightLabel="LIVE"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(300)} style={styles.sosCard}>
          <Text style={styles.sosTitle}>Critical Response</Text>
          <Text style={styles.sosDescription}>
            Use this when patient status is severe or rapidly declining.
          </Text>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={startSOSCountdown}
            activeOpacity={0.9}
          >
            <Ionicons name="call" size={22} color={Colors.white} />
            <Text style={styles.sosButtonText}>Activate SOS and Call 911</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => void sendHospitalAlertSms()}
            activeOpacity={0.9}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#0B4A6F" />
            <Text style={styles.secondaryButtonText}>
              Send hospital alert SMS to contacts
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(350).delay(90)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Triage Level</Text>
          <Text style={styles.cardHint}>
            Set current patient urgency before transfer.
          </Text>
          <View style={styles.triageGrid}>
            {TRIAGE_OPTIONS.map((option) => {
              const active = triageLevel === option.level;
              return (
                <TouchableOpacity
                  key={option.level}
                  style={[
                    styles.triageItem,
                    {
                      backgroundColor: option.bg,
                      borderColor: active ? option.color : "transparent",
                    },
                  ]}
                  onPress={() => setTriageLevel(option.level)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.triageLabel, { color: option.color }]}>
                    {option.label}
                  </Text>
                  <Text style={styles.triageDetail}>{option.detail}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(400).delay(140)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Nearest Hospital Units</Text>
          <Text style={styles.cardHint}>
            Live-sorted by your current location. Updated {lastHospitalUpdate}.
          </Text>
          {realtimeUnits.map((unit) => (
            <View key={unit.name} style={styles.hospitalRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hospitalName}>{unit.name}</Text>
                <Text style={styles.hospitalService}>{unit.service}</Text>
                <Text style={styles.hospitalPhone}>{unit.phone}</Text>
                <Text style={styles.hospitalDistance}>
                  {formatDistanceKm(unit.distanceKm)}
                </Text>
              </View>
              <View style={styles.hospitalActions}>
                <TouchableOpacity
                  style={styles.unitAction}
                  onPress={() => void Linking.openURL(`tel:${unit.phone}`)}
                >
                  <Ionicons name="call" size={18} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitAction, styles.mapAction]}
                  onPress={() => void openHospitalMap(unit.mapQuery)}
                >
                  <Ionicons name="navigate" size={18} color="#0B4A6F" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(460).delay(190)}
          style={styles.card}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Patient Medical Handoff</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={
                isEditingMedical
                  ? saveMedicalInfo
                  : () => setIsEditingMedical(true)
              }
            >
              <Ionicons
                name={isEditingMedical ? "checkmark" : "create-outline"}
                size={14}
                color="#0B4A6F"
              />
              <Text style={styles.editButtonText}>
                {isEditingMedical ? "Save" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditingMedical ? (
            <View style={styles.formStack}>
              <TextInput
                style={styles.input}
                placeholder="Patient full name"
                placeholderTextColor={Colors.textTertiary}
                value={medicalInfo.name}
                onChangeText={(text) =>
                  setMedicalInfo({ ...medicalInfo, name: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Blood type"
                placeholderTextColor={Colors.textTertiary}
                value={medicalInfo.bloodType}
                onChangeText={(text) =>
                  setMedicalInfo({ ...medicalInfo, bloodType: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Allergies"
                placeholderTextColor={Colors.textTertiary}
                value={medicalInfo.allergies}
                onChangeText={(text) =>
                  setMedicalInfo({ ...medicalInfo, allergies: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Medical conditions"
                placeholderTextColor={Colors.textTertiary}
                value={medicalInfo.conditions}
                onChangeText={(text) =>
                  setMedicalInfo({ ...medicalInfo, conditions: text })
                }
              />
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Current medications"
                placeholderTextColor={Colors.textTertiary}
                multiline
                value={medicalInfo.medications}
                onChangeText={(text) =>
                  setMedicalInfo({ ...medicalInfo, medications: text })
                }
              />
            </View>
          ) : (
            <View style={styles.detailStack}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Patient</Text>
                <Text style={styles.detailValue}>
                  {medicalInfo.name || "--"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Blood Type</Text>
                <Text style={[styles.detailValue, styles.bloodTypeValue]}>
                  {medicalInfo.bloodType || "--"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Allergies</Text>
                <Text style={styles.detailValue}>
                  {medicalInfo.allergies || "None listed"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Conditions</Text>
                <Text style={styles.detailValue}>
                  {medicalInfo.conditions || "None listed"}
                </Text>
              </View>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Medications</Text>
                <Text style={styles.detailValue}>
                  {medicalInfo.medications || "None listed"}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(460).delay(210)}
          style={styles.card}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Emergency Contacts</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setIsAddingContact((prev) => !prev)}
            >
              <Ionicons
                name={isAddingContact ? "close" : "add"}
                size={14}
                color={Colors.white}
              />
              <Text style={styles.addButtonText}>
                {isAddingContact ? "Cancel" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          {isAddingContact && (
            <View style={styles.formStack}>
              <TextInput
                style={styles.input}
                placeholder="Contact name"
                placeholderTextColor={Colors.textTertiary}
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />
              <TouchableOpacity style={styles.saveButton} onPress={addContact}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Colors.white}
                />
                <Text style={styles.saveButtonText}>Save contact</Text>
              </TouchableOpacity>
            </View>
          )}

          {contacts.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={styles.contactRow}
              onPress={() => void Linking.openURL(`tel:${contact.phone}`)}
              onLongPress={() => removeContact(contact.id)}
              activeOpacity={0.85}
            >
              <View style={styles.contactAvatar}>
                <Text style={styles.contactInitial}>
                  {contact.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
              <Ionicons name="call" size={18} color="#0B4A6F" />
            </TouchableOpacity>
          ))}

          {contacts.length === 0 && !isAddingContact && (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={28}
                color={Colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>No emergency contacts</Text>
              <Text style={styles.emptyHint}>
                Add family or caregivers for rapid updates.
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(450).delay(250)}
          style={styles.checklistCard}
        >
          <Text style={styles.cardTitle}>Hospital Transfer Checklist</Text>
          {[
            "Secure airway and stop severe bleeding before transport",
            "Prepare government ID and insurance details",
            "Bring current medications and recent prescriptions",
            "Keep patient warm and monitor consciousness",
          ].map((item) => (
            <View key={item} style={styles.checkRow}>
              <View style={styles.checkDot} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </Animated.View>

        <View style={{ height: 44 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EAF4FB",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  sosCard: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 18,
  },
  sosTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.white,
  },
  sosDescription: {
    fontSize: 13,
    color: "#CBD5E1",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  sosButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#B91C1C",
    paddingVertical: 14,
    borderRadius: 14,
  },
  sosButtonText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: "#E2EEF6",
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0B4A6F",
    fontWeight: "700",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D6E6F2",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardHint: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  triageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  triageItem: {
    width: "48.6%",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 2,
  },
  triageLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  triageDetail: {
    fontSize: 11,
    color: "#334155",
    marginTop: 2,
  },
  hospitalRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
    gap: 8,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  hospitalService: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  hospitalPhone: {
    fontSize: 12,
    color: "#0B4A6F",
    marginTop: 4,
    fontWeight: "700",
  },
  hospitalDistance: {
    marginTop: 4,
    fontSize: 11,
    color: "#1D4ED8",
    fontWeight: "700",
  },
  hospitalActions: {
    gap: 8,
  },
  unitAction: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#0B4A6F",
    justifyContent: "center",
    alignItems: "center",
  },
  mapAction: {
    backgroundColor: "#DBEAFE",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E2EEF6",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  editButtonText: {
    fontWeight: "700",
    color: "#0B4A6F",
    fontSize: 12,
  },
  formStack: {
    gap: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#D3E0EA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  detailStack: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    textAlign: "right",
    fontWeight: "700",
  },
  bloodTypeValue: {
    color: "#B91C1C",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0B4A6F",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  saveButton: {
    marginTop: 2,
    backgroundColor: "#1D4ED8",
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveButtonText: {
    color: Colors.white,
    fontWeight: "700",
  },
  contactRow: {
    borderWidth: 1,
    borderColor: "#D6E6F2",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    backgroundColor: "#F8FBFF",
  },
  contactAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0B4A6F",
    alignItems: "center",
    justifyContent: "center",
  },
  contactInitial: {
    color: Colors.white,
    fontWeight: "800",
  },
  contactName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  contactPhone: {
    fontSize: 12,
    color: "#475569",
    marginTop: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  checklistCard: {
    backgroundColor: "#F0F9FF",
    borderColor: "#BAE6FD",
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 9,
  },
  checkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#0369A1",
    marginTop: 6,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    lineHeight: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    backgroundColor: "#991B1B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  overlayBadge: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 14,
  },
  overlayBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  overlayTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  overlayLabel: {
    color: "#FECACA",
    marginTop: 12,
    fontSize: 15,
  },
  overlayCount: {
    fontSize: 100,
    color: Colors.white,
    fontWeight: "900",
    lineHeight: 108,
  },
  overlayCancel: {
    marginTop: 20,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overlayCancelText: {
    color: "#0F172A",
    fontWeight: "800",
  },
});
