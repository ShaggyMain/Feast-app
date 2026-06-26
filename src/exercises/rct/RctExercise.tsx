/**
 * R6 · RCT (Radar Control Test) — guide traffic along a corridor network to its
 * exit fix at the cleared flight level, keep separation where routes cross, and
 * comply with radio instructions in time. Aircraft self-navigate their route;
 * the controller manages altitude/speed. The simulation is the pure, tested
 * engine in ./engine; this drives a fixed-timestep loop and draws it with SVG.
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
import { velocity } from '@/exercises/radar/engine/geometry';
import { useT } from '@/i18n/useT';
import { RctControls } from './RctControls';
import { generateScenario } from './engine/generate';
import { scoreRct, stanineLabel } from './engine/scoring';
import {
  changeAltitude,
  changeSpeed,
  initRctWorld,
  isRctComplete,
  setAltitude,
  setSpeed,
  stepRct,
  withAircraft,
} from './engine/sim';
import { emptyRctStats, type RctAircraft, type RctScenario, type RctWorld } from './engine/types';

const LEVEL_NUM: Record<Difficulty, 1 | 2 | 3> = { easy: 1, medium: 2, hard: 3 };
const STEP_SEC = 0.05;
const STEP_MS = STEP_SEC * 1000;

const SCOPE_BG = '#0B1220';
const RING = 'rgba(77,139,255,0.16)';
const AIRWAY = '#3A4A6B';
const FIX = '#5BD6C0';
const NORMAL = '#79E08A';
const WARN = '#FFB020';
const CONFLICT = '#FF5A5A';
const SELECTED = '#4D8BFF';
const LABEL = '#9FB4D8';

export function RctExercise({ exerciseId }: { exerciseId: string }) {
  const t = useT();
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip={t('tip.rct')}
      renderPlay={({ level, runKey, feedback, onFinish }) => (
        <RctPlay key={runKey} level={LEVEL_NUM[level]} feedback={feedback} onFinish={onFinish} />
      )}
    />
  );
}

function RctPlay({
  level,
  feedback,
  onFinish,
}: {
  level: 1 | 2 | 3;
  feedback: FeedbackFn;
  onFinish: (s: CustomSummary) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const scopePx = Math.min(width - 2 * Spacing.md, 420);

  const seedRef = useRef(Math.floor(Math.random() * 1e9));
  const scenarioRef = useRef<RctScenario | null>(null);
  if (!scenarioRef.current) scenarioRef.current = generateScenario(seedRef.current, level);
  const scenario = scenarioRef.current;
  const cfg = scenario.config;
  const scale = scopePx / cfg.size;
  const aircraftCount = scenario.aircraft.length;
  const instrCount = scenario.instructions.length;

  const worldRef = useRef<RctWorld | null>(null);
  if (!worldRef.current) worldRef.current = initRctWorld(scenario);

  const selectedRef = useRef<string | null>(null);
  const prevStatsRef = useRef(emptyRctStats());
  const finishedRef = useRef(false);
  const lastRef = useRef(0);
  const accRef = useRef(0);
  const [, setFrame] = useState(0);

  const finish = (): void => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const w = worldRef.current!;
    const sc = scoreRct(w.stats, aircraftCount, instrCount);
    onFinish({
      totalItems: aircraftCount,
      correct: w.stats.onTimeExits,
      accuracy: aircraftCount > 0 ? w.stats.onTimeExits / aircraftCount : 0,
      avgResponseMs: 0,
      score: sc.raw,
      lines: [
        t('done.stanine', { s: sc.stanine, label: stanineLabel(sc.stanine) }),
        t('rct.exits', { n: w.stats.onTimeExits, total: aircraftCount }),
        t('rct.wrongAlt', { n: w.stats.wrongAlt }),
        t('rct.instr', { n: w.stats.instrComplied, total: instrCount }),
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
        world = stepRct(world, scenario, STEP_SEC);
        accRef.current -= STEP_MS;

        const s = world.stats;
        const p = prevStatsRef.current;
        if (s.conflictEvents > p.conflictEvents) feedback('wrong');
        if (s.onTimeExits > p.onTimeExits || s.instrComplied > p.instrComplied) feedback('correct');
        if (s.wrongAlt > p.wrongAlt || s.lost > p.lost || s.instrMissed > p.instrMissed)
          feedback('timeout');
        prevStatsRef.current = { ...s };

        if (isRctComplete(world, scenario)) {
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

  const issue = (fn: (ac: RctAircraft) => RctAircraft): void => {
    const id = selectedRef.current;
    if (!id) return;
    const w = worldRef.current!;
    const ac = w.aircraft.find((a) => a.id === id);
    if (!ac || ac.state !== 'enroute') return;
    worldRef.current = withAircraft(w, id, fn);
    setFrame((f) => f + 1);
  };
  const onAltitude = (d: number) => issue((ac) => changeAltitude(ac, d, cfg));
  const onSpeed = (d: number) => issue((ac) => changeSpeed(ac, d, cfg));
  const selectPlane = (id: string): void => {
    selectedRef.current = id;
    setFrame((f) => f + 1);
  };
  const onExecute = (insId: string): void => {
    const w = worldRef.current!;
    const ins = w.instructions.find((i) => i.id === insId);
    if (!ins) return;
    selectedRef.current = ins.acId;
    worldRef.current = withAircraft(w, ins.acId, (ac) =>
      ins.kind === 'speed' ? setSpeed(ac, ins.value, cfg) : setAltitude(ac, ins.value, cfg),
    );
    setFrame((f) => f + 1);
  };

  const world = worldRef.current!;
  const px = (v: number) => v * scale;
  const fixById = (id: string) => scenario.fixes.find((f) => f.id === id);
  const enroute = world.aircraft.filter((a) => a.state === 'enroute');
  const pendingCount = world.aircraft.filter((a) => a.state === 'pending').length;
  const selected = enroute.find((a) => a.id === selectedRef.current) ?? null;
  const activeInstr = world.instructions.filter((i) => i.status === 'active');

  const timeLeft = Math.max(0, Math.ceil(cfg.durationSec - world.elapsedSec));
  const activeConf = enroute.filter((a) => a.conflict).length;
  const c = scopePx / 2;

  return (
    <View style={styles.wrap}>
      <View style={styles.hud}>
        <AppText variant="subtitle" color={theme.text}>
          ⏱ {timeLeft}s
        </AppText>
        <AppText variant="subtitle" color={NORMAL}>
          ✅ {world.stats.onTimeExits}/{aircraftCount}
        </AppText>
        <AppText variant="subtitle" color={activeConf ? CONFLICT : theme.textSecondary}>
          ⚠ {activeConf ? activeConf : world.stats.conflictEvents}
        </AppText>
        <AppText variant="subtitle" color={theme.textSecondary}>
          📻 {world.stats.instrComplied}/{instrCount}
        </AppText>
        <AppText variant="subtitle" color={theme.textSecondary}>
          ✈ {enroute.length}
          {pendingCount ? `+${pendingCount}` : ''}
        </AppText>
      </View>

      <Svg width={scopePx} height={scopePx}>
        <Rect x={0} y={0} width={scopePx} height={scopePx} rx={16} fill={SCOPE_BG} />
        {[0.5, 0.34, 0.18].map((rr) => (
          <Circle key={rr} cx={c} cy={c} r={scopePx * rr} stroke={RING} strokeWidth={1} fill="none" />
        ))}

        {/* airways (corridors) */}
        {scenario.airways.map(([aId, bId], i) => {
          const fa = fixById(aId);
          const fb = fixById(bId);
          if (!fa || !fb) return null;
          return (
            <Line
              key={`aw${i}`}
              x1={px(fa.x)}
              y1={px(fa.y)}
              x2={px(fb.x)}
              y2={px(fb.y)}
              stroke={AIRWAY}
              strokeWidth={8}
              strokeOpacity={0.35}
              strokeLinecap="round"
            />
          );
        })}

        {/* fixes */}
        {scenario.fixes.map((f) => {
          const fx = px(f.x);
          const fy = px(f.y);
          const big = f.id === 'CTR';
          const s = big ? 7 : 5;
          return (
            <G key={f.id}>
              <Rect
                x={fx - s}
                y={fy - s}
                width={s * 2}
                height={s * 2}
                fill={big ? FIX : 'none'}
                stroke={FIX}
                strokeWidth={1.5}
                transform={`rotate(45, ${fx}, ${fy})`}
              />
              {f.edge || big ? (
                <SvgText x={fx + 9} y={fy + 3} fill={FIX} fontSize={9} fontWeight="bold">
                  {f.name}
                </SvgText>
              ) : null}
            </G>
          );
        })}

        {/* aircraft */}
        {enroute.map((a) => {
          const ax = px(a.x);
          const ay = px(a.y);
          const isSel = a.id === selectedRef.current;
          const base = isSel ? SELECTED : NORMAL;
          const color = a.conflict ? CONFLICT : a.warn ? WARN : base;
          const v = velocity(a.heading, a.speed);
          const mag = Math.hypot(v.vx, v.vy) || 1;
          const len = 16 + (a.speed / cfg.maxSpeed) * scopePx * 0.14;
          const ex = ax + (v.vx / mag) * len;
          const ey = ay + (v.vy / mag) * len;
          const eta = Math.round(a.etaSec - world.elapsedSec);
          const climbing = a.targetAltitude !== a.altitude;
          const arrow = climbing ? (a.targetAltitude > a.altitude ? '↑' : '↓') : '';
          const offLevel = Math.abs(a.altitude - a.clearedAlt) > cfg.altWindow;
          return (
            <G key={a.id}>
              <Circle cx={ax} cy={ay} r={(cfg.sepH / 2) * scale} stroke={color} strokeWidth={1} fill="none" opacity={a.conflict ? 0.5 : 0.14} />
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
              <SvgText x={ax + 11} y={ay + 8} fill={offLevel ? WARN : LABEL} fontSize={9}>
                {`FL${Math.round(a.altitude)}${arrow}  ${eta >= 0 ? eta + 's' : '!'}`}
              </SvgText>
              <Circle cx={ax} cy={ay} r={22} fill="transparent" onPress={() => selectPlane(a.id)} />
            </G>
          );
        })}
      </Svg>

      <RctControls
        selected={selected}
        instructions={activeInstr}
        elapsedSec={world.elapsedSec}
        onAltitude={onAltitude}
        onSpeed={onSpeed}
        onExecute={(ins) => onExecute(ins.id)}
      />

      <PrimaryButton label={t('radar.finish')} variant="ghost" onPress={finish} style={styles.finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.xs,
  },
  finish: { minHeight: 40, paddingVertical: Spacing.sm },
});
