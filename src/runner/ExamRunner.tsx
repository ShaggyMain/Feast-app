/**
 * Exam mode runner (M5). Pulls a mixed set of generated items across modules
 * (see exam.ts) and runs them back-to-back with the shared PlayItem — one long
 * timed sitting. Saves a single ExerciseResult under exercise id 'exam'.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';

import type { Difficulty, ExerciseResult, ItemOutcome, ModuleId } from '@/types';
import { EXERCISES, MODULES, getModule } from '@/data/registry';
import { BASE_POINTS, speedBonus } from '@/runner/scoring';
import { PlayItem } from '@/runner/ExerciseRunner';
import { buildExamItems } from '@/runner/exam';
import { useResultsStore } from '@/store/results';
import { useSettingsStore } from '@/store/settings';
import { bestScore } from '@/store/selectors';
import { makeId } from '@/core/id';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';

const EXAM_COUNT = 20;
const LEVEL_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Łatwy' },
  { value: 'medium', label: 'Średni' },
  { value: 'hard', label: 'Trudny' },
];

interface Entry {
  outcome: ItemOutcome;
  module: ModuleId;
  timeLimitMs: number;
}

export function ExamRunner() {
  const theme = useTheme();
  const router = useRouter();
  useKeepAwake();

  const addResult = useResultsStore((s) => s.addResult);
  const standardDefs = useMemo(
    () => EXERCISES.filter((e) => (e.runner ?? 'standard') === 'standard' && e.generate),
    [],
  );

  const [level, setLevel] = useState<Difficulty>(() => useSettingsStore.getState().defaultLevel);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
  const [seed, setSeed] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saved, setSaved] = useState<ExerciseResult | null>(null);
  const prevBestRef = useRef(0);

  const items = useMemo(
    () => (phase === 'playing' ? buildExamItems(seed, level, EXAM_COUNT, standardDefs) : []),
    [phase, seed, level, standardDefs],
  );
  const index = entries.length;
  const current = index < items.length ? items[index] : null;

  useEffect(() => {
    if (phase !== 'playing' || saved || entries.length < EXAM_COUNT) return;
    let correct = 0;
    let scoreSum = 0;
    let rtSum = 0;
    let answered = 0;
    const byModule: Record<ModuleId, { c: number; t: number }> = {
      math: { c: 0, t: 0 },
      spatial: { c: 0, t: 0 },
      memory: { c: 0, t: 0 },
      reaction: { c: 0, t: 0 },
    };
    for (const e of entries) {
      byModule[e.module].t += 1;
      if (e.outcome.correct) {
        correct += 1;
        byModule[e.module].c += 1;
        scoreSum += BASE_POINTS + speedBonus(e.outcome.responseMs, e.timeLimitMs);
      }
      if (e.outcome.answered) {
        rtSum += e.outcome.responseMs;
        answered += 1;
      }
    }
    const result: ExerciseResult = {
      id: makeId(),
      module: 'math',
      exercise: 'exam',
      level,
      date: new Date().toISOString(),
      totalItems: EXAM_COUNT,
      correct,
      accuracy: correct / EXAM_COUNT,
      avgResponseMs: answered ? Math.round(rtSum / answered) : 0,
      score: scoreSum,
    };
    addResult(result);
    setSaved(result);
    setPhase('done');
  }, [entries, phase, saved, level, addResult]);

  const onComplete = useCallback(
    (outcome: ItemOutcome) => {
      const it = items[entries.length];
      if (!it) return;
      setEntries((prev) => [...prev, { outcome, module: it.module, timeLimitMs: it.timeLimitMs }]);
    },
    [items, entries.length],
  );

  const start = useCallback(() => {
    prevBestRef.current = bestScore(useResultsStore.getState().results, 'exam');
    setEntries([]);
    setSaved(null);
    setSeed(Math.floor(Math.random() * 1_000_000));
    setPhase('playing');
  }, []);

  if (phase === 'intro') {
    return (
      <Screen>
        <AppText variant="title">Tryb egzaminacyjny</AppText>
        <AppText variant="bodyMuted">
          {EXAM_COUNT} pytań z różnych modułów, jedno po drugim, bez przerw i bez podpowiedzi o
          ćwiczeniu — symulacja zmęczenia jak na FEAST.
        </AppText>
        <AppText variant="label" style={styles.mt}>
          POZIOM TRUDNOŚCI
        </AppText>
        <SegmentedControl value={level} options={LEVEL_OPTIONS} onChange={setLevel} accent={theme.tint} />
        <View style={styles.actions}>
          <PrimaryButton label="Start egzaminu" onPress={start} />
          <PrimaryButton label="Wróć" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (phase === 'done' && saved) {
    const isRecord = saved.score > prevBestRef.current;
    const byModule: Record<ModuleId, { c: number; t: number }> = {
      math: { c: 0, t: 0 },
      spatial: { c: 0, t: 0 },
      memory: { c: 0, t: 0 },
      reaction: { c: 0, t: 0 },
    };
    for (const e of entries) {
      byModule[e.module].t += 1;
      if (e.outcome.correct) byModule[e.module].c += 1;
    }
    return (
      <Screen>
        <AppText variant="title">Egzamin ukończony</AppText>
        <View style={styles.statRow}>
          <Stat label="Wynik" value={String(saved.score)} accent={theme.tint} />
          <Stat label="Trafność" value={`${Math.round(saved.accuracy * 100)}%`} />
          <Stat label="Śr. czas" value={`${(saved.avgResponseMs / 1000).toFixed(1)}s`} />
        </View>
        <AppText variant="label" style={styles.mt}>
          WG MODUŁU
        </AppText>
        {MODULES.filter((m) => byModule[m.id].t > 0).map((m) => (
          <AppText key={m.id} variant="bodyMuted" color={m.color}>
            {m.title}: {byModule[m.id].c}/{byModule[m.id].t}
          </AppText>
        ))}
        <View style={[styles.banner, { backgroundColor: isRecord ? theme.success : theme.surfaceAlt }]}>
          <AppText variant="caption" color={isRecord ? theme.successText : theme.textSecondary}>
            {isRecord
              ? `Nowy rekord egzaminu! Poprzedni: ${prevBestRef.current}`
              : `Najlepszy egzamin: ${Math.max(prevBestRef.current, saved.score)}`}
          </AppText>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Jeszcze raz" onPress={start} />
          <PrimaryButton label="Postępy" variant="secondary" onPress={() => router.push('/progress')} />
          <PrimaryButton label="Wróć" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const accent = current ? getModule(current.module)?.color ?? theme.tint : theme.tint;
  const correctSoFar = entries.filter((e) => e.outcome.correct).length;
  const progress = index / EXAM_COUNT;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <AppText variant="caption">
          Egzamin · {Math.min(index + 1, EXAM_COUNT)} / {EXAM_COUNT}
        </AppText>
        <AppText variant="caption" color={theme.success}>
          ✓ {correctSoFar}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View style={{ flex: progress, backgroundColor: theme.tint }} />
        <View style={{ flex: 1 - progress }} />
      </View>

      {current ? (
        <PlayItem
          key={index}
          item={current.item}
          timeLimitMs={current.timeLimitMs}
          accent={accent}
          onComplete={onComplete}
        />
      ) : (
        <View style={styles.flex} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mt: { marginTop: Spacing.sm },
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden', flexDirection: 'row' },
  banner: { borderRadius: Radius.md, padding: Spacing.md },
  flex: { flex: 1 },
});
