import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { HeaderIconButton } from "../../components/ui/header-icon-button";
import { Colors } from "../../constants/Colors";
import { HeaderMetrics } from "../../constants/ui";
import { signUpFlow } from "../../services/authFacade";
import { syncIdentityToProfile } from "../../services/userProfile";
import { moderateScale, scale, verticalScale } from "../../utils/responsive";

type BannerState = {
  tone: "error" | "success" | "info";
  title: string;
  message: string;
};

const AUTH_ACCENT = Colors.primary;
const AUTH_ACCENT_TEXT = Colors.white;
const BORDER_COLOR = "#D8DCE2";
const MUTED_TEXT = "#67707C";
const WARNING_BG = "#FFF8E8";
const WARNING_BORDER = "#E7D1A1";
const WARNING_ICON_BG = "#FDE7B0";
const WARNING_ICON = "#9D6B08";
const SUCCESS_BG = "#EEF8F2";
const SUCCESS_BORDER = "#BFE0CA";
const SUCCESS_ICON_BG = "#D8EFDF";

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [pinFocused, setPinFocused] = useState(false);
  const [confirmPinFocused, setConfirmPinFocused] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const formatName = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z\s]/g, "");
    return cleaned.length > 0
      ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      : cleaned;
  };

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, "");
    const capped = digits.slice(0, 12);

    if (capped.length === 0) return "";
    if (capped.length <= 2) return `+${capped}`;
    if (capped.length <= 5) return `+${capped.slice(0, 2)} (${capped.slice(2)})`;
    if (capped.length <= 8) {
      return `+${capped.slice(0, 2)} (${capped.slice(2, 5)}) ${capped.slice(5)}`;
    }
    return `+${capped.slice(0, 2)} (${capped.slice(2, 5)}) ${capped.slice(5, 8)} ${capped.slice(8, 12)}`;
  };

  const validateInputs = () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setBanner({
        tone: "error",
        title: "Missing information",
        message: "Please enter your full name.",
      });
      return false;
    }
    if (trimmedName.length < 2) {
      setBanner({
        tone: "error",
        title: "Invalid name",
        message: "Your name must be at least 2 characters long.",
      });
      return false;
    }
    if (!email.trim()) {
      setBanner({
        tone: "error",
        title: "Missing information",
        message: "Please enter your email address.",
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setBanner({
        tone: "error",
        title: "Invalid email",
        message: "Please enter a valid email address.",
      });
      return false;
    }

    const phoneDigits = contactNumber.replace(/\D/g, "");
    if (
      !contactNumber ||
      phoneDigits.length !== 12 ||
      !phoneDigits.startsWith("63")
    ) {
      setBanner({
        tone: "error",
        title: "Invalid phone number",
        message: "Use a Philippine number starting with +63 and 10 digits.",
      });
      return false;
    }

    if (!pin || pin.length < 6) {
      setBanner({
        tone: "error",
        title: "Invalid PIN",
        message: "Your PIN must be at least 6 digits.",
      });
      return false;
    }

    if (pin !== confirmPin) {
      setBanner({
        tone: "error",
        title: "PIN mismatch",
        message: "The PIN confirmation does not match.",
      });
      return false;
    }

    return true;
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/auth/login");
  };

  const handleSignUp = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);
      setBanner(null);
      const trimmedName = fullName.trim();
      const trimmedEmail = email.trim();
      const trimmedPin = pin.trim();

      await signUpFlow(trimmedEmail, trimmedPin, trimmedName);
      await syncIdentityToProfile(
        {
          fullName: trimmedName,
          email: trimmedEmail,
          contactNumber,
        },
        { forceName: true },
      );
      await AsyncStorage.setItem("onboarding_done", "1");

      setBanner({
        tone: "success",
        title: "Account created",
        message: "Your MediMate account is ready. Redirecting now.",
      });
      setTimeout(() => router.replace("/(tabs)"), 900);
    } catch (e: any) {
      const code = e?.message;
      console.error("Sign up error:", e);

      if (code === "email_exists" || code === "auth/email-already-in-use") {
        setBanner({
          tone: "error",
          title: "Email already used",
          message: "This email is already registered. Try signing in instead.",
        });
      } else if (code === "weak_pin" || code === "auth/weak-password") {
        setBanner({
          tone: "error",
          title: "Weak PIN",
          message: "PIN must be at least 6 characters long.",
        });
      } else {
        setBanner({
          tone: "error",
          title: "Sign up failed",
          message: "Could not create your account. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.backgroundAccentTop} />
          <View style={styles.backgroundAccentBottom} />

          <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
            <HeaderIconButton
              icon="chevron-back"
              onPress={handleBack}
              style={styles.backButton}
            />
            <Text style={styles.pageTitle}>Create account</Text>
            <Text style={styles.pageSubtitle}>Sign up to continue</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(320).delay(40)} style={styles.formArea}>
            {banner ? (
              <View
                style={[
                  styles.banner,
                  banner.tone === "error" && styles.bannerError,
                  banner.tone === "success" && styles.bannerSuccess,
                  banner.tone === "info" && styles.bannerInfo,
                ]}
              >
                <View
                  style={[
                    styles.bannerIconWrap,
                    banner.tone === "success"
                      ? styles.bannerIconWrapSuccess
                      : styles.bannerIconWrapWarning,
                  ]}
                >
                  <Ionicons
                    name={
                      banner.tone === "success"
                        ? "checkmark"
                        : "warning-outline"
                    }
                    size={16}
                    color={
                      banner.tone === "success" ? Colors.success : WARNING_ICON
                    }
                    style={styles.bannerIcon}
                  />
                </View>
                <View style={styles.bannerText}>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  <Text style={styles.bannerMessage}>{banner.message}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <View
                style={[
                  styles.inputShell,
                  nameFocused && styles.inputShellFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={nameFocused ? Colors.primary : "#8A94A3"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#97A0AC"
                  value={fullName}
                  onChangeText={(text) => setFullName(formatName(text))}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View
                style={[
                  styles.inputShell,
                  emailFocused && styles.inputShellFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={emailFocused ? Colors.primary : "#8A94A3"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="example@gmail.com"
                  placeholderTextColor="#97A0AC"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone number</Text>
              <View
                style={[
                  styles.inputShell,
                  phoneFocused && styles.inputShellFocused,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={phoneFocused ? Colors.primary : "#8A94A3"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="+63 (9XX) XXX XXXX"
                  placeholderTextColor="#97A0AC"
                  value={contactNumber}
                  onChangeText={(text) => setContactNumber(formatPhone(text))}
                  onFocus={() => setPhoneFocused(true)}
                  onBlur={() => setPhoneFocused(false)}
                  maxLength={19}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PIN</Text>
              <View
                style={[
                  styles.inputShell,
                  pinFocused && styles.inputShellFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={pinFocused ? Colors.primary : "#8A94A3"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPin}
                  keyboardType="number-pad"
                  placeholder="Create PIN"
                  placeholderTextColor="#97A0AC"
                  value={pin}
                  onChangeText={setPin}
                  onFocus={() => setPinFocused(true)}
                  onBlur={() => setPinFocused(false)}
                  maxLength={6}
                />
                <TouchableOpacity
                  onPress={() => setShowPin((current) => !current)}
                  style={styles.trailingButton}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={showPin ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={Colors.primaryLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm PIN</Text>
              <View
                style={[
                  styles.inputShell,
                  confirmPinFocused && styles.inputShellFocused,
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={confirmPinFocused ? Colors.primary : "#8A94A3"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showConfirmPin}
                  keyboardType="number-pad"
                  placeholder="Re-enter PIN"
                  placeholderTextColor="#97A0AC"
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  onFocus={() => setConfirmPinFocused(true)}
                  onBlur={() => setConfirmPinFocused(false)}
                  maxLength={6}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPin((current) => !current)}
                  style={styles.trailingButton}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={showConfirmPin ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={Colors.primaryLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSignUp}
              activeOpacity={0.9}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={AUTH_ACCENT_TEXT} />
              ) : (
                <Text style={styles.primaryButtonText}>Create account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={handleBack} activeOpacity={0.85}>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(HeaderMetrics.horizontal),
    paddingTop: verticalScale(HeaderMetrics.compactTop),
    paddingBottom: verticalScale(28),
  },
  backgroundAccentTop: {
    position: "absolute",
    top: verticalScale(-86),
    right: scale(-56),
    width: scale(228),
    height: scale(228),
    borderRadius: 999,
    backgroundColor: "rgba(74, 124, 167, 0.14)",
  },
  backgroundAccentBottom: {
    position: "absolute",
    bottom: verticalScale(-90),
    left: scale(-60),
    width: scale(200),
    height: scale(200),
    borderRadius: 999,
    backgroundColor: "rgba(18, 52, 88, 0.08)",
  },
  header: {
    paddingTop: verticalScale(16),
    marginBottom: verticalScale(26),
  },
  backButton: {
    marginBottom: verticalScale(28),
  },
  pageTitle: {
    fontSize: moderateScale(31),
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.9,
  },
  pageSubtitle: {
    marginTop: verticalScale(8),
    fontSize: moderateScale(15),
    color: MUTED_TEXT,
  },
  formArea: {
    width: "100%",
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(13),
    marginBottom: verticalScale(20),
  },
  bannerError: {
    backgroundColor: WARNING_BG,
    borderColor: WARNING_BORDER,
  },
  bannerSuccess: {
    backgroundColor: SUCCESS_BG,
    borderColor: SUCCESS_BORDER,
  },
  bannerInfo: {
    backgroundColor: WARNING_BG,
    borderColor: WARNING_BORDER,
  },
  bannerIconWrap: {
    width: scale(28),
    height: scale(28),
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(10),
    marginTop: verticalScale(1),
  },
  bannerIconWrapWarning: {
    backgroundColor: WARNING_ICON_BG,
  },
  bannerIconWrapSuccess: {
    backgroundColor: SUCCESS_ICON_BG,
  },
  bannerIcon: {
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: moderateScale(13),
    fontWeight: "700",
    color: "#2B2F36",
    marginBottom: verticalScale(3),
  },
  bannerMessage: {
    fontSize: moderateScale(12.5),
    color: "#5F6772",
    lineHeight: 19,
  },
  field: {
    marginBottom: verticalScale(18),
  },
  label: {
    marginBottom: verticalScale(9),
    fontSize: moderateScale(13),
    fontWeight: "600",
    color: "#202733",
  },
  inputShell: {
    minHeight: verticalScale(56),
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(14),
  },
  inputShellFocused: {
    borderColor: Colors.primaryLight,
  },
  inputIcon: {
    marginRight: scale(10),
  },
  trailingButton: {
    paddingLeft: scale(10),
    paddingVertical: verticalScale(4),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(14),
    color: "#111111",
  },
  primaryButton: {
    minHeight: verticalScale(56),
    borderRadius: 16,
    backgroundColor: AUTH_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(10),
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: moderateScale(15),
    fontWeight: "800",
    color: AUTH_ACCENT_TEXT,
  },
  footerRow: {
    marginTop: verticalScale(22),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(6),
  },
  footerText: {
    fontSize: moderateScale(13),
    color: MUTED_TEXT,
  },
  footerLink: {
    fontSize: moderateScale(13),
    fontWeight: "800",
    color: Colors.primary,
  },
});
