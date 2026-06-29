/**
 * R6 · Multipass (Multi Control Test) — the full FEAST stage-2 capstone: three
 * tasks monitored at once.
 *   • Radar  — blips drift; when two close in they flash red, tap one to turn it.
 *   • Strips — flight-progress strips; when one lights up, acknowledge it in time.
 *   • Audio  — your callsign is read out among others; confirm only when it's
 *              yours (go/no-go). Spoken via offline TTS, with a visual fallback.
 *
 * Everything is driven from ONE requestAnimationFrame loop with all state in
 * refs (no competing timers — that was the old Multipass's freeze bug). The pure
 * generators + scoring live in ./engine and are unit-tested.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import * as Speech from 'expo-speech';

import type { Difficulty } from '@/types';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';
import { PrimaryButton } from '@/ui/PrimaryButton';
import {
  CustomExerciseShell,
  type CustomSummary,
  type FeedbackFn,
} from '@/exercises/_shared/CustomExercise';
import { mulberry32 } from '@/core/rng';
import { useT } from '@/i18n/useT';
import { mpParams, type MPParams } from './engine/params';
import { genStrips, type Strip } from './engine/strips';
import { genCallsign, nextSpoken, type Callsign } from './engine/callsign';
import { emptyTally, scoreMultipass, stanineLabel, type TaskTally } from './engine/scoring';

const TARGET_RED = '#FF5A5A';
const BLIP = '#79E08A';
const SCOPE_BG = '#0B1220';
const RING = 'rgba(77,139,255,0.16)';
/** Seconds of look-ahead for a predicted separation breach (the warning window). */
const CONFLICT_LOOKAHEAD_S = 5;

interface Blip {
  id: string;
  x: number;
  y: number;
  heading: number;
  conflict: boolean;
}
interface Episode {
  a: string;
  b: string;
  since: number;
}
interface ActiveStrip {
  id: string;
  until: number;
}
interface Spoken {
  cs: Callsign;
  until: number;
  isTarget: boolean;
  answered: boolean;
}

export function MultipassFullExercise({ exerciseId }: { exerciseId: string }) {
  const t = useT();
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip={t('tip.mpFull')}
      renderPlay={({ level, runKey, feedback, onFinish }) => (
        <MPFullPlay key={runKey} params={mpParams(level as Difficulty)} feedback={feedback} onFinish={onFinish} />
      )}
    />
  );
}

