import {
    getAllOfflineMedicines,
    OfflineMedicineRecord,
} from "./offlineMedicineData";

function norm(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return norm(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function extractMedicineCandidates(message: string): string[] {
  const compact = norm(message);
  const candidates = new Set<string>();

  // 1. Direct match if the whole message is a medicine name
  if (compact && compact.length <= 32) {
    candidates.add(compact);
  }

  // 2. Pattern-based extraction (English & Tagalog)
  const patterns = [
    /(?:about|for|is|what is|tell me about|medicine|drug|tablet|capsule|gamot|para sa|tungkol sa)\s+([a-z0-9\s-]{4,40})/g,
    /(?:take|dosing|dosage|inumin|dosage ng)\s+([a-z0-9\s-]{4,40})/g,
    /(?:price of|cost of|magkano ang|presyo ng)\s+([a-z0-9\s-]{4,40})/g,
  ];

  for (const pattern of patterns) {
    const matches = compact.matchAll(pattern);
    for (const match of matches) {
      const cleaned = match[1].trim();
      if (cleaned.length >= 4 && cleaned.length <= 32) {
        candidates.add(cleaned);
      }
    }
  }

  // 3. Sliding window tokenization (n-grams)
  const tokens = compact.split(" ").filter((t) => t.length >= 4);
  for (let i = 0; i < tokens.length; i++) {
    // Single word
    candidates.add(tokens[i]);
    // Two words
    if (i < tokens.length - 1) {
      candidates.add(`${tokens[i]} ${tokens[i + 1]}`);
    }
    // Three words
    if (i < tokens.length - 2) {
      candidates.add(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
    }
  }

  return Array.from(candidates).slice(0, 15);
}

let exactMatchIndex: Map<string, OfflineMedicineRecord> | null = null;
let tokenMatchIndex: Map<string, Set<OfflineMedicineRecord>> | null = null;
let queryCache: Map<string, OfflineMedicineRecord | null> = new Map();

const QUERY_CACHE_LIMIT = 200;

function setCachedResult(query: string, result: OfflineMedicineRecord | null) {
  if (queryCache.size >= QUERY_CACHE_LIMIT) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey) queryCache.delete(firstKey);
  }
  queryCache.set(query, result);
}

function buildIndexes() {
  if (exactMatchIndex && tokenMatchIndex) {
    return;
  }

  exactMatchIndex = new Map();
  tokenMatchIndex = new Map();

  for (const med of getAllOfflineMedicines()) {
    const targets = [med.name, med.genericName, ...med.aliases]
      .map(norm)
      .filter(Boolean);

    for (const target of targets) {
      if (!exactMatchIndex.has(target)) {
        exactMatchIndex.set(target, med);
      }

      for (const token of tokenize(target)) {
        const bucket = tokenMatchIndex.get(token);
        if (bucket) {
          bucket.add(med);
        } else {
          tokenMatchIndex.set(token, new Set([med]));
        }
      }
    }
  }
}

export function warmOfflineMedicineLookupIndexes(): void {
  buildIndexes();
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  const matrix: number[][] = Array(lenB + 1)
    .fill(null)
    .map(() => Array(lenA + 1).fill(0));

  for (let i = 0; i <= lenA; i++) matrix[0][i] = i;
  for (let j = 0; j <= lenB; j++) matrix[j][0] = j;

  for (let j = 1; j <= lenB; j++) {
    for (let i = 1; i <= lenA; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost,
      );
    }
  }
  return matrix[lenB][lenA];
}

// Calculate similarity score (0-1, higher = more similar)
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

