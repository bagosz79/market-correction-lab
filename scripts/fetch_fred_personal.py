#!/usr/bin/env python3
"""Private NASDAQ100 daily closes from FRED. Never publishes market data."""
import argparse
import csv
import json
import math
import os
import re
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
API_URL = "https://api.stlouisfed.org/fred/series/observations"
SERIES = "NASDAQ100"
KEY_RE = re.compile(r"^[a-z0-9]{32}$")


def normalize(payload):
    """Keep genuine observations, missing dates, and questionable daily changes."""
    if not isinstance(payload, dict) or not isinstance(payload.get("observations"), list):
        raise ValueError("Unexpected FRED response: observations missing")
    seen, missing, rows, extreme = set(), [], [], []
    for obs in payload["observations"]:
        day = str(obs.get("date", ""))
        try:
            if date.fromisoformat(day).isoformat() != day:
                raise ValueError()
        except ValueError:
            raise ValueError("Invalid observation date") from None
        if day in seen:
            raise ValueError("Duplicate FRED date: " + day)
        seen.add(day)
        raw = str(obs.get("value", "")).strip()
        if raw in ("", ".", "-"):
            missing.append(day)
            continue
        try:
            close = float(raw)
        except ValueError:
            raise ValueError("Invalid close on " + day) from None
        if not math.isfinite(close) or close <= 0:
            raise ValueError("Nonpositive/nonfinite close on " + day)
        rows.append((day, close))
    rows.sort()
    if len(rows) < 2:
        raise ValueError("At least two valid daily closes required")
    for (before, p), (after, c) in zip(rows, rows[1:]):
        pct = 100 * (c/p - 1)
        if abs(pct) > 25:
            extreme.append({"date": after, "previous_date": before,
                            "return_pct": round(pct, 3)})
    return rows, {"rows": len(rows), "first_date": rows[0][0],
                  "last_date": rows[-1][0], "explicit_missing_dates": missing,
                  "moves_over_25pct_review": extreme, "volume_available": False}


def safe_destination(path, repo_root=ROOT):
    dest = Path(path).expanduser().resolve()
    repo = Path(repo_root).resolve()
    if dest.suffix.lower() != ".csv":
        raise ValueError("Output must be CSV")
    try:
        rel = dest.relative_to(repo)
    except ValueError:
        return dest
    if not rel.parts or rel.parts[0] != ".private":
        raise PermissionError("Refusing public repo location. Use .private/ or a separate drive.")
    return dest


def download(key, start="1986-01-01", end=None):
    if not KEY_RE.fullmatch(key or ""):
        raise ValueError("FRED_API_KEY must be your own 32-character key")
    for d in [start, end]:
        if d is not None:
            try:
                if date.fromisoformat(d).isoformat() != d:
                    raise ValueError()
            except ValueError:
                raise ValueError("Invalid ISO date argument") from None
    if end and start > end:
        raise ValueError("Start date must not exceed end date")
    query = {"series_id": SERIES, "api_key": key, "file_type": "json",
             "observation_start": start, "sort_order": "asc"}
    if end:
        query["observation_end"] = end
    req = Request(API_URL + "?" + urlencode(query),
                  headers={"User-Agent": "MarketCorrectionLab/0.2 private researcher"})
    try:
        with urlopen(req, timeout=30) as response:
            payload = json.load(response)
    except HTTPError as exc:
        raise RuntimeError("FRED HTTP error " + str(exc.code)) from None
    except (URLError, TimeoutError):
        raise RuntimeError("FRED connection error") from None
    if isinstance(payload, dict) and "error_code" in payload:
        raise RuntimeError("FRED API rejected the request (code " +
                           str(payload["error_code"]) + ")")
    return normalize(payload)


def save_private(path, rows, quality):
    dest = safe_destination(path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".csv.tmp")
    try:
        with tmp.open("w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Date", "Close"])
            writer.writerows(rows)
        tmp.replace(dest)
    finally:
        if tmp.exists():
            tmp.unlink()
    manifest = {
        "symbol": "NDX", "fred_series": SERIES, "frequency": "daily close",
        "source": "Nasdaq, Inc. via FRED",
        "source_url": "https://fred.stlouisfed.org/series/NASDAQ100",
        "downloaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "rights": "Nasdaq copyrighted; separate permission required for redistribution",
        "public_redistribution_authorized": False,
        "quality": quality,
    }
    meta = dest.with_suffix(".meta.json")
    meta.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main():
    ap = argparse.ArgumentParser(description="Private NASDAQ100 daily closing prices via FRED")
    ap.add_argument("--out", required=True, help="CSV on D: or .private/, never public Git")
    ap.add_argument("--start", default="1986-01-01")
    ap.add_argument("--end")
    args = ap.parse_args()
    dest = safe_destination(args.out)
    rows, quality = download(os.environ.get("FRED_API_KEY", ""), args.start, args.end)
    save_private(dest, rows, quality)
    print(json.dumps({"status": "saved_privately", "file": str(dest),
                      "quality": quality}, ensure_ascii=False))


if __name__ == "__main__":
    main()
