import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import fetch_fred_personal as f


class FredPersonalTests(unittest.TestCase):
    def sample(self):
        return {"observations": [
            {"date": "2026-01-06", "value": "101.5"},
            {"date": "2026-01-02", "value": "100"},
            {"date": "2026-01-05", "value": "."}]}

    def test_missing_not_fabricated_and_sorted(self):
        rows, quality = f.normalize(self.sample())
        self.assertEqual(rows, [("2026-01-02", 100.0), ("2026-01-06", 101.5)])
        self.assertEqual(quality["explicit_missing_dates"], ["2026-01-05"])
        self.assertFalse(quality["volume_available"])

    def test_duplicate_even_if_missing(self):
        data = self.sample()
        data["observations"].append({"date": "2026-01-05", "value": "99"})
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            f.normalize(data)

    def test_invalid_price(self):
        for val in ("-2", "0", "nan", "inf", "abc"):
            with self.subTest(val=val):
                with self.assertRaises(ValueError):
                    f.normalize({"observations": [
                        {"date": "2026-01-02", "value": "100"},
                        {"date": "2026-01-05", "value": val}]})

    def test_bad_dates(self):
        with self.assertRaisesRegex(ValueError, "date"):
            f.normalize({"observations": [
                {"date": "2026-02-30", "value": "100"},
                {"date": "2026-03-02", "value": "101"}]})

    def test_extreme_moves_flagged(self):
        rows, q = f.normalize({"observations": [
            {"date": "2026-01-02", "value": "100"},
            {"date": "2026-01-05", "value": "140"}]})
        self.assertEqual(q["moves_over_25pct_review"][0]["return_pct"], 40.0)

    def test_restrict_repo_and_accept_separate_drive(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            with self.assertRaises(PermissionError):
                f.safe_destination(root / "data" / "NDX.csv", repo_root=root)
            self.assertEqual(f.safe_destination(root / ".private" / "NDX.csv", repo_root=root),
                             root / ".private" / "NDX.csv")
            self.assertEqual(f.safe_destination(root.parent / "NDX.csv", repo_root=root),
                             root.parent / "NDX.csv")

    def test_local_csv_and_metadata(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "NDX.csv"
            f.save_private(out, [("2026-01-02", 100.0), ("2026-01-05", 95.0)], {"rows": 2})
            self.assertIn("Date,Close", out.read_text())
            m = json.loads(out.with_suffix(".meta.json").read_text())
            self.assertFalse(m["public_redistribution_authorized"])

    def test_key_validation_and_dates(self):
        with self.assertRaisesRegex(ValueError, "FRED_API_KEY"):
            f.download("invalid-key")
        with self.assertRaises(ValueError):
            f.download("a" * 32, start="2026-11-06", end="2026-01-01")


if __name__ == "__main__":
    unittest.main()
