import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("update_macro", Path(__file__).resolve().parents[1] / "scripts/update_macro.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class MacroTests(unittest.TestCase):
    def setUp(self):
        self.sample = {"status": "REQUEST_SUCCEEDED", "Results": {"series": [{"seriesID": "LNS14000000", "data": [
            {"year": "2026", "period": "M01", "value": "4.2"},
            {"year": "2026", "period": "M02", "value": "4.1"},
        ]}]}}

    def test_valid_parsing(self):
        got = m.parse(self.sample, "2026-11-06T00:00:00+00:00")
        self.assertEqual(got["observations"][-1], {"period": "2026-02", "value": 4.1})

    def test_missing_value_is_skipped_and_reported(self):
        self.sample["Results"]["series"][0]["data"].append({"year": "2026", "period": "M03", "value": "-"})
        payload = m.parse(self.sample, "2026-11-06")
        self.assertEqual(payload["missing_periods"], ["2026-03"])
        self.assertEqual(len(payload["observations"]), 2)

    def test_invalid_is_not_published(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            ok = m.collect(folder, lambda: self.sample)
            self.assertEqual(ok["bls_update"], "success")
            saved = (folder / "macro.json").read_text()
            fail = m.collect(folder, lambda: {"status": "REQUEST_FAILED"})
            self.assertEqual(fail["bls_update"], "stale")
            self.assertEqual((folder / "macro.json").read_text(), saved)

    def test_missing_data_not_faked(self):
        with tempfile.TemporaryDirectory() as d:
            state = m.collect(Path(d), lambda: {"status": "REQUEST_FAILED"})
            self.assertEqual(state["bls_update"], "failed")
            self.assertFalse((Path(d) / "macro.json").exists())

    def test_rejects_duplicate_and_bad_value(self):
        self.sample["Results"]["series"][0]["data"].append({"year": "2026", "period": "M02", "value": "4.1"})
        with self.assertRaises(ValueError):
            m.parse(self.sample, "2026-11-06")


if __name__ == "__main__":
    unittest.main()
