import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"scripts"))
from build_site import build, parse_market_csv


class BuildTests(unittest.TestCase):
    def test_offline_build_has_no_fake_macro(self):
        with tempfile.TemporaryDirectory() as td:
            dest = Path(td)/"dist"
            info = build(dest)
            self.assertEqual(info["bls_update"], "not_attempted")
            self.assertTrue((dest/"index.html").exists())
            self.assertFalse((dest/"data"/"market.json").exists())
            self.assertFalse((dest/"data"/"macro.json").exists())

    def test_publish_requires_explicit_license_gate(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"prices.csv"
            p.write_text("Date,Close,Volume\n2024-01-02,100,20\n2024-01-03,90,21\n", encoding="utf-8")
            self.assertEqual(len(parse_market_csv(p)),2)
            original=os.environ.pop("MCL_PUBLISH_MARKET_DATA",None)
            try:
                with self.assertRaises(PermissionError):build(Path(td)/"dist",market_csv=p)
                os.environ["MCL_PUBLISH_MARKET_DATA"]="YES"
                info=build(Path(td)/"dist",market_csv=p,symbol="TEST")
                self.assertEqual(info["market_rows"],2)
            finally:
                if original is None:os.environ.pop("MCL_PUBLISH_MARKET_DATA",None)
                else:os.environ["MCL_PUBLISH_MARKET_DATA"]=original

    def test_invalid_negative_price_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            f=Path(td)/"bad.csv"
            f.write_text("Date,Close\n2024-01-02,100\n2024-01-03,-10\n",encoding="utf-8")
            with self.assertRaises(ValueError):parse_market_csv(f)

if __name__=="__main__":unittest.main()
