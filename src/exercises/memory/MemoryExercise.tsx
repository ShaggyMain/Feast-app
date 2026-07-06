/**
 * 3.1 Zapamiętywanie — show a set of numbered gauges, hide them behind a mask,
 * then ask for SEVERAL of the values (more as the set grows), so the whole set
 * must be held, not just the first few. Light adaptivity: the gauge count rises
 * after a clean round and falls after a miss. Uses the shared CustomExerciseShell.
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
import { useT } from '@/i18n/useT';

export function MemoryExercise({ exerciseId }: { exerciseId: string }) {
  const t = useT();
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip={t('tip.memory')}
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
  const t = useT();
  const rngRef = useRef(mulberry32(Math.floor(Math.random() * 1e9)));
  const kRef = useRef(params.baseGauges);
  const maxKRef = useRef(params.baseGauges);
  const streakRef = useRef(0);
  const correctRef = useRef(0); // correct sub-answers
  const askedRef = useRef(0); // total sub-questions asked
  const rtsRef = useRef<number[]>([]);
  const dataRef = useRef<GaugeRound | null>(null);
  const qCountRef = useRef(1); // questions in the current round
  const roundOkRef = useRef(true); // no wrong answer yet this round
  const answeredRef = useRef(false); // guard for the current question
  const recallStartRef = useRef(0);
  const phaseStartRef = useRef(0);
  const phaseDurRef = useRef(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [round, setRound] = useState(0);
  const [sub, setSub] = useState<'expose' | 'mask' | 'recall'>('expose');
  const [qIdx, setQIdx] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());

  const finish = useCallback(() => {
    const rts = rtsRef.current;
    const avg = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
    const speed = rts.reduce((s, rt) => s + Math.max(0, Math.round((params.recallMs - rt) / 120)), 0);
    onFinish({
      totalItems: askedRef.current,
      correct: correctRef.current,
      accuracy: askedRef.current > 0 ? correctRef.current / askedRef.current : 0,
      avgResponseMs: avg,
      score: correctRef.current * 100 + speed,
      lines: [
        t('mem.correctLine', { c: correctRef.current, n: askedRef.current }),
        t('mem.maxGauges', { n: maxKRef.current }),
      ],
    });
  }, [params, onFinish]);

  // End of a round: a clean round raises the count (after a streak), any miss lowers it.
  const endRound = useCallback(() => {
    if (roundOkRef.current) {
      streakRef.current += 1;
      if (streakRef.current >= 2) {
        kRef.current = Math.min(kRef.current + 1, params.baseGauges + 2, 7);
        streakRef.current = 0;
      }
    } else {
      streakRef.current = 0;
      kRef.current = Math.max(kRef.current - 1, Math.max(4, params.baseGauges - 1));
    }
    setRound((r) => r + 1);
  }, [params]);

  // Grade the current recall question, then advance to the next or end the round.
  const answer = useCallback(
    (choiceId?: string) => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      const q = dataRef.current?.questions[qIdx];
      const ok = !!q && choiceId === q.correctChoiceId;
      askedRef.current += 1;
      if (ok) {
        correctRef.current += 1;
        rtsRef.current.push(Date.now() - recallStartRef.current);
        feedback('correct');
      } else {
        roundOkRef.current = false;
        feedback(choiceId ? 'wrong' : 'timeout');
      }
      if (qIdx < qCountRef.current - 1) {
        setQIdx((i) => i + 1);
      } else {
        endRound();
      }
    },
    [qIdx, feedback, endRound],
  );
  const answerRef = useRef(answer);
  answerRef.current = answer;

  // Drive each round: expose → mask → recall (first question).
  useEffect(() => {
    if (round >= params.rounds) {
      finish();
      return;
    }
    let cancelled = false;
    dataRef.current = buildGaugeRound(rngRef.current, kRef.current);
    qCountRef.current = dataRef.current.questions.length;
    maxKRef.current = Math.max(maxKRef.current, kRef.current);
    roundOkRef.current = true;

    phaseStartRef.current = Date.now();
    phaseDurRef.current = params.exposeMs;
    setSub('expose');
    const t1 = setTimeout(() => {
      if (cancelled) return;
      setSub('mask');
      const t2 = setTimeout(() => {
        if (cancelled) return;
        setQIdx(0);
        setSub('recall');
      }, params.maskMs);
      timers.current.push(t2);
    }, params.exposeMs);
    timers.current.push(t1);

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [round, params, finish]);

  // Each recall question gets its own countdown; auto-miss on timeout.
  useEffect(() => {
    if (sub !== 'recall') return;
    answeredRef.current = false;
    recallStartRef.current = Date.now();
    phaseStartRef.current = Date.now();
    phaseDurRef.current = params.recallMs;
    const id = setTimeout(() => answerRef.current(undefined), params.recallMs);
    return () => clearTimeout(id);
  }, [sub, qIdx, params.recallMs]);

  // Tick the countdown bar during timed phases.
  useEffect(() => {
    if (sub === 'mask') return;
    const id = setInterval(() => setNowTs(Date.now()), 120);
    return () => clearInterval(id);
  }, [sub]);

  const data = dataRef.current;
  const question = data?.questions[qIdx];
  const progress = Math.max(0, Math.min(1, (phaseStartRef.current + phaseDurRef.current - nowTs) / phaseDurRef.current));

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <AppText variant="caption">
          {t('mem.round', { i: Math.min(round + 1, params.rounds), n: params.rounds })}
        </AppText>
        <AppText variant="caption" color={theme.success}>
          ✓ {correctRef.current}
        </AppText>
      </View>
      {sub !== 'mask' ? <TimerBar progress={progress} /> : null}

      {sub === 'expose' && data ? (
        <View style={styles.body}>
          <AppText variant="subtitle">{t('mem.memorize')}</AppText>
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

      {sub === 'recall' && question ? (
        <View style={styles.body}>
          <AppText variant="caption" color={theme.textSecondary}>
            {qIdx + 1} / {qCountRef.current}
          </AppText>
          <AppText variant="subtitle" style={styles.center}>
            {t('mem.recallQ', { n: question.recallIndex + 1 })}
          </AppText>
          <View style={styles.choiceGrid}>
            {question.choices.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => answer(c.id)}
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
