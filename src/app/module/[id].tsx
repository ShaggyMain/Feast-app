import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { exercisesForModule, getModule } from '@/data/registry';
import { useTheme } from '@/hooks/use-theme';
import { useResultsStore } from '@/store/results';
import { exerciseStats } from '@/store/selectors';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';

export default function ModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const moduleMeta = getModule(id ?? '');
  const exercises = exercisesForModule(id ?? '');
  const results = useResultsStore((s) => s.results);

  return (
    <Screen>
      <Stack.Screen options={{ title: moduleMeta?.title ?? 'Moduł' }} />

      {moduleMeta ? (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{moduleMeta.subtitle}</Text>
      ) : (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Nie znaleziono modułu.</Text>
      )}

      {exercises.length === 0 ? (
        <Card>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Ćwiczenia w przygotowaniu</Text>
          <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
            Ten moduł pojawi się w kolejnych kamieniach milowych. Zacznij od „Trening demo” na
            ekranie głównym.
          </Text>
        </Card>
      ) : (
        exercises.map((exercise) => {
          const stats = exerciseStats(results, exercise.id);
          return (
            <Card key={exercise.id} accent={moduleMeta?.color}>
              <Text style={[styles.exTitle, { color: theme.text }]}>{exercise.title}</Text>
              <Text style={[styles.exDesc, { color: theme.textSecondary }]}>
                {exercise.description}
              </Text>
              <Text style={[styles.exMeta, { color: theme.textSecondary }]}>
                {stats
                  ? `Najlepszy wynik: ${stats.bestScore} · prób: ${stats.attempts}`
                  : 'Brak prób — zacznij teraz'}
              </Text>
              <PrimaryButton
                label="Start"
                onPress={() => router.push(`/exercise/${exercise.id}`)}
                style={styles.startBtn}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
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
    fontSize: 18,
    fontWeight: '700',
  },
  exDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  exMeta: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  startBtn: {
    marginTop: Spacing.sm,
  },
});
