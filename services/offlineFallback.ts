import {
    OFFLINE_MEDICINES,
    OfflineMedicineRecord,
} from "./offlineMedicineData";

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function findOfflineMedicineByName(
  medicineName: string,
): OfflineMedicineRecord | null {
  const q = norm(medicineName);
  if (!q) return null;

  for (const med of OFFLINE_MEDICINES) {
    const targets = [med.name, med.genericName, ...med.aliases].map(norm);
    if (targets.some((t) => t.includes(q) || q.includes(t))) {
      return med;
    }
  }

  return null;
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

  const matched = findOfflineMedicineByName(text);
  if (matched) {
    return `Offline mode: ${matched.name} is commonly used for ${matched.commonUses}. Warning: ${matched.warnings}. Common side effects: ${matched.sideEffects.join(", ")}.`;
  }

  if (text.includes("emergency") || text.includes("sos")) {
    return "Offline mode: If there is severe chest pain, breathing difficulty, stroke signs, or heavy bleeding, call emergency services immediately (911) and use your Emergency screen quick actions.";
  }

  if (text.includes("reminder") || text.includes("missed dose")) {
    return "Offline mode: If you missed a dose, take it as soon as remembered unless it is close to the next dose. Do not double-dose unless your doctor advised it.";
  }

  return "Offline mode is active. I can give basic guidance from local data, but for full AI analysis and personalized checks, reconnect to the internet.";
}
