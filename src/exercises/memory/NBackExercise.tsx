/**
 * 3.2 N-back — a stream of letters; tap when the current letter matches the one
 * N steps back. Scores hits / misses / false alarms. Uses CustomExerciseShell.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { mulberry32 } from '@/core/rng';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';
import {
  CustomExerciseShell,
  type CustomSummary,
  type FeedbackFn,
} from '@/exercises/_shared/CustomExercise';
import { buildNbackSequence, nbackParams, type NBackParams, type NBackSequence } from './params';
import { useT } from '@/i18n/useT';

const BLANK_MS = 400;

export function NBackExercise({ exerciseId }: { exerciseId: string }) {
  const t = useT();
  return (
    <CustomExerciseShell
      exerciseId={exerciseId}
      tip={t('tip.nback')}
      renderPlay={({ level, runKey, feedback, onFinish }) => (
        <NBackPlay key={runKey} params={nbackParams(level)} feedback={feedback} onFinish={onFinish} />
      )}
    />
  );
}

function NBackPlay({
  params,
  feedback,
  onFinish,
}: {
  params: NBackParams;
  feedback: FeedbackFn;
  onFinish: (s: CustomSummary) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { n, length, isiMs, targetRate } = params;
  const seqRef = useRef<NBackSequence>(
    buildNbackSequence(mulberry32(Math.floor(Math.random() * 1e9)), n, length, targetRate),
  );
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState<'blank' | 'stim'>('blank');
  const [flash, setFlash] = useState<'none' | 'hit' | 'miss'>('none');
  const respondedRef = useRef(false);
  const stimAtRef = useRef(0);
  const winTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitsRef = useRef<number[]>([]);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const correctRejRef = useRef(0);

  const finish = useCallback(() => {
    const hits = hitsRef.current;
    const targets = seqRef.current.target.filter(Boolean).length;
    const correct = hits.length + correctRejRef.current;
    const avg = hits.length ? Math.round(hits.reduce((a, b) => a + b, 0) / hits.length) : 0;
    const score = hits.length * 60 + correctRejRef.current * 8;
    onFinish({
      totalItems: length,
      correct,
      accuracy: length > 0 ? correct / length : 0,
      avgResponseMs: avg,
      score,
      lines: [
        t('react.hits', { h: hits.length, g: targets }),
        t('react.falseAlarms', { n: falseAlarmsRef.current }),
        t('react.misses', { n: missesRef.current }),
      ],
    });
  }, [length, onFinish]);

  useEffect(() => {
    if (idx >= length) {
      finish();
      return;
    }
    let cancelled = false;
    respondedRef.current = false;
    setFlash('none');
    setSub('blank');
    const t1 = setTimeout(() => {
      if (cancelled) return;
      stimAtRef.current = Date.now();
      setSub('stim');
      winTimer.current = setTimeout(() => {
        if (cancelled) return;
        if (!respondedRef.current) {
          if (seqRef.current.target[idx]) {
            missesRef.current += 1;
            setFlash('miss');
          } else {
            correctRejRef.current += 1;
          }
        }
        setIdx((i) => i + 1);
      }, isiMs);
    }, BLANK_MS);
    return () => {
      cancelled = true;
      clearTimeout(t1);
      if (winTimer.current) clearTimeout(winTimer.current);
    };
  }, [idx, length, isiMs, finish]);

  const onMatch = () => {
    if (sub !== 'stim' || respondedRef.current) return;
    respondedRef.current = true;
    if (seqRef.current.target[idx]) {
      hitsRef.current.push(Date.now() - stimAtRef.current);
      setFlash('hit');
      feedback('correct');
    } else {
      falseAlarmsRef.current += 1;
      feedback('wrong');
    }
  };

  const letter = sub === 'stim' ? seqRef.current.seq[idx] : '·';
  const bg = flash === 'hit' ? theme.success : flash === 'miss' ? theme.danger : theme.surfaceAlt;

  return (
    <Pressable style={[styles.area, { backgroundColor: theme.background }]} onPress={onMatch}>
      <View style={styles.header}>
        <AppText variant="caption" color={theme.tint}>
          {n}-back
        </AppText>
        <AppText variant="caption">
          {Math.min(idx + 1, length)} / {length}
        </AppText>
      </View>
      <View style={styles.center}>
        <View style={[styles.tile, { backgroundColor: bg }]}>
          <AppText variant="hero" color={sub === 'stim' ? theme.text : theme.textSecondary} style={styles.letter}>
            {letter}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color={theme.textSecondary} style={styles.hint}>
        {n === 1 ? t('nback.hint1', { n }) : t('nback.hintN', { n })}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, padding: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tile: {
    width: 160,
    height: 160,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 72, fontWeight: '800' },
  hint: { textAlign: 'center', marginBottom: Spacing.md },
});