function MPFullPlay({
  params,
  feedback,
  onFinish,
}: {
  params: MPParams;
  feedback: FeedbackFn;
  onFinish: (s: CustomSummary) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const scopePx = Math.min(width - 2 * Spacing.md, 240);
  const sep = params.sepFrac * scopePx;
  const speed = params.radarSpeedFrac * scopePx;

  const rngRef = useRef(mulberry32(Math.floor(Math.random() * 1e9)));
  const rng = rngRef.current;

  // --- task state (refs only) ---
  const stripsRef = useRef<Strip[]>([]);
  if (stripsRef.current.length === 0) stripsRef.current = genStrips(rng, params.stripCount);
  const targetRef = useRef<Callsign | null>(null);
  if (!targetRef.current) targetRef.current = genCallsign(rng);
  const blipsRef = useRef<Blip[]>([]);
  if (blipsRef.current.length === 0) {
    blipsRef.current = Array.from({ length: params.radarBlips }, (_, i) => ({
      id: `b${i}`,
      x: scopePx * (0.2 + rng() * 0.6),
      y: scopePx * (0.2 + rng() * 0.6),
      heading: Math.floor(rng() * 360),
      conflict: false,
    }));
  }

  const episodeRef = useRef<Episode | null>(null);
  const activeStripRef = useRef<ActiveStrip | null>(null);
  const nextStripAtRef = useRef(0);
  const spokenRef = useRef<Spoken | null>(null);
  const nextAudioAtRef = useRef(0);
  const speechOkRef = useRef(Platform.OS !== 'web');

  const radar = useRef<TaskTally>(emptyTally());
  const strips = useRef<TaskTally>(emptyTally());
  const audio = useRef<TaskTally>(emptyTally());

  const startRef = useRef(0);
  const lastRef = useRef(0);
  const finishedRef = useRef(false);
  const [, setFrame] = useState(0);

  const speak = (text: string): void => {
    if (Platform.OS === 'web') {
      speechOkRef.current = false;
      return;
    }
    try {
      Speech.stop();
      Speech.speak(text, { language: 'en-US', rate: 0.95 });
    } catch {
      speechOkRef.current = false;
    }
  };

  const finish = (): void => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
    const sc = scoreMultipass(radar.current, strips.current, audio.current);
    const total =
      radar.current.hits + radar.current.misses +
      strips.current.hits + strips.current.misses +
      audio.current.hits + audio.current.misses + audio.current.falseAlarms;
    onFinish({
      totalItems: total,
      correct: radar.current.hits + strips.current.hits + audio.current.hits,
      accuracy: sc.raw / 100,
      avgResponseMs: 0,
      score: sc.raw,
      lines: [
        t('done.stanine', { s: sc.stanine, label: stanineLabel(sc.stanine) }),
        t('mpf.radar', { pct: sc.radar, hits: radar.current.hits, total: radar.current.hits + radar.current.misses }),
        t('mpf.strips', { pct: sc.strips, hits: strips.current.hits, total: strips.current.hits + strips.current.misses }),
        t('mpf.audio', { pct: sc.audio, hits: audio.current.hits, fa: audio.current.falseAlarms, miss: audio.current.misses }),
      ],
    });
  };

  const blipVel = (heading: number): [number, number] => [
    Math.sin((heading * Math.PI) / 180) * speed,
    -Math.cos((heading * Math.PI) / 180) * speed,
  ];

  // A pair is a conflict only while CLOSING toward a separation breach within the
  // look-ahead window — not merely near each other. Without this, a crowded scope
  // kept blips permanently red and re-flagged them the instant you turned one.
  const converging = (a: Blip, b: Blip): boolean => {
    const dpx = a.x - b.x;
    const dpy = a.y - b.y;
    const [avx, avy] = blipVel(a.heading);
    const [bvx, bvy] = blipVel(b.heading);
    const dvx = avx - bvx;
    const dvy = avy - bvy;
    const closing = dpx * dvx + dpy * dvy;
    if (closing >= 0) return false; // separating or parallel
    if (Math.hypot(dpx, dpy) < sep) return true; // already inside separation, still closing
    const dv2 = dvx * dvx + dvy * dvy;
    if (dv2 === 0) return false;
    const tcpa = -closing / dv2; // > 0
    if (tcpa > CONFLICT_LOOKAHEAD_S) return false;
    return Math.hypot(dpx + dvx * tcpa, dpy + dvy * tcpa) < sep; // will breach separation
  };

  const resolveEpisode = (turn: boolean): void => {
    const ep = episodeRef.current;
    if (!ep) return;
    if (turn) {
      const a = blipsRef.current.find((b) => b.id === ep.a);
      const b = blipsRef.current.find((b) => b.id === ep.b);
      if (a && b) {
        // Steer each blip directly away from the other so they actually separate;
        // a heading change alone (positions unchanged) used to re-trigger at once.
        const brg = (((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI) % 360 + 360) % 360;
        blipsRef.current = blipsRef.current.map((bl) =>
          bl.id === ep.a ? { ...bl, heading: (brg + 180) % 360 } : bl.id === ep.b ? { ...bl, heading: brg } : bl,
        );
      }
    }
    episodeRef.current = null;
  };

  useEffect(() => {
    let raf = 0;
    const loop = (now: number): void => {
      if (finishedRef.current) return;
      if (startRef.current === 0) {
        startRef.current = now;
        lastRef.current = now;
        nextStripAtRef.current = now + params.stripEveryMs;
        nextAudioAtRef.current = now + 1500;
      }
      const dt = Math.min(now - lastRef.current, 60) / 1000;
      lastRef.current = now;
      const elapsed = now - startRef.current;

      // --- radar: move + bounce ---
      const blips = blipsRef.current.map((b) => {
        let { x, y, heading } = b;
        const vx = Math.sin((heading * Math.PI) / 180) * speed * dt;
        const vy = -Math.cos((heading * Math.PI) / 180) * speed * dt;
        x += vx;
        y += vy;
        if (x < 8 || x > scopePx - 8) {
          heading = (360 - heading + 360) % 360; // reflect across the vertical wall
          x = Math.max(8, Math.min(scopePx - 8, x));
        }
        if (y < 8 || y > scopePx - 8) {
          heading = (180 - heading + 360) % 360; // reflect across the horizontal wall
          y = Math.max(8, Math.min(scopePx - 8, y));
        }
        return { ...b, x, y, heading, conflict: false };
      });
      // conflicts (one episode at a time): only genuinely converging pairs
      let pair: [number, number] | null = null;
      for (let i = 0; i < blips.length && !pair; i++) {
        for (let j = i + 1; j < blips.length; j++) {
          if (converging(blips[i], blips[j])) {
            pair = [i, j];
            break;
          }
        }
      }
      if (!episodeRef.current && pair) {
        episodeRef.current = { a: blips[pair[0]].id, b: blips[pair[1]].id, since: now };
      }
      const ep = episodeRef.current;
      if (ep) {
        blipsRef.current = blips.map((b) => (b.id === ep.a || b.id === ep.b ? { ...b, conflict: true } : b));
        if (now - ep.since > params.conflictGraceMs) {
          radar.current.misses += 1;
          feedback('wrong');
          resolveEpisode(true);
        }
      } else {
        blipsRef.current = blips;
      }

      // --- strips: schedule + expire ---
      if (!activeStripRef.current && now >= nextStripAtRef.current) {
        const s = stripsRef.current[Math.floor(rng() * stripsRef.current.length)];
        activeStripRef.current = { id: s.id, until: now + params.stripWindowMs };
      }
      if (activeStripRef.current && now > activeStripRef.current.until) {
        strips.current.misses += 1;
        feedback('wrong');
        activeStripRef.current = null;
        nextStripAtRef.current = now + params.stripEveryMs;
      }

      // --- audio: schedule + expire ---
      if (!spokenRef.current && now >= nextAudioAtRef.current) {
        const cs = nextSpoken(rng, targetRef.current!, params.audioMatchRate);
        spokenRef.current = {
          cs,
          until: now + params.audioWindowMs,
          isTarget: cs.text === targetRef.current!.text,
          answered: false,
        };
        speak(cs.spoken);
        nextAudioAtRef.current = now + params.audioEveryMs;
      }
      if (spokenRef.current && now > spokenRef.current.until) {
        if (spokenRef.current.isTarget && !spokenRef.current.answered) {
          audio.current.misses += 1;
        }
        spokenRef.current = null;
      }

      if (elapsed >= params.durationMs) {
        finish();
        return;
      }
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      finishedRef.current = true;
      cancelAnimationFrame(raf);
      try {
        Speech.stop();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- taps ---
  const tapBlip = (id: string): void => {
    const ep = episodeRef.current;
    if (ep && (id === ep.a || id === ep.b)) {
      radar.current.hits += 1;
      feedback('correct');
      resolveEpisode(true);
      setFrame((f) => f + 1);
    }
  };
  const tapStrip = (id: string): void => {
    if (activeStripRef.current?.id === id) {
      strips.current.hits += 1;
      feedback('correct');
      activeStripRef.current = null;
      nextStripAtRef.current = lastRef.current + params.stripEveryMs;
      setFrame((f) => f + 1);
    }
  };
  const tapConfirm = (): void => {
    const sp = spokenRef.current;
    if (!sp || sp.answered) return;
    sp.answered = true;
    if (sp.isTarget) {
      audio.current.hits += 1;
      feedback('correct');
    } else {
      audio.current.falseAlarms += 1;
      feedback('wrong');
    }
    setFrame((f) => f + 1);
  };

  const now = lastRef.current;
  const timeLeft = Math.max(0, Math.ceil((params.durationMs - (now - startRef.current)) / 1000));
  const target = targetRef.current!;
  const active = activeStripRef.current;
  const sp = spokenRef.current;
  const showText = !speechOkRef.current && sp ? sp.cs.text : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.hud}>
        <AppText variant="subtitle" color={theme.text}>⏱ {timeLeft}s</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          R {radar.current.hits} · P {strips.current.hits} · A {audio.current.hits}
        </AppText>
      </View>

      {/* RADAR */}
      <Svg width={scopePx} height={scopePx}>
        <Rect x={0} y={0} width={scopePx} height={scopePx} rx={14} fill={SCOPE_BG} />
        <Circle cx={scopePx / 2} cy={scopePx / 2} r={scopePx * 0.42} stroke={RING} strokeWidth={1} fill="none" />
        {blipsRef.current.map((b) => {
          const color = b.conflict ? TARGET_RED : BLIP;
          const hx = b.x + Math.sin((b.heading * Math.PI) / 180) * 12;
          const hy = b.y - Math.cos((b.heading * Math.PI) / 180) * 12;
          return (
            <G key={b.id}>
              <Line x1={b.x} y1={b.y} x2={hx} y2={hy} stroke={color} strokeWidth={2} />
              <Circle cx={b.x} cy={b.y} r={5} fill={color} />
              {/* enlarged transparent hit target */}
              <Circle cx={b.x} cy={b.y} r={20} fill="transparent" onPress={() => tapBlip(b.id)} />
            </G>
          );
        })}
      </Svg>

      {/* FLIGHT STRIPS */}
      <View style={styles.stripList}>
        {stripsRef.current.map((s) => {
          const on = active?.id === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => tapStrip(s.id)}
              style={[
                styles.strip,
                { borderColor: theme.border, backgroundColor: on ? theme.warning : theme.surface },
              ]}>
              <AppText variant="subtitle" color={on ? theme.tintText : theme.text}>{s.callsign}</AppText>
              <AppText variant="caption" color={on ? theme.tintText : theme.textSecondary}>
                {on ? t('mpf.confirm') : s.clearance}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* AUDIO */}
      <View style={[styles.audio, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <View>
          <AppText variant="caption" color={theme.textSecondary}>{t('mpf.yourCallsign')}</AppText>
          <AppText variant="subtitle" color={theme.text}>{target.text}</AppText>
          {showText ? (
            <AppText variant="caption" color={theme.tint}>{t('mpf.heard', { cs: showText })}</AppText>
          ) : (
            <AppText variant="caption" color={theme.textSecondary}>{sp ? '🔊 ...' : ' '}</AppText>
          )}
        </View>
        <Pressable
          onPress={tapConfirm}
          style={({ pressed }) => [styles.confirm, { backgroundColor: theme.tint }, pressed && { opacity: 0.7 }]}>
          <AppText variant="subtitle" color={theme.tintText}>{t('mpf.confirm')}</AppText>
        </Pressable>
      </View>

      <PrimaryButton label={t('radar.finish')} variant="ghost" onPress={finish} style={styles.finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  hud: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: Spacing.xs },
  stripList: { width: '100%', gap: Spacing.xs },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  audio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  confirm: { borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  finish: { minHeight: 38, paddingVertical: Spacing.xs },
});
