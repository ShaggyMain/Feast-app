/**
 * 3.1 Zapamiętywanie — show a set of numbered gauges, hide them behind a mask,
 * then ask for one value. Light adaptivity: the gauge count rises after a
 * streak and falls after a miss. Uses the shared CustomExerciseShell.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { mulberry32 } from '@/core/rng';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { TimerBar } from '@/ui/TimerBar';
import { AppText } from '@/ui/Text';
import {
  CustomExerciseShell,
  type CustomSummary,
  type FeedbackFn,
} from '@/exercises/_shared/CustomExercise';
import { buildGaugeRound, type GaugeRound } from './gauges';
import { memoryParams, type MemoryParams } from './params';

export function MemoryExercise({ exerciseId }: { exerciseId: string }) {
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip="Zapamiętaj wartości wskaźników. Po chwili znikną — wtedy odpowiesz, ile wynosił wskazany."
      renderPlay={({ level, runKey, feedback, onFinish }) => (
        <MemoryPlay key={runKey} params={memoryParams(level)} feedback={feedback} onFinish={onFinish} />
      )}
    />
  );
}

function MemoryPlay({
  params,
  feedback,
  onFinish,
}: {
  params: MemoryParams;
  feedback: FeedbackFn;
  onFinish: (s: CustomSummary) => void;
}) {
  const theme = useTheme();
  const rngRef = useRef(mulberry32(Math.floor(Math.random() * 1e9)));
  const kRef = useRef(params.baseGauges);
  const maxKRef = useRef(params.baseGauges);
  const streakRef = useRef(0);
  const correctRef = useRef(0);
  const rtsRef = useRef<number[]>([]);
  const dataRef = useRef<GaugeRound | null>(null);
  const resolvedRef = useRef(false);
  const recallStartRef = useRef(0);
  const phaseStartRef = useRef(0);
  const phaseDurRef = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [round, setRound] = useState(0);
  const [sub, setSub] = useState<'expose' | 'mask' | 'recall'>('expose');
  const [nowTs, setNowTs] = useState(Date.now());

  const finish = useCallback(() => {
    const rts = rtsRef.current;
    const avg = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
    const speed = rts.reduce((s, rt) => s + Math.max(0, Math.round((params.recallMs - rt) / 120)), 0);
    onFinish({
      totalItems: params.rounds,
      correct: correctRef.current,
      accuracy: params.rounds > 0 ? correctRef.current / params.rounds : 0,
      avgResponseMs: avg,
      score: correctRef.current * 100 + speed,
      lines: [`Poprawne: ${correctRef.current}/${params.rounds}`, `Maks. wskaźników: ${maxKRef.current}`],
    });
  }, [params, onFinish]);

  const resolve = useCallback(
    (choiceId?: string) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      const data = dataRef.current;
      const ok = !!data && choiceId === data.correctChoiceId;
      if (ok) {
        correctRef.current += 1;
        streakRef.current += 1;
        rtsRef.current.push(Date.now() - recallStartRef.current);
        feedback('correct');
        if (streakRef.current >= 2) {
          kRef.current = Math.min(kRef.current + 1, params.baseGauges + 2, 7);
          streakRef.current = 0;
        }
      } else {
        streakRef.current = 0;
        kRef.current = Math.max(kRef.current - 1, Math.max(4, params.baseGauges - 1));
        feedback(choiceId ? 'wrong' : 'timeout');
      }
      setRound((r) => r + 1);
    },
    [feedback, params],
  );

  // Drive each round: expose → mask → recall (auto-resolve on timeout).
  useEffect(() => {
    if (round >= params.rounds) {
      finish();
      return;
    }
    let cancelled = false;
    resolvedRef.current = false;
    dataRef.current = buildGaugeRound(rngRef.current, kRef.current);
    maxKRef.current = Math.max(maxKRef.current, kRef.current);

    phaseStartRef.current = Date.now();
    phaseDurRef.current = params.exposeMs;
    setSub('expose');
    const t1 = setTimeout(() => {
      if (cancelled) return;
      setSub('mask');
      const t2 = setTimeout(() => {
        if (cancelled) return;
        recallStartRef.current = Date.now();
        phaseStartRef.current = Date.now();
        phaseDurRef.current = params.recallMs;
        setSub('recall');
        const t3 = setTimeout(() => {
          if (cancelled) return;
          resolve(undefined);
        }, params.recallMs);
        timers.current.push(t3);
      }, params.maskMs);
      timers.current.push(t2);
    }, params.exposeMs);
    timers.current.push(t1);

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [round, params, finish, resolve]);

  // Tick the countdown bar during timed phases.
  useEffect(() => {
    if (sub === 'mask') return;
    const id = setInterval(() => setNowTs(Date.now()), 120);
    return () => clearInterval(id);
  }, [sub]);

  const data = dataRef.current;
  const progress = Math.max(0, Math.min(1, (phaseStartRef.current + phaseDurRef.current - nowTs) / phaseDurRef.current));

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <AppText variant="caption">
          Runda {Math.min(round + 1, params.rounds)} / {params.rounds}
        </AppText>
        <AppText variant="caption" color={theme.success}>
          ✓ {correctRef.current}
        </AppText>
      </View>
      {sub !== 'mask' ? <TimerBar progress={progress} /> : null}

      {sub === 'expose' && data ? (
        <View style={styles.body}>
          <AppText variant="subtitle">Zapamiętaj wskaźniki</AppText>
          <View style={styles.gaugeWrap}>
            {data.values.map((v, i) => (
              <View key={i} style={[styles.gauge, { backgroundColor: theme.surfaceAlt }]}>
                <AppText variant="caption" color={theme.textSecondary}>
                  #{i + 1}
                </AppText>
                <AppText variant="title">{v}</AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {sub === 'mask' ? (
        <View style={styles.body}>
          <AppText variant="hero" color={theme.textSecondary}>
            ▦ ▦ ▦
          </AppText>
        </View>
      ) : null}

      {sub === 'recall' && data ? (
        <View style={styles.body}>
          <AppText variant="subtitle" style={styles.center}>
            Jaka była wartość wskaźnika #{data.recallIndex + 1}?
          </AppText>
          <View style={styles.choiceGrid}>
            {data.choices.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => resolve(c.id)}
                style={[styles.choice, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.choiceText, { color: theme.text }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg },
  center: { textAlign: 'center' },
  gaugeWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
  gauge: {
    minWidth: 90,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: 2,
  },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md, width: '100%' },
  choice: {
    width: '47%',
    flexGrow: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  choiceText: { fontSize: 24, fontWeight: '800' },
});
