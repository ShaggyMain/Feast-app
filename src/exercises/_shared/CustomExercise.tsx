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
import { useSettingsStore } from '@/store/settings';
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

const LEVEL_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Łatwy' },
  { value: 'medium', label: 'Średni' },
  { value: 'hard', label: 'Trudny' },
];

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
  useKeepAwake();

  const def = getExercise(exerciseId);
  const addResult = useResultsStore((s) => s.addResult);
  const hapticsOn = useSettingsStore((s) => s.haptics);
  const soundOn = useSettingsStore((s) => s.sound);

  const [level, setLevel] = useState<Difficulty>(() => useSettingsStore.getState().defaultLevel);
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
        <View style={styles.tip}>
          <AppText variant="bodyMuted">{tip}</AppText>
        </View>
        <AppText variant="label">POZIOM TRUDNOŚCI</AppText>
        <SegmentedControl value={level} options={LEVEL_OPTIONS} onChange={setLevel} accent={theme.tint} />
        <View style={styles.actions}>
          <PrimaryButton label="Start" onPress={start} />
          <PrimaryButton label="Wróć" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (phase === 'done' && summary) {
    const isRecord = summary.score > prevBestRef.current;
    const levelLabel = LEVEL_OPTIONS.find((l) => l.value === level)?.label ?? level;
    return (
      <Screen>
        <AppText variant="title">Koniec</AppText>
        <AppText variant="caption">Poziom: {levelLabel}</AppText>
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
          style={[styles.recordBanner, { backgroundColor: isRecord ? theme.success : theme.surfaceAlt }]}>
          <AppText variant="caption" color={isRecord ? theme.successText : theme.textSecondary}>
            {isRecord
              ? `Nowy rekord (${levelLabel})! Poprzedni: ${prevBestRef.current}`
              : `Najlepszy wynik (${levelLabel}): ${Math.max(prevBestRef.current, summary.score)}`}
          </AppText>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Jeszcze raz" onPress={start} />
          <PrimaryButton label="Zmień poziom" variant="secondary" onPress={() => setPhase('intro')} />
          <PrimaryButton label="Wróć" variant="ghost" onPress={() => router.back()} />
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
