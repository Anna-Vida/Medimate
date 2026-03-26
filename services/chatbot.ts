import { GoogleGenerativeAI } from "@google/generative-ai";
import { callAiProxy, hasAiProxy } from "./aiProxy";
import { isInternetAvailable } from "./network";
import { getOfflineChatbotReply } from "./offlineFallback";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");
const CHATBOT_TIMEOUT_MS = 15000;

async function generateOpenAiChat(
  messages: ChatMessage[],
  languageName: string,
): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_KEY_MISSING");

  const prompt = buildPrompt(messages, languageName);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI Error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isApiKeyIssue(error: unknown): boolean {
  const text = String(error || "").toLowerCase();
  return (
    text.includes("api_key_invalid") ||
    text.includes("api key expired") ||
    text.includes("api key invalid") ||
    text.includes("key expired") ||
    text.includes("token is expired") ||
    text.includes("expired token") ||
    text.includes("401") ||
    text.includes("403") ||
    text.includes("404") ||
    text.includes("not found") ||
    text.includes("billing") ||
    text.includes("insufficient_quota")
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

  try {
    if (!hasAiProxy()) {
      if (!API_KEY && !OPENAI_API_KEY) {
        return sanitizeChatResponse(getOfflineChatbotReply(latest));
      }

      if (API_KEY) {
        try {
          const prompt = buildPrompt(messages, languageName);
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
          const result = await withTimeout(
            model.generateContent(prompt),
            CHATBOT_TIMEOUT_MS,
          );
          return sanitizeChatResponse(result.response.text().trim());
        } catch (error) {
          console.warn("Gemini Chatbot failed, trying OpenAI fallback");
          if (OPENAI_API_KEY) {
            try {
              return sanitizeChatResponse(await generateOpenAiChat(messages, languageName));
            } catch (openAiErr) {
              console.error("OpenAI Fallback failed:", openAiErr);
              return sanitizeChatResponse(getOfflineChatbotReply(latest));
            }
          }
          if (shouldUseOfflineFallback(error)) {
            return sanitizeChatResponse(getOfflineChatbotReply(latest));
          }
          throw error;
        }
      } else if (OPENAI_API_KEY) {
        try {
          return sanitizeChatResponse(await generateOpenAiChat(messages, languageName));
        } catch (openAiErr) {
          return sanitizeChatResponse(getOfflineChatbotReply(latest));
        }
      }
    }
    const text = await withTimeout(
      callAiProxy({
        task: "chatbot",
        prompt: languageScopedConversation,
        model: "gemini-1.5-pro",
      }),
      CHATBOT_TIMEOUT_MS,
    );

    return sanitizeChatResponse(
      text || "I could not generate a response right now. Please try again.",
    );
  } catch (error) {
    console.error("Chatbot proxy error:", JSON.stringify(error, null, 2));

    // Try OpenAI as a last resort before offline if proxy fails
    if (OPENAI_API_KEY) {
      try {
        return sanitizeChatResponse(await generateOpenAiChat(messages, languageName));
      } catch (openAiErr) {
        // proceed to offline
      }
    }

    if (shouldUseOfflineFallback(error)) {
      return sanitizeChatResponse(getOfflineChatbotReply(latest));
    }
    return `I could not reach the AI service right now. Please check your internet and try again. Details: ${String(error)}`;
  }
}
