# ClarifyApp Medicine Matching Architecture - Technical Analysis

## Overview

The app has a **dual-mode medicine identification system**: Online (Gemini AI) and Offline (local database + OCR). The offline fallback enables medicine identification without internet.

---

## 1. SCANNER IMPLEMENTATION

### Scanner Files

- **[app/scanner.tsx](app/scanner.tsx)** - Main scanner with both pill + prescription modes
- **[app/scanner_formatted.tsx](app/scanner_formatted.tsx)** - Alternative formatted UI version

### Scanner Flow

```
Camera Capture (Photo)
    ↓
identifyMedicine() function
    ├─ 1. Try Online: analyzeMedicineImage(photo, scanMode)
    │   ├─ Uses Semini Vision API to identify from image
    │   ├─ Returns MedicineAnalysis array
    │   └─ Detects: barcode, pill appearance, prescription text
    │
    └─ 2. If Online Fails → Try Offline:
        ├─ extractOfflineOcrResult(photo)
        │   ├─ OCR text extraction using @react-native-ml-kit/text-recognition
        │   ├─ Parse prescription identity (patient, doctor, license)
        │   └─ Find best medicine match from offline database
        │
        └─ If match found → mapOfflineRecordToAnalysis() → Display results
```

### Two Scanning Modes

1. **Pill Mode** - Identifies medicine from pill appearance, box labels
2. **Prescription Mode** - Optimized for extracting doctor handwriting, medical abbreviations (po qid, prn, bid)

---

## 2. MEDICINE MATCHING/SEARCH LOGIC

### Online Matching (Internet Required)

**File:** [services/gemini.ts](services/gemini.ts) - `analyzeMedicineImage()`

**Process:**

1. Base64 encodes the image
2. Sends to Google Gemini Vision API with detailed prompt
3. **Prompt includes:**
   - Focus on brand names + generic names
   - Dosage extraction
   - Active ingredients
   - Warnings and side effects
   - Philippines-specific info (PhilHealth coverage, affordability)
   - Prescription details (doctor name, patient info, license number)

**Key Point:** Gemini directly analyzes image appearance - no local matching needed.

### Offline Matching (No Internet Required)

**Files:**

- [services/offlineOcr.ts](services/offlineOcr.ts) - OCR processing + medicine matching
- [services/offlineFallback.ts](services/offlineFallback.ts) - Medicine lookup functions
- [assets/data/offline-medicines.generated.json](assets/data/offline-medicines.generated.json) - Medicine database

#### Offline Matching Strategy: Three-Pass Progressive Approach

```typescript
// File: services/offlineOcr.ts, function: findBestMedicineMatch()

Pass 1: Line-by-Line Matching (Fastest)
├─ Split OCR text into lines
├─ Try exact immediate matches on each line
└─ Return first match found

Pass 2: Word-Level Matching (Fast)
├─ Extract words ≥4 characters from normalized text
├─ Try to match each word individually
└─ Return first match found

Pass 3: Substring Matching (Comprehensive)
├─ Iterate through all medicines in database
├─ Check if medicine name/aliases appear as substring in OCR text
├─ Only if substring is ≥4 characters (avoid false positives)
└─ Return first match found
```

#### Simple Medicine Search (Manual Input)

**File:** [services/offlineFallback.ts](services/offlineFallback.ts) - `findOfflineMedicineByName()`

```typescript
function findOfflineMedicineByName(
  medicineName: string,
): OfflineMedicineRecord | null {
  const q = norm(medicineName); // Normalize: trim + lowercase

  for (const med of ALL_OFFLINE_MEDICINES) {
    const targets = [med.name, med.genericName, ...med.aliases].map(norm);

    // MATCHING LOGIC: Bidirectional substring matching
    if (targets.some((t) => t.includes(q) || q.includes(t))) {
      return med; // First match found = return immediately
    }
  }
  return null;
}
```

**Matching Rule:** Either:

- Query contains medicine name (`"Paracetamol".includes("Para")` ✓)
- Medicine name contains query (`"Biogesic".includes("gesic")` ✓)

---

## 3. OFFLINE DATABASE STRUCTURE

### Data Flow

```
Kaggle Dataset (11,000 medicines)
    ↓
scripts/kaggle_to_offline_json.py (data processor)
    ├─ Normalizes and deduplicates records
    ├─ Fills in missing fields with defaults
    └─ Outputs structured JSON
    ↓
assets/data/offline-medicines.generated.json (~11,000 medicines)
    ↓
services/offlineMedicineData.ts (loads at runtime)
    ├─ Import hardcoded OFFLINE_MEDICINES (~20 medicines)
    ├─ Merge with GENERATED_OFFLINE_MEDICINES (Kaggle data)
    └─ Create ALL_OFFLINE_MEDICINES (complete list)
```

