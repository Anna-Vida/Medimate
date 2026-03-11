"""
Export merged Kaggle medicine datasets to ClarifyApp offline JSON format.

Merges multiple Kaggle datasets for comprehensive medicine coverage:
  1. singhnavjot2062001/11000-medicine-details (11,000 base medicines)
  2. deepalighodki/medicine (additional medicines)
  3. ujjwalaggarwal402/medicine-dataset (quality data with details)

Usage:
  pip install kagglehub[pandas-datasets] pandas
  python scripts/kaggle_to_offline_json.py

Optional env vars:
  KAGGLE_FILE_PATH=<path-inside-dataset>  (if dataset has multiple files)
"""

from __future__ import annotations

import json
import importlib
import os
import tempfile
import zipfile
from typing import Any, Dict, List, cast

import pandas as pd

DATASET_IDS = [
    "singhnavjot2062001/11000-medicine-details",
    "deepalighodki/medicine",
    "ujjwalaggarwal402/medicine-dataset",
]
OUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "assets", "data", "offline-medicines.generated.json"
)
SUPPORTED_EXTENSIONS = (
    ".csv",
    ".tsv",
    ".json",
    ".jsonl",
    ".xml",
    ".parquet",
    ".feather",
    ".sqlite",
    ".sqlite3",
    ".db",
    ".db3",
    ".s3db",
    ".dl3",
    ".xls",
    ".xlsx",
    ".xlsm",
    ".xlsb",
    ".odf",
    ".ods",
    ".odt",
)


def pick(row: Dict[str, Any], candidates: List[str], default: str = "") -> str:
    for key in candidates:
        if key in row and pd.notna(row[key]):
            value = str(row[key]).strip()
            if value:
                return value
    return default


def split_list(raw: str) -> List[str]:
    if not raw:
        return []
    parts = [p.strip() for p in raw.replace(";", ",").split(",")]
    return [p for p in parts if p]


def record_from_row(row: Dict[str, Any]) -> Dict[str, Any]:
    name = pick(row, ["name", "medicine_name", "Medicine Name", "drug_name"]) or "Unknown"
    generic = pick(
        row,
        [
            "generic_name",
            "Generic Name",
            "composition",
            "salt_composition",
            "active_ingredient",
        ],
        default=name,
    )
    uses = pick(
        row,
        ["uses", "use", "description", "indication", "primary_use"],
        default="General medicine guidance",
    )
    warnings = pick(
        row,
        ["warnings", "warning", "side_effects", "precautions", "contraindications"],
        default="Consult a pharmacist or doctor before use.",
    )
    side_effects = split_list(
        pick(row, ["side_effects", "side effect", "adverse_effects"], default=warnings)
    )

    alias_source = pick(row, ["aliases", "brand_names", "brands", "synonyms"], default="")
    aliases = split_list(alias_source)
    if name and name.lower() not in [a.lower() for a in aliases]:
        aliases.append(name)

    return {
        "name": name,
        "aliases": aliases,
        "genericName": generic,
        "commonUses": uses,
        "warnings": warnings,
        "sideEffects": side_effects[:6] if side_effects else ["Consult pharmacist for side effects"],
        "estimatedPrice": "Price varies by pharmacy",
        "philHealthCovered": False,
    }


