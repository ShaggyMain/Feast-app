import { Alert, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { EXERCISES, getModule } from '@/data/registry';
import { useTheme } from '@/hooks/use-theme';
import { useResultsStore } from '@/store/results';
import { exerciseStats, overallStats } from '@/store/selectors';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';

export default function StatsScreen() {
  const theme = useTheme();
  const results = useResultsStore((s) => s.results);
  const clearAll = useResultsStore((s) => s.clearAll);
  const stats = overallStats(results);

  const played = EXERCISES.map((exercise) => ({
    exercise,
    stats: exerciseStats(results, exercise.id),
  })).filter((entry) => entry.stats !== null);

  const confirmClear = () => {
    Alert.alert('Wyczyścić dane?', 'Usunie to wszystkie zapisane wyniki na tym urządzeniu.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyczyść', style: 'destructive', onPress: () => clearAll() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.statRow}>
        <Stat label="Sesje" value={String(stats.totalSessions)} />
        <Stat label="Pytania" value={String(stats.totalItems)} />
        <Stat label="Śr. trafność" value={`${Math.round(stats.avgAccuracy * 100)}%`} />
      </View>

      {results.length === 0 ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Brak wyników</Text>
          <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
            Ukończ sesję, aby zobaczyć tu trafność, tempo i najlepsze wyniki.
          </Text>
        </Card>
      ) : (
        <>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>WG ĆWICZENIA</Text>
          {played.map(({ exercise, stats: exStats }) => {
            const moduleMeta = getModule(exercise.module);
            return (
              <Card key={exercise.id} accent={moduleMeta?.color}>
                <Text style={[styles.exTitle, { color: theme.text }]}>{exercise.title}</Text>
                <View style={styles.exStatRow}>
                  <Stat label="Rekord" value={String(exStats!.bestScore)} accent={theme.tint} />
                  <Stat label="Śr. traf." value={`${Math.round(exStats!.avgAccuracy * 100)}%`} />
                  <Stat label="Prób" value={String(exStats!.attempts)} />
                </View>
              </Card>
            );
          })}
          <PrimaryButton label="Wyczyść dane" variant="ghost" onPress={confirmClear} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  exTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  exStatRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