export function findOfflineMedicineByName(
  medicineName: string,
): OfflineMedicineRecord | null {
  const q = norm(medicineName);
  if (!q) return null;

  if (queryCache.has(q)) {
    return queryCache.get(q) ?? null;
  }

  buildIndexes();

  const exact = exactMatchIndex?.get(q);
  if (exact) {
    setCachedResult(q, exact);
    return exact;
  }

  const queryTokens = tokenize(q);
  const candidateMap = new Map<string, OfflineMedicineRecord>();

  for (const token of queryTokens) {
    const directTokenMatch = exactMatchIndex?.get(token);
    if (directTokenMatch) {
      return directTokenMatch;
    }

    const tokenCandidates = tokenMatchIndex?.get(token);
    for (const candidate of tokenCandidates ?? []) {
      candidateMap.set(candidate.name, candidate);
    }
  }

  if (candidateMap.size === 0 && q.length >= 5) {
    for (const [key, med] of exactMatchIndex?.entries() ?? []) {
      if (key.includes(q) || q.includes(key)) {
        candidateMap.set(med.name, med);
        if (candidateMap.size >= 24) {
          break;
        }
      }
    }
  }

  let bestMatch: { med: OfflineMedicineRecord; score: number } | null = null;
  const MIN_SCORE = 0.65; // Require 65% similarity

  for (const med of candidateMap.values()) {
    const targets = [med.name, med.genericName, ...med.aliases]
      .map(norm)
      .filter(Boolean);

    for (const target of targets) {
      // Exact match (best)
      if (target === q) {
        setCachedResult(q, med);
        return med;
      }

      // Substring match with minimum length requirement (good)
      if (q.length >= 5 && (target.includes(q) || q.includes(target))) {
        const score = calculateSimilarity(q, target);
        if (score > (bestMatch?.score ?? 0)) {
          bestMatch = { med, score };
        }
      } else if (q.length >= 4) {
        // Fuzzy match for shorter queries (OCR fallback)
        const score = calculateSimilarity(q, target);
        if (score > MIN_SCORE && score > (bestMatch?.score ?? 0)) {
          bestMatch = { med, score };
        }
      }
    }
  }

  const finalMatch = bestMatch?.med ?? null;
  setCachedResult(q, finalMatch);
  return finalMatch;
}

export function getOfflinePhilHealthInfo(medicineName: string) {
  const med = findOfflineMedicineByName(medicineName);

  return {
    isPhilHealthCovered: med?.philHealthCovered ?? false,
    coverageDetails: med
      ? med.philHealthCovered
        ? "May be covered under selected PhilHealth packages. Confirm with facility."
        : "No confirmed offline coverage data."
      : "Offline mode: medicine not found in local dataset.",
    seniorDiscountEligible: true,
    discountNote:
      "20% senior discount under RA 9994 applies with valid Senior Citizen ID.",
    estimatedPrice: med?.estimatedPrice ?? "Price varies by pharmacy",
    genericAlternative:
      med?.genericName ?? "Ask your pharmacist for local generic alternatives",
    programsAvailable: [
      "PCSO Medical Assistance",
      "Malasakit Center",
      "DSWD AICS",
    ],
  };
}

const HIGH_RISK_PAIRS = [
  ["warfarin", "aspirin"],
  ["warfarin", "ibuprofen"],
  ["warfarin", "diclofenac"],
  ["aspirin", "ibuprofen"],
  ["metformin", "alcohol"],
  ["losartan", "spironolactone"],
  ["amlodipine", "simvastatin"],
  ["digoxin", "furosemide"],
  ["clopidogrel", "omeprazole"],
  ["warfarin", "naproxen"],
  ["aspirin", "warfarin"],
  ["aspirin", "clopidogrel"],
  ["ibuprofen", "aspirin"],
];

function pairMatches(
  a: string,
  b: string,
  left: string,
  right: string,
): boolean {
  return (
    (a.includes(left) && b.includes(right)) ||
    (a.includes(right) && b.includes(left))
  );
}

export function getOfflineDrugInteraction(
  medicine1: string,
  medicine2: string,
) {
  const m1 = norm(medicine1);
  const m2 = norm(medicine2);

  if (!m1 || !m2) {
    return {
      isSafe: true,
      interaction: "Insufficient medicine names for offline interaction check.",
      sidesEffects: [],
      recommendation: "Please consult a pharmacist for complete review.",
    };
  }

  if (m1 === m2) {
    return {
      isSafe: false,
      interaction: "Potential duplicate therapy: same medicine selected twice.",
      sidesEffects: ["Overdose risk", "Increased side effects"],
      recommendation: "Do not double-dose unless explicitly prescribed.",
    };
  }

  for (const [a, b] of HIGH_RISK_PAIRS) {
    if (pairMatches(m1, m2, a, b)) {
      return {
        isSafe: false,
        interaction:
          "Potentially high-risk interaction detected in offline safety rules.",
        sidesEffects: ["Bleeding risk", "Dizziness", "Stomach irritation"],
        recommendation:
          "Avoid combining without physician approval and seek pharmacist review immediately.",
      };
    }
  }

  return {
    isSafe: true,
    interaction: "No major interaction found in offline rules.",
    sidesEffects: ["Mild side effects may still occur"],
    recommendation:
      "Continue with caution and ask a pharmacist when internet is available for full AI check.",
  };
}