def dedupe(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged: Dict[str, Dict[str, Any]] = {}

    for rec in records:
        key = rec["name"].strip().lower()
        if not key:
            continue

        if key not in merged:
            merged[key] = rec
            continue

        current = merged[key]
        current_aliases = set(a.strip().lower() for a in current.get("aliases", []))
        for alias in rec.get("aliases", []):
            if alias.strip().lower() not in current_aliases:
                current["aliases"].append(alias)

        if current.get("commonUses", "") == "General medicine guidance" and rec.get("commonUses"):
            current["commonUses"] = rec["commonUses"]

        if current.get("warnings", "") == "Consult a pharmacist or doctor before use." and rec.get("warnings"):
            current["warnings"] = rec["warnings"]

        # Merge sideEffects (remove duplicates)
        if rec.get("sideEffects"):
            current_side_effects = set(current.get("sideEffects", []))
            for effect in rec.get("sideEffects", []):
                if effect.lower() not in {s.lower() for s in current_side_effects}:
                    current["sideEffects"].append(effect)

        # Use non-generic price if available
        if current.get("estimatedPrice", "") == "Price varies by pharmacy" and rec.get("estimatedPrice"):
            if rec["estimatedPrice"] != "Price varies by pharmacy":
                current["estimatedPrice"] = rec["estimatedPrice"]

        # Update PhilHealth coverage if found in newer data
        if not current.get("philHealthCovered") and rec.get("philHealthCovered"):
            current["philHealthCovered"] = True

    return list(merged.values())


def load_dataset_with_adapter(kagglehub_module: Any, dataset_id: str) -> pd.DataFrame | None:
    """Load dataset using new KaggleDatasetAdapter method (faster)."""
    try:
        KaggleDatasetAdapter = kagglehub_module.KaggleDatasetAdapter
        df = kagglehub_module.load_dataset(
            KaggleDatasetAdapter.PANDAS,
            dataset_id,
            "",  # Use all files
        )
        print(f"✓ Loaded {dataset_id}: {len(df)} records")
        return df
    except Exception as e:
        print(f"⚠ Could not load {dataset_id} with adapter: {e}")
        return None


def resolve_dataset_file_path(kagglehub_module: Any, dataset_id: str) -> str:
    dataset_root = kagglehub_module.dataset_download(dataset_id)
    candidates: List[str] = []

    for root, _, files in os.walk(dataset_root):
        for file_name in files:
            if file_name.lower().endswith(SUPPORTED_EXTENSIONS):
                candidates.append(os.path.join(root, file_name))

    if not candidates:
        # Fallback for datasets where root archive extraction is delayed/partial
        # but known file names are available via path download.
        likely_names = [
            "Medicine_Details.csv",
            "medicine_details.csv",
            "medicines.csv",
            "medicine.csv",
            "dataset.csv",
        ]
        for name in likely_names:
            try:
                kagglehub_module.dataset_download(dataset_id, path=name)
                return name
            except Exception:
                continue

        raise RuntimeError(
            "No supported data file found in downloaded Kaggle dataset. "
            "Set KAGGLE_FILE_PATH manually to a valid file path within the dataset."
        )

    # Prefer CSV first (most common), then fall back to shortest path name.
    candidates.sort(key=lambda p: (0 if p.lower().endswith(".csv") else 1, len(p)))
    selected = candidates[0]
    rel_path = os.path.relpath(selected, dataset_root).replace("\\", "/")
    return rel_path




def main() -> None:
    try:
        kagglehub = importlib.import_module("kagglehub")
    except Exception as exc:
        raise RuntimeError(
            "Missing dependency 'kagglehub'. Install with: pip install kagglehub[pandas-datasets] pandas"
        ) from exc

    print("=" * 70)
    print("ClarifyApp Medicine Dataset Merger")
    print("=" * 70)
    print(f"\nLoading {len(DATASET_IDS)} datasets...\n")

    all_rows: List[Dict[str, Any]] = []
    
    for dataset_id in DATASET_IDS:
        try:
            # Try new adapter method first (faster)
            df = load_dataset_with_adapter(kagglehub, dataset_id)
            
            if df is None or df.empty:
                print(f"⚠ Skipping empty dataset: {dataset_id}")
                continue
            
            # Convert rows and map to standard format
            rows_raw = df.fillna("").to_dict(orient="records")
            rows: List[Dict[str, Any]] = [cast(Dict[str, Any], row) for row in rows_raw]
            mapped = [record_from_row(r) for r in rows]
            all_rows.extend(mapped)
            
        except Exception as e:
            print(f"✗ Error loading {dataset_id}: {e}")
            continue

    if not all_rows:
        raise RuntimeError("No medicine records loaded from any dataset.")

    print(f"\n✓ Total raw records before deduplication: {len(all_rows)}")
    
    # Deduplicate and merge
    cleaned = dedupe(all_rows)
    
    print(f"✓ Total unique medicines after deduplication: {len(cleaned)}")
    print(f"\n{'Saving to:':20} {OUT_PATH}")
    
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    print("=" * 70)
    print(f"✓ Successfully exported {len(cleaned)} unique medicines!")
    print("=" * 70)


if __name__ == "__main__":
    main()
