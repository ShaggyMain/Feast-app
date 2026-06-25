/**
 * Custom interactive runner for the reaction-time exercises (4.1 simple
 * reaction, 4.2 go/no-go). These don't fit the generated-item runner — they
 * measure response latency — so they have their own component but still persist
 * a standard ExerciseResult (accuracy + avgResponseMs + score).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import type { ExerciseResult, RunnerKind } from '@/types';
import { useResultsStore } from '@/store/results';
import { useSettingsStore } from '@/store/settings';
import { bestScore } from '@/store/selectors';
import { playCue } from '@/core/sound';
import { makeId } from '@/core/id';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';
import { getExercise } from '@/data/registry';

const SIMPLE_TRIALS = 5;
const GONOGO_TRIALS = 14;
const GONOGO_ISI_MS = 600;
const GONOGO_WINDOW_MS = 900;

export interface ReactionSummary {
  totalItems: number;
  correct: number;
  accuracy: number;
  avgResponseMs: number;
  score: number;
  lines: string[];
}

export function ReactionExercise({ exerciseId, kind }: { exerciseId: string; kind: RunnerKind }) {
  const router = useRouter();
  const theme = useTheme();
  useKeepAwake();

  const def = getExercise(exerciseId);
  const addResult = useResultsStore((s) => s.addResult);
  const hapticsOn = useSettingsStore((s) => s.haptics);
  const soundOn = useSettingsStore((s) => s.sound);

  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro');
  const [runKey, setRunKey] = useState(0);
  const [summary, setSummary] = useState<ReactionSummary | null>(null);
  const prevBestRef = useRef(0);

  const feedback = useCallback(
    (ok: boolean) => {
      if (hapticsOn && Platform.OS !== 'web') {
        Haptics.notificationAsync(
          ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      if (soundOn) playCue(ok ? 'correct' : 'wrong');
    },
    [hapticsOn, soundOn],
  );

  const onFinish = useCallback(
    (result: ReactionSummary) => {
      if (!def) return;
      const saved: ExerciseResult = {
        id: makeId(),
        module: def.module,
        exercise: def.id,
        level: 'medium',
        date: new Date().toISOString(),
        totalItems: result.totalItems,
        correct: result.correct,
        accuracy: result.accuracy,
        avgResponseMs: result.avgResponseMs,
        score: result.score,
      };
      addResult(saved);
      setSummary(result);
      setPhase('done');
    },
    [def, addResult],
  );

  const start = useCallback(() => {
    prevBestRef.current = def ? bestScore(useResultsStore.getState().results, def.id) : 0;
    setSummary(null);
    setRunKey((k) => k + 1);
    setPhase('running');
  }, [def]);

  if (!def) {
    return (
      <Screen>
        <AppText variant="title">Nie znaleziono ćwiczenia</AppText>
        <PrimaryButton label="Wróć" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <Screen>
        <AppText variant="title">{def.title}</AppText>
        <AppText variant="bodyMuted">{def.description}</AppText>
        <View style={styles.tipBox}>
          <AppText variant="bodyMuted">
            {kind === 'reaction-simple'
              ? 'Czekaj na zielony ekran i dotknij jak najszybciej. Dotknięcie przed zielonym to falstart.'
              : 'Dotknij na ZIELONY (GO), wstrzymaj się na CZERWONY (NO-GO). Liczy się szybkość i opanowanie.'}
          </AppText>
        </View>
        <PrimaryButton label="Start" onPress={start} />
        <PrimaryButton label="Wróć" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (phase === 'done' && summary) {
    const isRecord = summary.score > prevBestRef.current;
    return (
      <Screen>
        <AppText variant="title">Koniec</AppText>
        <View style={styles.statRow}>
          <Stat label="Wynik" value={String(summary.score)} accent={theme.tint} />
          <Stat label="Trafność" value={`${Math.round(summary.accuracy * 100)}%`} />
          <Stat label="Śr. czas" value={summary.avgResponseMs ? `${summary.avgResponseMs} ms` : '—'} />
        </View>
        {summary.lines.map((line) => (
          <AppText key={line} variant="bodyMuted">
            {line}
          </AppText>
        ))}
        <View
          style={[
            styles.recordBanner,
            { backgroundColor: isRecord ? theme.success : theme.surfaceAlt },
          ]}>
          <AppText variant="caption" color={isRecord ? theme.successText : theme.textSecondary}>
            {isRecord
              ? `Nowy rekord! Poprzedni: ${prevBestRef.current}`
              : `Najlepszy wynik: ${Math.max(prevBestRef.current, summary.score)}`}
          </AppText>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Jeszcze raz" onPress={start} />
          <PrimaryButton label="Statystyki" variant="secondary" onPress={() => router.push('/stats')} />
          <PrimaryButton label="Wróć" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // running
  return kind === 'reaction-simple' ? (
    <SimpleReaction key={runKey} trials={SIMPLE_TRIALS} feedback={feedback} onFinish={onFinish} />
  ) : (
    <GoNoGo key={runKey} trials={GONOGO_TRIALS} feedback={feedback} onFinish={onFinish} />
  );
}

// ---------------------------------------------------------------------------

interface RunnerProps {
  trials: number;
  feedback: (ok: boolean) => void;
  onFinish: (summary: ReactionSummary) => void;
}

function SimpleReaction({ trials, feedback, onFinish }: RunnerProps) {
  const theme = useTheme();
  const [state, setState] = useState<'waiting' | 'go' | 'falsestart'>('waiting');
  const [done, setDone] = useState(0);
  const rtsRef = useRef<number[]>([]);
  const falseStartsRef = useRef(0);
  const goAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleGo = useCallback(() => {
    setState('waiting');
    const delay = 1000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      goAtRef.current = Date.now();
      setState('go');
    }, delay);
  }, []);

  useEffect(() => {
    scheduleGo();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleGo]);

  const finish = () => {
    const rts = rtsRef.current;
    const avg = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
    const best = rts.length ? Math.min(...rts) : 0;
    const fs = falseStartsRef.current;
    const score = rts.reduce((s, rt) => s + Math.max(0, 600 - rt), 0);
    onFinish({
      totalItems: trials,
      correct: trials,
      accuracy: trials / (trials + fs),
      avgResponseMs: avg,
      score,
      lines: [`Najlepszy czas: ${best} ms`, `Falstarty: ${fs}`],
    });
  };

  const handlePress = () => {
    if (state === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      falseStartsRef.current += 1;
      feedback(false);
      setState('falsestart');
      timerRef.current = setTimeout(scheduleGo, 900);
      return;
    }
    if (state === 'go') {
      rtsRef.current.push(Date.now() - goAtRef.current);
      feedback(true);
      const n = done + 1;
      setDone(n);
      if (n >= trials) finish();
      else scheduleGo();
    }
  };

  const bg = state === 'go' ? theme.success : state === 'falsestart' ? theme.warning : theme.danger;
  const title =
    state === 'go' ? 'TERAZ!' : state === 'falsestart' ? 'Falstart!' : 'Czekaj na zielony…';
  const sub = state === 'go' ? 'dotknij jak najszybciej' : state === 'falsestart' ? 'za wcześnie' : '';

  return (
    <Pressable style={[styles.fullArea, { backgroundColor: bg }]} onPress={handlePress}>
      <AppText variant="caption" color="#FFFFFF" style={styles.counter}>
        Próba {Math.min(done + 1, trials)} / {trials}
      </AppText>
      <View style={styles.center}>
        <AppText variant="hero" color="#FFFFFF" style={styles.centerText}>
          {title}
        </AppText>
        {sub ? (
          <AppText variant="body" color="#FFFFFF" style={styles.centerText}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------

function buildGoNoGoSequence(trials: number): Array<'go' | 'nogo'> {
  return Array.from({ length: trials }, () => (Math.random() < 0.7 ? 'go' : 'nogo'));
}

function GoNoGo({ trials, feedback, onFinish }: RunnerProps) {
  const theme = useTheme();
  const seqRef = useRef<Array<'go' | 'nogo'>>(buildGoNoGoSequence(trials));
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'blank' | 'stim'>('blank');
  const stim = seqRef.current[Math.min(idx, trials - 1)];

  const respondedRef = useRef(false);
  const stimAtRef = useRef(0);
  const windowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hitsRef = useRef<number[]>([]);
  const missesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const correctRejRef = useRef(0);

  const finish = useCallback(() => {
    const hits = hitsRef.current;
    const goCount = seqRef.current.filter((s) => s === 'go').length;
    const correct = hits.length + correctRejRef.current;
    const avg = hits.length ? Math.round(hits.reduce((a, b) => a + b, 0) / hits.length) : 0;
    const score = hits.reduce((s, rt) => s + Math.max(0, 700 - rt), 0) + correctRejRef.current * 40;
    onFinish({
      totalItems: trials,
      correct,
      accuracy: correct / trials,
      avgResponseMs: avg,
      score,
      lines: [
        `Trafienia: ${hits.length}/${goCount}`,
        `Fałszywe alarmy: ${falseAlarmsRef.current}`,
        `Pominięcia: ${missesRef.current}`,
      ],
    });
  }, [trials, onFinish]);

  useEffect(() => {
    if (idx >= trials) {
      finish();
      return;
    }
    let cancelled = false;
    respondedRef.current = false;
    setPhase('blank');
    const isiTimer = setTimeout(() => {
      if (cancelled) return;
      stimAtRef.current = Date.now();
      setPhase('stim');
      windowTimer.current = setTimeout(() => {
        if (cancelled) return;
        if (!respondedRef.current) {
          if (seqRef.current[idx] === 'go') missesRef.current += 1;
          else correctRejRef.current += 1;
        }
        setIdx((i) => i + 1);
      }, GONOGO_WINDOW_MS);
    }, GONOGO_ISI_MS);
    return () => {
      cancelled = true;
      clearTimeout(isiTimer);
      if (windowTimer.current) clearTimeout(windowTimer.current);
    };
  }, [idx, trials, finish]);

  const handlePress = () => {
    if (phase !== 'stim' || respondedRef.current) return;
    respondedRef.current = true;
    if (seqRef.current[idx] === 'go') {
      hitsRef.current.push(Date.now() - stimAtRef.current);
      feedback(true);
    } else {
      falseAlarmsRef.current += 1;
      feedback(false);
    }
    if (windowTimer.current) clearTimeout(windowTimer.current);
    setTimeout(() => setIdx((i) => i + 1), 220);
  };

  const showStim = phase === 'stim';
  const bg = showStim ? (stim === 'go' ? theme.success : theme.danger) : theme.surfaceAlt;
  const title = showStim ? (stim === 'go' ? 'GO' : 'STOP') : '·';

  return (
    <Pressable style={[styles.fullArea, { backgroundColor: bg }]} onPress={handlePress}>
      <AppText variant="caption" color={theme.textSecondary} style={styles.counter}>
        {Math.min(idx + 1, trials)} / {trials}
      </AppText>
      <View style={styles.center}>
        <AppText variant="hero" color={showStim ? '#FFFFFF' : theme.textSecondary} style={styles.centerText}>
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullArea: { flex: 1, padding: Spacing.lg },
  counter: { textAlign: 'center', marginTop: Spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  centerText: { textAlign: 'center' },
  tipBox: { paddingVertical: Spacing.xs },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  recordBanner: { borderRadius: Radius.md, padding: Spacing.md },
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
});
