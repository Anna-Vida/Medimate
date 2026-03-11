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

  if (compact && compact.length <= 32) {
    candidates.add(compact);
  }

  const phraseMatches = compact.match(
    /(?:about|for|is|what is|tell me about|medicine|drug|tablet|capsule)\s+([a-z0-9\s-]{4,40})/g,
  );

  for (const phrase of phraseMatches ?? []) {
    const cleaned = phrase
      .replace(
        /^(about|for|is|what is|tell me about|medicine|drug|tablet|capsule)\s+/,
        "",
      )
      .trim();
    if (cleaned.length >= 4 && cleaned.length <= 32) {
      candidates.add(cleaned);
    }
  }

  const tokens = tokenize(compact).slice(0, 6);
  for (let index = 0; index < tokens.length; index += 1) {
    candidates.add(tokens[index]);
    if (index < tokens.length - 1) {
      candidates.add(`${tokens[index]} ${tokens[index + 1]}`);
    }
  }

  return Array.from(candidates).slice(0, 10);
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

  if (text.includes("emergency") || text.includes("sos")) {
    return "Offline mode: If there is severe chest pain, breathing difficulty, stroke signs, or heavy bleeding, call emergency services immediately (911) and use your Emergency screen quick actions.";
  }

  if (text.includes("reminder") || text.includes("missed dose")) {
    return "Offline mode: If you missed a dose, take it as soon as remembered unless it is close to the next dose. Do not double-dose unless your doctor advised it.";
  }

  if (
    text.includes("side effect") ||
    text.includes("warning") ||
    text.includes("use for") ||
    text.includes("what is") ||
    text.includes("medicine") ||
    text.includes("drug")
  ) {
    for (const candidate of extractMedicineCandidates(message)) {
      const matched = findOfflineMedicineByName(candidate);
      if (matched) {
        return `Offline mode: ${matched.name} is commonly used for ${matched.commonUses}. Warning: ${matched.warnings}. Common side effects: ${matched.sideEffects.join(", ")}.`;
      }
    }
  }

  return "Offline mode is active. I can give basic guidance from local data, but for full AI analysis and personalized checks, reconnect to the internet.";
}
