/**
 * 3.4 Radar / DART (MVP). Real-time scope: planes spawn and fly toward the
 * runway; tap a plane to clear it to land. Cleared planes that reach the runway
 * land (score); uncleared ones go around (miss). Keep separation — planes that
 * get too close raise a conflict. requestAnimationFrame drives the loop; all sim
 * state lives in refs (see ./sim for the pure, tested helpers).
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';
import {
  CustomExerciseShell,
  type CustomSummary,
  type FeedbackFn,
} from '@/exercises/_shared/CustomExercise';
import {
  conflictPairs,
  pairKey,
  radarParams,
  reachedLanding,
  stepToward,
  type RadarParams,
} from './sim';

interface Plane {
  id: number;
  x: number;
  y: number;
  cleared: boolean;
  conflicting: boolean;
}

const SCOPE = '#0B1220';
const RING = 'rgba(77,139,255,0.18)';
const NORMAL = '#FFB020';
const CLEARED = '#34C759';
const CONFLICT = '#FF5A5A';

export function RadarExercise({ exerciseId }: { exerciseId: string }) {
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip="Dotknij samolot, by sprowadzić go do lądowania. Utrzymuj separację — zbyt bliskie maszyny to konflikt. Skanuj cały ekran, nie fiksuj się na jednej."
      renderPlay={({ level, runKey, feedback, onFinish }) => (
        <RadarPlay key={runKey} params={radarParams(level)} feedback={feedback} onFinish={onFinish} />
      )}
    />
  );
}

function RadarPlay({
  params,
  feedback,
  onFinish,
}: {
  params: RadarParams;
  feedback: FeedbackFn;
  onFinish: (s: CustomSummary) => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(width - 24, 440);
  const lx = size / 2;
  const ly = size * 0.88;
  const landR = size * 0.07;

  const planesRef = useRef<Plane[]>([]);
  const nextIdRef = useRef(1);
  const spawnAccRef = useRef(0);
  const conflictSetRef = useRef<Set<string>>(new Set());
  const landingsRef = useRef(0);
  const conflictsRef = useRef(0);
  const missesRef = useRef(0);
  const startRef = useRef(0);
  const lastRef = useRef(0);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    const spawn = () => {
      planesRef.current.push({
        id: nextIdRef.current++,
        x: size * (0.15 + Math.random() * 0.7),
        y: size * 0.05,
        cleared: false,
        conflicting: false,
      });
    };

    const loop = (now: number) => {
      if (finishedRef.current) return;
      if (startRef.current === 0) {
        startRef.current = now;
        lastRef.current = now;
      }
      const dtMs = Math.min(now - lastRef.current, 50);
      lastRef.current = now;
      const elapsed = now - startRef.current;
      elapsedRef.current = elapsed;

      // spawn
      spawnAccRef.current += dtMs;
      if (
        elapsed < params.durationMs - 4000 &&
        spawnAccRef.current >= params.spawnEveryMs &&
        planesRef.current.length < params.maxPlanes
      ) {
        spawnAccRef.current = 0;
        spawn();
      }

      // move toward the runway; land or miss on arrival
      const dt = dtMs / 1000;
      const speed = size * params.speedFrac;
      const remaining: Plane[] = [];
      for (const p of planesRef.current) {
        const sp = (p.cleared ? 1.3 : 1) * speed;
        const m = stepToward(p.x, p.y, lx, ly, sp * dt);
        p.x = m.x;
        p.y = m.y;
        if (reachedLanding(p.x, p.y, lx, ly, landR)) {
          if (p.cleared) {
            landingsRef.current += 1;
            feedback('correct');
          } else {
            missesRef.current += 1;
            feedback('timeout');
          }
        } else {
          remaining.push(p);
        }
      }
      planesRef.current = remaining;

      // separation / conflicts (count discrete onsets)
      const pairs = conflictPairs(planesRef.current, size * params.sepFrac);
      const curKeys = new Set(pairs.map(([a, b]) => pairKey(a, b)));
      const conflictingIds = new Set<number>();
      for (const [a, b] of pairs) {
        conflictingIds.add(a);
        conflictingIds.add(b);
      }
      for (const k of curKeys) {
        if (!conflictSetRef.current.has(k)) {
          conflictsRef.current += 1;
          feedback('wrong');
        }
      }
      conflictSetRef.current = curKeys;
      for (const p of planesRef.current) p.conflicting = conflictingIds.has(p.id);

      if (elapsed >= params.durationMs) {
        finishedRef.current = true;
        const landings = landingsRef.current;
        const conflicts = conflictsRef.current;
        const misses = missesRef.current;
        const handled = landings + misses;
        onFinish({
          totalItems: handled,
          correct: landings,
          accuracy: handled > 0 ? landings / handled : 0,
          avgResponseMs: 0,
          score: Math.max(0, landings * 100 - conflicts * 45 - misses * 35),
          lines: [`Lądowania: ${landings}`, `Konflikty: ${conflicts}`, `Nieobsłużone: ${misses}`],
        });
        return;
      }

      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      finishedRef.current = true;
      cancelAnimationFrame(raf);
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearPlane = (id: number) => {
    const p = planesRef.current.find((q) => q.id === id);
    if (p) p.cleared = true;
  };

  const timeLeft = Math.max(0, Math.ceil((params.durationMs - elapsedRef.current) / 1000));
  const rings = [0.5, 0.33, 0.16];

  return (
    <View style={styles.wrap}>
      <View style={styles.hud}>
        <AppText variant="subtitle" color={theme.text}>
          ⏱ {timeLeft}s
        </AppText>
        <AppText variant="subtitle" color={CLEARED}>
          🛬 {landingsRef.current}
        </AppText>
        <AppText variant="subtitle" color={CONFLICT}>
          ⚠ {conflictsRef.current}
        </AppText>
      </View>

      <Svg width={size} height={size}>
        <Rect x={0} y={0} width={size} height={size} rx={16} fill={SCOPE} />
        {rings.map((r) => (
          <Circle key={r} cx={size / 2} cy={size / 2} r={size * r} stroke={RING} strokeWidth={1} fill="none" />
        ))}
        <Line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={RING} strokeWidth={1} />
        <Line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={RING} strokeWidth={1} />

        {/* runway / landing zone */}
        <Circle cx={lx} cy={ly} r={landR} stroke={CLEARED} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
        <Rect x={lx - 4} y={ly - landR * 0.7} width={8} height={landR * 1.4} rx={2} fill={CLEARED} opacity={0.8} />

        {planesRef.current.map((p) => {
          const color = p.conflicting ? CONFLICT : p.cleared ? CLEARED : NORMAL;
          const d = Math.hypot(lx - p.x, ly - p.y) || 1;
          const vx = ((lx - p.x) / d) * 14;
          const vy = ((ly - p.y) / d) * 14;
          return (
            <G key={p.id}>
              {p.cleared ? (
                <Circle cx={p.x} cy={p.y} r={12} stroke={CLEARED} strokeWidth={1.5} fill="none" />
              ) : null}
              <Line x1={p.x} y1={p.y} x2={p.x + vx} y2={p.y + vy} stroke={color} strokeWidth={2} />
              <Circle cx={p.x} cy={p.y} r={6} fill={color} />
              {/* enlarged transparent hit target */}
              <Circle cx={p.x} cy={p.y} r={22} fill="transparent" onPress={() => clearPlane(p.id)} />
            </G>
          );
        })}
      </Svg>

      <AppText variant="caption" color={theme.textSecondary} style={styles.hint}>
        Dotknij = sprowadź do lądowania · utrzymuj separację
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.md },
  hud: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: Spacing.sm },
  hint: { textAlign: 'center' },
});
