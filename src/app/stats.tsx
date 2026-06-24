import { Alert, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { EXERCISES, getModule } from '@/data/registry';
import { useTheme } from '@/hooks/use-theme';
import { useResultsStore } from '@/store/results';
import { exerciseStats, overallStats } from '@/store/selectors';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';

export default function StatsScreen() {
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
          <AppText variant="subtitle">Brak wyników</AppText>
          <AppText variant="bodyMuted">
            Ukończ sesję, aby zobaczyć tu trafność, tempo i najlepsze wyniki.
          </AppText>
        </Card>
      ) : (
        <>
          <AppText variant="label" style={styles.section}>
            WG ĆWICZENIA
          </AppText>
          {played.map(({ exercise, stats: exStats }) => {
            const moduleMeta = getModule(exercise.module);
            return (
              <Card key={exercise.id} accent={moduleMeta?.color}>
                <AppText variant="subtitle">{exercise.title}</AppText>
                <View style={styles.exStatRow}>
                  <Stat label="Rekord" value={String(exStats!.bestScore)} accent={moduleMeta?.color} />
                  <Stat label="Śr. traf." value={`${Math.round(exStats!.avgAccuracy * 100)}%`} />
                  <Stat label="Śr. czas" value={`${(exStats!.avgResponseMs / 1000).toFixed(1)}s`} />
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
  statRow: { flexDirection: 'row', gap: Spacing.md },
  section: { marginTop: Spacing.sm },
  exStatRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
