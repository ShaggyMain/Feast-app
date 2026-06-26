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
import { mpParams, type MPParams } from './engine/params';
import { genStrips, type Strip } from './engine/strips';
import { genCallsign, nextSpoken, type Callsign } from './engine/callsign';
import { emptyTally, scoreMultipass, stanineLabel, type TaskTally } from './engine/scoring';

const TARGET_RED = '#FF5A5A';
const BLIP = '#79E08A';
const SCOPE_BG = '#0B1220';
const RING = 'rgba(77,139,255,0.16)';

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
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip="Trzy zadania naraz. RADAR: dotknij czerwony samolot, by go odwrócić. PASKI: dotknij pasek, gdy się podświetli. AUDIO: potwierdź tylko, gdy usłyszysz SWÓJ callsign. Skanuj wszystkie trzy pola — nie fiksuj się na jednym."
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
        `Stanina: ${sc.stanine}/9 — ${stanineLabel(sc.stanine)}`,
        `Radar: ${sc.radar}%  (${radar.current.hits}/${radar.current.hits + radar.current.misses})`,
        `Paski: ${sc.strips}%  (${strips.current.hits}/${strips.current.hits + strips.current.misses})`,
        `Audio: ${sc.audio}%  (traf. ${audio.current.hits}, fałsz. ${audio.current.falseAlarms}, pom. ${audio.current.misses})`,
      ],
    });
  };

  const resolveEpisode = (turn: boolean): void => {
    const ep = episodeRef.current;
    if (!ep) return;
    if (turn) {
      blipsRef.current = blipsRef.current.map((b) =>
        b.id === ep.a ? { ...b, heading: (b.heading + 140) % 360 } : b.id === ep.b ? { ...b, heading: (b.heading + 220) % 360 } : b,
      );
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
      // conflicts (one episode at a time)
      let pair: [number, number] | null = null;
      for (let i = 0; i < blips.length && !pair; i++) {
        for (let j = i + 1; j < blips.length; j++) {
          if (Math.hypot(blips[i].x - blips[j].x, blips[i].y - blips[j].y) < sep) {
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
                {on ? 'POTWIERDŹ' : s.clearance}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* AUDIO */}
      <View style={[styles.audio, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <View>
          <AppText variant="caption" color={theme.textSecondary}>TWÓJ CALLSIGN</AppText>
          <AppText variant="subtitle" color={theme.text}>{target.text}</AppText>
          {showText ? (
            <AppText variant="caption" color={theme.tint}>słychać: {showText}</AppText>
          ) : (
            <AppText variant="caption" color={theme.textSecondary}>{sp ? '🔊 ...' : ' '}</AppText>
          )}
        </View>
        <Pressable
          onPress={tapConfirm}
          style={({ pressed }) => [styles.confirm, { backgroundColor: theme.tint }, pressed && { opacity: 0.7 }]}>
          <AppText variant="subtitle" color={theme.tintText}>POTWIERDŹ</AppText>
        </Pressable>
      </View>

      <PrimaryButton label="Zakończ" variant="ghost" onPress={finish} style={styles.finish} />
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
