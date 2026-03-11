import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
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
import { ChatMessage, getChatbotReply } from "../services/chatbot";
import { LANGUAGES, Language } from "../services/languages";
import {
    checkSpeechRecognitionAvailable,
    requestSpeechPermission,
    speakText,
    startListening,
    stopListening,
    stopSpeaking,
    useSpeechRecognitionEvent,
} from "../services/speechService";

interface UIChatMessage extends ChatMessage {
  timestamp: number;
}

const QUICK_PROMPTS = [
  "Explain my medicine side effects in simple words",
  "What should I prepare before going to hospital?",
  "How do I remember my daily medicines?",
  "What food should seniors avoid with common medicines?",
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
  const [isListening, setIsListening] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
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
    () => input.trim().length > 0 && !loading,
    [input, loading],
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
    const t = setTimeout(() => {
      chatRef.current?.scrollToEnd({ animated: true });
    }, 70);

    return () => clearTimeout(t);
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || loading) {
      return;
    }

    const nextMessages: UIChatMessage[] = [
      ...messages,
      { role: "user", content: prompt, timestamp: Date.now() },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    const aiMessages: ChatMessage[] = nextMessages.map(({ role, content }) => ({
      role,
      content,
    }));
    try {
      const reply = await getChatbotReply(aiMessages, {
        languageName: selectedLanguage.geminiName,
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
    speakText(
      text,
      () => setSpeakingKey((prev) => (prev === key ? null : prev)),
      selectedLanguage.code,
    );
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, []);

  const handleMicPress = async () => {
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

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <AppHeader
        title="CareBot"
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

          <View style={styles.promptSection}>
            <Text style={styles.promptSectionLabel}>Quick prompts</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptWrap}
            >
              {QUICK_PROMPTS.map((prompt) => (
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
          <TextInput
            style={styles.input}
            placeholder="Ask CareBot anything about your care"
            placeholderTextColor={Colors.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.micButton,
              isListening && styles.micButtonActive,
              loading && { opacity: 0.5 },
            ]}
            onPress={handleMicPress}
            disabled={loading}
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
    marginBottom: 8,
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
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 20 : 12,
    borderTopWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
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
