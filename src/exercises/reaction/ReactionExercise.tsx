/**
 * Custom interactive runner for the reaction-time exercises (4.1 simple
 * reaction, 4.2 go/no-go). These measure response latency rather than grading
 * generated items, so they have their own component, but still persist a
 * standard ExerciseResult. Difficulty (easy/medium/hard) tunes the response
 * deadline / stimulus windows / trial count via `params.ts`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import type { Difficulty, ExerciseResult, RunnerKind } from '@/types';
import { useResultsStore } from '@/store/results';
import { pickInitialLevel, useSettingsStore } from '@/store/settings';
import { bestScore } from '@/store/selectors';
import { playCue, type SoundCue } from '@/core/sound';
import { makeId } from '@/core/id';
import { getExercise } from '@/data/registry';
import { gonogoParams, simpleParams, type GoNoGoParams, type SimpleParams } from '@/exercises/reaction/params';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { MixNextButton } from '@/runner/MixNextButton';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';
import { useT } from '@/i18n/useT';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

export interface ReactionSummary {
  totalItems: number;
  correct: number;
  accuracy: number;
  avgResponseMs: number;
  score: number;
  lines: string[];
}

type FeedbackFn = (cue: SoundCue) => void;

export function ReactionExercise({ exerciseId, kind }: { exerciseId: string; kind: RunnerKind }) {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  useKeepAwake();
  const levelOptions = LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) }));

  const def = getExercise(exerciseId);
  const addResult = useResultsStore((s) => s.addResult);
  const hapticsOn = useSettingsStore((s) => s.haptics);
  const soundOn = useSettingsStore((s) => s.sound);

  const [level, setLevel] = useState<Difficulty>(() => pickInitialLevel(exerciseId));
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro');
  const [runKey, setRunKey] = useState(0);
  const [summary, setSummary] = useState<ReactionSummary | null>(null);
  const prevBestRef = useRef(0);

  const feedback = useCallback<FeedbackFn>(
    (cue) => {
      if (hapticsOn && Platform.OS !== 'web') {
        Haptics.notificationAsync(
          cue === 'correct'
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      if (soundOn) playCue(cue);
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
        level,
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
    [def, addResult, level],
  );

  const start = useCallback(() => {
    prevBestRef.current = def ? bestScore(useResultsStore.getState().results, def.id, level) : 0;
    setSummary(null);
    setRunKey((k) => k + 1);
    setPhase('running');
  }, [def, level]);

  if (!def) {
    return (
      <Screen>
        <AppText variant="title">{t('common.notFound')}</AppText>
        <PrimaryButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <Screen>
        <AppText variant="title">{t(def.title)}</AppText>
        <AppText variant="bodyMuted">{t(def.description)}</AppText>
        <View style={styles.tipBox}>
          <AppText variant="bodyMuted">
            {t(kind === 'reaction-simple' ? 'tip.reactSimple' : 'tip.reactGonogo')}
          </AppText>
        </View>
        <AppText variant="label">{t('runner.levelLabel')}</AppText>
        <SegmentedControl value={level} options={levelOptions} onChange={setLevel} accent={theme.tint} />
        <View style={styles.actions}>
          <PrimaryButton label={t('common.start')} onPress={start} />
          <PrimaryButton label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (phase === 'done' && summary) {
    const isRecord = summary.score > prevBestRef.current;
    const levelLabel = t(`level.${level}`);
    return (
      <Screen>
        <AppText variant="title">{t('shell.done')}</AppText>
        <AppText variant="caption">{t('runner.levelPrefix', { label: levelLabel })}</AppText>
        <View style={styles.statRow}>
          <Stat label={t('runner.score')} value={String(summary.score)} accent={theme.tint} />
          <Stat label={t('runner.accuracy')} value={`${Math.round(summary.accuracy * 100)}%`} />
          <Stat label={t('runner.avgTime')} value={summary.avgResponseMs ? `${summary.avgResponseMs} ms` : '—'} />
        </View>
        {summary.lines.map((line) => (
          <AppText key={line} variant="bodyMuted">
            {line}
          </AppText>
        ))}
        <View
          style={[styles.recordBanner, { backgroundColor: isRecord ? theme.success : theme.surfaceAlt }]}>
          <AppText variant="caption" color={isRecord ? theme.successText : theme.textSecondary}>
            {isRecord
              ? t('runner.newRecord', { label: levelLabel, prev: prevBestRef.current })
              : t('runner.bestScore', { label: levelLabel, best: Math.max(prevBestRef.current, summary.score) })}
          </AppText>
        </View>
        <View style={styles.actions}>
          <MixNextButton exerciseId={exerciseId} />
          <PrimaryButton label={t('common.retry')} onPress={start} />
          <PrimaryButton label={t('common.changeLevel')} variant="secondary" onPress={() => setPhase('intro')} />
          <PrimaryButton label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return kind === 'reaction-simple' ? (
    <SimpleReaction key={runKey} params={simpleParams(level)} feedback={feedback} onFinish={onFinish} />
  ) : (
    <GoNoGo key={runKey} params={gonogoParams(level)} feedback={feedback} onFinish={onFinish} />
  );
}

// ---------------------------------------------------------------------------

function SimpleReaction({
  params,
  feedback,
  onFinish,
}: {
  params: SimpleParams;
  feedback: FeedbackFn;
  onFinish: (summary: ReactionSummary) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { trials, deadlineMs } = params;

  const [state, setState] = useState<'waiting' | 'go' | 'falsestart'>('waiting');
  const [done, setDone] = useState(0);
  const [retry, setRetry] = useState(0);
  const resolvedRef = useRef(false);
  const goAtRef = useRef(0);
  const waitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rtsRef = useRef<number[]>([]);
  const missesRef = useRef(0);
  const falseStartsRef = useRef(0);

  const finish = useCallback(() => {
    const rts = rtsRef.current;
    const avg = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 0;
    const best = rts.length ? Math.min(...rts) : 0;
    const score = rts.reduce((s, rt) => s + Math.max(0, 600 - rt), 0);
    onFinish({
      totalItems: trials,
      correct: rts.length,
      accuracy: trials > 0 ? rts.length / trials : 0,
      avgResponseMs: avg,
      score,
      lines: [
        t('react.bestTime', { ms: best }),
        t('react.missesSlow', { n: missesRef.current }),
        t('react.falseStarts', { n: falseStartsRef.current }),
      ],
    });
  }, [trials, onFinish]);

  // Each (done, retry) starts a trial: wait a random delay, flash green, then
  // a deadline. A false start bumps `retry` to restart the same trial.
  useEffect(() => {
    if (done >= trials) {
      finish();
      return;
    }
    let cancelled = false;
    resolvedRef.current = false;
    setState('waiting');
    waitTimer.current = setTimeout(() => {
      if (cancelled) return;
      goAtRef.current = Date.now();
      setState('go');
      deadlineTimer.current = setTimeout(() => {
        if (cancelled || resolvedRef.current) return;
        resolvedRef.current = true;
        missesRef.current += 1;
        feedback('timeout');
        setDone((d) => d + 1);
      }, deadlineMs);
    }, 1000 + Math.random() * 3000);
    return () => {
      cancelled = true;
      if (waitTimer.current) clearTimeout(waitTimer.current);
      if (deadlineTimer.current) clearTimeout(deadlineTimer.current);
    };
  }, [done, retry, trials, deadlineMs, feedback, finish]);

  const handlePress = () => {
    if (state === 'waiting') {
      if (waitTimer.current) clearTimeout(waitTimer.current);
      falseStartsRef.current += 1;
      feedback('wrong');
      setState('falsestart');
      setTimeout(() => setRetry((r) => r + 1), 900);
      return;
    }
    if (state === 'go') {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      if (deadlineTimer.current) clearTimeout(deadlineTimer.current);
      rtsRef.current.push(Date.now() - goAtRef.current);
      feedback('correct');
      setDone((d) => d + 1);
    }
  };

  const bg = state === 'go' ? theme.success : state === 'falsestart' ? theme.warning : theme.danger;
  const title =
    state === 'go' ? t('react.now') : state === 'falsestart' ? t('react.falseStart') : t('react.waitGreen');
  const sub = state === 'go' ? t('react.tapFast') : state === 'falsestart' ? t('react.tooEarly') : '';

  return (
    <Pressable style={[styles.fullArea, { backgroundColor: bg }]} onPress={handlePress}>
      <AppText variant="caption" color="#FFFFFF" style={styles.counter}>
        {t('react.trial', { i: Math.min(done + 1, trials), n: trials })}
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

function buildSequence(trials: number, goRatio: number): Array<'go' | 'nogo'> {
  return Array.from({ length: trials }, () => (Math.random() < goRatio ? 'go' : 'nogo'));
}

function GoNoGo({
  params,
  feedback,
  onFinish,
}: {
  params: GoNoGoParams;
  feedback: FeedbackFn;
  onFinish: (summary: ReactionSummary) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { trials, windowMs, isiMs, goRatio } = params;
  const seqRef = useRef<Array<'go' | 'nogo'>>(buildSequence(trials, goRatio));
  const [idx, setIdx] = useState(0);
  // What the panel currently shows; `null` is the blank ISI gap. Kept separate
  // from `idx` on purpose: advancing the trial must never pull the *next*
  // stimulus onto the screen before the blank gap, which would reveal (GO vs
  // STOP) a frame early and let you know whether to tap before the icon shows.
  const [shown, setShown] = useState<'go' | 'nogo' | null>(null);

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
        t('react.hits', { h: hits.length, g: goCount }),
        t('react.falseAlarms', { n: falseAlarmsRef.current }),
        t('react.misses', { n: missesRef.current }),
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
    setShown(null);
    const isiTimer = setTimeout(() => {
      if (cancelled) return;
      stimAtRef.current = Date.now();
      setShown(seqRef.current[idx]);
      windowTimer.current = setTimeout(() => {
        if (cancelled) return;
        if (!respondedRef.current) {
          if (seqRef.current[idx] === 'go') missesRef.current += 1;
          else correctRejRef.current += 1;
        }
        // Blank the panel *before* advancing so the next stimulus can't flash.
        setShown(null);
        setIdx((i) => i + 1);
      }, windowMs);
    }, isiMs);
    return () => {
      cancelled = true;
      clearTimeout(isiTimer);
      if (windowTimer.current) clearTimeout(windowTimer.current);
    };
  }, [idx, trials, windowMs, isiMs, finish]);

  const handlePress = () => {
    if (shown === null || respondedRef.current) return;
    respondedRef.current = true;
    if (seqRef.current[idx] === 'go') {
      hitsRef.current.push(Date.now() - stimAtRef.current);
      feedback('correct');
    } else {
      falseAlarmsRef.current += 1;
      feedback('wrong');
    }
    if (windowTimer.current) clearTimeout(windowTimer.current);
    setTimeout(() => {
      setShown(null);
      setIdx((i) => i + 1);
    }, 220);
  };

  const showStim = shown !== null;
  const bg = showStim ? (shown === 'go' ? theme.success : theme.danger) : theme.surfaceAlt;
  const title = showStim ? (shown === 'go' ? 'GO' : 'STOP') : '·';

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
