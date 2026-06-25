import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { exercisesForModule, getModule } from '@/data/registry';
import { useTheme } from '@/hooks/use-theme';
import { useResultsStore } from '@/store/results';
import { exerciseStats } from '@/store/selectors';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

export default function ModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const moduleMeta = getModule(id ?? '');
  const exercises = exercisesForModule(id ?? '');
  const results = useResultsStore((s) => s.results);

  return (
    <Screen>
      <Stack.Screen options={{ title: moduleMeta?.title ?? 'Moduł' }} />

      <AppText variant="bodyMuted">
        {moduleMeta ? moduleMeta.subtitle : 'Nie znaleziono modułu.'}
      </AppText>

      {exercises.length === 0 ? (
        <Card>
          <AppText variant="subtitle">Ćwiczenia w przygotowaniu</AppText>
          <AppText variant="bodyMuted">
            Ten moduł pojawi się w kolejnych kamieniach milowych. Zacznij od modułu „Matematyka pod
            czas” lub od „Szybki trening” na ekranie głównym.
          </AppText>
        </Card>
      ) : (
        exercises.map((exercise) => {
          const stats = exerciseStats(results, exercise.id);
          return (
            <Card key={exercise.id} accent={moduleMeta?.color}>
              <AppText variant="subtitle">{exercise.title}</AppText>
              <AppText variant="bodyMuted">{exercise.description}</AppText>
              <View style={styles.metaRow}>
                <AppText variant="caption" color={moduleMeta?.color}>
                  {stats ? `Rekord: ${stats.bestScore} · prób: ${stats.attempts}` : 'Brak prób'}
                </AppText>
                <AppText variant="caption">
                  {exercise.timePerItemSec > 0
                    ? `${exercise.timePerItemSec}s · ${exercise.itemsPerSession} pyt.`
                    : `${exercise.itemsPerSession} prób`}
                </AppText>
              </View>
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  startBtn: { marginTop: Spacing.sm },
});
