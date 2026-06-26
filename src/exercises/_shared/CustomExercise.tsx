/**
 * Shared shell for custom (non-generated) exercises: difficulty intro, result
 * persistence, and the done screen. The exercise supplies a `renderPlay`
 * render-prop that drives its own interactive UI and calls `onFinish`.
 */
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import type { Difficulty, ExerciseResult } from '@/types';
import { useResultsStore } from '@/store/results';
import { pickInitialLevel, useSettingsStore } from '@/store/settings';
import { bestScore } from '@/store/selectors';
import { playCue, type SoundCue } from '@/core/sound';
import { makeId } from '@/core/id';
import { getExercise } from '@/data/registry';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';
import { useT } from '@/i18n/useT';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

export interface CustomSummary {
  totalItems: number;
  correct: number;
  accuracy: number;
  avgResponseMs: number;
  score: number;
  lines: string[];
}

export type FeedbackFn = (cue: SoundCue) => void;

export interface RenderPlayArgs {
  level: Difficulty;
  runKey: number;
  feedback: FeedbackFn;
  onFinish: (summary: CustomSummary) => void;
}

export function CustomExerciseShell({
  exerciseId,
  tip,
  renderPlay,
}: {
  exerciseId: string;
  tip: string;
  renderPlay: (args: RenderPlayArgs) => ReactNode;
}) {
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
  const [summary, setSummary] = useState<CustomSummary | null>(null);
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
    (result: CustomSummary) => {
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
        <View style={styles.tip}>
          <AppText variant="bodyMuted">{tip}</AppText>
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
          <PrimaryButton label={t('common.retry')} onPress={start} />
          <PrimaryButton label={t('common.changeLevel')} variant="secondary" onPress={() => setPhase('intro')} />
          <PrimaryButton label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return <>{renderPlay({ level, runKey, feedback, onFinish })}</>;
}

const styles = StyleSheet.create({
  tip: { paddingVertical: Spacing.xs },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  recordBanner: { borderRadius: Radius.md, padding: Spacing.md },
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
});
