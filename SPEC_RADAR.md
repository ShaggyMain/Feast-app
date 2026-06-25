# FEAST — pod-moduł RADAR (DART / RCT): research + szczegółowy plan do Claude Code

To rozszerzenie głównego `SPEC.md` (sekcja **Moduł 3.4 Radar/DART**). Tutaj radar jest rozpisany „na poważnie": pełna mechanika, algorytmy, integracja z apką FEAST i kamienie milowe — bo to najtrudniejszy i najważniejszy element całej rekrutacji.

**Decyzje projektowe (ustalone):**
- Radar = **pod-moduł w apce FEAST** (wspólny motyw, statystyki, nawigacja), ale z własnym silnikiem czasu rzeczywistego (nie pasuje do prostego „pytanie–odpowiedź" Runnera).
- **Wiernie jak FEAST na start** (abstrakcyjny radar, separacja + reguły, prowadzenie do waypointów), z opcjonalnymi warstwami trudności później.

> Realizacja w tym repo: **rendering = react-native-svg** (wystarcza dla 6–10 maszyn, działa w naszym samodzielnym APK), pierwszy etap = **R0–R4** (grywalny i punktowany, poziomy L1–L3), DART **zastępuje** wcześniejszy radar MVP.

---

# CZĘŚĆ A — RESEARCH: czym jest test radarowy

**FEAST II** to faza symulacyjna. Zawiera do trzech testów (RADAR jest zawsze, reszta zależy od ANSP):

1. **RADAR / DART (Dynamic ATC Radar Test)** — rdzeń, zawsze obecny. Prowadzisz samoloty na ekranie radaru, wydając komendy zmiany **kursu, wysokości i/lub prędkości**, tak aby unikać konfliktów i bezpiecznie doprowadzać maszyny do waypointów wyjściowych. Test działa w czasie rzeczywistym z rosnącym obciążeniem; nie wymaga wiedzy lotniczej — instrukcje są na ekranie.
   - Obciążenie sięga **6–10 samolotów jednocześnie**.
   - Samoloty zagrożone kolizją są **podświetlane na czerwono**; potencjalne konflikty to normalna część testu — chodzi o spokojne i sprawne ich rozwiązywanie.
   - Zwykle **6 poziomów trudności** — od jednego samolotu, przez 4 samoloty, po 4 samoloty + dodatkowy „niekontrolowany" ruch do omijania.
   - Punkty tracisz za: **konflikt** (naruszenie minimalnej separacji), **zbyt późne przekazanie** samolotu oraz **niedotrzymanie szacowanego czasu przylotu (ETA)**.
   - Wynik raportowany zwykle w skali **stanine 1–9** (9 = najlepszy).

2. **Radar Control Test (RCT)** — prowadzenie samolotów przez **sieć korytarzy** do waypointów wyjściowych, z zarządzaniem wysokością i separacją, przy jednoczesnym reagowaniu na komunikaty radiowe.

3. **Multipass (Multi Control Test)** — najbardziej obciążający: trzy zadania **równocześnie** — kierowanie/lądowanie samolotów z rozwiązywaniem konfliktów, **zarządzanie paskami postępu lotu (flight strips)** oraz **zadanie audio** (odsłuchanie sekwencji 3 liter + 3 cyfr, np. „KDB937", i potwierdzenie).

**Co tak naprawdę jest sprawdzane (i co trenujemy w apce):** świadomość sytuacyjna, wielozadaniowość, priorytetyzacja pod presją czasu, **konsekwentne stosowanie podanych reguł, gdy sytuacja się zmienia** („rule-first monitoring"), oraz opanowanie. Definicja konfliktu jest zawsze taka, jak w instrukcji danego scenariusza — nie realne minima lotnicze.

> Uwaga etyczna i prawna: dokładna implementacja FEAST (grafika, reguły, punktacja) różni się między organizacjami i jest zastrzeżona. Ta aplikacja **nie odtwarza materiałów egzaminacyjnych** — trenuje przenośne umiejętności (śledzenie wielu obiektów, wykrywanie konfliktów na czas, stosowanie reguł przy zmieniających się danych) na własnych, generowanych scenariuszach.

---

# CZĘŚĆ B — MECHANIKA SYMULACJI (rdzeń techniczny)

### Ekran radaru
- Ciemne tło, **pierścienie zasięgu** (range rings), opcjonalna siatka.
- **Samoloty** = bloki/„blipy" z: znakiem wywoławczym (callsign), wektorem kursu (linia w kierunku lotu), etykietą (FL = poziom lotu, prędkość).
- **Waypointy / bramki wyjściowe** (fixes/gates) z etykietami; każdy samolot ma przypisaną bramkę docelową i okno ETA.
- Opcjonalnie „ślad" (kilka ostatnich pozycji) dla czytelności ruchu.

### Model samolotu (stan)
```ts
type Aircraft = {
  id: string; callsign: string;
  x: number; y: number;            // pozycja na scope (jednostki sim)
  heading: number;                 // 0–360 (deg), 0 = północ
  speed: number;                   // kt (przeliczane na jednostki/tick)
  altitude: number;                // ft lub FL
  targetHeading: number; targetAltitude: number; targetSpeed: number;
  controllable: boolean;           // false = ruch niekontrolowany (do omijania)
  exitGateId: string; etaSeconds: number;
  state: 'inbound' | 'cleared' | 'handedOff' | 'conflict' | 'lost';
};
```

### Pętla czasu rzeczywistego (fixed timestep)
- Stały krok symulacji (np. 30–60 Hz) z akumulatorem, żeby fizyka była niezależna od FPS.
- W każdym ticku: zaktualizuj kurs ku `targetHeading` (z prędkością skrętu), wysokość ku `targetAltitude` (pionowa prędkość), prędkość ku `targetSpeed`, potem przesuń pozycję.

### Detekcja konfliktów (dwa poziomy)
- **Aktywny konflikt (czerwony):** dla pary (a,b) jeśli pozioma odległość < `S_h` **oraz** różnica wysokości < `S_v` → konflikt. Podświetl oba na czerwono + haptyka/alarm.
- **Ostrzeżenie predykcyjne (bursztynowy):** przewidź pozycje liniowo na `T` sekund do przodu, policz **najmniejszą odległość (CPA — closest point of approach)**; jeśli CPA < `S_h` w czasie `T` → ostrzeżenie zawczasu.
- Progi `S_h`, `S_v`, `T` konfigurowalne (część definicji scenariusza/poziomu).

### Interakcja (komendy gracza) — pod dotyk na telefonie
- **Wybór:** dotknij samolot → otwiera się panel komend tej maszyny.
- **Kurs:** szybkie przyciski L20/R20/„direct to <gate>".
- **Prędkość:** +/- prędkość.
- **Direct-to:** skieruj samolot wprost do przypisanej bramki.
- **Przekazanie (handoff):** gdy samolot dotrze do bramki w oknie ETA → „hand off" (zalicza), zbyt późno → punkty minus.
- Zasada UX z FEAST: **najpierw rozwiązuj konflikty, skanuj cały ekran, nie fiksuj się na jednym samolocie**, stosuj regułę scenariusza konsekwentnie.

### Cele i punktacja
- Każdy samolot ma: dotrzeć do **właściwej bramki** w **oknie ETA**, **bez naruszeń separacji**, i zostać przekazanym o czasie.
- **Kary:** za czas trwania aktywnego konfliktu, za niedotrzymanie ETA, za złą bramkę / opuszczenie sektora.
- **Bonusy:** czyste przekazania na czas.
- Surowy wynik → mapowanie na **stanine 1–9**.

### Poziomy trudności (6, jak w FEAST)
1. **L1:** 1 samolot — doprowadź do bramki (nauka sterowania).
2. **L2:** 2–3 samoloty, proste skrzyżowania kursów.
3. **L3:** 4 samoloty kontrolowane.
4. **L4:** 4 + **ruch niekontrolowany** (czerwony, nie do sterowania) do omijania.
5. **L5:** + warstwa **wysokości** i ciaśniejsze ETA.
6. **L6:** maksymalne obciążenie (6–10 samolotów, szybsze pojawianie się).

---

# CZĘŚĆ C — INTEGRACJA Z APKĄ FEAST

Radar to **wyjątek** od wspólnego `ExerciseRunner`. Dostaje własny komponent `RadarScreen`, ale **współdzieli**: motyw/UI, nawigację, ustawienia (poziom) i **zapis wyników** (`ExerciseResult`).

### Struktura plików
```
src/exercises/radar/
  engine/
    geometry.ts        # mod360, normalizeDeg, bearing, dist, approach, clamp
    types.ts           # Aircraft, Gate, Scenario, RadarConfig, World, RadarStats
    conflicts.ts       # detekcja konfliktów + CPA (predictedSeparation)
    sim.ts             # czysty krok świata (stepWorld) — bez UI, deterministyczny
    scoring.ts         # kary/bonusy + mapowanie na stanine
    generate.ts        # generator scenariuszy wg poziomu (seedowalny), L1–L3
  RadarExercise.tsx    # pętla czasu rzeczywistego + rysowanie (SVG) + zapis wyniku
  CommandPanel.tsx     # panel komend wybranego samolotu (kurs/prędkość)
```
Zasada: **cały silnik (`engine/`) to czyste funkcje TypeScript bez Reacta** — łatwe do testów. UI tylko czyta stan i rysuje + zbiera dotyk. Pętla: **stały krok (fixed timestep)** z akumulatorem.

---

# CZĘŚĆ D — KAMIENIE MILOWE RADARU

- **R0 — Statyczny scope:** pierścienie, kilka nieruchomych blipów z wektorem i etykietą, bramki. Dotknięcie = zaznaczenie.
- **R1 — Ruch:** pętla czasu rzeczywistego ze stałym krokiem; samoloty lecą wg kursu.
- **R2 — Komendy:** dotknij samolot → `CommandPanel`; zmiana kursu i prędkości; płynny skręt z `turnRate`. „Direct-to-gate".
- **R3 — Konflikty:** detekcja separacji + czerwone podświetlenie + ostrzeżenie predykcyjne (CPA, bursztyn) + haptyka. Pierścienie separacji.
- **R4 — Cele + punktacja:** bramki + okna ETA; sukces = wyjście właściwą bramką w oknie; kary. Generator scenariuszy + poziomy **L1–L3**. Zapis wyniku.
- **R5 — Trudność L4–L6:** ruch niekontrolowany, warstwa wysokości, większe obciążenie; mapowanie na **stanine 1–9**.
- **R6 (opcjonalnie):** tryb korytarzy (RCT), flight strips i zadanie audio (Multipass).

---

# CZĘŚĆ F — Załącznik: kluczowe algorytmy (pseudokod)

**Geometria (north-up, y w dół ekranu):**
```ts
const mod360 = (d) => ((d % 360) + 360) % 360;
const normalizeDeg = (d) => { d = mod360(d); return d > 180 ? d - 360 : d; }; // [-180,180]
const bearing = (a, b) => mod360(deg(Math.atan2(b.x - a.x, -(b.y - a.y)))); // 0=N
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
```

**Konflikty + CPA:**
```ts
function predictedSeparation(a, b, T) {
  const rp = sub(pos(b), pos(a));
  const rv = sub(vel(b), vel(a));
  const t = clamp(-dot(rp, rv) / dot(rv, rv), 0, T);
  return len(add(rp, scale(rv, t)));
}
```

**Punktacja → stanine:**
```ts
let raw = 100;
raw -= conflictSeconds * K_CONFLICT;
raw -= missedEta * K_ETA;
raw -= wrongGate * K_GATE;
raw += onTimeHandoffs * K_BONUS;
const stanine = mapRawToStanine(clamp(raw, 0, 100)); // 1–9
```

---

*Dokument informacyjny i przygotowawczy. Aplikacja nie jest powiązana z Eurocontrol ani PAŻP i nie odtwarza zastrzeżonych materiałów egzaminacyjnych — generuje własne, podobne scenariusze treningowe rozwijające przenośne umiejętności.*
