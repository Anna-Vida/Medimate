export interface OfflineMedicineRecord {
  name: string;
  aliases: string[];
  genericName: string;
  commonUses: string;
  warnings: string;
  sideEffects: string[];
  estimatedPrice: string;
  philHealthCovered: boolean;
}

// Replace or expand this list with your Kaggle-exported JSON dataset for richer offline behavior.
export const OFFLINE_MEDICINES: OfflineMedicineRecord[] = [
  {
    name: "Paracetamol",
    aliases: ["biogesic", "acetaminophen", "tylenol"],
    genericName: "Paracetamol",
    commonUses: "Fever and mild pain relief",
    warnings: "Do not exceed max daily dose. Avoid combining with alcohol.",
    sideEffects: ["Nausea", "Rash (rare)", "Liver injury in overdose"],
    estimatedPrice: "PHP 4-8 per tablet",
    philHealthCovered: false,
  },
  {
    name: "Amoxicillin",
    aliases: ["amox", "amoxil"],
    genericName: "Amoxicillin",
    commonUses: "Bacterial infections",
    warnings: "Complete full course. Not for viral infections.",
    sideEffects: ["Diarrhea", "Nausea", "Rash"],
    estimatedPrice: "PHP 12-25 per capsule",
    philHealthCovered: false,
  },
  {
    name: "Amlodipine",
    aliases: ["norvasc"],
    genericName: "Amlodipine",
    commonUses: "High blood pressure and angina",
    warnings: "May cause dizziness when standing.",
    sideEffects: ["Ankle swelling", "Headache", "Flushing"],
    estimatedPrice: "PHP 6-18 per tablet",
    philHealthCovered: false,
  },
  {
    name: "Metformin",
    aliases: ["glucophage"],
    genericName: "Metformin",
    commonUses: "Type 2 diabetes blood sugar control",
    warnings: "Take with food to reduce stomach upset.",
    sideEffects: ["Nausea", "Diarrhea", "Abdominal discomfort"],
    estimatedPrice: "PHP 5-15 per tablet",
    philHealthCovered: false,
  },
  {
    name: "Losartan",
    aliases: ["cozaar"],
    genericName: "Losartan",
    commonUses: "High blood pressure and kidney protection",
    warnings: "Monitor blood pressure regularly.",
    sideEffects: ["Dizziness", "Fatigue", "High potassium"],
    estimatedPrice: "PHP 8-22 per tablet",
    philHealthCovered: false,
  },
  {
    name: "Aspirin",
    aliases: ["acetylsalicylic acid"],
    genericName: "Aspirin",
    commonUses: "Pain relief and antiplatelet use",
    warnings: "Can increase bleeding risk and irritate stomach.",
    sideEffects: ["Stomach pain", "Bleeding", "Heartburn"],
    estimatedPrice: "PHP 3-10 per tablet",
    philHealthCovered: false,
  },
  {
    name: "Warfarin",
    aliases: ["coumadin"],
    genericName: "Warfarin",
    commonUses: "Blood clot prevention",
    warnings: "High interaction risk. Monitor INR.",
    sideEffects: ["Bleeding", "Bruising", "Nausea"],
    estimatedPrice: "PHP 20-45 per tablet",
    philHealthCovered: false,
  },
];
