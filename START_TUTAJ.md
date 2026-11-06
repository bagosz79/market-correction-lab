# MARKET CORRECTION LAB — START (6 listopada 2026)

**To jest pierwsza działająca wersja lokalna, a nie opublikowana strona GitHub Pages.**

## Uruchom teraz

1. Rozpakuj ZIP np. do `D:\AI Projects\Market-Correction-Lab`.
2. Otwórz w przeglądarce plik `web\index.html` lub dołączony oddzielnie, pojedynczy `Market_Correction_Lab_MVP_0_1.html`.
3. Domyślnie zobaczysz **DEMO z syntetycznymi cenami** — wyraźnie oznaczone. Nie są to prawdziwe notowania ani wyniki backtestu.
4. Kliknij **Importuj ceny CSV** i wskaż prawdziwy plik `Date,Close,Volume` (wolumen opcjonalny). Dane analizowane są wyłącznie w przeglądarce, bez wysyłania do zewnętrznego serwera.
5. Na karcie **Źródła danych** możesz dodać osobne pliki VIX, AAII i Put/Call. Jeśli ich brak, sygnały mają status **BRAK DANYCH**.

## Co działa

- Interaktywna historia ceny i drawdown, filtry 6M/1Y/3Y/MAX.
- Wyznaczanie korekt ≥10%, cofnięć ≥5%, głębszych spadków ≥20%, dna, długości i daty powrotu do szczytu.
- Kapitulacja: 6 jawnych warunków (RSI, Drawdown, RVOL, VIX, AAII, Put/Call). **Progi robocze, niezweryfikowane historycznie**.
- Jeden potwierdzony, publiczny odczyt AAII, nie pełna historia.
- Testy automatyczne, budowanie strony oraz workflow GitHub Actions. Próba pobrania danych o bezrobociu z darmowego API BLS podczas harmonogramu.

## Co jeszcze nie działa

- **Brak publicznego adresu GitHub Pages** — nie ma jeszcze repozytorium.
- Nie ma automatycznego pobierania realnego NDX (nie zakładamy prawa do publicznego rozpowszechniania danych Nasdaq).
- Nie ma kompletnej historii AAII ani automatycznego pobierania FinancialJuice.
- GitHub Actions i odświeżanie BLS **nie są uruchomione w chmurze**, dopóki repozytorium nie powstanie. Dostępność API BLS nie została potwierdzona udanym pobraniem w tej sesji.
- Lokalnie importowane CSV nie są zapisywane w chmurze. Odświeżenie strony wymaga ponownego importu.
- Strona nie wykonuje transakcji ani nie oblicza prawdopodobieństwa odbicia.

## Jak udostępnić online przez GitHub

1. Utwórz na swoim koncie GitHub publiczne repozytorium **market-correction-lab**. Nie dodawaj osobnego README podczas tworzenia, ponieważ paczka już go zawiera.
2. Wgraj wszystkie pliki z katalogu projektu do głównego katalogu repozytorium, łącznie z ukrytym folderem `.github`. Możesz użyć GitHub Desktop lub poleceń Git.
3. W repozytorium wybierz **Settings → Pages → Source → GitHub Actions**.
4. W zakładce **Actions** sprawdź wykonanie workflow `Market Correction Lab · Tests and Pages`.
5. Po udanym wdrożeniu sprawdź adres w stylu `https://TWOJ-LOGIN.github.io/market-correction-lab/` (nie jest jeszcze aktywny).

Dane nie muszą znajdować się na C:. Repozytorium i uruchomienia Actions są w chmurze. Sam plik można przechowywać np. na D:.

**Kolejny etap:** zweryfikowanie realnego feedu cenowego, którego warunki dopuszczają docelowy sposób wykorzystania i publikacji; dopiero potem włączenie automatycznych aktualizacji indeksów.

Pełne informacje techniczne i źródła: `README.md`.
