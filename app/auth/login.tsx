import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Colors } from "../../constants/Colors";
import { getCurrentUser, signInFlow } from "../../services/authFacade";
import { syncIdentityToProfile } from "../../services/userProfile";
import { moderateScale, scale, verticalScale } from "../../utils/responsive";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pinFocused, setPinFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !pin) {
      Alert.alert("Missing info", "Enter email and PIN");
      return;
    }
    try {
      setLoading(true);
      await signInFlow(email.trim(), pin.trim());
      await AsyncStorage.setItem("onboarding_done", "1");
      const authUser = getCurrentUser();
      await syncIdentityToProfile({
        email: authUser?.email || email.trim(),
        fullName: authUser?.displayName,
      });

      router.replace("/(tabs)");
    } catch (e: any) {
      const code = e?.message;
      console.error("Login error details:", e);
      if (code === "not_found")
        Alert.alert("Account not found", "Sign up to create a new account.");
      else if (code === "invalid")
        Alert.alert("Wrong PIN", "Check your PIN and try again.");
      else
        Alert.alert(
          "Error",
          "Could not sign in. Check your email and PIN, or try resetting your password.",
        );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          scrollEnabled={false}
        >
          {/* Header Section */}
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.headerGradient}
          >
            <Animated.View entering={FadeInDown.duration(600)}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require("../../assets/images/MEDIMATE LOGO.png")}
                  style={{ width: scale(120), height: scale(120), marginBottom: verticalScale(10) }}
                  resizeMode="contain"
                />
                <Text style={styles.appName}>MediMate</Text>
                <Text style={styles.tagline}>Your Health Companion</Text>
              </View>
            </Animated.View>
          </LinearGradient>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Animated.View entering={FadeInUp.duration(600).delay(200)}>
              <Text style={styles.welcomeTitle}>Welcome Back</Text>
              <Text style={styles.welcomeSubtitle}>
                Sign in to continue managing your health
              </Text>

              {/* Email Input */}
              <View style={styles.inputGroupContainer}>
                <Text style={styles.label}>Email Address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    emailFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons
                    name="mail"
                    size={18}
                    color={emailFocused ? Colors.primary : Colors.textSecondary}
                    style={{ marginRight: scale(10) }}
                  />
                  <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              {/* PIN Input */}
              <View style={styles.inputGroupContainer}>
                <Text style={styles.label}>Security PIN</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    pinFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={18}
                    color={pinFocused ? Colors.primary : Colors.textSecondary}
                    style={{ marginRight: scale(10) }}
                  />
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    keyboardType="number-pad"
                    placeholder="••••"
                    placeholderTextColor={Colors.textTertiary}
                    value={pin}
                    onChangeText={setPin}
                    onFocus={() => setPinFocused(true)}
                    onBlur={() => setPinFocused(false)}
                    maxLength={6}
                  />
                </View>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={loading}
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.gradientBtn}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.primaryText}>Sign In</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={18}
                        color={Colors.white}
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Guest Login Button */}
              <TouchableOpacity
                onPress={async () => {
                  await AsyncStorage.setItem("onboarding_done", "1");
                  router.replace("/(tabs)");
                }}
                style={[styles.secondaryBtn, { marginTop: verticalScale(10), backgroundColor: 'transparent', borderColor: Colors.primary }]}
              >
                <Text style={styles.secondaryText}>Continue as Guest</Text>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push("/auth/signup")}
                activeOpacity={0.85}
              >
                <Ionicons name="person-add" size={18} color={Colors.primary} />
                <Text style={styles.secondaryText}>Create an Account</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingVertical: verticalScale(40),
    paddingHorizontal: scale(24),
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoBg: {
    width: scale(80),
    height: scale(80),
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  appName: {
    fontSize: moderateScale(28),
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: moderateScale(13),
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: verticalScale(4),
    fontWeight: "500",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(32),
    justifyContent: "center",
  },
  welcomeTitle: {
    fontSize: moderateScale(26),
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: verticalScale(6),
  },
  welcomeSubtitle: {
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginBottom: verticalScale(28),
    lineHeight: 20,
  },
  inputGroupContainer: {
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: moderateScale(12),
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: verticalScale(8),
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: scale(14),
    borderWidth: 1.5,
    borderColor: Colors.border,
    height: verticalScale(48),
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.05)",
  },
  input: {
    flex: 1,
    fontSize: moderateScale(15),
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  primaryBtn: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(24),
    borderRadius: 14,
    overflow: "hidden",
  },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
    gap: scale(8),
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: moderateScale(15),
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: verticalScale(20),
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: scale(12),
    color: Colors.textSecondary,
    fontSize: moderateScale(12),
    fontWeight: "600",
  },
  secondaryBtn: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 14,
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  secondaryText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: moderateScale(15),
  },
  guestBtn: {
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  guestBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: moderateScale(14),
    textDecorationLine: 'underline',
  },
});
