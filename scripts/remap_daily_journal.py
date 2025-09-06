#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remap DailyJournalR6 source CSV (Arabic headers, semicolon-delimited) into a clean, UTF-8, semicolon-delimited mapped CSV
that aligns with your staging/normalization pipeline (see journal_import_progress.md).

Usage (PowerShell examples):
  # Basic (auto-detect encoding, delimiter)
  python scripts/remap_daily_journal.py \
    --source "DailyJournalR6.csv" \
    --mapping "mappings/daily_journal_r6_mapping.json" \
    --output "DailyJournalR6_mapped_fixed.csv"

  # Force source encoding (if you know it), e.g., Windows-1256
  python scripts/remap_daily_journal.py \
    --source "DailyJournalR6.csv" \
    --mapping "mappings/daily_journal_r6_mapping.json" \
    --output "DailyJournalR6_mapped_fixed.csv" \
    --source-encoding "cp1256"

Notes
- The mapping JSON defines how to map your source headers (Arabic or otherwise) to the standardized output headers.
- The script preserves text verbatim (no replacement with �) by reading with the correct encoding.
- Amount and date fields can be normalized (Arabic/Persian numerals → ASCII digits) if requested.
"""

import argparse
import csv
import io
import json
import os
import sys
from typing import Dict, List, Optional

PREFERRED_ENCODINGS = [
    "cp1256",      # Arabic (Windows-1256)
    "utf-8-sig",  # UTF-8 with BOM
    "utf-8",
    "cp1252",
    "latin1",
]

# Output columns expected by your pipeline (adjustable)
OUTPUT_COLUMNS_STANDARD = [
    "reference_number",
    "entry_date",
    "amount",
    "debit_account_code",
    "credit_account_code",
    "debit_account_name_src",
    "credit_account_name_src",
    "txn_description",
    "classification_code",
    "work_item_code",
    "expenses_code",
]

# Output columns for staging.raw_transactions in your DB (exact order)
OUTPUT_COLUMNS_RAW_STAGE = [
    "entry_date_text",
    "reference_number",
    "classification_code",
    "classification_name",
    "txn_description",
    "work_item_code",
    "work_item_description",
    "expenses_code",
    "expenses_description",
    "amount_text",
    "extra_col_text",
    "credit_account_code",
    "credit_account_name_src",
    "debit_account_code",
    "debit_account_name_src",
    "source_file",
]

ARABIC_TO_ASCII_DIGITS = str.maketrans(
    # Arabic-Indic 0-9
    "٠١٢٣٤٥٦٧٨٩",
    "0123456789"
)
PERSIAN_TO_ASCII_DIGITS = str.maketrans(
    # Extended Arabic-Indic (Persian) 0-9
    "۰۱۲۳۴۵۶۷۸۹",
    "0123456789"
)


def detect_delimiter(sample: str) -> str:
    # Prefer ';' if present; else fall back to ','
    if ";" in sample and sample.count(";") >= sample.count(","):
        return ";"
    return ","


def try_read(path: str, encoding: Optional[str] = None) -> tuple[str, str]:
    """Return (text, encoding_used). Raises on failure."""
    encodings = [encoding] if encoding else PREFERRED_ENCODINGS
    last_err = None
    for enc in encodings:
        try:
            with open(path, "rb") as f:
                raw = f.read()
            text = raw.decode(enc)
            return text, enc
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Failed to decode {path} with encodings {encodings}: {last_err}")


def normalize_digits(value: str) -> str:
    if value is None:
        return value
    # Convert Arabic/Persian digits to ASCII
    v = value.translate(ARABIC_TO_ASCII_DIGITS)
    v = v.translate(PERSIAN_TO_ASCII_DIGITS)
    return v


def load_mapping(path: str) -> Dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        mapping = json.load(f)
    # mapping: {"source_header": "output_header"}
    return mapping


def map_headers(src_headers: List[str], mapping: Dict[str, str]) -> Dict[int, str]:
    """Return a map from source column index -> output header name."""
    index_to_output: Dict[int, str] = {}
    # Normalize source headers by stripping BOM and whitespace
    norm_src = [h.strip("\ufeff ") for h in src_headers]

    # Direct match by exact source header string
    for i, h in enumerate(norm_src):
        if h in mapping:
            index_to_output[i] = mapping[h]
    return index_to_output


def build_csv_reader(text: str, delimiter: Optional[str]) -> tuple[csv.reader, List[str]]:
    # Peek first line to detect delimiter if not provided
    buf = io.StringIO(text)
    first_line = buf.readline()
    used_delim = delimiter or detect_delimiter(first_line)
    buf.seek(0)
    reader = csv.reader(buf, delimiter=used_delim)
    headers = next(reader)
    return reader, [h.strip("\ufeff ") for h in headers]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="Path to DailyJournalR6.csv (original)")
    ap.add_argument("--mapping", required=True, help="Path to JSON header mapping file")
    ap.add_argument("--output", required=True, help="Path to write mapped CSV (UTF-8, ';' delimiter)")
    ap.add_argument("--source-encoding", default=None, help="Force source encoding (e.g., cp1256)")
    ap.add_argument("--source-delimiter", default=None, help="Force source delimiter (default: auto)")
    ap.add_argument("--normalize-numeric", action="store_true", help="Normalize Arabic/Persian digits to ASCII for amount/date")
    ap.add_argument("--include-unmapped", action="store_true", help="Append original unmapped source columns to the output CSV after the standardized columns")
    ap.add_argument("--target", choices=["standard","raw_staging"], default="standard", help="Choose output shape: 'standard' (default) or 'raw_staging' to match staging.raw_transactions columns")
    args = ap.parse_args()

    # Read source as text with selected/guessed encoding
    text, enc_used = try_read(args.source, args.source_encoding)

    # Build CSV reader
    reader, src_headers = build_csv_reader(text, args.source_delimiter)

    # Load mapping
    mapping = load_mapping(args.mapping)
    idx_to_out = map_headers(src_headers, mapping)

    # Choose output columns based on target
    OUTPUT_COLUMNS = OUTPUT_COLUMNS_STANDARD if args.target == "standard" else OUTPUT_COLUMNS_RAW_STAGE

    # Validate mapping covers required outputs (only those that must come from source headers)
    # For raw_staging, 'extra_col_text' and 'source_file' can be filled without source headers.
    required_set = set(OUTPUT_COLUMNS)
    if args.target == "raw_staging":
        required_set = required_set - {"extra_col_text", "source_file"}
    mapped_outs = set(idx_to_out.values())
    missing = required_set - mapped_outs
    if missing:
        sys.stderr.write(
            "ERROR: mapping does not produce required output columns: " + ", ".join(sorted(missing)) + "\n"
        )
        sys.stderr.write(
            "Source headers seen (for reference): " + ", ".join(src_headers) + "\n"
        )
        sys.exit(1)

    # Determine any unmapped source columns (by index) and their header names
    extra_indices = []
    extra_headers: List[str] = []
    if args.include_unmapped:
        for i, h in enumerate(src_headers):
            if i not in idx_to_out:
                extra_indices.append(i)
                extra_headers.append(h)

    # Prepare writer
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    out_fh = open(args.output, "w", encoding="utf-8", newline="")
    writer = csv.writer(out_fh, delimiter=';')

    # Compose final headers order: standardized first, then extra source headers
    final_headers = OUTPUT_COLUMNS + (extra_headers if args.include_unmapped else [])
    writer.writerow(final_headers)

    # Process rows
    row_count = 0
    for row in reader:
        if not row:
            continue
        out = {h: "" for h in OUTPUT_COLUMNS}
        # Defaults for raw_staging-only columns
        if args.target == "raw_staging":
            out["extra_col_text"] = ""
            out["source_file"] = os.path.basename(args.source)
        for i, val in enumerate(row):
            if i in idx_to_out:
                out_col = idx_to_out[i]
                out[out_col] = val
        # Optional normalization
        if args.normalize_numeric:
            # entry_date and amount normalization (digits only; do not change separators here)
            if out.get("entry_date"):
                out["entry_date"] = normalize_digits(out["entry_date"])  # keep format as-is
            if out.get("amount"):
                out["amount"] = normalize_digits(out["amount"])  # decimal separator untouched
        # Build row in desired order
        row_values = [out.get(col, "") for col in OUTPUT_COLUMNS]
        if args.include_unmapped:
            row_values.extend([row[i] if i < len(row) else "" for i in extra_indices])
        writer.writerow(row_values)
        row_count += 1

    out_fh.close()

    print(f"OK: wrote {row_count} rows to {args.output} (source encoding: {enc_used})")


if __name__ == "__main__":
    main()