export function getOfflineChatbotReply(message: string): string {
  const text = norm(message);

  // 0. Direct Medicine Name Check (Priority)
  // If the user types just "sambong" or "what is tamsulosin", match it immediately.
  const candidates = extractMedicineCandidates(message);
  for (const candidate of candidates) {
    const matched = findOfflineMedicineByName(candidate);
    if (matched) {
      // Return a comprehensive info card if matched directly
      return `Offline mode: **${matched.name}** (${matched.genericName})\n` +
             `Uses: ${matched.commonUses}\n` +
             `Price: ${matched.estimatedPrice}\n` +
             `Warning: ${matched.warnings}`;
    }
  }

  // Emergency / SOS (English & Tagalog)
  if (
    text.includes("emergency") ||
    text.includes("sos") ||
    text.includes("saklolo") ||
    text.includes("tulong") ||
    text.includes("panganib")
  ) {
    return "Offline mode: If there is severe chest pain, breathing difficulty, stroke signs, or heavy bleeding, call 911 immediately. Use the 'Emergency' screen for quick actions.";
  }

  // Reminders / Dosing (English & Tagalog)
  if (
    text.includes("reminder") ||
    text.includes("missed dose") ||
    text.includes("nakalimutan") ||
    text.includes("paano inumin") ||
    text.includes("dose")
  ) {
    return "Offline mode: If you missed a dose, take it as soon as remembered unless it's close to the next dose. Do not double-dose. For specific dosing instructions, please consult your doctor or pharmacist.";
  }

  // Generic / Brand Name (English & Tagalog)
  if (
    text.includes("generic") ||
    text.includes("brand") ||
    text.includes("pangalan") ||
    text.includes("ibang pangalan")
  ) {
    for (const candidate of extractMedicineCandidates(message)) {
      const matched = findOfflineMedicineByName(candidate);
      if (matched) {
        return `Offline mode: ${matched.name} is also known by its generic name ${matched.genericName}. Other brand names/aliases: ${matched.aliases.join(", ")}.`;
      }
    }
  }

  // Price / Cost (English & Tagalog)
  if (
    text.includes("price") ||
    text.includes("cost") ||
    text.includes("magkano") ||
    text.includes("presyo") ||
    text.includes("bayad")
  ) {
    for (const candidate of extractMedicineCandidates(message)) {
      const matched = findOfflineMedicineByName(candidate);
      if (matched) {
        return `Offline mode: ${matched.name} estimated price is ${matched.estimatedPrice}. Note: Prices vary by pharmacy and generic brands are usually cheaper.`;
      }
    }
    return "Offline mode: I can't find the price for that specific medicine. In general, generic medicines in the Philippines are 50-90% cheaper than branded ones.";
  }

  // Use / Purpose / Side Effects / Warnings (English & Tagalog)
  if (
    text.includes("side effect") ||
    text.includes("warning") ||
    text.includes("use for") ||
    text.includes("what is") ||
    text.includes("medicine") ||
    text.includes("drug") ||
    text.includes("gamot") ||
    text.includes("para saan") ||
    text.includes("bawal") ||
    text.includes("babala")
  ) {
    for (const candidate of extractMedicineCandidates(message)) {
      const matched = findOfflineMedicineByName(candidate);
      if (matched) {
        return `Offline mode: ${matched.name} is commonly used for ${matched.commonUses}. \n\nWarning: ${matched.warnings}. \n\nSide effects: ${matched.sideEffects.join(", ")}.`;
      }
    }
  }

  // Interaction check (English & Tagalog)
  if (
    text.includes("interaction") ||
    text.includes("combine") ||
    text.includes("sabay") ||
    text.includes("pagsamahin")
  ) {
    const candidates = extractMedicineCandidates(message);
    if (candidates.length >= 2) {
      const result = getOfflineDrugInteraction(candidates[0], candidates[1]);
      return `Offline mode interaction check: ${result.interaction} \n\nRecommendation: ${result.recommendation}`;
    }
    return "Offline mode: To check for interactions, please mention both medicine names (e.g., 'Can I take Aspirin and Warfarin together?').";
  }

  // PhilHealth / Discounts (English & Tagalog)
  if (
    text.includes("philhealth") ||
    text.includes("discount") ||
    text.includes("libre") ||
    text.includes("senior") ||
    text.includes("pwd")
  ) {
    return "Offline mode: Seniors and PWDs are entitled to a 20% discount and VAT exemption on medicines. Some medicines are covered by PhilHealth's Konsulta package. Ask your local health center.";
  }

  return "Offline mode is active. I can help with basic medicine info (uses, warnings, price, generic names) from local data. For personalized AI advice, please reconnect to the internet.";
}
