#!/usr/bin/env python3
"""BLS unemployment-rate snapshot for Market Correction Lab (stdlib only)."""
import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

URL = "https://api.bls.gov/publicAPI/v1/timeseries/data/LNS14000000"
SERIES = "LNS14000000"
ROOT = Path(__file__).resolve().parents[1]


def utcnow():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse(data, timestamp):
    if data.get("status") != "REQUEST_SUCCEEDED":
        raise ValueError("BLS API status: " + str(data.get("status")))
    series = data.get("Results", {}).get("series", [])
    if len(series) != 1 or series[0].get("seriesID") != SERIES:
        raise ValueError("Unexpected BLS series ID")
    observed = {}
    for row in series[0].get("data", []):
        month = str(row.get("period", ""))
        if month not in {f"M{i:02d}" for i in range(1, 13)}:
            continue
        period = f"{int(row['year']):04d}-{int(month[1:]):02d}"
        value = float(row["value"])
        if not math.isfinite(value) or not (0 <= value <= 100):
            raise ValueError("Invalid unemployment rate for " + period)
        if period in observed:
            raise ValueError("Duplicate observation: " + period)
        observed[period] = {"period": period, "value": value}
    if not observed:
        raise ValueError("BLS returned no monthly observations")
    return {
        "source": "U.S. Bureau of Labor Statistics Public Data API v1",
        "source_url": URL,
        "series": SERIES,
        "indicator": "US unemployment rate, seasonally adjusted",
        "fetched_at": timestamp,
        "observations": [observed[k] for k in sorted(observed)],
    }


def collect(out_dir=ROOT / "data", fetcher=None):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = utcnow()
    status = {
        "built_at": stamp,
        "market_data": "not_published",
        "bls_update": "failed",
        "notes": [],
    }
    try:
        if fetcher is None:
            req = Request(URL, headers={"Accept": "application/json", "User-Agent": "MarketCorrectionLab/0.2 (public research app)"})
            with urlopen(req, timeout=25) as response:
                incoming = json.load(response)
        else:
            incoming = fetcher()
        payload = parse(incoming, stamp)
        tmp = out_dir / "macro.json.tmp"
        tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, out_dir / "macro.json")
        status["bls_update"] = "success"
        status["bls_last_observation"] = payload["observations"][-1]["period"]
        status["bls_observations"] = len(payload["observations"])
    except Exception as exc:
        # The previous verified snapshot is intentionally preserved, never fabricated.
        status["notes"].append("BLS fetch failed; last successful snapshot preserved if present: " + str(exc)[:350])
        if (out_dir / "macro.json").exists():
            status["bls_update"] = "stale"
            try:
                old = json.loads((out_dir / "macro.json").read_text(encoding="utf-8"))
                status["bls_last_observation"] = old["observations"][-1]["period"]
            except (KeyError, ValueError, IndexError):
                pass
        print("WARNING:", status["notes"][-1], file=sys.stderr)
    (out_dir / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return status


if __name__ == "__main__":
    status = collect()
    print(json.dumps(status, ensure_ascii=False, indent=2))
    if status["bls_update"] == "failed":
        sys.exit(1)
