#!/usr/bin/env python3
"""Offline-safe build for GitHub Pages. The only automatic feed is public BLS data."""
import argparse
import csv
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BLS_URL = "https://api.bls.gov/publicAPI/v1/timeseries/data/LNS14000000"


def now_utc():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def fetch_bls():
    req = Request(BLS_URL, headers={"User-Agent": "MarketCorrectionLab/0.1 educational dashboard", "Accept": "application/json"})
    with urlopen(req, timeout=18) as response:
        obj = json.load(response)
    if obj.get("status") != "REQUEST_SUCCEEDED":
        raise ValueError("BLS status: " + str(obj.get("status")))
    result = obj.get("Results", {}).get("series", [])
    if len(result) != 1 or result[0].get("seriesID") != "LNS14000000":
        raise ValueError("BLS series ID mismatch")
    observations = []
    for entry in result[0].get("data", []):
        period = str(entry.get("period", ""))
        if period not in [f"M{n:02d}" for n in range(1, 13)]:
            continue
        year = int(entry["year"])
        value = float(entry["value"])
        if not 0 <= value <= 100:
            raise ValueError("BLS unemployment rate out of expected bounds")
        observations.append({"period": f"{year}-{int(period[1:]):02d}", "value": value})
    observations.sort(key=lambda r: r["period"])
    if not observations:
        raise ValueError("BLS returned no monthly observations")
    return {"source": "U.S. Bureau of Labor Statistics Public Data API v1", "series": "LNS14000000", "indicator": "US unemployment rate, seasonally adjusted", "source_url": BLS_URL, "fetched_at": now_utc(), "observations": observations}


def parse_market_csv(path):
    data = []
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = csv.DictReader(f)
        names = {name.strip().lower(): name for name in rows.fieldnames or []}
        if "date" not in names or "close" not in names:
            raise ValueError("Market CSV requires Date,Close headers")
        for line, row in enumerate(rows, start=2):
            try:
                date = datetime.strptime(row[names["date"]].strip(), "%Y-%m-%d").date().isoformat()
                raw_close = row[names["close"]].strip()
                if raw_close == ".":
                    continue  # explicitly missing FRED observation; do not interpolate
                close = float(raw_close)
                if not 0 < close < float("inf"):
                    raise ValueError("invalid close")
                volume = row.get(names.get("volume", ""), "")
                volume = None if volume == "" else float(volume)
                if volume is not None and not 0 < volume < float("inf"):
                    raise ValueError("invalid volume")
                data.append({"date": date, "close": close, "volume": volume})
            except (ValueError, TypeError, KeyError) as exc:
                raise ValueError(f"Invalid market CSV row {line}: {exc}") from exc
    data.sort(key=lambda r: r["date"])
    if len(data) < 2 or any(data[i]["date"] == data[i - 1]["date"] for i in range(1, len(data))):
        raise ValueError("Market CSV needs >=2 distinct dates without duplicates")
    return data


def build(out, fetch_macro=False, market_csv=None, symbol="MARKET / IMPORT"):
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "web", out)
    (out / "data").mkdir(parents=True, exist_ok=True)
    status = {"built_at": now_utc(), "market_data": "not_published", "bls_update": "not_attempted", "notes": []}
    if market_csv:
        if os.environ.get("MCL_PUBLISH_MARKET_DATA") != "YES":
            raise PermissionError("To publish price CSV, set MCL_PUBLISH_MARKET_DATA=YES after verifying distribution rights.")
        data = parse_market_csv(Path(market_csv))
        (out / "data" / "market.json").write_text(json.dumps({"symbol": symbol, "source": "User-provided authorized price data", "rows": data}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        status["market_data"] = "published_user_authorized"
        status["market_rows"] = len(data)
    if fetch_macro:
        try:
            obj = fetch_bls()
            (out / "data" / "macro.json").write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            status["bls_update"] = "success"
            status["bls_last_observation"] = obj["observations"][-1]["period"]
        except (TimeoutError, HTTPError, URLError, ValueError, KeyError) as exc:
            status["bls_update"] = "failed"
            status["notes"].append("BLS unavailable at build time: " + str(exc))
            print("WARNING: BLS unavailable — no macro values will be fabricated: " + str(exc), file=sys.stderr)
    (out / "data" / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    return status


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=ROOT / "dist")
    ap.add_argument("--fetch-bls", action="store_true", help="Download public US unemployment rate through BLS API")
    ap.add_argument("--market-csv", type=Path, help="Optional legally authorized market price CSV")
    ap.add_argument("--symbol", default="MARKET / IMPORT")
    args = ap.parse_args()
    print(json.dumps(build(args.out, args.fetch_bls, args.market_csv, args.symbol), ensure_ascii=False, indent=2))