### Data Schema

```typescript
interface OfflineMedicineRecord {
  name: string; // Primary brand/medicine name
  aliases: string[]; // Brand names, generic names
  genericName: string; // Active ingredient name
  commonUses: string; // Purpose/indication
  warnings: string; // Important precautions
  sideEffects: string[]; // Array of possible side effects
  estimatedPrice: string; // PHP currency format
  philHealthCovered: boolean; // PhilHealth coverage indicator
}
```

### Sample Medicine Record

```json
{
  "name": "Paracetamol",
  "aliases": ["biogesic", "acetaminophen", "tylenol"],
  "genericName": "Paracetamol",
  "commonUses": "Fever and mild pain relief",
  "warnings": "Do not exceed max daily dose. Avoid combining with alcohol.",
  "sideEffects": ["Nausea", "Rash (rare)", "Liver injury in overdose"],
  "estimatedPrice": "PHP 4-8 per tablet",
  "philHealthCovered": false
}
```

### Kaggle Data Processing (kaggle_to_offline_json.py)

**Key Normalization Steps:**

1. **Name Extraction** (tries multiple field names):

   ```python
   pick(row, ["name", "medicine_name", "Medicine Name", "drug_name"]) or "Unknown"
   ```

2. **Alias Consolidation**:
   - Splits comma/semicolon-separated aliases
   - Deduplicates via lowercased matching
   - Automatically adds primary name as alias

3. **Deduplication (dedupe function)**:

   ```python
   key = rec["name"].strip().lower()  # Keyed by normalized name
   # Merges duplicate records, preserves best description
   ```

4. **Field Fallbacks**:
   - Missing `commonUses` → "General medicine guidance"
   - Missing `warnings` → "Consult a pharmacist or doctor before use."
   - Missing `sideEffects` → Uses warnings field

---

## 4. NAME NORMALIZATION & FORMATTING DIFFERENCES

### Online vs Offline Normalization

| Aspect            | Online (Gemini)                | Offline (Local)              |
| ----------------- | ------------------------------ | ---------------------------- |
| **Processing**    | Direct image analysis          | OCR text → normalized string |
| **Normalization** | Minimal                        | Aggressive                   |
| **Output**        | Brand + generic both present   | Match against aliases        |
| **Matching Path** | Vision model trained on images | Substring/containment logic  |
| **Confidence**    | AI confidence scores           | Binary match/no-match        |

### Offline Normalization Functions

**Function 1: offlineOcr.ts - `normalize()`**

```typescript
function normalize(value: string): string {
  return value
    .toLowerCase() // lowercase
    .replace(/[^a-z0-9\s]/g, " ") // remove special chars → spaces
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim(); // remove leading/trailing
}
// Example: "Paracetamol-500mg!" → "paracetamol 500mg"
```

**Function 2: offlineFallback.ts - `norm()`**

```typescript
function norm(value: string): string {
  return value.trim().toLowerCase(); // Just trim + lowercase
}
// Example: "  PARACETAMOL  " → "paracetamol"
```

### Search Input Normalization (User Search)

[app/scanner.tsx](app/scanner.tsx) - `handleOfflineSearch()`

```typescript
const query = offlineSearchInput.trim(); // Minimal normalization
const match = findOfflineMedicineByName(query);
// Search is case-insensitive but allows partial/special characters
```

### OCR-Based Normalization (Prescription Images)

[services/offlineOcr.ts](services/offlineOcr.ts)

1. Calls `recognizeTextFromImage()` using ML Kit OCR
2. Text undergoes aggressive normalization via `normalize()`
3. Three-pass matching described above

---

## 5. POTENTIAL OFFLINE MATCHING ISSUES

### ⚠️ Known Limitations & Edge Cases

#### Issue 1: Substring Arbitrariness

- **Problem:** Both query→target and target→query containment is checked
  ```typescript
  if (targets.some((t) => t.includes(q) || q.includes(t)))
  ```
- **Examples:**
  - ✓ `"Aspirin"` matches query `"Asp"` (first rule)
  - ✓ Query `"Ibuprofen"` matches alias `"Ibu"` (second rule)
  - ✗ `"Amox"` vs `"Amlodipine"` - substring match but different medicines
- **Impact:** Risk of false positives with short acronyms or partial names

#### Issue 2: OCR Text Ambiguity

- **Problem:** OCR frequently produces variations:
  - Handwriting errors: "Paracitamol" (should be "Paracetamol")
  - Spacing issues: "Para cetamol"
  - Abbreviations: "Tx" (treatment), "Rx" (prescription)
