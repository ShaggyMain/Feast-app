/**
 * 3.3 Multipass — two parallel channels to monitor at once. Channel A (colour):
 * tap when it turns GREEN. Channel B (shape): tap when it shows a TRIANGLE.
 * Stimuli arrive on independent timers; scored per channel + combined, showing
 * the cost of divided attention. Two independent go/no-go loops via useChannel.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MutableRefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TimerBar } from '@/ui/TimerBar';
import { AppText } from '@/ui/Text';
import {
  CustomExerciseShell,
  type CustomSummary,
  type FeedbackFn,
} from '@/exercises/_shared/CustomExercise';
import { multipassParams, type MultipassParams } from './params';

const TARGET_GREEN = '#34C759';
const COLOR_DISTRACTORS = ['#4D8BFF', '#FFB020', '#9AA4B2'];
const TARGET_SHAPE = '▲';
const SHAPE_DISTRACTORS = ['●', '■', '◆'];

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

interface ChannelStats {
  hits: MutableRefObject<number[]>;
  misses: MutableRefObject<number>;
  fa: MutableRefObject<number>;
  cr: MutableRefObject<number>;
}

function useChannel(opts: {
  params: MultipassParams;
  makeValue: (isTarget: boolean) => string;
  running: MutableRefObject<boolean>;
  feedback: FeedbackFn;
}) {
  const { params, makeValue, running, feedback } = opts;
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState<'blank' | 'on'>('blank');
  const stimRef = useRef<{ isTarget: boolean; value: string }>({ isTarget: false, value: '' });
  const respondedRef = useRef(false);
  const stimAtRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hits = useRef<number[]>([]);
  const misses = useRef(0);
  const fa = useRef(0);
  const cr = useRef(0);

  useEffect(() => {
    if (!running.current) return;
    let cancelled = false;
    respondedRef.current = false;
    const isTarget = Math.random() < params.targetRate;
    stimRef.current = { isTarget, value: makeValue(isTarget) };
    setSub('blank');
    const t1 = setTimeout(() => {
      if (cancelled) return;
      stimAtRef.current = Date.now();
      setSub('on');
      const t2 = setTimeout(() => {
        if (cancelled) return;
        if (!respondedRef.current) {
          if (stimRef.current.isTarget) misses.current += 1;
          else cr.current += 1;
        }
        setIdx((i) => i + 1);
      }, params.onMs);
      timersRef.current.push(t2);
    }, params.cycleMs - params.onMs);
    timersRef.current.push(t1);
    return () => {
      cancelled = true;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const tap = useCallback(() => {
    if (sub !== 'on' || respondedRef.current) return;
    respondedRef.current = true;
    if (stimRef.current.isTarget) {
      hits.current.push(Date.now() - stimAtRef.current);
      feedback('correct');
    } else {
      fa.current += 1;
      feedback('wrong');
    }
  }, [sub, feedback]);

  // Stable identity: the inner refs never change, so build the wrapper once.
  // (A fresh object each render would re-create `finish` in the parent and make
  // its timer effect re-run every tick — freezing the clock and the channels.)
  const statsRef = useRef<ChannelStats | null>(null);
  if (!statsRef.current) statsRef.current = { hits, misses, fa, cr };
  return { sub, stim: stimRef.current, tap, stats: statsRef.current };
}

export function MultipassExercise({ exerciseId }: { exerciseId: string }) {
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip="Pilnuj dwóch torów naraz. KOLOR: dotknij, gdy zrobi się zielony. KSZTAŁT: dotknij, gdy pojawi się trójkąt ▲."
      renderPlay={({ level, runKey, feedback, onFinish }) => (
        <MultipassPlay key={runKey} params={multipassParams(level)} feedback={feedback} onFinish={onFinish} />
      )}
    />
  );
}

function MultipassPlay({
  params,
  feedback,
  onFinish,
}: {
  params: MultipassParams;
  feedback: FeedbackFn;
  onFinish: (s: CustomSummary) => void;
}) {
  const theme = useTheme();
  const runningRef = useRef(true);
  const finishedRef = useRef(false);
  const startRef = useRef(Date.now());
  const [, setNow] = useState(0);

  const colour = useChannel({
    params,
    running: runningRef,
    feedback,
    makeValue: (t) => (t ? TARGET_GREEN : pick(COLOR_DISTRACTORS)),
  });
  const shape = useChannel({
    params,
    running: runningRef,
    feedback,
    makeValue: (t) => (t ? TARGET_SHAPE : pick(SHAPE_DISTRACTORS)),
  });

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    runningRef.current = false;
    const a = colour.stats;
    const b = shape.stats;
    const hitsA = a.hits.current.length;
    const hitsB = b.hits.current.length;
    const correct = hitsA + hitsB + a.cr.current + b.cr.current;
    const total =
      hitsA + a.misses.current + a.fa.current + a.cr.current +
      hitsB + b.misses.current + b.fa.current + b.cr.current;
    const rts = [...a.hits.current, ...b.hits.current];
    onFinish({
      totalItems: hitsA + a.misses.current + hitsB + b.misses.current,
      correct: hitsA + hitsB,
      accuracy: total > 0 ? correct / total : 0,
      avgResponseMs: rts.length ? Math.round(rts.reduce((s, r) => s + r, 0) / rts.length) : 0,
      score: (hitsA + hitsB) * 40 + (a.cr.current + b.cr.current) * 4,
      lines: [
        `Tor KOLOR: ${hitsA} trafień, ${a.fa.current} fałsz. alarm.`,
        `Tor KSZTAŁT: ${hitsB} trafień, ${b.fa.current} fałsz. alarm.`,
      ],
    });
  }, [colour.stats, shape.stats, onFinish]);

  useEffect(() => {
    startRef.current = Date.now();
    const end = setTimeout(finish, params.durationMs);
    const tick = setInterval(() => setNow(Date.now()), 200);
    return () => {
      clearTimeout(end);
      clearInterval(tick);
      runningRef.current = false;
    };
  }, [finish, params.durationMs]);

  const progress = Math.max(0, 1 - (Date.now() - startRef.current) / params.durationMs);
  const timeLeft = Math.max(0, Math.ceil((params.durationMs - (Date.now() - startRef.current)) / 1000));

  const colourBg = colour.sub === 'on' ? colour.stim.value : theme.surfaceAlt;
  const shapeGlyph = shape.sub === 'on' ? shape.stim.value : '·';

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <AppText variant="caption">⏱ {timeLeft}s</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          dwa tory naraz
        </AppText>
      </View>
      <TimerBar progress={progress} />

      <Pressable style={[styles.channel, { backgroundColor: colourBg }]} onPress={colour.tap}>
        <AppText variant="label" color="#FFFFFF">
          KOLOR
        </AppText>
        <AppText variant="subtitle" color="#FFFFFF">
          dotknij gdy ZIELONY
        </AppText>
      </Pressable>

      <Pressable style={[styles.channel, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]} onPress={shape.tap}>
        <AppText variant="label">KSZTAŁT</AppText>
        <AppText style={styles.shape} color={theme.text}>
          {shapeGlyph}
        </AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          dotknij gdy ▲
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: Spacing.md, gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  channel: {
    flex: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  shape: { fontSize: 64, fontWeight: '800' },
});
