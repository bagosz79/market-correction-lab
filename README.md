# Market Correction Lab — MVP 0.1

**Status: pierwsza demonstracyjna wersja działa na GitHub Pages. Kod Python, testy i proces BLS są dodane; automatyczne publikacje wymagają ustawienia Pages Source na GitHub Actions.**

Standalone Polish-language, mobile-responsive, no-framework market-correction research dashboard. Independent of GoldBot and TSCC. The initial series on first launch is **DETERMINISTIC SYNTHETIC DATA** and is prominently marked as such. There is no API key in the frontend, no hidden external script and no trading functionality.

## What works today

- Open `web/index.html` locally with a browser; synthetic demo works without a server or internet.
- Load your own daily closing-price CSV (`Date,Close[,Volume]`), e.g. a CSV file you lawfully downloaded yourself. Nothing is uploaded by the page.
- Identify peak-to-trough price declines of at least 5%, recovery dates or unrecovered episodes, and categorize 5–10%, 10–20%, >=20% episodes.
- Draw interactive price and drawdown charts with period controls, show episode table and count corrections >=10%.
- Evaluate research-only conditions for **RSI(14), drawdown, RVOL(20), VIX, bearish AAII, Put/Call** using only supplied observations. Missing data remain `BRAK DANYCH`.
- Import supplementary `VIX`, `AAII` and `Put/Call` CSV files. AAII requires `published_at`, not the earlier `week_ending` value, to avoid look-ahead.
- Display the **single officially verified AAII sentiment reading** for the week ending November 4, 2026 (34.1% bullish, 17.5% neutral, 48.4% bearish). It is **not** mistaken for a complete AAII time series and is not automatically used in historical signals.
- Run `python scripts/build_site.py --out dist` to assemble a static site and status; optionally fetch the **US unemployment rate** from public BLS API v1 using `--fetch-bls`.
- GitHub Actions uruchamia testy, aktualizuje publiczny snapshot BLS i publikuje stronę. Przed pierwszym wdrożeniem z pipeline zmień Pages → Source na **GitHub Actions**. Harmonogram w dni robocze 23:17 UTC.

## What does not work yet (do not mistake it for live features)

- **Strona demo działa** pod https://bagosz79.github.io/market-correction-lab/. Automatyczny data pipeline musi być najpierw pomyślnie wdrożony z GitHub Actions.
- **No live Nasdaq / S&P 500 / Dow Jones prices in the published default build**. The app initially shows synthetic data; real analysis requires CSV import or a separately authorized feed.
- No automatic AAII scraping, no full AAII 1987+ history, no public FinancialJuice feed and no verified reverse-engineering of the proprietary WiśniewskiFX "Kapitulacja" formula.
- No backtest edge, probabilities of a reversal, intraday volume profile or automatic buy/sell signals.
- No R2 cloud bucket, user authentication or secure server-side dataset upload in MVP 0.1.
- BLS is a **monthly macro indicator**, **not** a component of the six capitulation signals. The BLS API may be unavailable; on failure no fabricated values are shown.
- Initial import data only live in current browser memory. A page refresh clears them. The page does not persist CSV to C: or upload anything to GitHub.

## Start on Windows

1. Unzip the project on `D:\AI Projects\Market-Correction-Lab` (or another drive).
2. Double-click `web\index.html` to inspect the demo.
3. Click **Importuj ceny CSV** to load real data. This changes the banner from synthetic demo to user-supplied source.
4. In **Źródła danych**, optionally add VIX, AAII or Put/Call CSVs; review how many of six signals can be computed.

CSV price example (fictitious values showing the format only):

```csv
Date,Close,Volume
2026-11-02,24120.50,520300
2026-11-03,23980.10,608200
2026-11-04,23560.00,701050
```

Supported aliases: FRED `DATE,NASDAQ100`, `DATE,SP500`, Yahoo-style `Date,Close,Volume`, `Date,Adj Close` and other variants. Date must be ISO `YYYY-MM-DD`. FRED observations explicitly marked `.` are skipped (never interpolated); other invalid prices are rejected.

Additional files:

```csv
Date,VIX
2026-11-04,19.2
```

```csv
published_at,bullish,neutral,bearish
2026-11-05,34.1,17.5,48.4
```

```csv
Date,ratio
2026-11-04,1.18
```

**All three CSV snippets above are examples of import formatting.** For AAII, values are publicly sourced from the verified November 4, 2026 survey and published on November 5. VIX and price and PCR values in snippets are fictitious.

## Tests and offline site build

From project root:

```bash
python -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/*.test.cjs
python scripts/build_site.py --out dist
```

No external Python packages are needed for the build. Node.js 22 and Python 3.12 are installed by GitHub Actions. To preview `dist` with a local HTTP server:

```bash
python -m http.server 8000 --directory dist
```

Then open <http://localhost:8000> in the browser.

## GitHub Pages deployment — do once

1. Create **a new public GitHub repo** called `market-correction-lab` (or any name) in your GitHub UI.
2. Upload the CONTENTS of this project directory as the repository root, including hidden folder `.github/workflows/pages.yml`. If you use the web upload interface, verify the `.github` directory is included; GitHub Desktop / Git are more reliable for folder uploads.
3. Repository **Settings → Pages → Build and deployment → Source = GitHub Actions**.
4. Verify **Actions → Market Correction Lab · Tests and Pages** has succeeded.
5. Website URL will normally be `https://<github-username>.github.io/<repository-name>/` after the deployment succeeds (not before).

