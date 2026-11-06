# NDX — prywatny pobór dziennych zamknięć (Data Engine 0.2)

**Status:** skrypt i testy przygotowane. Nie pobrano rzeczywistej serii, ponieważ klucz FRED musi należeć do użytkownika.

**Źródło:** [FRED NASDAQ100](https://fred.stlouisfed.org/series/NASDAQ100) — Nasdaq, Inc. (prawa autorskie Nasdaq). Wartości dziennych zamknięć, bez OHLC i bez wolumenu. API: https://fred.stlouisfed.org/docs/api/fred/series_observations.html.

## Wykonanie lokalne na Windows / dysk D:

1. W https://fredaccount.stlouisfed.org/ utwórz własny klucz API i **nie publikuj go w repo ani w czacie**.
2. Otwórz PowerShell w folderze repozytorium i wpisz:

```powershell
$env:FRED_API_KEY = 'TWÓJ_OSOBISTY_KLUCZ_FRED'
python scripts/fetch_fred_personal.py --out "D:\\MarketData\\NDX.csv"
Remove-Item Env:FRED_API_KEY
```

3. Zaimportuj `D:\\MarketData\\NDX.csv` przez przycisk **Importuj ceny CSV** na https://bagosz79.github.io/market-correction-lab/.

Plik `D:\\MarketData\\NDX.meta.json` opisuje pochodzenie, zakres dat, puste wartości i podejrzane dzienne zmiany >25%. Ceny nie zostaną przesłane na GitHub przez tę aplikację. Możesz również zapisać plik w `.private/`, który jest ignorowany przez Git.

## Ograniczenia

- FRED wymaga osobistego klucza API. GitHub Pages nie może ukryć klucza w frontendzie.
- Historia NDX objęta jest prawami Nasdaq. Oprogramowanie nie udziela pozwolenia na dalszą redystrybucję.
- Brak wolumenu NDX oznacza brak prawdziwego RVOL; brak OHLC oznacza brak sygnałów wymagających high/low.
- Nie pobieramy danych w GitHub Actions ani nie umieszczamy ich w publicznym `data/market.json`.
- Testy korzystają z fikcyjnych danych jednostkowych, nie dowodzą połączenia z API.
- Druga seria, `VXNCLS` (Cboe Nasdaq-100 Volatility Index), będzie osobnym kolejnym krokiem.
