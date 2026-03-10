"""
Export Kaggle medicine dataset to ClarifyApp offline JSON format.

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

DATASET_ID = "singhnavjot2062001/11000-medicine-details"
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

    return list(merged.values())


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


def load_dataframe_from_dataset_file(
    kagglehub_module: Any,
    dataset_id: str,
    file_path: str,
) -> pd.DataFrame:
    def read_tabular(path: str) -> pd.DataFrame:
        lower = path.lower()
        if lower.endswith(".csv"):
            for enc in ("utf-8", "latin-1", "cp1252"):
                try:
                    return pd.read_csv(path, encoding=enc)
                except UnicodeDecodeError:
                    continue
            return pd.read_csv(path, encoding_errors="replace")
        if lower.endswith(".tsv"):
            return pd.read_csv(path, sep="\t")
        if lower.endswith(".json") or lower.endswith(".jsonl"):
            return pd.read_json(path)
        if lower.endswith(".parquet"):
            return pd.read_parquet(path)
        if lower.endswith(".xls") or lower.endswith(".xlsx") or lower.endswith(".xlsm"):
            return pd.read_excel(path)
        raise RuntimeError(f"Unsupported selected file format for pandas loading: {path}")

    try:
        local_file = kagglehub_module.dataset_download(dataset_id, path=file_path)
    except Exception as exc:
        if "DataCorruptionError" not in type(exc).__name__:
            raise
        # If cache is corrupted, force a fresh download of the target file.
        local_file = kagglehub_module.dataset_download(
            dataset_id,
            path=file_path,
            force_download=True,
        )

    with open(local_file, "rb") as f:
        signature = f.read(4)

    # Some Kaggle files are zip-compressed but keep source extension in file name.
    if signature.startswith(b"PK"):
        with tempfile.TemporaryDirectory() as tmp_dir:
            with zipfile.ZipFile(local_file, "r") as zf:
                zf.extractall(tmp_dir)

            extracted_candidates: List[str] = []
            for root, _, files in os.walk(tmp_dir):
                for file_name in files:
                    if file_name.lower().endswith(SUPPORTED_EXTENSIONS):
                        extracted_candidates.append(os.path.join(root, file_name))

            if not extracted_candidates:
                raise RuntimeError(
                    "Zip file downloaded but no supported tabular file was found inside."
                )

            extracted_candidates.sort(key=lambda p: (0 if p.lower().endswith(".csv") else 1, len(p)))
            return read_tabular(extracted_candidates[0])

    return read_tabular(local_file)


def main() -> None:
    try:
        kagglehub = importlib.import_module("kagglehub")
    except Exception as exc:
        raise RuntimeError(
            "Missing dependency 'kagglehub'. Install with: pip install kagglehub[pandas-datasets] pandas"
        ) from exc

    file_path = os.environ.get("KAGGLE_FILE_PATH", "").strip()
    if not file_path:
        file_path = resolve_dataset_file_path(kagglehub, DATASET_ID)
    print(f"Using dataset file: {file_path}")

    print(f"Loading dataset: {DATASET_ID}")
    df = load_dataframe_from_dataset_file(
        kagglehub,
        DATASET_ID,
        file_path,
    )

    if not isinstance(df, pd.DataFrame) or df.empty:
        raise RuntimeError("Dataset loaded but no records were found.")

    rows_raw = df.fillna("").to_dict(orient="records")
    rows: List[Dict[str, Any]] = [cast(Dict[str, Any], row) for row in rows_raw]
    mapped = [record_from_row(r) for r in rows]
    cleaned = dedupe(mapped)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    print(f"Exported {len(cleaned)} records to: {OUT_PATH}")


if __name__ == "__main__":
    main()
