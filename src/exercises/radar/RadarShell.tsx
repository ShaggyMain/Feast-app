/**
 * Radar-specific shell (the SPEC exception to the shared runner): a 1–6 level
 * picker with per-level descriptions and bests, result persistence, and the
 * stanine done screen. Mirrors CustomExerciseShell but for the six DART levels.
 */
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import type { Difficulty, ExerciseResult } from '@/types';
import { useResultsStore } from '@/store/results';
import { useSettingsStore } from '@/store/settings';
import { bestRadarScore } from '@/store/selectors';
import { playCue, type SoundCue } from '@/core/sound';
import { makeId } from '@/core/id';
import { getExercise } from '@/data/registry';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';
import type { RadarLevel } from './engine/types';

export const RADAR_LEVELS: { level: RadarLevel; label: string; desc: string }[] = [
  { level: 1, label: 'L1 · Sterowanie', desc: '1 samolot. Naucz się prowadzić maszynę do bramki w oknie ETA.' },
  { level: 2, label: 'L2 · Skrzyżowanie', desc: '2 maszyny na kursie kolizyjnym + 1 dodatkowa. Rozwiąż konflikt.' },
  { level: 3, label: 'L3 · Cztery maszyny', desc: '4 kontrolowane samoloty — większe obciążenie i skanowanie.' },
  { level: 4, label: 'L4 · Ruch obcy', desc: '4 kontrolowane + 1 niekontrolowany (szary) do omijania.' },
  { level: 5, label: 'L5 · Wysokość', desc: 'Warstwa poziomów lotu (FL): wznoszenie/zniżanie + ciaśniejsze ETA.' },
  { level: 6, label: 'L6 · Maks. obciążenie', desc: '6 + 2 obce, wiele poziomów lotu, maszyny nalatują stopniowo.' },
];

/** Map a radar level to a difficulty bucket for the stored `level` field. */
function difficultyFor(level: RadarLevel): Difficulty {
  if (level <= 2) return 'easy';
  if (level <= 4) return 'medium';
  return 'hard';
}

export interface RadarSummary {
  totalItems: number;
  correct: number;
  accuracy: number;
  score: number;
  lines: string[];
}

export type RadarFeedbackFn = (cue: SoundCue) => void;

export interface RadarRenderArgs {
  level: RadarLevel;
  runKey: number;
  feedback: RadarFeedbackFn;
  onFinish: (summary: RadarSummary) => void;
}

/** Most recently played radar level for this exercise, or 1. */
function lastPlayedLevel(exerciseId: string): RadarLevel {
  const r = useResultsStore.getState().results.find((x) => x.exercise === exerciseId && x.radarLevel);
  const lvl = r?.radarLevel ?? 1;
  return (Math.min(6, Math.max(1, lvl)) as RadarLevel);
}

export function RadarShell({
  exerciseId,
  tip,
  renderPlay,
}: {
  exerciseId: string;
  tip: string;
  renderPlay: (args: RadarRenderArgs) => ReactNode;
}) {
  const router = useRouter();
  const theme = useTheme();
  useKeepAwake();

  const def = getExercise(exerciseId);
  const addResult = useResultsStore((s) => s.addResult);
  const hapticsOn = useSettingsStore((s) => s.haptics);
  const soundOn = useSettingsStore((s) => s.sound);

  const [level, setLevel] = useState<RadarLevel>(() => lastPlayedLevel(exerciseId));
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro');
  const [runKey, setRunKey] = useState(0);
  const [summary, setSummary] = useState<RadarSummary | null>(null);
  const prevBestRef = useRef(0);

  const feedback = useCallback<RadarFeedbackFn>(
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
    (result: RadarSummary) => {
      if (!def) return;
      const saved: ExerciseResult = {
        id: makeId(),
        module: def.module,
        exercise: def.id,
        level: difficultyFor(level),
        radarLevel: level,
        date: new Date().toISOString(),
        totalItems: result.totalItems,
        correct: result.correct,
        accuracy: result.accuracy,
        avgResponseMs: 0,
        score: result.score,
      };
      addResult(saved);
      setSummary(result);
      setPhase('done');
    },
    [def, addResult, level],
  );

  const start = useCallback(() => {
    prevBestRef.current = def
      ? bestRadarScore(useResultsStore.getState().results, def.id, level)
      : 0;
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

  const meta = RADAR_LEVELS[level - 1];

  if (phase === 'intro') {
    const best = bestRadarScore(useResultsStore.getState().results, def.id, level);
    return (
      <Screen>
        <AppText variant="title">{def.title}</AppText>
        <AppText variant="bodyMuted">{def.description}</AppText>
        <View style={styles.tip}>
          <AppText variant="bodyMuted">{tip}</AppText>
        </View>
        <AppText variant="label">POZIOM (L1–L6)</AppText>
        <View style={[styles.levelCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.levelRow}>
            <PrimaryButton
              label="◀"
              variant="secondary"
              onPress={() => setLevel((l) => (Math.max(1, l - 1) as RadarLevel))}
              style={styles.stepBtn}
            />
            <View style={styles.levelLabel}>
              <AppText variant="subtitle" color={theme.text}>
                {meta.label}
              </AppText>
            </View>
            <PrimaryButton
              label="▶"
              variant="secondary"
              onPress={() => setLevel((l) => (Math.min(6, l + 1) as RadarLevel))}
              style={styles.stepBtn}
            />
          </View>
          <AppText variant="bodyMuted">{meta.desc}</AppText>
          <AppText variant="caption" color={theme.textSecondary}>
            Najlepszy wynik: {best > 0 ? best : '—'}
          </AppText>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Start" onPress={start} />
          <PrimaryButton label="Wróć" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (phase === 'done' && summary) {
    const isRecord = summary.score > prevBestRef.current;
    return (
      <Screen>
        <AppText variant="title">Koniec</AppText>
        <AppText variant="caption">Poziom: {meta.label}</AppText>
        <View style={styles.statRow}>
          <Stat label="Wynik" value={String(summary.score)} accent={theme.tint} />
          <Stat label="Na czas" value={`${Math.round(summary.accuracy * 100)}%`} />
          <Stat label="Maszyny" value={String(summary.totalItems)} />
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
              ? `Nowy rekord (${meta.label})! Poprzedni: ${prevBestRef.current}`
              : `Najlepszy wynik (${meta.label}): ${Math.max(prevBestRef.current, summary.score)}`}
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
  levelCard: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  levelLabel: { flex: 1, alignItems: 'center' },
  stepBtn: { minWidth: 64, paddingHorizontal: Spacing.md },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  recordBanner: { borderRadius: Radius.md, padding: Spacing.md },
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
});
