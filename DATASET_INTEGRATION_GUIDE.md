# Better Medicine Datasets for ClarifyApp

## Overview

Your current dataset (11,000 medicines from Kaggle) has been fixed with better fuzzy matching. Here are additional datasets to merge and improve coverage.

---

## 🎯 Recommended Datasets (Ranked by Relevance)

### 1. **Drug-Drug Interactions Dataset** ⭐⭐⭐

- **Source:** https://kaggle.com/datasets/mghobashy/drug-drug-interactions
- **Size:** 10,600+ drug pairs
- **What it adds:** Comprehensive interaction data (currently you only have 4 pairs)
- **Integration:** Merge into `HIGH_RISK_PAIRS` in `services/offlineFallback.ts`
- **Format:** CSV with columns like `drug1, drug2, interaction_type, severity`

**Command to download:**

```bash
kaggle datasets download -d mghobashy/drug-drug-interactions
```

---

### 2. **Medicine Dataset (Ujjwal Aggarwal)** ⭐⭐⭐

- **Source:** https://kaggle.com/datasets/ujjwalaggarwal402/medicine-dataset
- **Size:** 10,000+ medicines with:
  - ✅ Side effects (detailed, not generic)
  - ✅ Dosage forms and strengths
  - ✅ Manufacturer information
  - ✅ Price ranges
- **Best for:** Replacing generic "General medicine guidance" placeholders
- **Integration:** Update `record_from_row()` in `scripts/kaggle_to_offline_json.py`

**Download:**

```bash
kaggle datasets download -d ujjwalaggarwal402/medicine-dataset
```

---

### 3. **OpenFDA Drug Data**

- **Source:** https://open.fda.gov/apis/drug/
- **What it adds:**
  - FDA-approved medicines
  - Adverse events/side effects (real-world data)
  - Labeling information
  - Interactions data
- **Integration:** Supplement main dataset (can fetch via API or use pre-downloaded CSV)
- **Best for:** Western medicines + comprehensive warning data

**OpenFDA API Example:**

```bash
curl "https://api.fda.gov/drug/event.json?limit=100&api_key=YOUR_KEY"
```

---

### 4. **Indian Medicines Dataset**

- **Search Kaggle for:** "Indian medicine dataset" or "pharmacy dataset"
- **Why:** Your app serves Filipino users (PhilHealth integrations)
- Popular dataset: "Medicine Details" (11,000 medicines - similar to yours but better quality)
- **What differs:** Better side effects data, strength/dosage info

---

### 5. **PhilHealth Coverage Data**

- **Source:** DOH/PhilHealth official lists
- **Manual creation needed:** Download from:
  - https://www.phic.gov.ph/index.php/benefits-services/health-benefits-package
  - List of PhilHealth-covered medicines list
- **Current limitation:** Your dataset has `philHealthCovered: false` for everything
- **Integration:** Create mapping file and merge with main dataset

---

## 🔧 Integration Steps

### Step 1: Update Data Generation Script

Modify `scripts/kaggle_to_offline_json.py` to merge multiple sources:

```python
def merge_datasets(main_df, interaction_df, openfda_df):
    """
    Merge medicine data from multiple sources
    - Main: Base medicine info (name, generic, uses)
    - Interactions: Drug-drug interactions
    - OpenFDA: Side effects & FDA warnings
    """
    pass
```

### Step 2: Enhanced Data Structure

Update `OfflineMedicineRecord` in `services/offlineMedicineData.ts`:

```typescript
interface OfflineMedicineRecord {
  name: string;
  aliases: string[];
  genericName: string;
  commonUses: string;
  warnings: string;
  sideEffects: string[];
  estimatedPrice: string;
  philHealthCovered: boolean;

  // NEW FIELDS
  dosagesForms?: string[]; // "10mg tablet", "5ml suspension"
  manufacturer?: string; // "Pharma Co Ltd"
  interactions?: string[]; // List of interacting medicines
  strengthOptions?: string[]; // "250mg", "500mg", "1000mg"
  fdaApproved?: boolean; // For Western medicines
}
```

### Step 3: Update Matching Logic ✅

Already done! Your `offlineFallback.ts` now has:

- ✅ Levenshtein distance (handles OCR typos)
- ✅ Confidence scoring (65% threshold)
- ✅ Better substring matching with length requirements

---

## 📊 Current vs. Enhanced Data Quality

| Aspect                  | Current             | Enhanced                  |
| ----------------------- | ------------------- | ------------------------- |
| **Medicines**           | 11,000              | 15,000-20,000             |
| **Side Effects**        | Generic placeholder | Real, detailed effects    |
| **Drug Interactions**   | 4 pairs             | 10,000+ pairs             |
| **Dosages**             | None                | Multiple options          |
| **Warnings**            | Generic             | Specific & severity-based |
| **PhilHealth Coverage** | 0% (false)          | 40-60% (real data)        |
| **Fuzzy Matching**      | ❌ Broken           | ✅ Fixed                  |

---

## 🚀 Quick Start: Merge Datasets

### Option A: Automated (Recommended)

1. Download Drug-Drug Interactions from Kaggle
2. Download Medicine Dataset (Ujjwal Aggarwal)
3. Run new merge script (to be created):
   ```bash
   python scripts/merge_medicine_datasets.py
   ```

### Option B: Manual

1. Convert downloaded CSVs to same format as current data
2. Deduplicate by medicine name
3. Merge in `record_from_row()` function

---

## 📝 Next Steps

1. **Immediate:** Use current fixed fuzzy matching ✅ (done)
2. **Short-term:** Download Drug-Drug Interactions dataset & integrate
3. **Medium-term:** Add OpenFDA data for better warnings
4. **Long-term:** Create PhilHealth coverage mapping

---

## 💡 PhilHealth Coverage Mapping

Create `assets/data/philhealth-coverage.json`:

```json
{
  "Paracetamol": {
    "covered": true,
    "packages": ["Hospitalization", "Outpatient"],
    "maxAmount": 5000
  },
  "Aspirin": {
    "covered": true,
    "packages": ["Tertiary Package"],
    "maxAmount": 3000
  }
}
```

Then in `offlineFallback.ts`:

```typescript
function getPhilHealthStatus(medicineName: string) {
  const coverage = PHILHEALTH_COVERAGE[medicineName];
  return coverage ?? { covered: false };
}
```

---

## 🔗 Reference URLs

- Kaggle Datasets: https://kaggle.com/
- OpenFDA API: https://open.fda.gov/
- PhilHealth Benefits: https://www.phic.gov.ph/
- Drug Interactions: https://www.drugs.com/interactions/
