/**
 * 3.4 Radar / DART — FEAST Stage-2 trainer. A real-time radar scope: guide each
 * controllable aircraft to its assigned exit gate within its ETA window while
 * keeping separation. Tap an aircraft to select it, then issue heading / speed /
 * altitude commands. Aircraft in conflict glow red; predicted losses of
 * separation glow amber (CPA look-ahead). Grey diamonds are uncontrolled transit
 * traffic — you cannot command them, only avoid them.
 *
 * The whole simulation is the pure, unit-tested engine in `./engine`. This
 * component only drives a fixed-timestep loop (requestAnimationFrame +
 * accumulator), draws the world with SVG, and turns taps into engine commands.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { useT } from '@/i18n/useT';
import { RadarShell, type RadarFeedbackFn, type RadarSummary } from './RadarShell';
import { CommandPanel } from './CommandPanel';
import { generateScenario } from './engine/generate';
import { velocity } from './engine/geometry';
import { scoreRadar, stanineLabel } from './engine/scoring';
import {
  changeAltitude,
  changeSpeed,
  directTo,
  initWorld,
  isComplete,
  stepWorld,
  turnBy,
  withAircraft,
} from './engine/sim';
import { emptyStats, type Aircraft, type RadarLevel, type Scenario, type World } from './engine/types';

const STEP_SEC = 0.05; // 20 Hz fixed timestep
const STEP_MS = STEP_SEC * 1000;

const SCOPE_BG = '#0B1220';
const RING = 'rgba(77,139,255,0.16)';
const GATE = '#5BD6C0';
const NORMAL = '#79E08A';
const WARN = '#FFB020';
const CONFLICT = '#FF5A5A';
const SELECTED = '#4D8BFF';
const TRAFFIC = '#9AA4B2'; // uncontrolled transit
const LABEL = '#9FB4D8';

export function RadarExercise({ exerciseId }: { exerciseId: string }) {
  const t = useT();
  return (
    <RadarShell
      exerciseId={exerciseId}
      tip={t('tip.radar')}
      renderPlay={({ level, runKey, feedback, onFinish }) => (
        <RadarPlay key={runKey} level={level} feedback={feedback} onFinish={onFinish} />
      )}
    />
  );
}

function RadarPlay({
  level,
  feedback,
  onFinish,
}: {
  level: RadarLevel;
  feedback: RadarFeedbackFn;
  onFinish: (s: RadarSummary) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const scopePx = Math.min(width - 2 * Spacing.sm, 460);

  const seedRef = useRef(Math.floor(Math.random() * 1e9));
  const scenarioRef = useRef<Scenario | null>(null);
  if (!scenarioRef.current) scenarioRef.current = generateScenario(seedRef.current, level);
  const scenario = scenarioRef.current;
  const cfg = scenario.config;
  const vertical = cfg.verticalEnabled;
  const scale = scopePx / cfg.size;
  const controllableCount = scenario.aircraft.filter((a) => a.controllable).length;

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
    const n = controllableCount;
    const sc = scoreRadar(w.stats, n);
    onFinish({
      totalItems: n,
      correct: w.stats.handoffs,
      accuracy: n > 0 ? w.stats.handoffs / n : 0,
      score: sc.raw,
      lines: [
        t('done.stanine', { s: sc.stanine, label: stanineLabel(sc.stanine) }),
        t('done.handoffs', { n: w.stats.handoffs, total: n }),
        t('done.wrongGate', { n: w.stats.wrongGate }),
        t('done.lost', { n: w.stats.lost }),
        t('done.conflictTime', { s: Math.round(w.stats.conflictSeconds) }),
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

  // --- commands (only ever applied to a selected, controllable, inbound track) ---
  const issue = (fn: (ac: Aircraft) => Aircraft): void => {
    const id = selectedRef.current;
    if (!id) return;
    const w = worldRef.current!;
    const ac = w.aircraft.find((a) => a.id === id);
    if (!ac || ac.state !== 'inbound' || !ac.controllable) return;
    worldRef.current = withAircraft(w, id, fn);
    setFrame((f) => f + 1);
  };
  const onTurn = (d: number) => issue((ac) => turnBy(ac, d));
  const onSpeed = (d: number) => issue((ac) => changeSpeed(ac, d, cfg));
  const onAltitude = (d: number) => issue((ac) => changeAltitude(ac, d, cfg));
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
  const pendingCount = world.aircraft.filter((a) => a.state === 'pending').length;
  const selected = inbound.find((a) => a.id === selectedRef.current && a.controllable) ?? null;
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
          ✅ {world.stats.handoffs}/{controllableCount}
        </AppText>
        <AppText variant="subtitle" color={activeCount ? CONFLICT : theme.textSecondary}>
          ⚠ {activeCount ? activeCount : world.stats.conflictEvents}
        </AppText>
        <AppText variant="subtitle" color={theme.textSecondary}>
          ✈ {inbound.length}
          {pendingCount ? `+${pendingCount}` : ''}
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
              <Rect x={gx - 6} y={gy - 6} width={12} height={12} fill="none" stroke={GATE} strokeWidth={1.5} transform={`rotate(45, ${gx}, ${gy})`} />
              <SvgText x={lx} y={gy - 10} fill={GATE} fontSize={11} fontWeight="bold" textAnchor={g.x < cfg.size / 2 ? 'start' : 'end'}>
                {g.name}
              </SvgText>
            </G>
          );
        })}

        {/* aircraft */}
        {inbound.map((a) => {
          const ax = px(a.x);
          const ay = px(a.y);
          const isSel = a.id === selectedRef.current && a.controllable;
          const base = a.controllable ? (isSel ? SELECTED : NORMAL) : TRAFFIC;
          const color = a.conflict ? CONFLICT : a.warn ? WARN : base;
          const v = velocity(a.heading, a.speed);
          const mag = Math.hypot(v.vx, v.vy) || 1;
          const len = 18 + (a.speed / cfg.maxSpeed) * scopePx * 0.14;
          const ex = ax + (v.vx / mag) * len;
          const ey = ay + (v.vy / mag) * len;
          const eta = Math.round(a.etaSec - world.elapsedSec);
          const gate = scenario.gates.find((g) => g.id === a.exitGateId);
          const climbing = a.targetAltitude !== a.altitude;
          const fl = `FL${Math.round(a.altitude)}${climbing ? (a.targetAltitude > a.altitude ? '↑' : '↓') : ''}`;
          return (
            <G key={a.id}>
              <Circle cx={ax} cy={ay} r={(cfg.sepH / 2) * scale} stroke={color} strokeWidth={1} fill="none" opacity={a.conflict ? 0.5 : 0.14} />
              {isSel ? <Circle cx={ax} cy={ay} r={18} stroke={SELECTED} strokeWidth={1.5} fill="none" /> : null}
              <Line x1={ax} y1={ay} x2={ex} y2={ey} stroke={color} strokeWidth={2.5} />
              {a.controllable ? (
                <Polygon
                  points={`${ax},${ay - 10} ${ax - 7},${ay + 7} ${ax + 7},${ay + 7}`}
                  fill={color}
                  transform={`rotate(${a.heading}, ${ax}, ${ay})`}
                />
              ) : (
                <Rect x={ax - 6} y={ay - 6} width={12} height={12} fill="none" stroke={color} strokeWidth={2} transform={`rotate(45, ${ax}, ${ay})`} />
              )}
              <SvgText x={ax + 13} y={ay - 5} fill={isSel ? theme.text : LABEL} fontSize={12} fontWeight="bold">
                {a.callsign}
              </SvgText>
              <SvgText x={ax + 13} y={ay + 9} fill={LABEL} fontSize={11}>
                {a.controllable
                  ? `→${gate?.name ?? ''}  ${eta >= 0 ? eta + 's' : '!'}${vertical ? '  ' + fl : ''}`
                  : vertical
                    ? fl
                    : t('radar.foreign')}
              </SvgText>
              {/* enlarged transparent hit target (controllable only) */}
              {a.controllable ? (
                <Circle cx={ax} cy={ay} r={28} fill="transparent" onPress={() => selectPlane(a.id)} />
              ) : null}
            </G>
          );
        })}
      </Svg>

      <CommandPanel
        selected={selected}
        gateName={selectedGate}
        vertical={vertical}
        onTurn={onTurn}
        onDirect={onDirect}
        onSpeed={onSpeed}
        onAltitude={onAltitude}
      />

      <PrimaryButton label={t('radar.finish')} variant="ghost" onPress={finish} style={styles.finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.sm },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.sm,
  },
  finish: { minHeight: 40, paddingVertical: Spacing.sm },
});