- **Risk:** Pass 3 substring matching may fail if medicine name doesn't appear cleanly in OCR text

#### Issue 3: Special Characters in Names

- **Problem:** Offline normalization removes special characters:
  ```typescript
  "Ascoril C-100" → "ascoril c 100"  // Loses brand distinction
  ```
- **Risk:** Two medicines with similar names after normalization (e.g., "AB/CD" vs "AB-CD")

#### Issue 4: **Alias Ordering Matters**

- **Problem:** First match wins - no ranking/scoring
  ```typescript
  // If database has two records with overlapping aliases:
  // Record A: name="Ibuprofen", aliases=["Advil", "Medicol"]
  // Record B: name="Ibuprofen Junior", aliases=["Ibuprofen", "IBU-J"]
  //
  // Query "Ibuprofen" might match Record B if it comes first
  ```
- **Current Data:** Hardcoded OFFLINE_MEDICINES checked first, then generated ones

#### Issue 5: **No Minimum Match Quality**

- **Problem:** Three-pass approach accepts any valid match
  - No string similarity scoring (Levenshtein distance, fuzzy matching)
  - No confidence threshold
- **Example:** Searching for "Aspirin" in OCR text containing "Aspirin" + "Ibuprofen" + "Paracetamol" may return wrong one if order is unlucky

#### Issue 6: **Case Sensitivity in User Input**

- **Problem:** User manual search has minimal normalization:
  ```typescript
  const query = offlineSearchInput.trim(); // No lowercase!
  ```
- **But:** findOfflineMedicineByName() does lowercase internally
- **Result:** Works despite inconsistency, but could be more robust

#### Issue 7: **Generated JSON Quality**

- **Problem:** Kaggle dataset processing fills missing fields with defaults:
  ```python
  "commonUses": "General medicine guidance",  # Placeholder!
  "warnings": "Consult a pharmacist or doctor before use."  # Generic!
  ```
- **Impact:** ~11,000 medicines may have low-quality data (see sample JSON records above)

#### Issue 8: **Long-Running Search Performance**

- **Problem:** `findOfflineMedicineByName()` iterates ALL_OFFLINE_MEDICINES (~11k records)
  - No indexing (no hash map by first letter, no trie)
  - Three-pass OCR matching multiplies iterations
- **Risk:** Slower on low-end phones; latency increases >1 second for OCR path

---

## 6. ONLINE vs OFFLINE: KEY DIFFERENCES

### Data Completeness

| Field                | Online (Gemini)                    | Offline Database                     |
| -------------------- | ---------------------------------- | ------------------------------------ |
| Medicine Name        | ✓ Brand + Generic                  | ✓ Brand, Aliases                     |
| Active Ingredients   | ✓ Detailed                         | ✓ Generic name only                  |
| Dosage               | ✓ Extracted from image/label       | ✗ Not stored (labeled "Check label") |
| Warnings             | ✓ Comprehensive AI-generated       | ✓ Generic or missing                 |
| Side Effects         | ✓ Detailed, ranked                 | ✓ Limited, ~3-6 items                |
| Affordability        | ✓ PhilHealth, generic alternatives | ✓ Basic (estimated price, coverage)  |
| Prescription Details | ✓ Patient, doctor, license         | ✓ Attempted from OCR parse           |
| Food Interactions    | ✓ AI-identified                    | ✗ Not in offline database            |

### Matching Confidence

**Online (Gemini):**

- Vision model trained on labeled medicine images
- Can identify based on visual appearance + text
- Better at handling visual degradation (worn labels, angles)

**Offline:**

- Text-only matching via string operations
- Depends entirely on OCR quality
- Fails if OCR text is severely corrupted

---

## 7. INTERACTION CHECKING: ONLINE vs OFFLINE

### Online Interaction Check

[services/gemini.ts](services/gemini.ts) - `analyzeInteractions()`

- Sends both medicine names to Gemini
- Returns: `hasConflict`, `severity`, detailed `description`
- **Coverage:** Extensive drug interaction database

### Offline Interaction Check

[services/offlineFallback.ts](services/offlineFallback.ts) - `getOfflineDrugInteraction()`

- Hardcoded HIGH_RISK_PAIRS:
  ```typescript
  const HIGH_RISK_PAIRS = [
    ["warfarin", "aspirin"],
    ["warfarin", "ibuprofen"],
    ["warfarin", "diclofenac"],
    ["aspirin", "ibuprofen"],
  ];
  ```
- **Coverage:** Only 4 interaction pairs
- **Matching:** Case-insensitive substring matching on normalized names

**Limitation:** Offline mode only warns about 4 specific interactions. All other combinations default to "safe."

---

## 8. FLOW SUMMARY WITH NORMALIZATION POINTS

