import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { MaxContentWidth, ModuleColors, Spacing } from '@/constants/theme';
import type { ModuleId } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { useResultsStore } from '@/store/results';
import { bestScore, dailyStreak, series } from '@/store/selectors';
import { Screen } from '@/ui/Screen';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';
import { LineChart } from '@/ui/Chart';

type Filter = 'all' | ModuleId;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Wsz.' },
  { value: 'math', label: 'Mat' },
  { value: 'spatial', label: 'Prze' },
  { value: 'memory', label: 'Pam' },
  { value: 'reaction', label: 'Rea' },
];

export default function ProgressScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const results = useResultsStore((s) => s.results);
  const [filter, setFilter] = useState<Filter>('all');

  const chartW = Math.min(width, MaxContentWidth) - 32 - 24;
  const accent = filter === 'all' ? theme.tint : ModuleColors[filter];

  // Charts exclude the cross-module exam; the exam best is shown separately.
  const base = results.filter((r) => r.exercise !== 'exam');
  const opts = { module: filter === 'all' ? undefined : filter, limit: 20 };
  const scoreData = series(base, 'score', opts);
  const accData = series(base, 'accuracy', opts).map((a) => Math.round(a * 100));

  const filtered = base.filter((r) => filter === 'all' || r.module === filter);
  const sessions = filtered.length;
  const best = filtered.reduce((m, r) => Math.max(m, r.score), 0);
  const streak = dailyStreak(results);
  const examBest = bestScore(results, 'exam');

  return (
    <Screen>
      <SegmentedControl value={filter} options={FILTERS} onChange={setFilter} accent={accent} />

      <View style={styles.statRow}>
        <Stat label="Sesje" value={String(sessions)} />
        <Stat label="Rekord" value={String(best)} accent={accent} />
        <Stat label="Passa (dni)" value={String(streak)} />
      </View>

      <LineChart label="WYNIK (ostatnie sesje)" data={scoreData} width={chartW} color={accent} />
      <LineChart
        label="TRAFNOŚĆ %"
        data={accData}
        width={chartW}
        color={theme.success}
        format={(v) => `${Math.round(v)}%`}
      />

      {examBest > 0 ? (
        <View style={[styles.examBox, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="caption">Tryb egzaminacyjny — rekord</AppText>
          <AppText variant="title" color={theme.tint}>
            {examBest}
          </AppText>
        </View>
      ) : null}

      {sessions === 0 ? (
        <AppText variant="bodyMuted" style={styles.empty}>
          Ukończ kilka sesji, aby zobaczyć trend wyniku i trafności.
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: Spacing.md },
  examBox: { borderRadius: 16, padding: Spacing.lg, alignItems: 'center', gap: 2 },
  empty: { textAlign: 'center' },
});
