/**
 * 3.4 Radar / DART — FEAST Stage-2 trainer. A real-time radar scope: guide each
 * aircraft to its assigned exit gate within its ETA window while keeping
 * separation. Tap an aircraft to select it, then issue heading/speed commands
 * from the panel. Aircraft in conflict glow red; predicted losses of separation
 * glow amber (CPA look-ahead).
 *
 * The whole simulation is the pure, unit-tested engine in `./engine`. This
 * component only drives a fixed-timestep loop (requestAnimationFrame +
 * accumulator), draws the world with SVG, and turns taps into engine commands.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { Difficulty } from '@/types';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';
import { PrimaryButton } from '@/ui/PrimaryButton';
import {
  CustomExerciseShell,
  type CustomSummary,
  type FeedbackFn,
} from '@/exercises/_shared/CustomExercise';
import { CommandPanel } from './CommandPanel';
import { generateScenario } from './engine/generate';
import { velocity } from './engine/geometry';
import { scoreRadar, stanineLabel } from './engine/scoring';
import { changeSpeed, directTo, initWorld, isComplete, stepWorld, turnBy, withAircraft } from './engine/sim';
import { emptyStats, type Scenario, type World } from './engine/types';

const LEVEL_NUM: Record<Difficulty, 1 | 2 | 3> = { easy: 1, medium: 2, hard: 3 };
const STEP_SEC = 0.05; // 20 Hz fixed timestep
const STEP_MS = STEP_SEC * 1000;

const SCOPE_BG = '#0B1220';
const RING = 'rgba(77,139,255,0.16)';
const GATE = '#5BD6C0';
const NORMAL = '#79E08A';
const WARN = '#FFB020';
const CONFLICT = '#FF5A5A';
const SELECTED = '#4D8BFF';
const LABEL = '#9FB4D8';

export function RadarExercise({ exerciseId }: { exerciseId: string }) {
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip="Doprowadź każdy samolot do jego bramki (→) w oknie ETA, utrzymując separację. Dotknij samolot i steruj kursem/prędkością. Czerwony = konflikt, bursztyn = prognoza utraty separacji. Skanuj cały ekran."
      renderPlay={({ level, runKey, feedback, onFinish }) => (
        <RadarPlay key={runKey} level={LEVEL_NUM[level]} feedback={feedback} onFinish={onFinish} />
      )}
    />
  );
}

function RadarPlay({
  level,
  feedback,
  onFinish,
}: {
  level: 1 | 2 | 3;
  feedback: FeedbackFn;
  onFinish: (s: CustomSummary) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const scopePx = Math.min(width - 2 * Spacing.md, 420);

  const seedRef = useRef(Math.floor(Math.random() * 1e9));
  const scenarioRef = useRef<Scenario | null>(null);
  if (!scenarioRef.current) scenarioRef.current = generateScenario(seedRef.current, level);
  const scenario = scenarioRef.current;
  const cfg = scenario.config;
  const scale = scopePx / cfg.size;

  const worldRef = useRef<World | null>(null);
  if (!worldRef.current) worldRef.current = initWorld(scenario);

  const selectedRef = useRef<string | null>(null);
  const prevStatsRef = useRef(emptyStats());
  const finishedRef = useRef(false);
  const lastRef = useRef(0);
  const accRef = useRef(0);
  const [, setFrame] = useState(0);

  const finish = (): void => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const w = worldRef.current!;
    const n = scenario.aircraft.length;
    const sc = scoreRadar(w.stats, n);
    onFinish({
      totalItems: n,
      correct: w.stats.onTimeHandoffs,
      accuracy: n > 0 ? w.stats.onTimeHandoffs / n : 0,
      avgResponseMs: 0,
      score: sc.raw,
      lines: [
        `Stanina: ${sc.stanine}/9 — ${stanineLabel(sc.stanine)}`,
        `Czyste przekazania: ${w.stats.onTimeHandoffs}/${n}`,
        `Spóźnione (poza oknem ETA): ${w.stats.missedEta}`,
        `Zła bramka: ${w.stats.wrongGate}`,
        `Utracone z sektora: ${w.stats.lost}`,
        `Czas w konflikcie: ${Math.round(w.stats.conflictSeconds)} s`,
      ],
    });
  };

  useEffect(() => {
    let raf = 0;
    const loop = (now: number): void => {
      if (finishedRef.current) return;
      if (lastRef.current === 0) lastRef.current = now;
      accRef.current += Math.min(now - lastRef.current, 100);
      lastRef.current = now;

      let world = worldRef.current!;
      while (accRef.current >= STEP_MS && !finishedRef.current) {
        world = stepWorld(world, scenario, STEP_SEC);
        accRef.current -= STEP_MS;

        const s = world.stats;
        const p = prevStatsRef.current;
        if (s.conflictEvents > p.conflictEvents) feedback('wrong');
        if (s.onTimeHandoffs > p.onTimeHandoffs) feedback('correct');
        if (s.lost > p.lost || s.wrongGate > p.wrongGate || s.missedEta > p.missedEta)
          feedback('timeout');
        prevStatsRef.current = { ...s };

        if (isComplete(world, scenario)) {
          worldRef.current = world;
          finish();
          return;
        }
      }
      worldRef.current = world;
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      finishedRef.current = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- commands ---
  const issue = (fn: (ac: Parameters<typeof turnBy>[0]) => ReturnType<typeof turnBy>): void => {
    const id = selectedRef.current;
    if (!id) return;
    const w = worldRef.current!;
    const ac = w.aircraft.find((a) => a.id === id);
    if (!ac || ac.state !== 'inbound') return;
    worldRef.current = withAircraft(w, id, fn);
    setFrame((f) => f + 1);
  };
  const onTurn = (d: number) => issue((ac) => turnBy(ac, d));
  const onSpeed = (d: number) => issue((ac) => changeSpeed(ac, d, cfg));
  const onDirect = () =>
    issue((ac) => {
      const g = scenario.gates.find((gg) => gg.id === ac.exitGateId);
      return g ? directTo(ac, g) : ac;
    });
  const selectPlane = (id: string): void => {
    selectedRef.current = id;
    setFrame((f) => f + 1);
  };

  const world = worldRef.current!;
  const px = (x: number) => x * scale;
  const inbound = world.aircraft.filter((a) => a.state === 'inbound');
  const selected = inbound.find((a) => a.id === selectedRef.current) ?? null;
  const selectedGate = selected
    ? scenario.gates.find((g) => g.id === selected.exitGateId)?.name ?? null
    : null;

  const timeLeft = Math.max(0, Math.ceil(cfg.durationSec - world.elapsedSec));
  const activeCount = inbound.filter((a) => a.conflict).length;
  const c = scopePx / 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.hud}>
        <AppText variant="subtitle" color={theme.text}>
          ⏱ {timeLeft}s
        </AppText>
        <AppText variant="subtitle" color={NORMAL}>
          ✅ {world.stats.onTimeHandoffs}/{scenario.aircraft.length}
        </AppText>
        <AppText variant="subtitle" color={activeCount ? CONFLICT : theme.textSecondary}>
          ⚠ {activeCount ? activeCount : world.stats.conflictEvents}
        </AppText>
        <AppText variant="subtitle" color={theme.textSecondary}>
          ✈ {inbound.length}
        </AppText>
      </View>

      <Svg width={scopePx} height={scopePx}>
        <Rect x={0} y={0} width={scopePx} height={scopePx} rx={16} fill={SCOPE_BG} />
        {[0.5, 0.34, 0.18].map((r) => (
          <Circle key={r} cx={c} cy={c} r={scopePx * r} stroke={RING} strokeWidth={1} fill="none" />
        ))}
        <Line x1={c} y1={0} x2={c} y2={scopePx} stroke={RING} strokeWidth={1} />
        <Line x1={0} y1={c} x2={scopePx} y2={c} stroke={RING} strokeWidth={1} />

        {/* exit gates */}
        {scenario.gates.map((g) => {
          const gx = px(g.x);
          const gy = px(g.y);
          const lx = Math.max(14, Math.min(scopePx - 30, gx + (g.x < cfg.size / 2 ? 8 : -8)));
          return (
            <G key={g.id}>
              <Circle cx={gx} cy={gy} r={cfg.gateRadius * scale} stroke={GATE} strokeWidth={1} strokeDasharray="3 3" fill="none" opacity={0.5} />
              <Rect x={gx - 5} y={gy - 5} width={10} height={10} fill="none" stroke={GATE} strokeWidth={1.5} transform={`rotate(45, ${gx}, ${gy})`} />
              <SvgText x={lx} y={gy - 9} fill={GATE} fontSize={10} fontWeight="bold" textAnchor={g.x < cfg.size / 2 ? 'start' : 'end'}>
                {g.name}
              </SvgText>
            </G>
          );
        })}

        {/* aircraft */}
        {inbound.map((a) => {
          const ax = px(a.x);
          const ay = px(a.y);
          const isSel = a.id === selectedRef.current;
          const color = a.conflict ? CONFLICT : a.warn ? WARN : isSel ? SELECTED : NORMAL;
          const v = velocity(a.heading, a.speed);
          const mag = Math.hypot(v.vx, v.vy) || 1;
          const len = 16 + (a.speed / cfg.maxSpeed) * scopePx * 0.14;
          const ex = ax + (v.vx / mag) * len;
          const ey = ay + (v.vy / mag) * len;
          const eta = Math.round(a.etaSec - world.elapsedSec);
          const gate = scenario.gates.find((g) => g.id === a.exitGateId);
          return (
            <G key={a.id}>
              <Circle cx={ax} cy={ay} r={(cfg.sepH / 2) * scale} stroke={color} strokeWidth={1} fill="none" opacity={a.conflict ? 0.5 : 0.15} />
              {isSel ? <Circle cx={ax} cy={ay} r={15} stroke={SELECTED} strokeWidth={1.5} fill="none" /> : null}
              <Line x1={ax} y1={ay} x2={ex} y2={ey} stroke={color} strokeWidth={2} />
              <Polygon
                points={`${ax},${ay - 8} ${ax - 5.5},${ay + 6} ${ax + 5.5},${ay + 6}`}
                fill={color}
                transform={`rotate(${a.heading}, ${ax}, ${ay})`}
              />
              <SvgText x={ax + 11} y={ay - 4} fill={isSel ? theme.text : LABEL} fontSize={10} fontWeight="bold">
                {a.callsign}
              </SvgText>
              <SvgText x={ax + 11} y={ay + 8} fill={LABEL} fontSize={9}>
                {`→${gate?.name ?? ''}  ${eta >= 0 ? eta + 's' : '!'}`}
              </SvgText>
              {/* enlarged transparent hit target */}
              <Circle cx={ax} cy={ay} r={22} fill="transparent" onPress={() => selectPlane(a.id)} />
            </G>
          );
        })}
      </Svg>

      <CommandPanel
        selected={selected}
        gateName={selectedGate}
        onTurn={onTurn}
        onDirect={onDirect}
        onSpeed={onSpeed}
      />

      <PrimaryButton label="Zakończ" variant="ghost" onPress={finish} style={styles.finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.sm,
  },
  finish: { minHeight: 40, paddingVertical: Spacing.sm },
});
