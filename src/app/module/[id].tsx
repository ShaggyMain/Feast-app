import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { exercisesForModule, getModule } from '@/data/registry';
import { mixableDefs } from '@/runner/MixRunner';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/useT';
import { useResultsStore } from '@/store/results';
import { exerciseStats } from '@/store/selectors';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

export default function ModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const theme = useTheme();
  const moduleMeta = getModule(id ?? '');
  const exercises = exercisesForModule(id ?? '');
  const results = useResultsStore((s) => s.results);

  return (
    <Screen>
      <Stack.Screen options={{ title: moduleMeta ? t(moduleMeta.title) : t('nav.module') }} />

      <AppText variant="bodyMuted">
        {moduleMeta ? t(moduleMeta.subtitle) : t('module.notFound')}
      </AppText>

      {mixableDefs(id ?? '').length >= 2 ? (
        <View style={[styles.mixCard, { borderColor: moduleMeta?.color ?? theme.tint, backgroundColor: theme.surface }]}>
          <AppText variant="subtitle">{t('mix.button')}</AppText>
          <AppText variant="bodyMuted">{t('mix.cardBody')}</AppText>
          <PrimaryButton
            label={t('mix.start')}
            onPress={() => router.push(`/mix/${id}`)}
            style={styles.startBtn}
          />
        </View>
      ) : null}

      {exercises.length === 0 ? (
        <Card>
          <AppText variant="subtitle">{t('module.soonTitle')}</AppText>
          <AppText variant="bodyMuted">{t('module.soonBody')}</AppText>
        </Card>
      ) : (
        exercises.map((exercise) => {
          const stats = exerciseStats(results, exercise.id);
          return (
            <Card key={exercise.id} accent={moduleMeta?.color}>
              <AppText variant="subtitle">{t(exercise.title)}</AppText>
              <AppText variant="bodyMuted">{t(exercise.description)}</AppText>
              <View style={styles.metaRow}>
                <AppText variant="caption" color={moduleMeta?.color}>
                  {stats
                    ? t('module.record', { score: stats.bestScore, n: stats.attempts })
                    : t('module.noTries')}
                </AppText>
                <AppText variant="caption">
                  {exercise.timePerItemSec > 0
                    ? t('module.timed', { sec: exercise.timePerItemSec, n: exercise.itemsPerSession })
                    : exercise.itemsPerSession > 0
                      ? t('module.tries', { n: exercise.itemsPerSession })
                      : t('module.timedSession')}
                </AppText>
              </View>
              <PrimaryButton
                label={t('common.start')}
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
  mixCard: { borderWidth: 1.5, borderRadius: 16, padding: Spacing.md, gap: Spacing.xs },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  startBtn: { marginTop: Spacing.sm },
});
