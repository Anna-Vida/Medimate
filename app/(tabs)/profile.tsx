import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Colors, Shadows } from "../../constants/Colors";
import { getCurrentUser } from "../../services/authFacade";
import { moderateScale, scale, verticalScale } from "../../utils/responsive";

const PROFILE_KEY = "user_profile";
const PREF_NOTIFS = "pref_notifications";
const PREF_VOICE = "pref_voice_assist";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  sex: string;
  bloodType: string;
  seniorId: string;
  philhealthId: string;
  contactNumber: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  allergies: string;
  conditions: string;
  avatarUri?: string;
}

const defaultProfile: UserProfile = {
  firstName: "",
  lastName: "",
  email: "",
  age: "",
  sex: "",
  bloodType: "",
  seniorId: "",
  philhealthId: "",
  contactNumber: "",
  address: "",
  emergencyContact: "",
  emergencyPhone: "",
  allergies: "",
  conditions: "",
  avatarUri: "",
};

// ── Styles defined FIRST so components below can reference them ──────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingTop: verticalScale(48),
    paddingBottom: verticalScale(28),
    paddingHorizontal: scale(20),
    backgroundColor: "#F8FAFC",
  },
  headerHero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: verticalScale(120),
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroBlob: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#A1E3F944",
    top: -60,
    left: -40,
  },
  heroBlob2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#578FCA33",
    top: -30,
    right: -30,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(24),
  },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  editFloat: {
    position: "absolute",
    right: scale(20),
    top: verticalScale(50),
    width: scale(40),
    height: scale(40),
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  avatarArea: { alignItems: "center" },
  avatarRing: {
    padding: 2,
    borderRadius: scale(30),
    marginBottom: verticalScale(12),
  },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(28),
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: scale(28),
    resizeMode: "cover",
  },
  avatarCamBtn: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarText: {
    fontSize: moderateScale(28),
    fontWeight: "800",
    color: Colors.primaryDark,
  },
  avatarName: {
    fontSize: moderateScale(20),
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  avatarPlaceholder: {
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  pillRow: { flexDirection: "row", gap: scale(6), marginTop: verticalScale(8) },
  pill: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillIcon: { marginRight: 0 },
  pillText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  completionWrap: {
    width: "100%",
    marginTop: verticalScale(12),
    paddingHorizontal: scale(20),
  },
  completionBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  completionFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  completionText: {
    marginTop: 6,
    fontSize: moderateScale(11),
    fontWeight: "800",
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  body: { flex: 1 },
  bodyContent: { padding: scale(20), paddingTop: verticalScale(20) },
  saveBtnRow: {
    flexDirection: "row",
    gap: scale(10),
    marginBottom: verticalScale(20),
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: Colors.primary,
    paddingVertical: verticalScale(14),
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: "#FFF",
  },
  cancelBtn: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  logoutBtn: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    paddingVertical: verticalScale(14),
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#DC2626",
  },
  sectionLabel: {
    fontSize: moderateScale(13),
    fontWeight: "800",
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: verticalScale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  field: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(14),
    gap: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  fieldIconWrap: {
    width: scale(32),
    height: scale(32),
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: Colors.textTertiary,
    marginBottom: verticalScale(2),
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  fieldInput: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    fontSize: moderateScale(14),
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  quickRow: {
    flexDirection: "row",
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  quickCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: verticalScale(14),
    alignItems: "center",
    gap: scale(6),
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Shadows.small.shadowColor,
    shadowOpacity: Shadows.small.shadowOpacity,
    shadowRadius: Shadows.small.shadowRadius,
    elevation: Shadows.small.elevation,
  },
  quickLabel: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  quickSub: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: scale(14),
    borderTopWidth: 1,
    borderColor: "#F8FAFC",
  },
  settingsLeft: { flexDirection: "row", alignItems: "center", gap: scale(10) },
  settingsLabel: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  settingsSub: { fontSize: moderateScale(12), color: Colors.textSecondary },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    padding: scale(14),
  },
  infoText: {
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  dangerBtn: {
    marginTop: verticalScale(6),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    paddingVertical: verticalScale(12),
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  dangerText: {
    fontSize: moderateScale(13),
    fontWeight: "800",
    color: "#DC2626",
  },
});

// ── Isolated field — no re-renders while typing ───────────────────────────────
const ProfileField = React.memo(
  ({
    label,
    value,
    icon,
    placeholder,
    keyboard = "default",
    lines = false,
    isEditing,
    onUpdate,
    format,
    options,
  }: {
    label: string;
    value: string;
    icon: string;
    placeholder: string;
    keyboard?: "default" | "phone-pad" | "numeric";
    lines?: boolean;
    isEditing: boolean;
    onUpdate: (v: string) => void;
    format?: (v: string) => string;
    options?: { label: string; value: string }[];
  }) => {
    const ref = useRef<TextInput>(null);
    const localRef = useRef(value);
    const [showDropdown, setShowDropdown] = useState(false);

    // Reset internal ref when value changes (e.g. after load/cancel)
    useEffect(() => {
      localRef.current = value;
      if (isEditing && ref.current) {
        ref.current.setNativeProps({ text: value });
      }
    }, [value, isEditing]);

    const handleTextChange = (t: string) => {
      const formatted = format ? format(t) : t;
      localRef.current = formatted;
      onUpdate(formatted);
      if (ref.current) {
        ref.current.setNativeProps({ text: formatted });
      }
    };

    const handleOptionSelect = (optionValue: string) => {
      onUpdate(optionValue);
      setShowDropdown(false);
    };

    if (options && isEditing) {
      return (
        <View style={styles.field}>
          <View style={styles.fieldIconWrap}>
            <Ionicons name={icon as any} size={16} color={Colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <TouchableOpacity
              style={[styles.fieldInput, { justifyContent: "center" }]}
              onPress={() => setShowDropdown(!showDropdown)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: value ? Colors.textPrimary : "#CBD5E1",
                  fontSize: moderateScale(14),
                  fontWeight: "500",
                }}
              >
                {value || placeholder}
              </Text>
            </TouchableOpacity>
            {showDropdown && (
              <View
                style={{
                  backgroundColor: "#FFF",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginTop: 4,
                  zIndex: 10,
                }}
              >
                {options.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={{
                      padding: scale(12),
                      borderBottomWidth:
                        opt.value === options[options.length - 1].value ? 0 : 1,
                      borderBottomColor: "#F1F5F9",
                    }}
                    onPress={() => handleOptionSelect(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color:
                          value === opt.value
                            ? Colors.primary
                            : Colors.textPrimary,
                        fontWeight: value === opt.value ? "700" : "600",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.field}>
        <View style={styles.fieldIconWrap}>
          <Ionicons name={icon as any} size={16} color={Colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>{label}</Text>
          {isEditing ? (
            <TextInput
              ref={ref}
              style={[
                styles.fieldInput,
                lines ? { height: 60, textAlignVertical: "top" } : undefined,
              ]}
              defaultValue={value}
              onChangeText={handleTextChange}
              onEndEditing={() => onUpdate(localRef.current)}
              placeholder={placeholder}
              placeholderTextColor="#CBD5E1"
              keyboardType={keyboard}
              multiline={lines}
              returnKeyType={lines ? "default" : "done"}
            />
          ) : (
            <Text style={styles.fieldValue}>{value || "—"}</Text>
          )}
        </View>
      </View>
    );
  },
);

ProfileField.displayName = "ProfileField";

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const fillWidth = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));

  // Reload profile every time the tab is navigated to (picks up signup/login data)
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );
  useEffect(() => {
    loadPrefs();
  }, []);

  const loadProfile = async () => {
    try {
      const authUser = getCurrentUser();
      const [data, storedName, storedPhone, storedEmail] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem("user_name"),
        AsyncStorage.getItem("user_phone"),
        AsyncStorage.getItem("user_email"),
      ]);

      const base: UserProfile = data ? JSON.parse(data) : defaultProfile;

      // Merge data from multiple sources (AsyncStorage keys or Firebase Auth)
      const updates: Partial<UserProfile> = {};

      // 1. Sync Email (Always from Auth if possible, else AsyncStorage)
      const effectiveEmail = authUser?.email || storedEmail || "";
      if (effectiveEmail) updates.email = effectiveEmail;

      // 2. Sync Name (If profile is currently blank)
      const effectiveName = storedName || authUser?.displayName || "";
      if (effectiveName && !base.firstName && !base.lastName) {
        const nameParts = effectiveName.split(" ");
        updates.firstName = nameParts[0] || "";
        updates.lastName = nameParts.slice(1).join(" ") || "";
      }

      // 3. Sync Phone
      if (storedPhone && !base.contactNumber) {
        updates.contactNumber = storedPhone;
      }

      // 4. Self-healing: If we have Auth info but AsyncStorage was empty, save it now
      if (authUser) {
        if (authUser.email && !storedEmail) {
          await AsyncStorage.setItem("user_email", authUser.email);
        }
        if (authUser.displayName && !storedName) {
          await AsyncStorage.setItem("user_name", authUser.displayName);
        }
        // Also update the main profile object if it's currently empty
        if (!data || !base.email || (!base.firstName && authUser.displayName)) {
          const updatedProfile = {
            ...base,
            ...updates,
          };
          await AsyncStorage.setItem(
            PROFILE_KEY,
            JSON.stringify(updatedProfile),
          );
        }
      }

      setProfile({ ...base, ...updates });
    } catch (e) {
      console.error("Load profile error:", e);
    }
  };
  const loadPrefs = async () => {
    try {
      const n = await AsyncStorage.getItem(PREF_NOTIFS);
      const v = await AsyncStorage.getItem(PREF_VOICE);
      if (n != null) setNotifEnabled(n === "1");
      if (v != null) setVoiceEnabled(v === "1");
    } catch {}
  };

  const saveProfile = async () => {
    // Validate phone if provided
    if (profile.contactNumber) {
      const phoneDigits = profile.contactNumber.replace(/\D/g, "");
      if (phoneDigits.length !== 12 || !phoneDigits.startsWith("63")) {
        Alert.alert(
          "Invalid phone number",
          "Contact number must start with +63 followed by 10 digits (e.g. +63 912 345 6789)",
        );
        return;
      }
    }
    try {
      setIsSaving(true);
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      setIsEditing(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1500);
    } catch {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  };
  const toggleNotif = async (val: boolean) => {
    setNotifEnabled(val);
    await AsyncStorage.setItem(PREF_NOTIFS, val ? "1" : "0");
  };
  const toggleVoice = async (val: boolean) => {
    setVoiceEnabled(val);
    await AsyncStorage.setItem(PREF_VOICE, val ? "1" : "0");
  };

  const update = useCallback((field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  const initials = () => {
    const f = profile.firstName?.charAt(0) || "";
    const l = profile.lastName?.charAt(0) || "";
    return (f + l).toUpperCase() || "?";
  };

  const handleLogout = async () => {
    try {
      const { signOutFlow } = await import("../../services/authFacade");
      await signOutFlow();
      router.replace("/auth/login");
    } catch {
      Alert.alert("Error", "Could not log out. Please try again.");
    }
  };
  const clearProfile = async () => {
    Alert.alert(
      "Clear profile?",
      "This will remove your saved profile information.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem(PROFILE_KEY);
            setProfile(defaultProfile);
            setIsEditing(false);
          },
        },
      ],
    );
  };

  type FieldKey = Exclude<keyof UserProfile, "avatarUri">;
  const F = (
    label: string,
    field: FieldKey,
    icon: string,
    placeholder: string,
    keyboard: "default" | "phone-pad" | "numeric" = "default",
    lines = false,
    format?: (v: string) => string,
    options?: { label: string; value: string }[],
  ) => (
    <ProfileField
      label={label}
      value={profile[field]}
      icon={icon}
      placeholder={placeholder}
      keyboard={keyboard}
      lines={lines}
      format={format}
      options={options}
      isEditing={isEditing}
      onUpdate={(v) => update(field, v)}
    />
  );

  const hasName = profile.firstName.trim().length > 0;

  const completionFields: (keyof UserProfile)[] = [
    "firstName",
    "lastName",
    "age",
    "sex",
    "bloodType",
    "contactNumber",
    "address",
    "emergencyContact",
    "emergencyPhone",
  ];
  const filled = completionFields.filter(
    (k) => (profile[k] || "").trim().length > 0,
  ).length;
  const completion = Math.round((filled / completionFields.length) * 100);

  useEffect(() => {
    if (barWidth > 0) {
      fillWidth.value = withTiming((completion / 100) * barWidth, {
        duration: 900,
      });
    }
  }, [barWidth, completion]);

  const pickAvatar = async () => {
    // Try expo-image-picker first (if installed), then expo-document-picker; otherwise show guidance
    try {
      let uri: string | undefined;
      try {
        const EPICKER = "expo-image-picker";
        const ImagePicker: any = await import(EPICKER as any);
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync?.();
        if (perm?.granted) {
          const res = await ImagePicker.launchImageLibraryAsync?.({
            mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 1,
            allowsEditing: true,
            quality: 0.8,
          });
          const canceled =
            (res as any)?.canceled === true || (res as any)?.cancelled === true;
          if (!canceled) {
            uri = (res as any)?.assets?.[0]?.uri || (res as any)?.uri;
          }
        }
      } catch {}
      if (!uri) {
        try {
          const EDOCPICK = "expo-document-picker";
          const Doc: any = await import(EDOCPICK as any);
          const res = await (Doc as any).getDocumentAsync?.({
            type: ["image/*"],
          });
          const canceled =
            (res as any)?.canceled === true || (res as any)?.type === "cancel";
          if (!canceled) {
            uri = (res as any)?.assets?.[0]?.uri || (res as any)?.uri;
          }
        } catch {}
      }
      if (uri) {
        setProfile((prev) => ({ ...prev, avatarUri: uri }));
      } else {
        Alert.alert(
          "Photo picker unavailable",
          "To enable picking photos, install and rebuild with either expo-image-picker or expo-document-picker. For now, initials will be shown.",
        );
      }
    } catch {
      Alert.alert(
        "Photo picker error",
        "Unable to open a photo selector on this device.",
      );
    }
  };

  const [savedToast, setSavedToast] = useState(false);
  const Content = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <TouchableOpacity
          onPress={isEditing ? saveProfile : () => setIsEditing(true)}
          activeOpacity={0.7}
          disabled={isSaving}
          style={styles.editFloat}
        >
          <Ionicons
            name={isEditing ? "checkmark" : "create-outline"}
            size={20}
            color={isEditing ? Colors.primary : Colors.primaryDark}
          />
        </TouchableOpacity>

        <View style={styles.avatarArea}>
          <View style={{ position: "relative" }}>
            <LinearGradient
              colors={[Colors.primaryLight, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatar}>
                {profile.avatarUri ? (
                  <Image
                    source={{ uri: profile.avatarUri }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials()}</Text>
                )}
              </View>
            </LinearGradient>
            {isEditing && (
              <TouchableOpacity
                onPress={pickAvatar}
                activeOpacity={0.8}
                style={styles.avatarCamBtn}
              >
                <Ionicons name="camera" size={14} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {hasName ? (
            <>
              <Text style={styles.avatarName}>
                {profile.firstName} {profile.lastName}
              </Text>
              <View style={styles.pillRow}>
                {profile.age ? (
                  <View style={styles.pill}>
                    <Ionicons
                      style={styles.pillIcon}
                      name="calendar"
                      size={12}
                      color="#64748B"
                    />
                    <Text style={styles.pillText}>{profile.age} yrs</Text>
                  </View>
                ) : null}
                {profile.sex ? (
                  <View style={styles.pill}>
                    <Ionicons
                      style={styles.pillIcon}
                      name="male-female"
                      size={12}
                      color="#64748B"
                    />
                    <Text style={styles.pillText}>{profile.sex}</Text>
                  </View>
                ) : null}
                {profile.bloodType ? (
                  <View style={[styles.pill, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons
                      style={styles.pillIcon}
                      name="water"
                      size={12}
                      color="#DC2626"
                    />
                    <Text style={[styles.pillText, { color: "#DC2626" }]}>
                      {profile.bloodType}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <Text style={styles.avatarPlaceholder}>
              Tap Edit to set up your profile
            </Text>
          )}
        </View>
        <View style={styles.completionWrap}>
          <View
            style={styles.completionBar}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          >
            <Animated.View style={[styles.completionFill, fillStyle]} />
          </View>
          <Text style={styles.completionText}>
            PROFILE COMPLETION {completion}%
          </Text>
        </View>
        {savedToast && (
          <Animated.View
            entering={FadeInUp.duration(250)}
            style={{
              position: "absolute",
              top: verticalScale(8),
              alignSelf: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              paddingHorizontal: scale(12),
              paddingVertical: verticalScale(8),
              borderColor: "#E2E8F0",
              borderWidth: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={Colors.success}
            />
            <Text style={{ color: Colors.success, fontWeight: "800" }}>
              Saved
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Body */}
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
          {/* Save/Cancel CTA */}
          {isEditing && (
            <Animated.View
              entering={FadeInUp.duration(400)}
              style={styles.saveBtnRow}
            >
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={saveProfile}
                activeOpacity={0.85}
                disabled={isSaving}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  loadProfile();
                  setIsEditing(false);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <Animated.View
            entering={FadeInUp.duration(400).delay(60)}
            style={styles.quickRow}
          >
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/medications")}
              activeOpacity={0.85}
            >
              <Ionicons name="medkit" size={18} color={Colors.primary} />
              <Text style={styles.quickLabel}>Medications</Text>
              <Text style={styles.quickSub}>Manage</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/scan-history")}
              activeOpacity={0.85}
            >
              <Ionicons name="time" size={18} color={Colors.primary} />
              <Text style={styles.quickLabel}>History</Text>
              <Text style={styles.quickSub}>Recent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push("/emergency")}
              activeOpacity={0.85}
            >
              <Ionicons name="warning" size={18} color="#EF4444" />
              <Text style={styles.quickLabel}>SOS</Text>
              <Text style={styles.quickSub}>Emergency</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Personal */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.sectionLabel}>PERSONAL</Text>
            <View style={styles.card}>
              {F(
                "First Name",
                "firstName",
                "person-outline",
                "Juan",
                "default",
                false,
                (v) => {
                  const cleaned = v.replace(/[^a-zA-Z\s]/g, "");
                  return cleaned.length > 0
                    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
                    : cleaned;
                },
              )}
              {F(
                "Last Name",
                "lastName",
                "person-outline",
                "Dela Cruz",
                "default",
                false,
                (v) => {
                  const cleaned = v.replace(/[^a-zA-Z\s]/g, "");
                  return cleaned.length > 0
                    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
                    : cleaned;
                },
              )}
              {F("Age", "age", "calendar-outline", "65", "numeric")}
              {/* Email — read-only, always sourced from auth */}
              <View style={styles.field}>
                <View style={styles.fieldIconWrap}>
                  <Ionicons
                    name={"mail-outline" as any}
                    size={16}
                    color={Colors.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Email (Account)</Text>
                  <Text
                    style={[
                      styles.fieldValue,
                      { color: profile.email ? Colors.textPrimary : "#CBD5E1" },
                    ]}
                  >
                    {profile.email || "—"}
                  </Text>
                </View>
              </View>
              {F(
                "Sex",
                "sex",
                "male-female-outline",
                "Select...",
                "default",
                false,
                undefined,
                [
                  { label: "Female", value: "Female" },
                  { label: "Male", value: "Male" },
                  { label: "Other", value: "Other" },
                ],
              )}
              {F(
                "Phone",
                "contactNumber",
                "call-outline",
                "+63 (9XX) XXX XXXX",
                "phone-pad",
                false,
                (v) => {
                  const digits = v.replace(/\D/g, "");
                  if (digits.length === 0) return "";
                  // Format as PHP: +63 9XX XXX XXXX or +63 (9XX) XXX XXXX
                  if (digits.length <= 2) return `+${digits}`;
                  if (digits.length <= 5)
                    return `+${digits.slice(0, 2)} (${digits.slice(2)})`;
                  if (digits.length <= 8)
                    return `+${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5)}`;
                  return `+${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5, 8)} ${digits.slice(8, 12)}`;
                },
              )}
              {F(
                "Address",
                "address",
                "location-outline",
                "Brgy, City",
                "default",
                true,
              )}
            </View>
          </Animated.View>

          {/* Medical */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Text style={styles.sectionLabel}>MEDICAL</Text>
            <View style={styles.card}>
              {F(
                "Blood Type",
                "bloodType",
                "water-outline",
                "Select...",
                "default",
                false,
                undefined,
                [
                  { label: "O+", value: "O+" },
                  { label: "O-", value: "O-" },
                  { label: "A+", value: "A+" },
                  { label: "A-", value: "A-" },
                  { label: "B+", value: "B+" },
                  { label: "B-", value: "B-" },
                  { label: "AB+", value: "AB+" },
                  { label: "AB-", value: "AB-" },
                ],
              )}
              {F(
                "Allergies",
                "allergies",
                "alert-circle-outline",
                "Penicillin, Aspirin...",
                "default",
                true,
              )}
              {F(
                "Conditions",
                "conditions",
                "fitness-outline",
                "Diabetes, Hypertension...",
                "default",
                true,
              )}
            </View>
          </Animated.View>

          {/* IDs */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <Text style={styles.sectionLabel}>GOVERNMENT IDs</Text>
            <View style={styles.card}>
              {F(
                "Senior Citizen ID",
                "seniorId",
                "id-card-outline",
                "SC-XXXXXXXXXX",
              )}
              {F(
                "PhilHealth ID",
                "philhealthId",
                "shield-checkmark-outline",
                "XX-XXXXXXXXX-X",
              )}
            </View>
          </Animated.View>

          {/* Emergency */}
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Text style={styles.sectionLabel}>EMERGENCY CONTACT</Text>
            <View style={styles.card}>
              {F(
                "Contact Person",
                "emergencyContact",
                "people-outline",
                "Maria Dela Cruz",
                "default",
                false,
                (v) => {
                  const cleaned = v.replace(/[^a-zA-Z\s]/g, "");
                  return cleaned.length > 0
                    ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
                    : cleaned;
                },
              )}
              {F(
                "Phone",
                "emergencyPhone",
                "call-outline",
                "+63 (9XX) XXX XXXX",
                "phone-pad",
                false,
                (v) => {
                  const digits = v.replace(/\D/g, "");
                  if (digits.length === 0) return "";
                  if (digits.length <= 2) return `+${digits}`;
                  if (digits.length <= 5)
                    return `+${digits.slice(0, 2)} (${digits.slice(2)})`;
                  if (digits.length <= 8)
                    return `+${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5)}`;
                  return `+${digits.slice(0, 2)} (${digits.slice(2, 5)}) ${digits.slice(5, 8)} ${digits.slice(8, 12)}`;
                },
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(450)}>
            <Text style={styles.sectionLabel}>PREFERENCES</Text>
            <View style={styles.card}>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLeft}>
                  <Ionicons
                    name="notifications"
                    size={18}
                    color={Colors.primary}
                  />
                  <View>
                    <Text style={styles.settingsLabel}>Notifications</Text>
                    <Text style={styles.settingsSub}>
                      Reminders and updates
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifEnabled}
                  onValueChange={toggleNotif}
                  trackColor={{ false: "#D1D5DB", true: Colors.primaryLight }}
                  thumbColor={notifEnabled ? Colors.primary : "#F4F3F4"}
                />
              </View>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLeft}>
                  <Ionicons name="mic" size={18} color={Colors.primary} />
                  <View>
                    <Text style={styles.settingsLabel}>Voice Assist</Text>
                    <Text style={styles.settingsSub}>
                      Enable spoken prompts
                    </Text>
                  </View>
                </View>
                <Switch
                  value={voiceEnabled}
                  onValueChange={toggleVoice}
                  trackColor={{ false: "#D1D5DB", true: Colors.primaryLight }}
                  thumbColor={voiceEnabled ? Colors.primary : "#F4F3F4"}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(500)}>
            <Text style={styles.sectionLabel}>APP</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={18} color="#64748B" />
                <Text style={styles.infoText}>MediMate</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={clearProfile}
              activeOpacity={0.85}
            >
              <Ionicons name="trash" size={16} color="#DC2626" />
              <Text style={styles.dangerText}>Clear Profile Data</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Log Out */}
          <Animated.View entering={FadeInUp.duration(400).delay(500)}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: verticalScale(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.root}>{Content}</View>
    </SafeAreaView>
  );
}
