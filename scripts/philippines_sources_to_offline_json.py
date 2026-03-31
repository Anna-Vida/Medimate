"""
Build ClarifyApp offline medicine data from Philippines-specific source exports.

Supported source types:
  1. FDA registered drug product exports (CSV/XLS/XLSX/JSON)
  2. DOH drug price reference index exports (CSV/XLS/XLSX/JSON)
  3. PITAHC herbal medicine lists (CSV/XLS/XLSX/JSON)

This script is intentionally tolerant of messy column names. You can export
tables manually from official sources, place them inside:

  data_sources/philippines/

and then run:

  pip install pandas openpyxl
  python scripts/philippines_sources_to_offline_json.py

Output:
  assets/data/offline-medicines.ph.generated.json
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Iterable, List, Optional

import pandas as pd

ROOT_DIR = os.path.join(os.path.dirname(__file__), "..")
SOURCE_DIR = os.path.join(ROOT_DIR, "data_sources", "philippines")
OUT_PATH = os.path.join(
    ROOT_DIR, "assets", "data", "offline-medicines.ph.generated.json"
)

SUPPORTED_EXTENSIONS = (".csv", ".xlsx", ".xls", ".json", ".jsonl")


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def normalize_key(value: str) -> str:
    return (
        normalize_text(value)
        .lower()
        .replace("/", " ")
        .replace("-", " ")
        .replace("_", " ")
    )


def pick(
    row: Dict[str, Any],
    candidates: Iterable[str],
    default: str = "",
) -> str:
    lowered = {normalize_key(key): key for key in row.keys()}
    for candidate in candidates:
        normalized_candidate = normalize_key(candidate)
        if normalized_candidate in lowered:
            raw_value = row.get(lowered[normalized_candidate], "")
            value = normalize_text(raw_value)
            if value:
                return value
    return default


def split_aliases(*values: str) -> List[str]:
    aliases: List[str] = []
    seen: set[str] = set()

    for value in values:
        if not value:
            continue
        for part in (
            value.replace(";", ",")
            .replace("|", ",")
            .replace("(", ",")
            .replace(")", ",")
            .split(",")
        ):
            cleaned = normalize_text(part)
            normalized = cleaned.lower()
            if len(cleaned) < 2 or normalized in seen:
                continue
            seen.add(normalized)
            aliases.append(cleaned)

    return aliases


def price_from_row(row: Dict[str, Any]) -> str:
    currency = pick(row, ["currency"], default="PHP")
    price = pick(
        row,
        [
            "price",
            "unit cost",
            "drug price",
            "reference price",
            "cost",
            "amount",
            "maximum price",
        ],
    )
    if not price:
        return "Price varies by pharmacy"

    if "php" in price.lower() or "peso" in price.lower():
        return price

    return f"{currency} {price}".strip()


def uses_from_row(row: Dict[str, Any]) -> str:
    return pick(
        row,
        [
            "common uses",
            "uses",
            "use",
            "indication",
            "indications",
            "therapeutic indication",
            "description",
            "therapeutic use",
        ],
        default="General medicine guidance",
    )


def warnings_from_row(row: Dict[str, Any]) -> str:
    return pick(
        row,
        [
            "warnings",
            "warning",
            "precautions",
            "contraindications",
            "safety notes",
            "notes",
            "remarks",
        ],
        default="Consult a pharmacist or doctor before use.",
    )


def side_effects_from_row(row: Dict[str, Any]) -> List[str]:
    raw = pick(
        row,
        [
            "side effects",
            "side_effects",
            "adverse effects",
            "common side effects",
        ],
    )
    if not raw:
        return ["Consult pharmacist for side effects"]

    items = split_aliases(raw)
    return items[:6] if items else ["Consult pharmacist for side effects"]


def advice_from_row(row: Dict[str, Any], candidates: Iterable[str]) -> str:
    return pick(row, candidates, default="")


def notes_from_row(row: Dict[str, Any]) -> List[str]:
    raw = pick(
        row,
        [
            "important notes",
            "key notes",
            "counseling points",
            "patient advice",
            "special instructions",
        ],
    )
    if not raw:
        return []
    return split_aliases(raw)


def build_record(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    brand_name = pick(
        row,
        [
            "brand name",
            "product name",
            "drug product name",
            "medicine name",
            "name",
        ],
    )
    generic_name = pick(
        row,
        [
            "generic name",
            "generic",
            "active ingredient",
            "active ingredients",
            "salt composition",
            "composition",
            "scientific name",
        ],
    )

    dosage_strength = pick(
        row,
        ["dosage strength", "strength", "dose", "dosage"],
    )
    dosage_form = pick(
        row,
        ["dosage form", "form", "pharmaceutical form"],
    )

    primary_name = brand_name or generic_name
    if not primary_name:
        return None

    enriched_generic = generic_name or primary_name
    if dosage_strength and dosage_form:
        enriched_use_name = f"{primary_name} {dosage_strength} {dosage_form}"
    else:
        enriched_use_name = primary_name

    aliases = split_aliases(
        brand_name,
        generic_name,
        pick(row, ["synonyms", "aliases", "other names", "common name"]),
        enriched_use_name if enriched_use_name != primary_name else "",
    )

    uses = uses_from_row(row)
    warnings = warnings_from_row(row)
    price = price_from_row(row)
    side_effects = side_effects_from_row(row)
    how_to_take = advice_from_row(
        row,
        [
            "how to take",
            "directions",
            "administration",
            "dose instructions",
            "instruction",
            "instructions",
        ],
    )
    avoid_with = split_aliases(
        pick(
            row,
            [
                "avoid with",
                "interactions",
                "food interactions",
                "drug interactions",
                "do not combine with",
            ],
        )
    )
    important_notes = notes_from_row(row)
    missed_dose_advice = advice_from_row(
        row,
        ["missed dose", "missed dose advice", "forgot dose", "if you miss a dose"],
    )
    when_to_seek_help = advice_from_row(
        row,
        ["when to seek help", "seek help", "red flags", "danger signs"],
    )
    storage = advice_from_row(
        row,
        ["storage", "storage instructions", "how to store"],
    )

    return {
        "name": primary_name,
        "aliases": aliases,
        "genericName": enriched_generic,
        "commonUses": uses,
        "warnings": warnings,
        "sideEffects": side_effects,
        "estimatedPrice": price,
        "philHealthCovered": False,
        **({"howToTake": how_to_take} if how_to_take else {}),
        **({"avoidWith": avoid_with} if avoid_with else {}),
        **({"importantNotes": important_notes} if important_notes else {}),
        **({"missedDoseAdvice": missed_dose_advice} if missed_dose_advice else {}),
        **({"whenToSeekHelp": when_to_seek_help} if when_to_seek_help else {}),
        **({"storage": storage} if storage else {}),
    }


def merge_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged: Dict[str, Dict[str, Any]] = {}

    for record in records:
        key = normalize_text(record["name"]).lower()
        if not key:
            continue

        if key not in merged:
            merged[key] = {
                **record,
                "aliases": list(record.get("aliases", [])),
                "sideEffects": list(record.get("sideEffects", [])),
            }
            continue

        current = merged[key]

        alias_seen = {normalize_text(alias).lower() for alias in current["aliases"]}
        for alias in record.get("aliases", []):
            normalized_alias = normalize_text(alias).lower()
            if normalized_alias and normalized_alias not in alias_seen:
                current["aliases"].append(alias)
                alias_seen.add(normalized_alias)

        if (
            current.get("commonUses") == "General medicine guidance"
            and record.get("commonUses")
        ):
            current["commonUses"] = record["commonUses"]

        if (
            current.get("warnings") == "Consult a pharmacist or doctor before use."
            and record.get("warnings")
        ):
            current["warnings"] = record["warnings"]

        if (
            current.get("estimatedPrice") == "Price varies by pharmacy"
            and record.get("estimatedPrice")
            and record["estimatedPrice"] != "Price varies by pharmacy"
        ):
            current["estimatedPrice"] = record["estimatedPrice"]

        current_effects = {
            normalize_text(effect).lower() for effect in current.get("sideEffects", [])
        }
        for effect in record.get("sideEffects", []):
            normalized_effect = normalize_text(effect).lower()
            if normalized_effect and normalized_effect not in current_effects:
                current["sideEffects"].append(effect)
                current_effects.add(normalized_effect)

    return sorted(merged.values(), key=lambda item: item["name"].lower())


def load_table(file_path: str) -> pd.DataFrame:
    lower_path = file_path.lower()
    if lower_path.endswith(".csv"):
        return pd.read_csv(file_path)
    if lower_path.endswith((".xlsx", ".xls")):
        return pd.read_excel(file_path)
    if lower_path.endswith(".json"):
        with open(file_path, "r", encoding="utf-8") as file:
            raw = json.load(file)
        if isinstance(raw, list):
            return pd.DataFrame(raw)
        if isinstance(raw, dict):
            for value in raw.values():
                if isinstance(value, list):
                    return pd.DataFrame(value)
            return pd.DataFrame([raw])
    if lower_path.endswith(".jsonl"):
        return pd.read_json(file_path, lines=True)
    raise RuntimeError(f"Unsupported file: {file_path}")


def discover_source_files() -> List[str]:
    if not os.path.isdir(SOURCE_DIR):
        return []

    files: List[str] = []
    for root, _, names in os.walk(SOURCE_DIR):
        for name in names:
            if name.lower().endswith(SUPPORTED_EXTENSIONS):
                files.append(os.path.join(root, name))
    return sorted(files)


def main() -> None:
    source_files = discover_source_files()
    if not source_files:
        raise RuntimeError(
            "No Philippines source files found. Put CSV/XLSX/JSON exports into "
            "data_sources/philippines/ and run the script again."
        )

    all_records: List[Dict[str, Any]] = []
    for file_path in source_files:
        try:
            frame = load_table(file_path).fillna("")
            rows = frame.to_dict(orient="records")
            added = 0
            for row in rows:
                record = build_record(row)
                if record:
                    all_records.append(record)
                    added += 1
            print(f"Loaded {added:4d} rows from {os.path.relpath(file_path, ROOT_DIR)}")
        except Exception as exc:
            print(f"Skipping {file_path}: {exc}")

    merged = merge_records(all_records)
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as file:
        json.dump(merged, file, ensure_ascii=False, indent=2)

    print(f"\nSaved {len(merged)} normalized Philippines records to:")
    print(OUT_PATH)


if __name__ == "__main__":
    main()
