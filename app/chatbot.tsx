import { Ionicons } from "@expo/vector-icons";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/app-header";
import { Colors } from "../constants/Colors";
import { Radius, Spacing } from "../constants/ui";
import {
  AssistantMode,
  ChatMessage,
  getChatbotReply,
} from "../services/chatbot";
import { LANGUAGES, Language } from "../services/languages";
import { getActiveMedications } from "../services/medicationStorage";
import {
  checkSpeechRecognitionAvailable,
  requestSpeechPermission,
  speakText,
  startListening,
  stopListening,
  stopSpeaking,
  useSpeechRecognitionEvent,
} from "../services/speechService";
import { getRecentScans } from "../services/storage";

interface UIChatMessage extends ChatMessage {
  timestamp: number;
}

interface PendingImageAttachment {
  uri: string;
  name: string;
}

const QUICK_PROMPTS = [
  "Explain my medicine side effects in simple words",
  "What should I prepare before going to hospital?",
  "How do I remember my daily medicines?",
  "What food should seniors avoid with common medicines?",
];

const CONSULTANT_PROMPTS = [
  "Review my recent medicine scan and tell me what to watch out for",
  "Explain my dosage in simple words and when I should take it",
  "What side effects or interactions should I monitor right now?",
  "When should I call a doctor about this medicine?",
];

