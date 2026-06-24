# FEAST Trainer — zadania + plan aplikacji na Androida (do Claude Code)

Dokument ma trzy części:
- **Część A — Zadania (ćwiczenia)** wierne testowi FEAST, dla 4 modułów, z przykładami, regułami generowania i punktacją.
- **Część B — Plan aplikacji** (architektura, ekrany, technologia, kamienie milowe) gotowy do realizacji w Claude Code.
- **Część C — Gotowy prompt** do wklejenia w Claude Code, żeby zacząć budowę.

> Jak tego użyć: zapisz ten plik w nowym folderze projektu jako `SPEC.md`, otwórz folder w Claude Code i wklej prompt z Części C. Claude Code będzie budować aplikację etapami, korzystając ze specyfikacji z tego pliku.

---

## O teście FEAST (skrót potrzebny do projektu)

FEAST (First European Air Traffic Controller Selection Test, Eurocontrol) składa się z:
- **FEAST I** — kilkanaście krótkich, mierzonych na czas modułów poznawczych (matematyka, przestrzenne/3D, serie liczbowe, pamięć, orientacja przestrzenna, angielski). Bez kalkulatora.
- **FEAST II** — część „radarowa": **DART** (sprowadzanie/kierowanie samolotów wg zmiennych reguł, unikanie kolizji) oraz **Multipass** (multitasking — równoległe monitorowanie sygnałów).
- **FEAST III** — kwestionariusz osobowości (poza zakresem tej aplikacji).

Aplikacja pokrywa 4 moduły treningowe:
1. **Matematyka pod czas** (prędkość–odległość–czas, działania, procenty, kursy/kąty).
2. **Wyobraźnia przestrzenna / 3D** (składanie kostki, rotacje, orientacja, współrzędne).
3. **Pamięć robocza + multitasking** (zapamiętywanie, n-back, Multipass, radar/DART).
4. **Czas reakcji + serie liczbowe**.

Zasada przewodnia treningu (i designu UI): **wszystko na czas, liczy się szybkość i dokładność**, brak kary za błędną odpowiedź (lepiej zgadnąć niż zostawić puste), wynik = trafność + tempo.

---

# CZĘŚĆ A — ZADANIA DLA 4 MODUŁÓW

Każde ćwiczenie ma: **cel**, **format**, **reguły generowania** (żeby zadania były losowe i nieskończone), **przykłady**, **czas i punktację**. Wszystkie zadania generowane proceduralnie (nie statyczna lista).

## Moduł 1 — Matematyka pod czas

### 1.1 Działania w pamięci
- **Cel:** szybkie, bezbłędne liczenie bez kalkulatora.
- **Format:** `a op b = ?`, op ∈ {+, −, ×, ÷}. Odpowiedź: 4 opcje (multiple choice) lub wpis liczbowy.
- **Generowanie:** poziomy trudności — łatwy: 2-cyfrowe (+, −, małe ×); średni: 2–3-cyfrowe, wszystkie działania; trudny: 3-cyfrowe, dzielenie bez reszty, łańcuchy `a op b op c`. Dystraktory: wynik ±(1–3 jednostki), wynik z zamianą działania, „ładna" liczba blisko poprawnej.
- **Przykłady:**
  - `47 × 6 = ?` → **282** (dystraktory: 272, 288, 252)
  - `156 ÷ 12 = ?` → **13**
  - `38 + 47 − 19 = ?` → **66**
- **Czas/punktacja:** 12 s na pytanie; sesja = liczba poprawnych w 2 min + średni czas odpowiedzi.

### 1.2 Prędkość – odległość – czas (lotnicze)
- **Cel:** przeliczenia v–s–t pod presją; rdzeń pracy KRL.
- **Format:** dane 2 z 3 wielkości, oblicz trzecią. Wskazówka metodyczna w aplikacji: zamień prędkość na „na minutę".
- **Generowanie:** prędkość dobierana tak, by `v/60` było wygodne (np. 300, 420, 480, 540, 600 km/h → 5/7/8/9/10 km/min); losowo pytaj o dystans, czas lub prędkość. Wersja trudniejsza: prędkości dające ułamki.
- **Przykłady:**
  - „Samolot leci 480 km/h. Dystans w 7 minut?" → **56 km**
  - „600 km/h, ile minut na 150 km?" → **15 min**
  - „Pokonał 84 km w 12 min. Prędkość?" → **420 km/h**
