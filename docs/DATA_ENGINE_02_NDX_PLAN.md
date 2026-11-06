# Data Engine 0.2 — NDX: kontrakt danych i plan odbioru

**Status:** zaplanowane; **NDX live/historical feed nie jest wdrożony.**  
**Projekt:** Market Correction Lab (niezależny od TSCC/GoldBot).  
**Zasada:** bez fikcyjnych odczytów, niepotwierdzonych źródeł, niejawnych progów i look-ahead.

## 1. Ustalenia potwierdzone (2026-11-06)

- Działają GitHub Pages i GitHub Actions; istnieje odrębna aktualizacja miesięcznej serii BLS USA.
- Publiczny frontend obecnie używa **danych syntetycznych** do demonstracji korekt, dopóki użytkownik nie zaimportuje CSV.
- Oficjalny FRED NASDAQ100 udostępnia dzienne **wartości zamknięcia** od 1986-01-02. Nie jest to feed OHLCV ani wolumen składników indeksu.
- FRED wskazuje Nasdaq jako autora danych i stosuje ograniczenia praw do danych oznaczonych copyright. Brak automatycznego prawa do publikacji pełnego archiwum w publicznym repozytorium.
- Na zrzutach WiśniewskiFX widać klasyfikację faz, metryki Stress Score / Bottom Score, statystyki historycznych korekt oraz walidację walk-forward (Brier i punkt odniesienia). **Nie zweryfikowano ani kodu autora, ani reguł generowania tych wyników.**
- Publiczny adres `https://wisniewskifx.com/rynek-k7q2/data.json` został podany, ale nie udało się odczytać zawartości w naszym środowisku. Dostęp w przeglądarce użytkownika nie oznacza prawa do redystrybucji. Wymagane są plik lub struktura, zanim opiszemy jego pola.

Źródła: https://fred.stlouisfed.org/data/NASDAQ100 ; https://fred.stlouisfed.org/legal/terms/ ; https://wisniewskifx.com/rynek-k7q2/#NDX

## 2. Minimalny kontrakt danych NDX (MVP 0.2.1)

Wejście do prywatnej analizy: CSV `DATE,NASDAQ100` (FRED) albo `Date,Close` (własny uprawniony feed). Wolumen indeksu **nie jest** wymagany i nie wolno go zgadywać. Na tym etapie badamy wyłącznie dzienne zamknięcia.

Pola kanoniczne obliczeń:

| Pole | Typ | Reguła |
|---|---|---|
| `date` | ISO `YYYY-MM-DD` | jednoznaczna data sesji w USA, bez duplikatów |
| `close` | float, > 0 | brak NaN, Infinity, zero, wartości ujemnych |
| `symbol` | string | `NDX`, z potwierdzoną mapą źródła |
| `source` | string | dostawca i oryginalny symbol |
| `frequency` | string | `1d_close` |
| `fetched_at` | timestamp | czas pobrania, **nie** czas sesji |
| `license_status` | enum | `personal_only`, `redistribution_approved`, `unknown` |

Kontrola jakości:
1. Odrzucić niepoprawne daty, duplikaty i niepoprawne liczby.
2. Zachować jawne braki źródłowe (`.`, puste); nigdy nie interpolować.
3. Raportować zakres dat, liczbę obserwacji, liczbę braków i luki między datami.
4. Luki w dni robocze są tylko **kandydatami do sprawdzenia** — bez kalendarza sesji USA nie uznajemy automatycznie świąt za braki.
5. Rozdzielać datę obserwacji, datę publikacji/pozyskania oraz zakres użycia licencyjnego.
6. Nie commitować surowych cen NDX do publicznego repo bez potwierdzonych praw.

## 3. Oddzielne warstwy

**A. Publiczny wykres:** tylko oficjalny embed/widget na warunkach dostawcy, bez eksfiltracji jego danych.  
**B. Prywatne badanie historii:** import uprawnionego CSV w przeglądarce. Dane nie trafiają automatycznie do GitHub.  
**C. Własne wskaźniki:** korekty i stany wyliczamy z warstwy B; wyniki opisane z okresem i liczbą próbek.  
**D. Potencjalne publiczne sygnały:** dopiero po osobnym sprawdzeniu praw do pochodnych danych i wyświetlania.

## 4. Minimalne definicje do testów, zanim użyjemy nazw faz

- Drawdown w dniu t: `close[t] / max(close[0:t]) - 1`. Historia kończy się w t.
- Epizod: szczyt zamknięcia, kolejne dno, powrót do wcześniejszego maksimum lub epizod nadal otwarty.
- Klasyfikacja opisowa: 5–<10% cofnięcie, 10–<20% korekta, >=20% głęboki spadek.
- Niezależnie liczyć: sesje od szczytu do dna; sesje od dna do powrotu; aktualny spadek.
- Faza `kapitulacja` **nie może** wynikać jedynie z faktu, że już znamy przyszłe dno.
- Oznaczenia „±5 sesji wokół dna” są retrospektywne, nie sygnałami dostępnymi w czasie rzeczywistym.
- Wynik `Bottom Score` nie jest procentowym prawdopodobieństwem bez odpowiedniej kalibracji.

## 5. Warunki odbioru NDX 0.2.1

- [ ] Import FRED `DATE,NASDAQ100` (w tym jawne `.`) działa bez wolumenu.
- [ ] Testy: szczyt → spadek → dno → powrót, epizod bez powrotu, duplikat, pusta wartość, zła data, wartość ujemna.
- [ ] Raport braków i metadanych: zakres, pokrycie, brakujące obserwacje, data ostatniej sesji, pochodzenie.
- [ ] Interfejs wyraźnie rozróżnia `DEMO` / `IMPORT PRYWATNY` / `AUTORYZOWANE DANE PUBLICZNE`.
- [ ] Żaden proces GitHub Actions nie publikuje historii cen NDX bez osobnego zatwierdzenia praw i konfiguracji.
- [ ] Kalkulacje Pythona i JavaScript dają takie same wartości dla identycznego zestawu testów.

## 6. Następne prace (po jednym kroku)

1. Zbudować i przetestować **raport kontroli jakości NDX CSV** (bez publikowania cen).
2. Na jednym uprawnionym CSV wykonać analizę korekt i porównać daty/szczyty z niezależnym źródłem.
3. Dopiero potem wyznaczyć jawne warunki kapitulacji dla NDX z dostępnych danych oraz uwzględnić VXN osobno od VIX.
4. Dalej: AAII / market breadth / walidacja walk-forward — żadnych wyników „skuteczności” bez kontroli liczby epizodów i porównania z baseline.
5. Opcjonalny audyt publicznego `data.json` **po przesłaniu pliku przez użytkownika**: badanie schematu/metod, bez kopiowania zbioru do repo.

**Nieobecne na dziś:** licencjonowany serwerowy feed NDX, kompletne dane wolumenowe, autorska metodologia WiśniewskiFX, zwalidowane prawdopodobieństwa dołka.
