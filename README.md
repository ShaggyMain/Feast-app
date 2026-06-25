# FEAST Trainer

Aplikacja mobilna (Android, React Native + Expo + TypeScript) do treningu przed testami
**FEAST** (selekcja kontrolerów ruchu lotniczego). W pełni **offline**, bez backendu.
Pełna specyfikacja zadań, architektury i kamieni milowych: [`SPEC.md`](./SPEC.md).

> Aplikacja nie jest powiązana z Eurocontrol ani PAŻP i nie odtwarza materiałów
> egzaminacyjnych — generuje własne, podobne zadania treningowe.

---

## Stan: **M0 — szkielet** ✅ · **M1 — moduł matematyczny** ✅

**M0 (szkielet):** Expo (SDK 56) + TypeScript, `expo-router`, motyw jasny/ciemny, ekran Home,
warstwa AsyncStorage (`ExerciseResult`) przez `zustand` + `persist`, wspólny `ExerciseRunner`
(licznik czasu, multiple-choice + wpis liczbowy, feedback kolor/haptyka bez kary za błąd,
scoring trafność + tempo, ekran wyniku).

**M1 (Moduł 1 — Matematyka pod czas):** cztery ćwiczenia jako czyste, deterministyczne
generatory z testami:

- **1.1 Działania w pamięci** (`math-arith`) — +, −, ×, ÷; poziomy trudności, na trudnym łańcuchy.
- **1.2 Prędkość · dystans · czas** (`math-vst`) — przeliczenia v–s–t, **wpis liczbowy**,
  prędkości dające całkowite km/min.
- **1.3 Procenty i proporcje** (`math-percent`) — X% z N oraz ułamki, zawsze całkowity wynik.
- **1.4 Kursy i kąty** (`math-heading`) — skręty L/P i kursy przeciwne na róży 0–360°,
  z **kompasem (SVG)**; dystraktor „zły kierunek".

Dodatkowo w M1: **poziomy trudności** (Łatwy/Średni/Trudny) z ekranem startowym ćwiczenia,
**ekran Ustawień** (domyślny poziom, haptyka), odświeżony **wygląd** (typografia, kafelki
z akcentem modułu, segmentowany wybór poziomu) i rekordy liczone per poziom.

**Różnorodność sesji** (`runner/session.ts`): zadania generowane proceduralnie są dodatkowo
budowane w sesję tak, by **nie powtarzały się** (deduplikacja promptów w oknie) i by **typy
były równoważone** (np. bez serii ośmiu mnożeń pod rząd). Między sesjami losowy seed daje inne
zestawy. Każde zadanie ma `category`, a balans pilnuje rozkładu.

**Tryb „tylko jedno działanie"** (1.1): na ekranie startowym można wybrać `Wszystkie / + / − / × / ÷`
(mechanizm `ExerciseDef.variant`, ogólny — przyda się też w kolejnych modułach).
**Dźwięk** (opcja w Ustawieniach, domyślnie wył.): krótkie sygnały przy poprawnej/błędnej
odpowiedzi przez `expo-audio`; pliki WAV syntezowane lokalnie (offline, `core/sound.ts`).

**M2 (Moduł 4 — Reakcja + serie liczbowe):**
- **4.1 Czas reakcji** (`react-simple`) — czekaj na zielony, dotknij jak najszybciej; pomiar ms,
  wykrywanie falstartu (własny komponent `reaction/ReactionExercise`).
- **4.2 Reakcja z wyborem / go-no-go** (`react-gonogo`) — reaguj na GO, wstrzymaj na STOP;
  trafienia, fałszywe alarmy, pominięcia.
- **4.3 Serie liczbowe** (`series`) — rozpoznaj regułę i podaj kolejny element. Rodziny reguł:
  arytmetyczna, geometryczna, druga różnica, naprzemienna, Fibonacci, kwadraty, sześciany
  (różnorodność „z definicji”).

Dodatkowo: **onboarding** (krótko o FEAST + strategie, pokazywany przy pierwszym uruchomieniu),
osobny **dźwięk „czas minął"**, oraz **własna ikona i splash** (granatowy kompas/radar,
generowane z SVG).

**Dopracowania M2:** reakcja (4.1/4.2) i serie (4.3) mają teraz **poziomy trudności** — w go/no-go
krótsze okna/ISI i więcej prób, w czasie reakcji krótszy deadline (zbyt wolno = pominięcie),
w seriach **dłuższe ciągi** na wyższym poziomie. Serie mają też **wybór typu** (Wszystkie /
Arytmetyczne / Geometryczne / Kwadraty), analogicznie do trybu jednego działania w 1.1.

Kolejne moduły (przestrzenne, pamięć/radar) dodajemy w M3–M5 — patrz `SPEC.md`.

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
    index.tsx               # Home: hero, szybki trening, kafelki modułów
    module/[id].tsx         # lista ćwiczeń modułu + najlepsze wyniki
    exercise/[id].tsx       # uruchamia ExerciseRunner dla danego ćwiczenia
    stats.tsx               # statystyki i postępy
    settings.tsx            # domyślny poziom, haptyka
  exercises/
    _shared/choices.ts      # budowa opcji MC (dokładnie jedna poprawna)
    math/arith.ts           # 1.1 działania w pamięci
    math/vst.ts             # 1.2 prędkość–dystans–czas (wpis liczbowy)
    math/percent.ts         # 1.3 procenty i proporcje
    math/heading.ts         # 1.4 kursy i kąty (+ kompas)
    math/generators.test.ts # testy 4 generatorów (×3 poziomy)
  runner/
    ExerciseRunner.tsx      # wspólny shell: intro+poziom, timer, input, wynik
    scoring.ts              # czysta logika punktacji (+ test)
  core/
    rng.ts                  # seedowany RNG (mulberry32) + helpery (+ test)
    id.ts                   # generator id rekordów
  store/
    results.ts              # zustand + persist (AsyncStorage)
    settings.ts             # preferencje (poziom, haptyka)
    selectors.ts            # czyste derywacje (rekord per poziom, statystyki) (+ test)
  data/
    registry.ts             # rejestr modułów i ćwiczeń (metadane + generatory)
  ui/                       # Screen, Card, PrimaryButton, TimerBar, Stat,
                            # Text, SegmentedControl, Figure (kompas SVG)
  constants/theme.ts        # kolory (jasny/ciemny), odstępy, typografia
  hooks/                    # use-color-scheme, use-theme
  types.ts                  # wspólne typy (ExerciseResult, GeneratedItem, Difficulty, ...)
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