export default function ChatbotScreen() {
  const router = useRouter();
  const chatRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    LANGUAGES[0],
  );
  const [assistantMode, setAssistantMode] =
    useState<AssistantMode>("carebot");
  const [isListening, setIsListening] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [contextSummary, setContextSummary] = useState("");
  const [contextPreview, setContextPreview] = useState<string[]>([]);
  const [pendingImage, setPendingImage] =
    useState<PendingImageAttachment | null>(null);
  const [messages, setMessages] = useState<UIChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello, I am CareBot. I can explain medicine info, reminders, and emergency preparation in simple terms.",
      timestamp: Date.now(),
    },
  ]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const canSend = useMemo(
    () => (input.trim().length > 0 || !!pendingImage) && !loading,
    [input, loading, pendingImage],
  );
  const quickPrompts = useMemo(
    () => (assistantMode === "consultant" ? CONSULTANT_PROMPTS : QUICK_PROMPTS),
    [assistantMode],
  );

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript?.trim();
    if (!transcript) {
      return;
    }
    setInput(transcript);
  });

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);
    Alert.alert("Voice Input Error", event.message || "Please try again.");
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadConsultantContext = async () => {
      try {
        const [activeMeds, recentScans] = await Promise.all([
          getActiveMedications(),
          getRecentScans(),
        ]);

        if (cancelled) {
          return;
        }

        const medLines = activeMeds
          .slice(0, 5)
          .map(
            (med) =>
              `${med.analysis.medicineName} | ${med.analysis.activeIngredients} | ${med.analysis.dosage || "No dosage saved"}`,
          );

        const scanLines = recentScans
          .slice(0, 3)
          .flatMap((scan) =>
            scan.analysis.slice(0, 3).map((result) => {
              const warningText = Array.isArray(result.warnings)
                ? result.warnings.join(", ")
                : result.warnings;
              return `${result.medicineName} | ${result.activeIngredients} | ${warningText || "No warning saved"}`;
            }),
          );

        const sections = [];
        if (medLines.length > 0) {
          sections.push(`Active medicines:\n${medLines.join("\n")}`);
        }
        if (scanLines.length > 0) {
          sections.push(`Recent scanned medicines:\n${scanLines.join("\n")}`);
        }

        setContextSummary(sections.join("\n\n"));
        setContextPreview([...medLines, ...scanLines].slice(0, 4));
      } catch (error) {
        console.warn("Failed to load CareBot context:", error);
        if (!cancelled) {
          setContextSummary("");
          setContextPreview([]);
        }
      }
    };

    void loadConsultantContext();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      chatRef.current?.scrollToEnd({ animated: true });
    }, 70);

    return () => clearTimeout(t);
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const prompt = text.trim();
    if ((!prompt && !pendingImage) || loading) {
      return;
    }

    let imageBase64: string | undefined;
    let outgoingText = prompt;
    if (pendingImage) {
      try {
        imageBase64 = await FileSystem.readAsStringAsync(pendingImage.uri, {
          encoding: "base64",
        });
      } catch {
        Alert.alert(
          "Upload Failed",
          "Could not read the selected image. Please try another file.",
        );
        return;
      }
      if (!outgoingText) {
        outgoingText =
          "Please review this uploaded medical image or check-up result.";
      }
    }

    const nextMessages: UIChatMessage[] = [  
      ...messages,
      {
        role: "user",
        content: pendingImage
          ? `${outgoingText} [Image attached: ${pendingImage.name}]`
          : outgoingText,
        timestamp: Date.now(),
      },
    ];
    setMessages(nextMessages);
    setInput("");
    setPendingImage(null);
    setLoading(true);

    const aiMessages: ChatMessage[] = nextMessages.map(({ role, content }) => ({
      role,
      content,
    }));
    try {
      const reply = await getChatbotReply(aiMessages, {
        languageName: selectedLanguage.geminiName,
        mode: assistantMode,
        contextSummary: assistantMode === "consultant" ? contextSummary : "",
        imageBase64,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, timestamp: Date.now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I could not complete that request right now. Please try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakMessage = (key: string, text: string) => {
    if (speakingKey === key) {
      stopSpeaking();
      setSpeakingKey(null);
      return;
    }

    stopSpeaking();
    setSpeakingKey(key);
    
    // Fallback for languages that might not have a dedicated TTS engine on the device.
    // The content is already translated, so it will still read in the target language.
    const ttsLang = ["fil-PH"].includes(selectedLanguage.code)
      ? "en-US"
      : selectedLanguage.code;

    speakText(
      text,
      () => setSpeakingKey((prev) => (prev === key ? null : prev)),
      ttsLang,
    );
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const handleMicPress = async () => {
    if (isOffline) {
      Alert.alert(
        "Offline Mode",
        "Voice input requires an internet connection. Please connect to the internet to use this feature.",
      );
      return;
    }

    if (isListening) {
      await stopListening();
      setIsListening(false);
      return;
    }

    const available = await checkSpeechRecognitionAvailable();
    if (!available) {
      Alert.alert(
        "Voice Not Available",
        "Speech recognition is not available on this device.",
      );
      return;
    }

    const granted = await requestSpeechPermission();
    if (!granted) {
      Alert.alert(
        "Microphone Permission Needed",
        "Please allow microphone access to use voice input.",
      );
      return;
    }

    try {
      await startListening(selectedLanguage.code || "en-US");
      setIsListening(true);
    } catch {
      setIsListening(false);
      Alert.alert(
        "Could Not Start Voice Input",
        "Please try again in a few seconds.",
      );
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setPendingImage({
        uri: asset.uri,
        name: asset.name || "medical-image.jpg",
      });
    } catch {
      Alert.alert(
        "Upload Failed",
        "Could not open the image picker. Please try again.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <AppHeader
        title={assistantMode === "consultant" ? "Virtual Consultant" : "CareBot"}
        subtitle={`AI health support (${selectedLanguage.geminiName})`}
        onBack={() => router.back()}
        rightIcon="volume-mute"
        onRightPress={() => {
          stopSpeaking();
          setSpeakingKey(null);
        }}
      />

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={chatRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.controlsRow}>
            <View style={styles.modeSwitch}>
              <TouchableOpacity
                style={[
                  styles.modeChip,
                  assistantMode === "carebot" && styles.modeChipActive,
                ]}
                onPress={() => setAssistantMode("carebot")}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    assistantMode === "carebot" && styles.modeChipTextActive,
                  ]}
                >
                  CareBot
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeChip,
                  assistantMode === "consultant" && styles.modeChipActive,
                ]}
                onPress={() => setAssistantMode("consultant")}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    assistantMode === "consultant" &&
                      styles.modeChipTextActive,
                  ]}
                >
                  Consultant
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.languageChip}
              onPress={() => setLanguageModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="language" size={16} color={Colors.primary} />
              <Text style={styles.languageChipText} numberOfLines={1}>
                {selectedLanguage.label}
              </Text>
            </TouchableOpacity>
          </View>

          {assistantMode === "consultant" && (
            <View style={styles.consultantBanner}>
              <Text style={styles.consultantBannerTitle}>
                Virtual Consultant
              </Text>
              <Text style={styles.consultantBannerText}>
                Uses your recent scans and saved medicines when available. It
                does not replace a doctor or pharmacist.
              </Text>
            </View>
          )}

          {assistantMode === "consultant" && contextPreview.length > 0 && (
            <View style={styles.contextCard}>
              <Text style={styles.contextCardTitle}>Consultation Summary</Text>
              <Text style={styles.contextCardSubtitle}>
                The consultant is using these recent medicine details:
              </Text>
              {contextPreview.map((line, index) => (
                <Text
                  key={`${index}-${line}`}
                  style={styles.contextCardLine}
                >
                  {line}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.promptSection}>
            <Text style={styles.promptSectionLabel}>Quick prompts</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptWrap}
            >
              {quickPrompts.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.promptChip}
                  onPress={() => sendMessage(prompt)}
                  disabled={loading}
                >
                  <Text style={styles.promptText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            const messageKey = `${message.role}-${index}`;
            return (
              <View
                key={messageKey}
                style={[
                  styles.messageRow,
                  isAssistant ? styles.assistantRow : styles.userRow,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isAssistant ? styles.assistantBubble : styles.userBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isAssistant ? styles.assistantText : styles.userText,
                    ]}
                  >
                    {message.content}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isAssistant ? styles.assistantTime : styles.userTime,
                    ]}
                  >
                    {formatTime(message.timestamp)}
                  </Text>

                  {isAssistant && (
                    <TouchableOpacity
                      style={styles.speakButton}
                      onPress={() =>
                        handleSpeakMessage(messageKey, message.content)
                      }
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={
                          speakingKey === messageKey
                            ? "stop-circle"
                            : "volume-high"
                        }
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.speakButtonText}>
                        {speakingKey === messageKey ? "Stop" : "Speak"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={[styles.messageRow, styles.assistantRow]}>
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <Text style={[styles.messageText, styles.assistantText]}>
                  Thinking...
                </Text>
                <Text style={[styles.messageTime, styles.assistantTime]}>
                  {formatTime(Date.now())}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          {pendingImage && (
            <View style={styles.attachmentPreview}>
              <Image
                source={{ uri: pendingImage.uri }}
                style={styles.attachmentThumb}
              />
              <View style={styles.attachmentTextWrap}>
                <Text style={styles.attachmentTitle}>Attached image</Text>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {pendingImage.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPendingImage(null)}
                style={styles.attachmentRemove}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={16} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Ask CareBot anything about your care"
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.mediaButton, loading && { opacity: 0.5 }]}
            onPress={handlePickImage}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="image-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.micButton,
              isListening && styles.micButtonActive,
              (loading || isOffline) && { opacity: 0.5 },
            ]}
            onPress={handleMicPress}
            disabled={loading || isOffline}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isListening ? "stop" : "mic"}
              size={17}
              color={isListening ? Colors.white : Colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, !canSend && { opacity: 0.5 }]}
            onPress={() => sendMessage(input)}
            disabled={!canSend}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose CareBot Language</Text>
              <TouchableOpacity
                onPress={() => setLanguageModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((language) => {
                const selected =
                  language.code === selectedLanguage.code &&
                  language.geminiName === selectedLanguage.geminiName;

                return (
                  <TouchableOpacity
                    key={`${language.code}-${language.geminiName}`}
                    style={[
                      styles.languageOption,
                      selected && styles.languageOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedLanguage(language);
                      setLanguageModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        selected && styles.languageOptionTextSelected,
                      ]}
                    >
                      {language.label}
                    </Text>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: 10,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  modeSwitch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
    flexShrink: 1,
  },
  modeChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  modeChipActive: {
    backgroundColor: Colors.primary,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  modeChipTextActive: {
    color: Colors.white,
  },
  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  languageChipText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  consultantBanner: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
  },
  consultantBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 4,
  },
  consultantBannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
  },
  contextCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
  },
  contextCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  contextCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 17,
  },
  contextCardLine: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  promptSection: {
    marginBottom: 4,
  },
  promptSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  promptWrap: {
    gap: 8,
    paddingRight: 8,
  },
  promptChip: {
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 240,
  },
  promptText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  assistantRow: {
    justifyContent: "flex-start",
    paddingRight: 46,
  },
  userRow: {
    justifyContent: "flex-end",
    paddingLeft: 46,
  },
  messageBubble: {
    maxWidth: "100%",
    borderRadius: Radius.lg,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 8,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  messageTime: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "600",
  },
  assistantText: {
    color: Colors.textPrimary,
  },
  assistantTime: {
    color: Colors.textTertiary,
  },
  speakButton: {
    marginTop: 7,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  speakButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  userText: {
    color: Colors.white,
  },
  userTime: {
    color: "rgba(255,255,255,0.72)",
    textAlign: "right",
  },
  inputArea: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    borderTopWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  attachmentPreview: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: 8,
  },
  attachmentThumb: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },
  attachmentTextWrap: {
    flex: 1,
  },
  attachmentTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 2,
  },
  attachmentName: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  attachmentRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryBg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 104,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  mediaButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.42)",
  },
  modalCard: {
    maxHeight: "75%",
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryBg,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  languageOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  languageOptionTextSelected: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
