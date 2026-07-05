/**
 * Module mix training. One timed sitting that interleaves generated question-
 * items from every question-based exercise in a single module (round-robin via
 * buildExamItems), run back-to-back with the shared PlayItem. Saves one result
 * per module under exercise id `mix-<module>`, and breaks the score down by
 * exercise so you can see which segment let you down.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';

import type { Difficulty, ExerciseResult, ItemOutcome, ModuleId } from '@/types';
import { EXERCISES, getModule } from '@/data/registry';
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
import { useT } from '@/i18n/useT';

const MIX_COUNT = 15;
const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

interface Entry {
  outcome: ItemOutcome;
  exerciseId: string;
  timeLimitMs: number;
}

/** Question-based exercises for a module (the ones a mix can draw items from). */
export function mixableDefs(moduleId: string) {
  return EXERCISES.filter(
    (e) => e.module === moduleId && (e.runner ?? 'standard') === 'standard' && typeof e.generate === 'function',
  );
}

export function MixRunner({ moduleId }: { moduleId: ModuleId }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  useKeepAwake();

  const addResult = useResultsStore((s) => s.addResult);
  const moduleMeta = getModule(moduleId);
  const defs = useMemo(() => mixableDefs(moduleId), [moduleId]);
  const mixId = `mix-${moduleId}`;
  const accent = moduleMeta?.color ?? theme.tint;

  const [level, setLevel] = useState<Difficulty>(() => useSettingsStore.getState().defaultLevel);
  const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
  const [seed, setSeed] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saved, setSaved] = useState<ExerciseResult | null>(null);
  const prevBestRef = useRef(0);

  const items = useMemo(
    () => (phase === 'playing' ? buildExamItems(seed, level, MIX_COUNT, defs) : []),
    [phase, seed, level, defs],
  );
  const index = entries.length;
  const current = index < items.length ? items[index] : null;

  useEffect(() => {
    if (phase !== 'playing' || saved || entries.length < MIX_COUNT) return;
    let correct = 0;
    let scoreSum = 0;
    let rtSum = 0;
    let answered = 0;
    for (const e of entries) {
      if (e.outcome.correct) {
        correct += 1;
        scoreSum += BASE_POINTS + speedBonus(e.outcome.responseMs, e.timeLimitMs);
      }
      if (e.outcome.answered) {
        rtSum += e.outcome.responseMs;
        answered += 1;
      }
    }
    const result: ExerciseResult = {
      id: makeId(),
      module: moduleId,
      exercise: mixId,
      level,
      date: new Date().toISOString(),
      totalItems: MIX_COUNT,
      correct,
      accuracy: correct / MIX_COUNT,
      avgResponseMs: answered ? Math.round(rtSum / answered) : 0,
      score: scoreSum,
    };
    addResult(result);
    setSaved(result);
    setPhase('done');
  }, [entries, phase, saved, level, addResult, moduleId, mixId]);

  const onComplete = useCallback(
    (outcome: ItemOutcome) => {
      const it = items[entries.length];
      if (!it) return;
      setEntries((prev) => [...prev, { outcome, exerciseId: it.exerciseId, timeLimitMs: it.timeLimitMs }]);
    },
    [items, entries.length],
  );

  const start = useCallback(() => {
    prevBestRef.current = bestScore(useResultsStore.getState().results, mixId);
    setEntries([]);
    setSaved(null);
    setSeed(Math.floor(Math.random() * 1_000_000));
    setPhase('playing');
  }, [mixId]);

  if (defs.length < 2) {
    return (
      <Screen>
        <AppText variant="title">{t('mix.title')}</AppText>
        <AppText variant="bodyMuted">{t('mix.unavailable')}</AppText>
        <PrimaryButton label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (phase === 'intro') {
    const levelOptions = LEVELS.map((l) => ({ value: l, label: t(`level.${l}`) }));
    return (
      <Screen>
        <AppText variant="title">{t('mix.title')}</AppText>
        <AppText variant="bodyMuted">
          {t('mix.introBody', { n: MIX_COUNT, module: moduleMeta ? t(moduleMeta.title) : '' })}
        </AppText>
        <AppText variant="label" style={styles.mt}>
          {t('runner.levelLabel')}
        </AppText>
        <SegmentedControl value={level} options={levelOptions} onChange={setLevel} accent={accent} />
        <View style={styles.actions}>
          <PrimaryButton label={t('common.start')} onPress={start} />
          <PrimaryButton label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (phase === 'done' && saved) {
    const isRecord = saved.score > prevBestRef.current;
    const byEx: Record<string, { c: number; t: number }> = {};
    for (const e of entries) {
      (byEx[e.exerciseId] ??= { c: 0, t: 0 }).t += 1;
      if (e.outcome.correct) byEx[e.exerciseId].c += 1;
    }
    return (
      <Screen>
        <AppText variant="title">{t('mix.doneTitle')}</AppText>
        <View style={styles.statRow}>
          <Stat label={t('runner.score')} value={String(saved.score)} accent={accent} />
          <Stat label={t('runner.accuracy')} value={`${Math.round(saved.accuracy * 100)}%`} />
          <Stat label={t('runner.avgTime')} value={`${(saved.avgResponseMs / 1000).toFixed(1)}s`} />
        </View>
        <AppText variant="label" style={styles.mt}>
          {t('mix.byExercise')}
        </AppText>
        {defs
          .filter((d) => byEx[d.id]?.t)
          .map((d) => (
            <AppText key={d.id} variant="bodyMuted" color={accent}>
              {t(d.title)}: {byEx[d.id].c}/{byEx[d.id].t}
            </AppText>
          ))}
        <View style={[styles.banner, { backgroundColor: isRecord ? theme.success : theme.surfaceAlt }]}>
          <AppText variant="caption" color={isRecord ? theme.successText : theme.textSecondary}>
            {isRecord
              ? t('runner.newRecord', { label: t('mix.title'), prev: prevBestRef.current })
              : t('runner.bestScore', { label: t('mix.title'), best: Math.max(prevBestRef.current, saved.score) })}
          </AppText>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label={t('common.retry')} onPress={start} />
          <PrimaryButton label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const correctSoFar = entries.filter((e) => e.outcome.correct).length;
  const progress = index / MIX_COUNT;
  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <AppText variant="caption">{t('mix.progress', { i: Math.min(index + 1, MIX_COUNT), n: MIX_COUNT })}</AppText>
        <AppText variant="caption" color={theme.success}>
          ✓ {correctSoFar}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
        <View style={{ flex: progress, backgroundColor: accent }} />
        <View style={{ flex: 1 - progress }} />
      </View>

      {current ? (
        <PlayItem key={index} item={current.item} timeLimitMs={current.timeLimitMs} accent={accent} onComplete={onComplete} />
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
