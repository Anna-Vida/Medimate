"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProxy = void 0;
const generative_ai_1 = require("@google/generative-ai");
const functions = __importStar(require("firebase-functions"));
const DEFAULT_MODEL = "gemini-2.5-flash";
function setCors(res) {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
}
function buildChatPrompt(rawPrompt) {
    return `You are ClarifyApp CareBot, a friendly healthcare support assistant for Filipino users.
Rules:
- Give practical, short answers in clear and simple English.
- If the request is medical, include a short safety note: emergency symptoms need immediate professional care.
- Never claim to replace a doctor.
- If users ask about medications, advise consulting pharmacist/doctor for dose changes.
- Keep answer under 180 words.

Conversation:
${rawPrompt}

Now answer the latest user message as the assistant.`;
}
exports.aiProxy = functions
    .region("asia-southeast1")
    .https.onRequest(async (req, res) => {
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
        const body = (req.body ?? {});
        const task = body.task;
        if (!task) {
            res.status(400).json({ error: "Missing task in request body." });
            return;
        }
        const modelName = body.model || DEFAULT_MODEL;
        const model = new generative_ai_1.GoogleGenerativeAI(key).getGenerativeModel({
            model: modelName,
        });
        if (task === "chatbot") {
            if (!body.prompt) {
                res.status(400).json({ error: "Missing prompt." });
                return;
            }
            const result = await model.generateContent(buildChatPrompt(body.prompt));
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
    }
    catch (error) {
        res
            .status(500)
            .json({ error: error?.message || "AI proxy request failed." });
    }
});
