import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { Colors } from "../../constants/Colors";
import { HeaderMetrics } from "../../constants/ui";
import { getCurrentUser, signInFlow } from "../../services/authFacade";
import { syncIdentityToProfile } from "../../services/userProfile";
import { moderateScale, scale, verticalScale } from "../../utils/responsive";

type BannerState = {
  tone: "error" | "success" | "info" | "warning";
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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pinFocused, setPinFocused] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);

  const resolveAuthCode = (error: any) => {
    const code = String(error?.code || error?.message || "").toLowerCase();
    return code;
  };

  const handleLogin = async () => {
    if (!email || !pin) {
      setBanner({
        tone: "error",
        title: "Missing information",
        message: "Enter your email address and PIN to continue.",
      });
      return;
    }

    try {
      setLoading(true);
      setBanner(null);
      await signInFlow(email.trim(), pin.trim());
      await AsyncStorage.setItem("onboarding_done", "1");
      const authUser = getCurrentUser();
      await syncIdentityToProfile({
        email: authUser?.email || email.trim(),
        fullName: authUser?.displayName,
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      const code = resolveAuthCode(e);

      if (code.includes("not_found")) {
        setBanner({
          tone: "warning",
          title: "Account not found",
          message: "No account matched that email. Create one to continue.",
        });
      } else if (
        code.includes("invalid") ||
        code.includes("invalid-credential")
      ) {
        setBanner({
          tone: "warning",
          title: "Incorrect login details",
          message: "Check your email and PIN, then try again.",
        });
      } else {
        console.warn("Login issue:", e);
        setBanner({
          tone: "error",
          title: "Sign in failed",
          message: "Could not sign in right now. Please try again.",
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
            <View style={styles.brandRow}>
              <Image
                source={require("../../assets/images/MEDIMATE LOGO.png")}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.brandText}>MediMate</Text>
            </View>
            <Text style={styles.pageTitle}>Login account</Text>
            <Text style={styles.pageSubtitle}>Welcome back!</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(320).delay(40)} style={styles.formArea}>
            {banner ? (
              <View
                style={[
                  styles.banner,
                  banner.tone === "error" && styles.bannerError,
                  banner.tone === "warning" && styles.bannerWarning,
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
                  placeholder="Enter your PIN"
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

            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.9}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color={AUTH_ACCENT_TEXT} />
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                await AsyncStorage.setItem("onboarding_done", "1");
                router.replace("/(tabs)");
              }}
              activeOpacity={0.85}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Continue as guest</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{"Don't have an account?"}</Text>
              <TouchableOpacity
                onPress={() => router.push("/auth/signup")}
                activeOpacity={0.85}
              >
                <Text style={styles.footerLink}>Sign up</Text>
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
    paddingTop: verticalScale(HeaderMetrics.regularVertical),
    paddingBottom: verticalScale(28),
  },
  backgroundAccentTop: {
    position: "absolute",
    top: verticalScale(-82),
    right: scale(-50),
    width: scale(220),
    height: scale(220),
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
    paddingTop: verticalScale(24),
    marginBottom: verticalScale(28),
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    marginBottom: verticalScale(20),
  },
  logo: {
    width: scale(34),
    height: scale(34),
  },
  brandText: {
    fontSize: moderateScale(15),
    fontWeight: "800",
    color: "#171717",
    letterSpacing: -0.2,
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
  bannerWarning: {
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
  secondaryButton: {
    minHeight: verticalScale(56),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(12),
  },
  secondaryButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: Colors.primary,
  },
  footerRow: {
    marginTop: verticalScale(24),
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
