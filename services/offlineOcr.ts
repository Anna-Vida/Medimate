import { findOfflineMedicineByName } from "./offlineFallback";
import {
    OfflineMedicineRecord
} from "./offlineMedicineData";

const OCR_TIMEOUT_MS = 8000;

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
  record: OfflineMedicineRecord | null;
  recognizedText: string;
  identity: OfflinePrescriptionIdentity;
}

function normalize(value: string): string {
  // More conservative normalization - preserve structure
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ") // Keep hyphens for dosage like "500-mg"
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

function findBestMedicineMatch(text: string): OfflineMedicineRecord | null {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  for (const line of lines) {
    const match = findOfflineMedicineByName(line);
    if (match) {
      return match;
    }
  }

  const normalizedText = normalize(text);
  const words = Array.from(
    new Set(normalizedText.split(" ").filter((w) => w.length >= 4)),
  ).slice(0, 20);

  for (const word of words) {
    const match = findOfflineMedicineByName(word);
    if (match) {
      return match;
    }
  }

  for (let index = 0; index < words.length - 1; index += 1) {
    const phrase = `${words[index]} ${words[index + 1]}`;
    const match = findOfflineMedicineByName(phrase);
    if (match) {
      return match;
    }
  }

  return null;
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
    const record = findBestMedicineMatch(recognizedText);

    return {
      record,
      recognizedText,
      identity,
    };
  } catch {
    return null;
  }
}
