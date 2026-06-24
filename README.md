# FEAST Trainer

Aplikacja mobilna (Android, React Native + Expo + TypeScript) do treningu przed testami
**FEAST** (selekcja kontrolerów ruchu lotniczego). W pełni **offline**, bez backendu.
Pełna specyfikacja zadań, architektury i kamieni milowych: [`SPEC.md`](./SPEC.md).

> Aplikacja nie jest powiązana z Eurocontrol ani PAŻP i nie odtwarza materiałów
> egzaminacyjnych — generuje własne, podobne zadania treningowe.

---

## Stan: kamień milowy **M0 — szkielet** ✅

Zrealizowane w M0:

- Projekt **Expo (SDK 56) + TypeScript** z nawigacją **expo-router** i motywem **jasny/ciemny**
  (automatycznie wg ustawień systemu).
- **Ekran główny (Home)** z kafelkami 4 modułów, skrótem do statystyk i przyciskiem
  „Trening demo".
- Warstwa zapisu w **AsyncStorage** (model `ExerciseResult`) przez `zustand` + `persist`
  (offline-first).
- Wspólny komponent **`ExerciseRunner`**: licznik czasu na pytanie, prezentacja zadania,
  obsługa odpowiedzi **multiple-choice** i **wpisu liczbowego**, feedback (kolor + haptyka,
  bez kary za błąd), scoring (trafność + tempo) oraz **ekran wyniku** z porównaniem do rekordu.
- Jedno **dummy-ćwiczenie** (`demo-arith`) spinające pełny przepływ:
  **Home → ćwiczenie → wynik → statystyki**.
- Generator zadań jako **czysta funkcja** (`src/exercises/dummy/generate.ts`),
  deterministyczna przy seedzie, z **testami** (m.in. „poprawna odpowiedź zawsze dokładnie jedna").

Kolejne moduły (matematyka, reakcja, przestrzenne, pamięć/radar) dodajemy w M1–M5 — patrz `SPEC.md`.

---

## Jak uruchomić na telefonie (Expo Go)

1. Zainstaluj **Node.js LTS** na komputerze.
2. W folderze projektu zainstaluj zależności:
   ```bash
   npm install
   ```
3. Uruchom serwer deweloperski:
   ```bash
   npx expo start
   ```
4. Na telefonie z Androidem zainstaluj aplikację **Expo Go** (Google Play).
5. Zeskanuj **kod QR** z terminala aplikacją Expo Go (telefon i komputer muszą być
   w tej samej sieci Wi-Fi). Aplikacja uruchomi się na żywo; zmiany w kodzie
   przeładowują się automatycznie (hot reload).

> Brak Wi-Fi współdzielonego? Uruchom z tunelem: `npx expo start --tunnel`.

---

## Samodzielna aplikacja na telefonie (APK, **bez** Expo Go)

Jeśli chcesz **prawdziwą ikonę aplikacji** na pulpicie i odpalać ją bez Expo Go i bez
skanowania QR — zbuduj instalowalny **APK**. Apka jest w pełni offline, więc taki plik
działa całkowicie samodzielnie.

### Wariant A — EAS Build (chmura, zalecane, bez Android Studio)

Potrzebujesz tylko darmowego konta Expo (https://expo.dev/signup).

```bash
# 1) jednorazowo: zainstaluj eas-cli i zaloguj się
npm install -g eas-cli
eas login

# 2) jednorazowo: powiąż projekt z Twoim kontem (zapisze projectId do app.json)
eas init

# 3) zbuduj instalowalny APK (profil "preview")
eas build -p android --profile preview
```

Po kilku minutach EAS pokaże **link do pobrania APK** (i kod QR). Otwórz link na telefonie,
pobierz `.apk`, uruchom go i potwierdź **„Instaluj z nieznanych źródeł"**. Gotowe — masz
ikonę „FEAST Trainer" i wchodzisz do aplikacji jednym dotknięciem.

> Kolejne wersje: podnieś `android.versionCode` w `app.json` (1 → 2 → …) i zbuduj ponownie.

### Wariant B — build lokalny (bez konta, ale wymaga Android Studio + JDK)

Z telefonem podłączonym przez USB (włączone *debugowanie USB*) **lub** emulatorem:

```bash
npx expo run:android --variant release
```

To skompiluje i zainstaluje aplikację bezpośrednio na urządzeniu. Wymaga zainstalowanego
**Android Studio** (Android SDK + Java). Pierwsze uruchomienie wygeneruje folder `android/`.

> Zalecenie: dla wygody użyj wariantu A (chmura) — nie wymaga konfigurowania Android Studio.

Konfiguracja profili budowania jest w [`eas.json`](./eas.json) (`preview` = APK do instalacji,
`production` = AAB do Google Play).

---

## Skrypty

| Polecenie           | Opis                                            |
| ------------------- | ----------------------------------------------- |
| `npm start`         | Uruchamia serwer deweloperski Expo (`expo start`). |
| `npm run android`   | Otwiera na podłączonym urządzeniu/emulatorze Android. |
| `npm run typecheck` | Sprawdzenie typów (`tsc --noEmit`).             |
| `npm test`          | Testy jednostkowe czystej logiki (`jest`).      |

---

## Struktura projektu

```
src/
  app/                      # ekrany (expo-router)
    _layout.tsx             # Stack + motyw nawigacji (jasny/ciemny)
    index.tsx               # Home: kafelki modułów + skrót do statystyk
    module/[id].tsx         # lista ćwiczeń modułu + najlepsze wyniki
    exercise/[id].tsx       # uruchamia ExerciseRunner dla danego ćwiczenia
    stats.tsx               # statystyki i postępy
  exercises/
    dummy/generate.ts       # czysty generator (deterministyczny przy seedzie) + test
  runner/
    ExerciseRunner.tsx      # wspólny shell: timer, input, feedback, scoring, wynik
    scoring.ts              # czysta logika punktacji (+ test)
  core/
    rng.ts                  # seedowany RNG (mulberry32) + helpery (+ test)
    id.ts                   # generator id rekordów
  store/
    results.ts              # zustand + persist (AsyncStorage)
    selectors.ts            # czyste derywacje (rekord, statystyki) (+ test)
  data/
    registry.ts             # rejestr modułów i ćwiczeń (metadane + generatory)
  ui/                       # Screen, Card, PrimaryButton, TimerBar, Stat
  constants/theme.ts        # kolory (jasny/ciemny), odstępy, typografia
  hooks/                    # use-color-scheme, use-theme
  types.ts                  # wspólne typy (ExerciseResult, GeneratedItem, ...)
```

### Zasady jakości (ze `SPEC.md`)
- Generatory zadań to **czyste funkcje** w TS — deterministyczne przy seedzie, łatwe do testów.
- Wspólny **Runner** (DRY) dla wszystkich ćwiczeń.
- Wszystko **offline**, bez backendu.
- Trening **zawsze na czas**; **brak kary** za błędną odpowiedź (lepiej zgadnąć niż zostawić puste).

---

## Testy

Testowana jest cała logika niezależna od UI (generatory, RNG, scoring, selektory) —
uruchamiana w czystym Node przez `ts-jest`:

```bash
npm test
```
