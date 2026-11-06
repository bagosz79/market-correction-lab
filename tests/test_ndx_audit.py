import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from audit_ndx_csv import analyze


class AuditNdxCsvTests(unittest.TestCase):
    def file(self, folder, text):
        p = Path(folder) / "ndx.csv"
        p.write_text(text, encoding="utf-8")
        return p

    def test_fred_missing_observation_without_fabrication(self):
        with tempfile.TemporaryDirectory() as td:
            p = self.file(td, "DATE,NASDAQ100\n2025-01-02,100\n2025-01-03,.\n2025-01-06,90\n")
            r = analyze(p)
            self.assertEqual(r["valid_close_rows"], 2)
            self.assertEqual(r["explicit_missing_rows"], 1)
            self.assertEqual(r["last_date"], "2025-01-06")
            self.assertEqual(r["redistribution"], "NOT_AUTHORIZED_BY_THIS_REPORT")
            self.assertEqual(r["candidate_missing_weekdays_including_source_missing"], 1)

    def test_date_close_csv_and_unsorted_input(self):
        with tempfile.TemporaryDirectory() as td:
            p = self.file(td, "Date,Close\n2025-01-06,90\n2025-01-02,100\n")
            r = analyze(p)
            self.assertEqual(r["out_of_order_rows"], 1)
            self.assertEqual(r["first_date"], "2025-01-02")

    def test_duplicate_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p = self.file(td, "Date,Close\n2025-01-02,100\n2025-01-02,98\n")
            with self.assertRaisesRegex(ValueError, "zdublowana"):
                analyze(p)

    def test_invalid_price_rejected(self):
        for bad in ["-15", "0", "nan", "inf", "abc"]:
            with self.subTest(value=bad), tempfile.TemporaryDirectory() as td:
                p = self.file(td, "Date,Close\n2025-01-02,100\n2025-01-03," + bad + "\n")
                with self.assertRaises(ValueError):
                    analyze(p)

    def test_invalid_date_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p = self.file(td, "Date,Close\n2025-02-30,100\n2025-03-03,101\n")
            with self.assertRaises(ValueError):
                analyze(p)

    def test_no_prices_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p = self.file(td, "DATE,NASDAQ100\n2025-01-02,.\n2025-01-03,.\n")
            with self.assertRaises(ValueError):
                analyze(p)


if __name__ == "__main__":
    unittest.main()
