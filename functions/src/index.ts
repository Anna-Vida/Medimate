import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Request, Response } from "express";
import * as functions from "firebase-functions";

interface ProxyRequest {
  task: "generate" | "chatbot";
  prompt?: string;
  imageBase64?: string;
  model?: string;
}

const DEFAULT_MODEL = "gemini-2.5-flash";

function setCors(res: any) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
}

function buildChatPrompt(rawPrompt: string) {
  return `You are ClarifyApp CareBot, a formal healthcare support assistant for Filipino users.
Rules:
- Give practical, concise answers in clear and simple English.
- Use a professional and respectful tone.
- Do not use markdown, asterisks, bullet symbols, or emojis.
- If the request is medical, include a short safety note: emergency symptoms need immediate professional care.
- Never claim to replace a doctor.
- If users ask about medications, advise consulting pharmacist/doctor for dose changes.
- Keep answer under 180 words.

Conversation:
${rawPrompt}

Now answer the latest user message as the assistant.`;
}

export const aiProxy = functions
  .region("asia-southeast1")
  .https.onRequest(async (req: Request, res: Response) => {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        res.status(500).json({ error: "Server AI key is not configured." });
        return;
      }

      const body = (req.body ?? {}) as ProxyRequest;
      const task = body.task;

      if (!task) {
        res.status(400).json({ error: "Missing task in request body." });
        return;
      }

      const modelName = body.model || DEFAULT_MODEL;
      const model = new GoogleGenerativeAI(key).getGenerativeModel({
        model: modelName,
      });

      if (task === "chatbot") {
        if (!body.prompt) {
          res.status(400).json({ error: "Missing prompt." });
          return;
        }

        const result = await model.generateContent(
          buildChatPrompt(body.prompt),
        );
        const text = result.response.text().trim();
        res.status(200).json({ text });
        return;
      }

      if (task === "generate") {
        if (!body.prompt) {
          res.status(400).json({ error: "Missing prompt." });
          return;
        }

        if (body.imageBase64) {
          const result = await model.generateContent([
            body.prompt,
            {
              inlineData: {
                data: body.imageBase64,
                mimeType: "image/jpeg",
              },
            },
          ]);
          const text = result.response.text().trim();
          res.status(200).json({ text });
          return;
        }

        const result = await model.generateContent(body.prompt);
        const text = result.response.text().trim();
        res.status(200).json({ text });
        return;
      }

      res.status(400).json({ error: "Unsupported task." });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error?.message || "AI proxy request failed." });
    }
  });
