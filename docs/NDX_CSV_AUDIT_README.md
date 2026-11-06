# NDX CSV audit (private)

Run locally with a CSV you have a right to use:

```powershell
python scripts/audit_ndx_csv.py "D:\\Data\\NASDAQ100.csv" --out ".local/ndx_audit.json"
```

It accepts `DATE,NASDAQ100` from a FRED export and `Date,Close`. Only a **quality report without prices** is produced. It checks positive finite prices, unique ISO dates, explicit missing values `.`, ordering, and candidate weekday gaps. Without an official US market calendar, weekday gaps are **not** confirmed missing trading sessions.

This tool does not download quotes, modify the website, or authorize redistribution. Keep original data off the public GitHub repository and use `.local/` for the report.
