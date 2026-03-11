const AI_PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL;

interface ProxyPayload {
  task: "generate" | "chatbot";
  prompt: string;
  imageBase64?: string;
  model?: string;
}

function normalizeUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function hasAiProxy() {
  return !!AI_PROXY_URL;
}

export async function callAiProxy(payload: ProxyPayload): Promise<string> {
  if (!AI_PROXY_URL) {
    throw new Error("AI proxy URL is not configured.");
  }

  const endpoint = normalizeUrl(AI_PROXY_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (String(error).toLowerCase().includes("abort")) {
      throw new Error("AI_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  let parsed: any = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = { text: raw };
  }

  if (!response.ok) {
    const errorMessage =
      parsed?.error || `Proxy request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return parsed?.text || "";
}
