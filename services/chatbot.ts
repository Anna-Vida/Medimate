import { GoogleGenerativeAI } from "@google/generative-ai";
import { callAiProxy, hasAiProxy } from "./aiProxy";
import { isInternetAvailable } from "./network";
import { getOfflineChatbotReply } from "./offlineFallback";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

function isApiKeyIssue(error: unknown): boolean {
  const text = String(error || "").toLowerCase();
  return (
    text.includes("api_key_invalid") ||
    text.includes("api key expired") ||
    text.includes("api key invalid") ||
    text.includes("key expired")
  );
}

function isQuotaIssue(error: unknown): boolean {
  const text = String(error || "").toLowerCase();
  return (
    text.includes("429") ||
    text.includes("quota") ||
    text.includes("rate limit")
  );
}

function shouldUseOfflineFallback(error: unknown): boolean {
  return isApiKeyIssue(error) || isQuotaIssue(error);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatbotOptions {
  languageName?: string;
}

function sanitizeChatResponse(text: string): string {
  return text
    .replace(/\*/g, "")
    .replace(/^\s*[-#]+\s*/gm, "")
    .replace(/`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildPrompt(messages: ChatMessage[], languageName: string) {
  const conversation = messages
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`,
    )
    .join("\n");

  return `You are ClarifyApp CareBot, a formal healthcare support assistant for Filipino users.
Rules:
- Give practical, concise answers in clear and simple English.
- Use a professional and respectful tone.
- Do not use markdown, asterisks, bullet symbols, or emojis.
- If the request is medical, include a short safety note: emergency symptoms need immediate professional care.
- Never claim to replace a doctor.
- If users ask about medications, advise consulting pharmacist/doctor for dose changes.
- Keep answer under 180 words.
- Respond fully in ${languageName}.

Conversation:
${conversation}

Now answer the latest user message as the assistant.`;
}

export async function getChatbotReply(
  messages: ChatMessage[],
  options?: ChatbotOptions,
): Promise<string> {
  const latest = messages[messages.length - 1]?.content || "";
  const languageName = options?.languageName || "English";

  const online = await isInternetAvailable();
  if (!online) {
    return sanitizeChatResponse(getOfflineChatbotReply(latest));
  }

  const conversation = messages
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`,
    )
    .join("\n");

  const languageScopedConversation =
    `Preferred response language: ${languageName}.\n` + conversation;

  if (hasAiProxy()) {
    try {
      const text = await callAiProxy({
        task: "chatbot",
        prompt: languageScopedConversation,
        model: "gemini-2.5-flash",
      });

      return sanitizeChatResponse(
        text || "I could not generate a response right now. Please try again.",
      );
    } catch (error) {
      console.error("Chatbot proxy error:", error);
      if (shouldUseOfflineFallback(error)) {
        return sanitizeChatResponse(getOfflineChatbotReply(latest));
      }
      return "I could not reach the AI service right now. Please check your internet and try again.";
    }
  }

  if (!API_KEY) {
    return sanitizeChatResponse(getOfflineChatbotReply(latest));
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(
      buildPrompt(messages, languageName),
    );
    const text = result.response.text().trim();

    return sanitizeChatResponse(
      text || "I could not generate a response right now. Please try again.",
    );
  } catch (error) {
    if (shouldUseOfflineFallback(error)) {
      return sanitizeChatResponse(getOfflineChatbotReply(latest));
    }

    console.error("Chatbot error:", error);
    return "I could not reach the AI service right now. Please check your internet and try again.";
  }
}
