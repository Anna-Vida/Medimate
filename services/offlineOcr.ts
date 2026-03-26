import { findOfflineMedicineByName } from "./offlineFallback";
import {
    OfflineMedicineRecord
} from "./offlineMedicineData";

const OCR_TIMEOUT_MS = 5000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("OCR_TIMEOUT"));
    }, timeoutMs);

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

export interface OfflinePrescriptionIdentity {
  patientName?: string;
  prescribedBy?: string;
  hospital?: string;
  licenseNumber?: string;
}

export interface OfflineOcrResult {
  records: OfflineMedicineRecord[];
  recognizedText: string;
  identity: OfflinePrescriptionIdentity;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIdentity(text: string): OfflinePrescriptionIdentity {
  const compact = text.replace(/\r/g, "");

  const patientMatch = compact.match(
    /(?:patient(?:\s*name)?|name)\s*[:\-]\s*([A-Za-z][A-Za-z .,'-]{2,50})/i,
  );

  const doctorMatch = compact.match(/(dr\.?\s*[A-Za-z][A-Za-z .,'-]{2,50})/i);

  const hospitalLine = compact
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /hospital|clinic|medical center|infirmary/i.test(line));

  const licenseMatch = compact.match(
    /(?:(?:prc|license|lic\.?)(?:\s*(?:no\.?|#))?\s*[:\-]?\s*)([A-Z0-9-]{4,20})/i,
  );

  return {
    patientName: patientMatch?.[1]?.trim(),
    prescribedBy: doctorMatch?.[1]?.trim(),
    hospital: hospitalLine,
    licenseNumber: licenseMatch?.[1]?.trim(),
  };
}

function isNonMedicineLine(line: string): boolean {
  const l = line.toLowerCase();
  if (!l) return true;
  const bad = [
    "patient",
    "name",
    "hospital",
    "clinic",
    "medical center",
    "infirmary",
    "prc",
    "license",
    "lic",
    "age",
    "sex",
    "male",
    "female",
    "address",
    "date",
    "signature",
    "doctor",
    "prescribed by",
    "ref no",
    "lot no",
    "exp date",
    "mfg date",
    "sig:",
    "qty:",
    "amount:",
    "total:",
    "price:",
    "capsule",
    "tablet",
    "syrup",
    "dosage",
    "take ",
    "daily",
    "every",
    "morning",
    "afternoon",
    "evening",
    "night",
    "before meal",
    "after meal",
  ];
  return bad.some((k) => l.includes(k));
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const maxLen = Math.max(la, lb);
  const dp: number[][] = Array(lb + 1)
    .fill(0)
    .map(() => Array(la + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[0][i] = i;
  for (let j = 0; j <= lb; j++) dp[j][0] = j;
  for (let j = 1; j <= lb; j++) {
    for (let i = 1; i <= la; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j][i] = Math.min(dp[j][i - 1] + 1, dp[j - 1][i] + 1, dp[j - 1][i - 1] + cost);
    }
  }
  const dist = dp[lb][la];
  return 1 - dist / maxLen;
}

function bestOfCandidates(queries: string[]): OfflineMedicineRecord[] {
  const seen = new Map<string, { med: OfflineMedicineRecord; score: number }>();
  
  for (const q of queries) {
    const candidate = findOfflineMedicineByName(q);
    if (candidate) {
      const t = [candidate.name, candidate.genericName, ...(candidate.aliases || [])]
        .map(normalize)
        .filter(Boolean);
      
      let best = 0;
      const nq = normalize(q);
      for (const s of t) {
        const sc = similarity(nq, s);
        if (sc > best) best = sc;
      }
      
      const prev = seen.get(candidate.name);
      // Boost phrases (multi-word matches)
      const weight = q.includes(" ") ? 0.08 : 0;
      const finalScore = Math.min(1, best + weight);
      
      if (!prev || finalScore > prev.score) {
        seen.set(candidate.name, { med: candidate, score: finalScore });
      }
    }
  }

  // Filter and sort candidates
  return Array.from(seen.values())
    .filter((v) => v.score >= 0.7) // Increased threshold for multi-med to reduce noise
    .sort((a, b) => b.score - a.score)
    .map((v) => v.med)
    .slice(0, 5); // Max 5 medicines
}

function findBestMedicineMatch(text: string): OfflineMedicineRecord[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((l) => Boolean(l) && !isNonMedicineLine(l))
    .slice(0, 20); // More lines for multi-med
    
  const lineQueries = lines.map((l) => l);
  const normalizedText = normalize(text);
  const words = Array.from(
    new Set(normalizedText.split(" ").filter((w) => w.length >= 4 && !isNonMedicineLine(w))),
  ).slice(0, 30);
  
  const wordQueries = words;
  const phraseQueries: string[] = [];
  for (let index = 0; index < words.length - 1; index += 1) {
    phraseQueries.push(`${words[index]} ${words[index + 1]}`);
  }
  
  const all = [...lineQueries, ...wordQueries, ...phraseQueries].map(normalize).filter(Boolean);
  return bestOfCandidates(all);
}

async function recognizeTextFromImage(imageUri: string): Promise<string> {
  let TextRecognition: any;
  try {
    const mod = await import("@react-native-ml-kit/text-recognition");
    TextRecognition = mod.default;
  } catch {
    throw new Error("OCR_MODULE_NOT_AVAILABLE");
  }

  const attempts = Array.from(
    new Set([imageUri, imageUri.replace(/^file:\/\//i, "")]),
  ).filter(Boolean);

  let lastError: unknown = null;
  for (const path of attempts) {
    try {
      const result = await TextRecognition.recognize(path);
      if (result?.text && typeof result.text === "string") {
        return result.text;
      }
      if (typeof result === "string") {
        return result;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("OCR_FAILED");
}

export async function extractOfflineOcrResult(
  imageUri: string,
): Promise<OfflineOcrResult | null> {
  try {
    const recognizedText = await withTimeout(
      recognizeTextFromImage(imageUri),
      OCR_TIMEOUT_MS,
    );
    const identity = parseIdentity(recognizedText);
    const records = findBestMedicineMatch(recognizedText);

    return {
      records,
      recognizedText,
      identity,
    };
  } catch {
    return null;
  }
}
