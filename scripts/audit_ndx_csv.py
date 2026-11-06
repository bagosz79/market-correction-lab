#!/usr/bin/env python3
"""Audyt prywatnego pliku NDX CSV. Raport zawiera metadane, nie ceny."""
import argparse
import csv
import hashlib
import json
import math
from datetime import date, timedelta
from pathlib import Path

MISSING = {"", ".", "-"}
DATES = {"date", "observation_date"}
PRICES = {"nasdaq100", "close", "adj close", "adj_close"}


def parse_iso(s, line):
    if len(s) != 10 or s[4] != "-" or s[7] != "-":
        raise ValueError(f"Wiersz {line}: data musi byc YYYY-MM-DD")
    try:
        d = date.fromisoformat(s)
        if d.isoformat() != s:
            raise ValueError()
        return d
    except ValueError as exc:
        raise ValueError(f"Wiersz {line}: niepoprawna data {s!r}") from exc


def analyze(path):
    path = Path(path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        first = stream.readline()
        stream.seek(0)
        delimiter = ";" if first.count(";") > first.count(",") else ","
        reader = csv.DictReader(stream, delimiter=delimiter)
        if not reader.fieldnames:
            raise ValueError("Brak naglowka CSV")
        header = {h.strip().lower(): h for h in reader.fieldnames if h is not None}
        dc = next((header[c] for c in DATES if c in header), None)
        pc = next((header[c] for c in ("nasdaq100", "close", "adj close", "adj_close") if c in header), None)
        if not dc or not pc:
            raise ValueError("Wymagane naglowki DATE,NASDAQ100 lub Date,Close")
        seen = set()
        vals = []
        missing_dates = []
        rows_total = 0
        out_of_order = 0
        previous = None
        for line, row in enumerate(reader, start=2):
            if not any(v and v.strip() for v in row.values() if isinstance(v, str)):
                continue
            rows_total += 1
            d = parse_iso(str(row.get(dc, "")).strip(), line)
            if d in seen:
                raise ValueError(f"Wiersz {line}: zdublowana data {d.isoformat()}")
            seen.add(d)
            if previous is not None and d < previous:
                out_of_order += 1
            previous = d
            raw = str(row.get(pc, "") or "").strip()
            if raw in MISSING:
                missing_dates.append(d.isoformat())
                continue
            try:
                value = float(raw.replace(",", "."))
            except ValueError as exc:
                raise ValueError(f"Wiersz {line}: niepoprawna cena") from exc
            if not math.isfinite(value) or value <= 0:
                raise ValueError(f"Wiersz {line}: cena musi byc dodatnia i skonczona")
            vals.append((d, value))
    if len(vals) < 2:
        raise ValueError("Do analizy potrzeba minimum 2 poprawnych cen")
    vals.sort()
    candidate_weekdays = 0
    example_gaps = []
    for (left, _), (right, _) in zip(vals, vals[1:]):
        at = left + timedelta(days=1)
        gap = 0
        while at < right:
            if at.weekday() < 5:
                gap += 1
            at += timedelta(days=1)
        candidate_weekdays += gap
        if gap and len(example_gaps) < 10:
            example_gaps.append({"after": left.isoformat(), "before": right.isoformat(), "weekdays_between": gap})
    return {
        "instrument": "NDX",
        "input_type": "daily_close_csv",
        "source_header": pc,
        "file_sha256": digest,
        "raw_rows": rows_total,
        "valid_close_rows": len(vals),
        "explicit_missing_rows": len(missing_dates),
        "explicit_missing_dates_first_10": missing_dates[:10],
        "out_of_order_rows": out_of_order,
        "first_date": vals[0][0].isoformat(),
        "last_date": vals[-1][0].isoformat(),
        "candidate_missing_weekdays_including_source_missing": candidate_weekdays,
        "candidate_gap_examples": example_gaps,
        "warning": "Luki liczone jako dni pon.-pt.; bez oficjalnego kalendarza sesji nie oznaczaja pewnych brakow danych.",
        "redistribution": "NOT_AUTHORIZED_BY_THIS_REPORT",
    }


def main():
    parser = argparse.ArgumentParser(description="NDX data-quality report, no quotes published")
    parser.add_argument("csv_file", type=Path)
    parser.add_argument("--out", type=Path, help="Opcjonalny lokalny plik JSON z metadanymi")
    args = parser.parse_args()
    result = analyze(args.csv_file)
    output = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(output, encoding="utf-8")
    else:
        print(output, end="")


if __name__ == "__main__":
    main()