Expected schedule: `23:17 UTC` Monday–Friday; schedule execution is **not guaranteed to be precise** by GitHub. At each build, it **tries** to refresh the BLS monthly series. It does **not** automatically refresh market prices.

**Public GitHub Pages sites are public even if the hosting repo is private.** Do not place proprietary data, secrets or personal data under `web/` or publish them with the deployment artifact.

## Optional legally authorized market data on published pages

`python scripts/build_site.py --market-csv /path/to/authorized.csv --symbol NDX`

The script deliberately refuses to publish prices unless `MCL_PUBLISH_MARKET_DATA=YES` is set. This is an explicit gate after *you* verify you possess distribution rights. We have **not** assumed FRED/Nasdaq third-party data can be redistributed through GitHub Pages. The default GitHub Actions workflow does not call `--market-csv`.

This opt-in is for a later license-approved build, not a recommendation to change the current default.

## Methodology

- Episode begins at a running all-time high **within available input history**, using only daily closes. The highest previous close is the drawdown peak; subsequent lower prices form the descent.
- Trough is the lowest daily close before first recovery to **at least** the prior peak close; recovery is **not** presumed before it occurs. Price may temporarily rebound before recovery; this is still one episode.
- Only episodes reaching at least 5% down are listed. Final depth determines classification: 5–<10% = pullback, 10–<20% = correction, >=20% = deep decline / *bear market territory* (not an official dating determination).
- `fallSessions = trough index - peak index`; `recoverySessions = recovery index - trough index`; missing recovery explicitly indicated. Trading sessions are counted from observed dates without filling holidays or weekends.
- RSI(14) uses Wilder's smoothing; RVOL(20) uses *the previous 20 sessions*, excluding the current day.
- Capitulation thresholds are research hypotheses only: RSI <=30, drawdown <= -10%, RVOL >=2, VIX >=30, AAII bearish >=50%, Put/Call >=1.2. **Not calibrated or validated**. 4/6 is NOT 66.7% chance of a rebound.
- VIX and Put/Call use last observation on/before price date if <=4 calendar days old. AAII uses **publication date**, not week ending; max age 14 days. No values newer than the analysis date are accessed.
- Daily-close market series are not identical to intraday highs/lows; without OHLC, actual intraday depth cannot be measured. Using limited history can miss earlier peaks.
- No interpolation of missing closes or forecast/backtest results; missing inputs are shown as unavailable.

## Source & licensing audit (November 6, 2026)

| Provider | Evidence | Use in MVP | Limits / rights |
|---|---|---|---|
| FRED Nasdaq 100 | https://fred.stlouisfed.org/series/NASDAQ100 | **Manual user CSV import only**, pending legal review | Series explicitly warns Nasdaq owns data and says to review copyright before sharing. |
| FRED legal terms | https://fred.stlouisfed.org/legal/terms/ and https://fred.stlouisfed.org/docs/api/terms_of_use.html | Governance | API access does not convey third-party redistribution rights. API typically needs a free key; not embedded. |
| AAII | https://www.aaii.com/sentimentsurvey | Single public verified weekly snapshot | Full multi-decade archive promoted as members-only. We do not bulk scrape or claim permission for republishing a historical database. |
| BLS | https://www.bls.gov/developers/ | Optional scheduled unemployment rate via v1 API | API without registration. Monthly data, possibly delayed/revised; failures are visible and no fallback value invented. |
| Cboe VIX | https://www.cboe.com/tradable-products/vix/vix-historical-data | Manual CSV import | Public historical downloads exist, but no blanket permission to redistribute. |
| FinancialJuice | https://www.financialjuice.com/home | No feed; UX inspiration only | No unattended scraping or republishing without appropriate authorization. |
| WiśniewskiFX | https://wisniewskifx.com/rynek-k7q2/#META | Inspiration only | Proprietary capitulation algorithm was not verified or reproduced. |

## Development next steps

1. Create and deploy GitHub repo through the owner's UI; verify first workflow and real Pages URL.
2. Connect a market data provider that permits scheduled use and the desired display/distribution model. Do not enable Nasdaq redistribution until rights established.
3. Expand official public AAII observations *only within allowed use*, log publication date, build provenance record with hashes and update timestamps.
4. Implement event-study / walk-forward analysis for research signals with no look-ahead, stable indicator revisions and point-in-time data.
5. Optionally move licensed private histories to Cloudflare R2 with access control, not a public R2 bucket. No TSCC/GoldBot integration in MVP.

## Next deployment step

1. Open Settings → Pages and change Source from `Deploy from a branch` to `GitHub Actions`.
2. Go to Actions → `Market Correction Lab - Test, refresh data and publish` and run it manually if necessary.
3. Confirm a successful deployment and check `data/status.json` for BLS source health; it may show `failed` or `stale` if the free BLS endpoint was unavailable.
4. The dashboard still shows **synthetic** price data unless you import a lawful price CSV. BLS is monthly macro context, not a live index feed or capitulation signal.