```
User Action: Scan Medicine (Camera)
    ↓
takePhoto() captures image URI
    ↓
identifyMedicine()
    ├─ Internet available?
    │  ├─ YES: analyzeMedicineImage(photo)
    │  │   └─ Sends to Gemini (no offline normalization needed)
    │  │   └─ Returns online analysis with full data
    │  │
    │  └─ NO: extractOfflineOcrResult(photo)
    │      ├─ recognizeTextFromImage(photo)
    │      │  └─ OCR outputs raw text with potential errors
    │      │
    │      ├─ parseIdentity(text)
    │      │  └─ Regex-based extraction of patient/doctor info
    │      │
    │      └─ findBestMedicineMatch(text)
    │         ├─ normalize(text) - aggressive special char removal
    │         │  Example: "Paracetamol-500mg!" → "paracetamol 500mg"
    │         │
    │         ├─ Pass 1: Line-by-line → findOfflineMedicineByName(line)
    │         │  └─ norm() applied to queries - minimal (trim + lower)
    │         │
    │         ├─ Pass 2: Word extraction → norm() → findOfflineMedicineByName(word)
    │         │
    │         └─ Pass 3: Substring matching with normalized targets
    │            └─ norm() on medicine names/aliases
    │            └─ String containment check (bidirectional)
    │
    └─ Match found?
       ├─ YES: mapOfflineRecordToAnalysis() → display
       └─ NO: Show manual offline search modal

Manual Search Input (No Internet)
    ↓
handleOfflineSearch()
    └─ findOfflineMedicineByName(query.trim())
       └─ norm() - simple trim + lowercase
       └─ Bidirectional substring matching
```

---

## 9. RECOMMENDATIONS FOR OFFLINE MATCHING IMPROVEMENTS

### High Priority

1. **Add Medicine Name Indexing**
   - Create hash maps keyed by first 2-3 letters
   - Reduces iteration from 11k to ~100-500 per search
2. **Implement Fuzzy Matching**
   - Use Levenshtein distance for OCR typos
   - Example: "Paracitamol" (OCR error) matches "Paracetamol"
   - Library: `fuse.js` or similar for React Native

3. **Expand HIGH_RISK_PAIRS**
   - Current: Only 4 drug interactions
   - Recommendation: Increase to 20-30 common dangerous combos in Philippines

4. **Improve Kaggle Data Quality**
   - Pre-filter medicines to Philippines-only
   - Verify PhilHealth coverage for each medicine
   - Add dosage recommendations (currently missing)

### Medium Priority

5. **Confidence Scoring for Matches**
   - Return top 3 matches, not just first match
   - Let user select if ambiguous
   - Score based on match position (line > word > substring)

6. **Smarter OCR Preprocessing**
   - Detect and correct common OCR errors (e.g., "l" vs "1", "O" vs "0")
   - Split on medical abbreviations (Rx, mg, tabs, etc.)
   - Remove watermarks/artifacts

7. **Caching**
   - Cache recent offline searches
   - Pre-load common Philippine medicines

8. **User Feedback Loop**
   - Log mis-matches when user corrects app
   - Improve database overtime

### Low Priority

9. Better error messaging when no match found
10. QR code scanning if medicine has barcode

---

## 10. FILES REFERENCE GUIDE

| File                                                                                         | Purpose                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [app/scanner.tsx](app/scanner.tsx)                                                           | Main scanner UI + flow orchestration             |
| [app/scanner_formatted.tsx](app/scanner_formatted.tsx)                                       | Alternative scanner UI                           |
| [services/gemini.ts](services/gemini.ts)                                                     | Online medicine identification via Gemini Vision |
| [services/offlineFallback.ts](services/offlineFallback.ts)                                   | Offline medicine lookup functions                |
| [services/offlineOcr.ts](services/offlineOcr.ts)                                             | OCR text extraction + medicine matching          |
| [services/offlineMedicineData.ts](services/offlineMedicineData.ts)                           | Medicine data schema + loading                   |
| [assets/data/offline-medicines.generated.json](assets/data/offline-medicines.generated.json) | Generated database (~11k medicines)              |
| [scripts/kaggle_to_offline_json.py](scripts/kaggle_to_offline_json.py)                       | Kaggle data processor                            |

---

## Summary

**ClarifyApp's offline matching uses a pragmatic 3-pass strategy**: line-level matches → word-level matches → substring matching. While fast and memory-efficient, it relies on **string containment logic** that can false-positive and lacks **confidence scoring**. The offline database has ~11k medicines with varying data quality. For mission-critical accuracy, users should verify offline matches with online identification when internet returns, or implement fuzzy matching + indexing for robustness.
