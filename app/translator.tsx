import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import AppHeader from "../components/app-header";
import { Colors } from "../constants/Colors";
import { translateTagalogToEnglish } from "../services/translator";
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
export default function Translator() {
  const router = useRouter();
  const [tagalogText, setTagalogText] = useState("");
  const [englishTranslation, setEnglishTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const handleTranslate = async () => {
    if (!tagalogText.trim()) {
      Alert.alert(
        "Please Enter Text",
        "Type or speak some Tagalog text to translate.",
      );
      return;
    }
    setIsTranslating(true);
    setEnglishTranslation("");
    try {
      const translation = await translateTagalogToEnglish(tagalogText);
      setEnglishTranslation(translation);
      Speech.speak(translation, {
        language: "en-US",
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error("Translation error:", error);
      Alert.alert(
        "Translation Failed",
        "Could not translate. Please try again.",
      );
    } finally {
      setIsTranslating(false);
    }
  };
  const handleSpeak = () => {
    if (!englishTranslation) return;
    setIsSpeaking(true);
    Speech.speak(englishTranslation, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };
  const handleClear = () => {
    setTagalogText("");
    setEnglishTranslation("");
    Speech.stop();
    setIsSpeaking(false);
  };
  const Content = (
    <KeyboardAvoidingView
      style={styles.content}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instructions */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(100)}
          style={styles.instructionCard}
        >
          <View style={styles.instructionIconWrap}>
            <Ionicons
              name="information-circle"
              size={20}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.instructionText}>
            Type Tagalog text below and tap Translate
          </Text>
        </Animated.View>
        {/* Tagalog Input */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(200)}
          style={styles.inputSection}
        >
          <View style={styles.langRow}>
            <Text style={styles.flagEmoji}>🇵🇭</Text>
            <Text style={styles.sectionLabel}>Tagalog / Filipino</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Type here... (e.g. Kumusta ka?)"
            placeholderTextColor={Colors.textTertiary}
            value={tagalogText}
            onChangeText={setTagalogText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {tagalogText.length > 0 && (
            <Text style={styles.charCount}>
              {tagalogText.length} characters
            </Text>
          )}
        </Animated.View>
        {/* Translate Button */}
        <AnimatedTouchable
          entering={FadeInUp.duration(500).delay(300)}
          style={[
            styles.translateButton,
            isTranslating && styles.translateButtonDisabled,
          ]}
          onPress={handleTranslate}
          disabled={isTranslating}
          activeOpacity={0.85}
        >
          {isTranslating ? (
            <>
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.translateButtonText}>Translating...</Text>
            </>
          ) : (
            <>
              <View style={styles.translateIconWrap}>
                <Ionicons name="language" size={28} color={Colors.white} />
              </View>
              <Text style={styles.translateButtonText}>
                Translate to English
              </Text>
            </>
          )}
        </AnimatedTouchable>
        {/* Translation Result */}
        {englishTranslation ? (
          <Animated.View
            entering={FadeInUp.duration(500).springify()}
            style={styles.resultSection}
          >
            <View style={styles.resultHeader}>
              <View style={styles.langRow}>
                <Ionicons
                  name="flag-outline"
                  size={18}
                  color={Colors.primaryDark}
                />
                <Text style={styles.sectionLabel}>English Translation</Text>
              </View>
              <TouchableOpacity
                onPress={handleSpeak}
                style={[
                  styles.speakButton,
                  isSpeaking && styles.speakButtonActive,
                ]}
                disabled={isSpeaking}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isSpeaking ? "volume-high" : "volume-medium"}
                  size={22}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.translationBox}>
              <Text style={styles.translationText}>{englishTranslation}</Text>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeInDown.duration(500)}>
        <AppHeader
          title="Voice Translator"
          subtitle="Tagalog to English"
          onBack={() => router.back()}
          rightIcon="refresh"
          onRightPress={handleClear}
        />
      </Animated.View>
      {Content}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.primaryDark,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    gap: 12,
  },
  backButton: {},
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  clearButton: {},
  clearBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 18,
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryBg,
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  instructionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: "600",
  },
  inputSection: {
    gap: 10,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  flagEmoji: {
    fontSize: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    fontSize: 17,
    color: Colors.textPrimary,
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: Colors.textTertiary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "right",
    fontWeight: "600",
  },
  translateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 22,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  translateButtonDisabled: {
    backgroundColor: Colors.primaryLight,
  },
  translateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  translateButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resultSection: {
    gap: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  speakButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  speakButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  translationBox: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  translationText: {
    fontSize: 26,
    lineHeight: 38,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
});