- **Czas/punktacja:** 15 s; trafność + tempo.

### 1.3 Procenty i proporcje
- **Format:** „ile to X% z N", skalowanie proporcji, ułamki.
- **Generowanie:** X ∈ {5,10,15,20,25,50,75}, N podzielne sensownie; trudniejsze: X dowolne.
- **Przykłady:** „15% z 240?" → **36**; „3/8 z 320?" → **120**.
- **Czas:** 15 s.

### 1.4 Kursy i kąty (headings)
- **Cel:** liczenie na kątach 0–360°, łącznik z modułem przestrzennym.
- **Format:** „kurs X°, skręt L/P o Y° → nowy kurs?" oraz „kurs przeciwny do X°?".
- **Generowanie:** X, Y wielokrotności 5–10; obsłuż zawijanie mod 360; reciprocal = (X+180) mod 360.
- **Przykłady:** „Kurs 040°, w prawo o 90° → **130°**"; „Kurs przeciwny do 070° → **250°**".
- **Czas:** 12 s.

---

## Moduł 2 — Wyobraźnia przestrzenna / 3D

### 2.1 Składanie kostki (siatka → sześcian) — KLUCZOWE, najtrudniejsze
- **Cel:** mentalne złożenie siatki 2D w sześcian i wybór poprawnego widoku 3D.
- **Format:** pokaż siatkę (6 ścian z kolorami/symbolami), poniżej 4 sześciany (każdy widoczny z 3 ścianami). Wybierz ten, który powstaje ze złożenia siatki.
- **Reguły generowania (rdzeń całej apki przestrzennej):**
  - Reprezentuj sześcian 6 ścianami z trzema parami przeciwległymi: (góra/dół), (przód/tył), (lewo/prawo); każda ściana = inny kolor lub symbol.
  - Wylosuj jedną z 11 siatek sześcianu (zestaw standardowych „hexomino"). Przypisz etykiety ścian do pól siatki zgodnie z poprawnym złożeniem (dla każdej siatki istnieje znana mapa sąsiedztwa).
  - **Poprawny sześcian:** wyrenderuj izometrycznie 3 wzajemnie sąsiadujące ściany w poprawnym układzie obrotowym (z funkcji sąsiedztwa).
  - **Dystraktory (3):** wprowadź dokładnie jedno naruszenie — (a) pokaż obok siebie dwie ściany przeciwległe (niemożliwe), (b) zły porządek obrotowy 3 widocznych ścian (lustro), (c) podmień jedną widoczną ścianę na nieprzylegającą.
  - Wariant trudniejszy: dodaj strzałki/orientację symboli (liczy się obrót, nie tylko sąsiedztwo).
- **Kluczowa funkcja do zbudowania:** `cubeAdjacency(net) → mapowanie ścian + relacje sąsiedztwa`, używana też w 2.2 i do generowania dystraktorów.
- **Czas/punktacja:** 60 s na pytanie (jak w FEAST); trafność najważniejsza.

### 2.2 Rotacja 3D (mental rotation)
- **Cel:** rozpoznać ten sam obiekt po obrocie (vs odbicie lustrzane / inny).
- **Format:** obiekt-cel (np. układ połączonych klocków albo blok ze strzałką) + 4 opcje; jedna to obrót celu.
- **Generowanie (MVP → zaawansowane):**
  - **MVP (2D):** asymetryczny kształt płaski (np. figura z klocków/tangram) obrócony o 90/180/270°; dystraktory = odbicie lustrzane i błędne obroty.
  - **Zaawansowane (3D):** układ 3–5 sześcianów renderowany izometrycznie/3D; jeden obrót poprawny, reszta to lustro lub inna bryła.
- **Czas:** 30–40 s.

### 2.3 Orientacja przestrzenna (kompas + pozycja)
- **Cel:** określanie kierunku/relacji z perspektywy.
- **Format:** siatka/kompas; pytania: „kierunek z punktu A do B?", „patrzysz na NE, skręcasz w lewo o 90° → kierunek?".
- **Generowanie:** losuj punkty na siatce; kierunek z atan2; relatywny azymut z obrotów. Odpowiedzi: 8 kierunków (N, NE, E, …) lub stopnie.
- **Przykłady:** „Z (2,1) do (5,5)?" → **NE**; „NE, w lewo 90°?" → **NW**.
- **Czas:** 15–20 s.

### 2.4 Układ współrzędnych (radarowo)
- **Cel:** szacowanie kursu i dystansu między punktami (jak w części radarowej).
- **Format:** punkty na płaszczyźnie (samolot, cel); oszacuj kurs (0–360°) i/lub dystans. Multiple choice.
- **Generowanie:** losuj 2 punkty; kurs = bearing, dystans = round(hypot). Dystraktory: ±20–40°, ±1–2 jednostki.
- **Czas:** 20 s.

---

## Moduł 3 — Pamięć robocza + multitasking (radar)

### 3.1 Zapamiętywanie (gauge / kod)
- **Cel:** krótkotrwałe zapamiętanie wartości pod presją.
- **Format:** pokaż 4–6 „wskaźników"/liczb przez 6–10 s → ukryj → krótki dystraktor (np. 1 działanie) → „jaka była wartość wskaźnika #3?" (multiple choice).
- **Generowanie:** losowe wartości; **adaptacyjnie** zwiększaj liczbę elementów po serii trafień (rozpiętość pamięci).
- **Czas:** ekspozycja 6–10 s, odpowiedź 10 s.

### 3.2 N-back
- **Cel:** trening pamięci roboczej.
- **Format:** strumień bodźców (litery lub pozycje na siatce); reaguj, gdy bieżący = ten sprzed N kroków.
- **Generowanie:** sekwencja z kontrolowanym odsetkiem trafień (~30%); poziomy 1-back → 2-back → 3-back (adaptacyjnie).
- **Punktacja:** trafienia / pominięcia / fałszywe alarmy; d-prime opcjonalnie.

### 3.3 Multipass (zadanie podwójne)
- **Cel:** równoległe monitorowanie dwóch kanałów + wykrywanie błędów.
- **Format:** dwa „tory" na ekranie: tor A (reaguj na konkretny cel wizualny, np. zmiana koloru), tor B (druga reguła — kształt/dźwięk). Bodźce pojawiają się niezależnie na timerach; zadanie ciągłe.
- **Generowanie:** niezależne harmonogramy bodźców; mierz trafność pod obciążeniem dwuzadaniowym.
- **Punktacja:** osobno dla każdego toru + łączny koszt podzielności uwagi. (Dźwięk opcjonalnie.)

### 3.4 Radar / DART — flagowe, najbardziej złożone
- **Cel:** świadomość sytuacyjna + priorytetyzacja + unikanie kolizji w czasie rzeczywistym.
- **Format:** ekran radaru; samoloty (kropki z kursem/prędkością) poruszają się po torach do pasa/celu. Reguły (zmienne między scenariuszami):
  - utrzymuj separację — zbyt bliskie samoloty = konflikt;
  - sprowadzaj/kieruj wg aktywnej reguły (np. lądują tylko maszyny poniżej/powyżej danej prędkości; bliższe pierwsze; szybsze pierwsze);
  - gracz dotyka samolotu, by wydać komendę (clear to land / zmień kurs / zmień prędkość).
- **Strategia (pokaż graczowi w samouczku):** najpierw unikanie kolizji, utrzymuj skanowanie całego ekranu, nie fiksuj się na jednym samolocie.
- **MVP → rozbudowa:**
  - **MVP:** 2–3 samoloty, jedna reguła, dotknij = clear to land, kontrola separacji, prosty wynik (udane lądowania, uniknięte konflikty).
  - **Etap 2:** więcej samolotów, zmiana prędkości/kursu, zmienne reguły, rosnące tempo, throughput.
- **Pętla czasu rzeczywistego:** aktualizacja pozycji w pętli animacji; detekcja bliskości (odległość < próg → konflikt); kolejka komend.
- **Punktacja:** udane lądowania, uniknięte konflikty, zgodność z regułą, przepustowość, kary za konflikty.

---

## Moduł 4 — Czas reakcji + serie liczbowe

### 4.1 Prosty czas reakcji
- **Format:** ekran czerwony → po losowym opóźnieniu (1–4 s) zielony; dotknij jak najszybciej; mierz ms. Falstart (dotyk przed zielonym) = błąd, powtórka.
- **Punktacja:** średni i najlepszy czas z N prób (np. 5).

### 4.2 Reakcja z wyborem (choice / go-no-go)
- **Format:** bodziec (kierunek strzałki / kolor); reaguj odpowiednim przyciskiem; lub go/no-go (dotknij na zielony, wstrzymaj na czerwony).
- **Punktacja:** czas reakcji + trafność; mierz fałszywe reakcje w no-go.

### 4.3 Serie liczbowe
- **Cel:** rozpoznanie reguły i podanie kolejnego elementu.
- **Format:** ciąg + „co dalej?" (4 opcje).
- **Generowanie:** typy reguł — arytmetyczna (+d), geometryczna (×r), druga różnica (np. +2,+4,+6…), naprzemienna (dwa przeplatane ciągi), Fibonacci-podobne, kwadraty/sześciany. Dystraktory: kolejny element złej reguły, ±1.
- **Przykłady:** `2, 6, 12, 20, ?` → **30** (różnice +4,+6,+8,+10); `1, 4, 9, 16, ?` → **25** (kwadraty); `3, 9, 27, 81, ?` → **243** (×3).
- **Czas:** 25–30 s.

---

# CZĘŚĆ B — PLAN APLIKACJI (dla Claude Code)

## Wybór technologii: React Native + Expo (TypeScript)

**Dlaczego Expo, a nie natywny Android/Kotlin czy Flutter:**
- Najniższy próg, by **odpalić apkę na Twoim telefonie**: instalujesz „Expo Go" z Google Play, skanujesz kod QR i aplikacja działa od razu na realnym urządzeniu — bez konfigurowania Android Studio/emulatora na start.
- Hot reload (zmiana w kodzie → natychmiast na telefonie), świetny ekosystem, Claude Code bardzo dobrze radzi sobie z RN/Expo.
- Animacje i rysowanie (radar, siatki kostek, kompas) ogarniają `react-native-reanimated` + `react-native-svg`; do wydajnego radaru w czasie rzeczywistym opcjonalnie `@shopify/react-native-skia`.
- Gdy apka będzie gotowa, **EAS Build** generuje instalowalny plik APK na telefon.
- (Alternatywa: **Flutter** — ładniejszy samodzielny APK, ale cięższy w konfiguracji na start. Jeśli wolisz Flutter, ta sama specyfikacja/zadania obowiązują, zmienia się tylko stos.)

## Stos bibliotek
- `expo` + `expo-router` (nawigacja plikowa) lub `@react-navigation/native`
- `react-native-reanimated` (animacje, pętla radaru, wizualizacje reakcji)
- `react-native-svg` (rysowanie: siatki kostek, kompas, siatki współrzędnych, wykresy)
- `@shopify/react-native-skia` (opcjonalnie — wydajny radar w czasie rzeczywistym)
- `@react-native-async-storage/async-storage` (lokalne zapisywanie wyników i ustawień — offline-first)
- `zustand` (proste zarządzanie stanem)
- `expo-haptics` (wibracje przy odpowiedziach), `expo-keep-awake` (ekran nie gaśnie w sesji), `expo-av` (opcjonalny dźwięk do Multipass)
- prosty wykres postępów: własny komponent na `react-native-svg` albo `victory-native`

## Środowisko / setup (kroki dla Claude Code i dla Ciebie)
1. Zainstaluj **Node.js LTS** (i opcjonalnie `git`).
2. `npx create-expo-app feast-trainer -t expo-template-blank-typescript`
3. `cd feast-trainer` → dodaj biblioteki ze stosu wyżej.
4. `npx expo start` → na telefonie zainstaluj **Expo Go**, zeskanuj kod QR (telefon i komputer w tej samej sieci Wi-Fi).
5. Iteruj; na koniec `eas build -p android --profile preview` → APK.

## Architektura i struktura katalogów
```
feast-trainer/
  app/                      # ekrany (expo-router)
    index.tsx               # Home: lista modułów + statystyki ogólne
    module/[id].tsx         # lista ćwiczeń modułu + najlepsze wyniki
    exercise/[id].tsx       # uruchamia konkretne ćwiczenie (shell Runnera)
    results.tsx             # podsumowanie sesji
    progress.tsx            # wykresy postępów
    settings.tsx            # trudność, dźwięk, długość sesji
    onboarding.tsx          # jak działa FEAST + strategie
  src/
    exercises/
      <nazwa>/generate.ts   # czysty generator zadań (deterministyczny przy seedzie)
      <nazwa>/Component.tsx  # UI ćwiczenia (jeśli nietypowe, np. radar)
    runner/ExerciseRunner.tsx # wspólny „shell": timer, input, scoring, wynik
    core/                   # cubeAdjacency, geometry (bearing/dist), rng z seedem
    store/                  # zustand + warstwa AsyncStorage
    ui/                     # przyciski, licznik czasu, motyw (jasny/ciemny)
    types.ts
```

## Model danych i statystyki
- `ExerciseResult { id, module, exercise, date, totalItems, correct, accuracy, avgResponseMs, score }` — lista w AsyncStorage.
- Statystyki: trafność i średni czas per ćwiczenie, wykres w czasie, najlepsze wyniki, passy (streak).
- **Adaptacyjna trudność:** śledź kroczącą trafność per ćwiczenie; po serii trafień podnoś poziom, po serii błędów obniżaj.
- **Tryb egzaminacyjny:** opcja „pełna sesja na czas" łącząca moduły bez przerw (symulacja zmęczenia jak na FEAST).

## Ekrany / nawigacja
- **Home:** kafelki 4 modułów + „dzienny trening" + skrót do statystyk.
- **Moduł:** lista ćwiczeń, najlepszy wynik, przycisk „start".
- **Ćwiczenie (Runner):** licznik czasu, treść zadania, opcje/wpis, feedback, pasek postępu sesji.
- **Wyniki:** trafność, tempo, wynik, porównanie z poprzednim.
- **Postępy:** wykresy per moduł/ćwiczenie.
- **Ustawienia:** poziom, dźwięk/haptyka, długość sesji, jasny/ciemny.
- **Onboarding:** krótko o FEAST + strategie (zwłaszcza radar: „najpierw kolizje, skanuj, nie fiksuj się").

## Kamienie milowe (buduj po kolei)
- **M0 — Szkielet:** projekt Expo + TS, nawigacja, motyw, Home, warstwa AsyncStorage, **shell `ExerciseRunner`** (timer + input + scoring + ekran wyniku) z jednym dummy-ćwiczeniem.
- **M1 — Moduł 1 (matematyka):** ćwiczenia 1.1–1.4 z generatorami, punktacją i wynikami. (Najszybszy realny efekt.)
- **M2 — Moduł 4 (reakcja + serie):** 4.1–4.3 — proste, interaktywne, dobry „szybki sukces" na telefonie.
- **M3 — Moduł 2 (przestrzenne):** najpierw 2.3 i 2.4 (kompas/współrzędne), potem `core/cubeAdjacency` + **2.1 składanie kostki** (najtrudniejsze) i 2.2 rotacja (MVP 2D → 3D).
- **M4 — Moduł 3 (pamięć + multitasking):** 3.1 i 3.2 (pamięć/n-back), potem 3.3 Multipass, na końcu **3.4 Radar/DART** w wersji MVP → rozbudowa.
- **M5 — Statystyki + adaptacja + polish:** ekran postępów z wykresami, adaptacyjna trudność, haptyka/dźwięk, tryb egzaminacyjny, jasny/ciemny.
- **M6 (opcjonalnie) — APK:** konfiguracja EAS Build i instalacja na telefonie.

Zasady jakości dla Claude Code: generatory jako **czyste funkcje** w TS (łatwe do testów), wspólny Runner (DRY), wszystko **offline**, brak backendu, kod w TypeScript, sensowne testy generatorów (np. że poprawna odpowiedź jest zawsze dokładnie jedna).

---

# CZĘŚĆ C — GOTOWY PROMPT DO CLAUDE CODE

Skopiuj poniższy blok do Claude Code (po umieszczeniu tego pliku jako `SPEC.md` w folderze projektu):

```
Zbuduj aplikację mobilną na Androida „FEAST Trainer" do przygotowania się do testów FEAST
(selekcja kontrolerów ruchu lotniczego). Pełna specyfikacja zadań, architektury i kamieni
milowych jest w pliku SPEC.md w tym repo — trzymaj się jej.

Stos: React Native + Expo + TypeScript, expo-router, react-native-reanimated,
react-native-svg, @react-native-async-storage/async-storage, zustand, expo-haptics,
expo-keep-awake. Aplikacja w pełni offline, bez backendu.

Pracuj kamieniami milowymi z SPEC.md (M0 → M6). Na początek zrealizuj M0:
- zainicjuj projekt Expo (TypeScript), nawigację (expo-router) i motyw (jasny/ciemny),
- zrób ekran Home z kafelkami 4 modułów i skrótem do statystyk,
- zaimplementuj warstwę zapisu w AsyncStorage (model ExerciseResult ze SPEC.md),
- zbuduj wspólny komponent ExerciseRunner (licznik czasu, prezentacja zadania,
  obsługa odpowiedzi multiple-choice i wpisu liczbowego, scoring, ekran wyniku),
- podłącz jedno dummy-ćwiczenie, żeby przejść pełny przepływ Home → ćwiczenie → wynik.

Generatory zadań pisz jako czyste funkcje w TypeScript (src/exercises/<nazwa>/generate.ts),
deterministyczne przy podanym seedzie, i dodaj proste testy (poprawna odpowiedź zawsze
dokładnie jedna). Po skończeniu M0 zatrzymaj się i pokaż mi, jak uruchomić apkę w Expo Go,
a potem przejdziemy do M1 (Moduł 1 — matematyka).
```

Po M0 kolejne prompty mogą być krótkie, np.: „Zrób M1 z SPEC.md (ćwiczenia 1.1–1.4)" itd.

---

## Uwagi końcowe
- **Trenuj zawsze z licznikiem czasu** — FEAST mierzy szybkość i dokładność, nie samą poprawność.
- **Brak kary za błędy** — lepiej zgadnąć niż zostawić puste; tak też punktuj w apce.
- **Radar i składanie kostki** to najtrudniejsze elementy — zostawione na koniec celowo; najpierw zbuduj łatwiejsze moduły, by mieć działającą apkę i motywację.
- Pamiętaj o zasadzie z planu przygotowań: **FEAST najlepiej zdać za pierwszym razem**, więc traktuj tę apkę jako trening „do skutku" przed aplikowaniem, nie jako rozgrzewkę tuż przed egzaminem.

*Dokument informacyjny do samodzielnego przygotowania. Aplikacja nie jest powiązana z Eurocontrol ani PAŻP i nie odtwarza materiałów egzaminacyjnych — generuje własne, podobne zadania treningowe.*
