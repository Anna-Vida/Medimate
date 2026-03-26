import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Colors } from "../../constants/Colors";
import { signUpFlow } from "../../services/authFacade";
import { syncIdentityToProfile } from "../../services/userProfile";
import { moderateScale, scale, verticalScale } from "../../utils/responsive";

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [pinFocused, setPinFocused] = useState(false);
  const [confirmPinFocused, setConfirmPinFocused] = useState(false);

  // Name formatter - only letters and spaces, capitalize properly
  const formatName = (text: string) => {
    const cleaned = text.replace(/[^a-zA-Z\s]/g, ""); // Remove non-letters/spaces
    return cleaned.length > 0
      ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      : cleaned;
  };

  // Phone formatter - +63 followed by 10 digits, formatted as +63 (9XX) XXX XXXX
  const formatPhone = (text: string) => {
    // Keep only digits
    const digits = text.replace(/\D/g, "");
    // Limit to country code (2) + 10 digits = 12 max
    const capped = digits.slice(0, 12);
    if (capped.length === 0) return "";
    if (capped.length <= 2) return `+${capped}`;
    if (capped.length <= 5)
      return `+${capped.slice(0, 2)} (${capped.slice(2)})`;
    if (capped.length <= 8)
      return `+${capped.slice(0, 2)} (${capped.slice(2, 5)}) ${capped.slice(5)}`;
    return `+${capped.slice(0, 2)} (${capped.slice(2, 5)}) ${capped.slice(5, 8)} ${capped.slice(8, 12)}`;
  };

  const validateInputs = () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert("Missing info", "Please enter your name");
      return false;
    }
    if (trimmedName.length < 2) {
      Alert.alert("Invalid name", "Name must be at least 2 characters");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Missing info", "Please enter your email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address");
      return false;
    }
    const phoneDigits = contactNumber.replace(/\D/g, "");
    if (
      !contactNumber ||
      phoneDigits.length !== 12 ||
      !phoneDigits.startsWith("63")
    ) {
      Alert.alert(
        "Invalid phone number",
        "Please enter a valid Philippine number starting with +63 followed by 10 digits (e.g. +63 912 345 6789)",
      );
      return false;
    }
    if (!pin || pin.length < 6) {
      Alert.alert("Invalid PIN", "PIN must be at least 6 digits");
      return false;
    }
    if (pin !== confirmPin) {
      Alert.alert("PIN mismatch", "PINs do not match");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateInputs()) return;

    try {
      setLoading(true);
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

      // Show success message before navigating
      Alert.alert(
        "Account Created",
        "Welcome to MediMate! Your account has been created successfully.",
        [{ text: "Continue", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (e: any) {
      const code = e?.message;
      if (code === "email_exists")
        Alert.alert(
          "Email exists",
          "This email is already registered. Try signing in.",
        );
      else if (code === "weak_pin")
        Alert.alert("Weak PIN", "PIN must be at least 6 characters.");
      else if (code === "auth/email-already-in-use")
        Alert.alert("Email Error", "This email is already registered.");
      else if (code === "auth/weak-password")
        Alert.alert("Weak PIN", "PIN must be at least 6 characters.");
      else {
        console.error("Sign up error:", e);
        Alert.alert("Error", "Could not create account. Please try again.");
      }
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
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section with Background */}
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.headerGradient}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Animated.View entering={FadeInDown.duration(600)}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require("../../assets/images/MEDIMATE LOGO.png")}
                  style={{ width: scale(80), height: scale(80), marginBottom: verticalScale(5) }}
                  resizeMode="contain"
                />
                <Text style={styles.headerTitle}>Join MediMate</Text>
                <Text style={styles.headerSubtitle}>
                  Create your health account
                </Text>
              </View>
            </Animated.View>
          </LinearGradient>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Animated.View entering={FadeInUp.duration(600).delay(200)}>
              {/* Full Name Input */}
              <View style={styles.inputGroupContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    nameFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={18}
                    color={nameFocused ? Colors.primary : Colors.textSecondary}
                    style={{ marginRight: scale(10) }}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor={Colors.textTertiary}
                    value={fullName}
                    onChangeText={(text) => setFullName(formatName(text))}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    maxLength={50}
                  />
                </View>
              </View>

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
                    placeholder="your@email.com"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              {/* Phone Number Input */}
              <View style={styles.inputGroupContainer}>
                <Text style={styles.label}>Phone Number (+63)</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    phoneFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons
                    name="call"
                    size={18}
                    color={phoneFocused ? Colors.primary : Colors.textSecondary}
                    style={{ marginRight: scale(10) }}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="+63 (9XX) XXX XXXX"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                    value={contactNumber}
                    onChangeText={(t) => setContactNumber(formatPhone(t))}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    maxLength={19}
                  />
                </View>
              </View>

              {/* PIN Input */}
              <View style={styles.inputGroupContainer}>
                <Text style={styles.label}>Security PIN (4-6 digits)</Text>
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
                    placeholder="••••"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    keyboardType="number-pad"
                    value={pin}
                    onChangeText={setPin}
                    onFocus={() => setPinFocused(true)}
                    onBlur={() => setPinFocused(false)}
                    maxLength={6}
                  />
                </View>
              </View>

              {/* Confirm PIN Input */}
              <View style={styles.inputGroupContainer}>
                <Text style={styles.label}>Confirm PIN</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    confirmPinFocused && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-open"
                    size={18}
                    color={
                      confirmPinFocused ? Colors.primary : Colors.textSecondary
                    }
                    style={{ marginRight: scale(10) }}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="••••"
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry
                    keyboardType="number-pad"
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    onFocus={() => setConfirmPinFocused(true)}
                    onBlur={() => setConfirmPinFocused(false)}
                    maxLength={6}
                  />
                </View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  loading && styles.primaryBtnDisabled,
                ]}
                activeOpacity={0.85}
                onPress={handleSignUp}
                disabled={loading}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.gradientBtn}
                >
                  <Ionicons name="person-add" size={20} color="#FFF" />
                  <Text style={styles.primaryText}>
                    {loading ? "Creating Account..." : "Create Account"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>Already registered?</Text>
                <View style={styles.divider} />
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in" size={18} color={Colors.primary} />
                <Text style={styles.secondaryText}>
                  Sign In to Your Account
                </Text>
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
    paddingVertical: verticalScale(32),
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(48),
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: verticalScale(48),
    left: scale(20),
    width: scale(44),
    height: scale(44),
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: verticalScale(48),
  },
  logoBg: {
    width: scale(70),
    height: scale(70),
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(14),
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerTitle: {
    fontSize: moderateScale(24),
    fontWeight: "900",
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: verticalScale(4),
    fontWeight: "500",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(28),
    justifyContent: "center",
  },
  inputGroupContainer: {
    marginBottom: verticalScale(18),
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
    marginBottom: verticalScale(20),
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
    marginVertical: verticalScale(18),
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
});
