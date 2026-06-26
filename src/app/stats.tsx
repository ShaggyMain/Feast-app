import { Alert, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { EXERCISES, getModule } from '@/data/registry';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/useT';
import { useResultsStore } from '@/store/results';
import { exerciseStats, overallStats } from '@/store/selectors';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';

export default function StatsScreen() {
  const t = useT();
  const results = useResultsStore((s) => s.results);
  const clearAll = useResultsStore((s) => s.clearAll);
  const stats = overallStats(results);

  const played = EXERCISES.map((exercise) => ({
    exercise,
    stats: exerciseStats(results, exercise.id),
  })).filter((entry) => entry.stats !== null);

  const confirmClear = () => {
    Alert.alert(t('stats.clearTitle'), t('stats.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.clear'), style: 'destructive', onPress: () => clearAll() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.statRow}>
        <Stat label={t('stats.sessions')} value={String(stats.totalSessions)} />
        <Stat label={t('stats.questions')} value={String(stats.totalItems)} />
        <Stat label={t('stats.avgAcc')} value={`${Math.round(stats.avgAccuracy * 100)}%`} />
      </View>

      {results.length === 0 ? (
        <Card>
          <AppText variant="subtitle">{t('stats.noneTitle')}</AppText>
          <AppText variant="bodyMuted">{t('stats.noneBody')}</AppText>
        </Card>
      ) : (
        <>
          <AppText variant="label" style={styles.section}>
            {t('stats.byExercise')}
          </AppText>
          {played.map(({ exercise, stats: exStats }) => {
            const moduleMeta = getModule(exercise.module);
            return (
              <Card key={exercise.id} accent={moduleMeta?.color}>
                <AppText variant="subtitle">{t(exercise.title)}</AppText>
                <View style={styles.exStatRow}>
                  <Stat label={t('stats.record')} value={String(exStats!.bestScore)} accent={moduleMeta?.color} />
                  <Stat label={t('stats.avgAccShort')} value={`${Math.round(exStats!.avgAccuracy * 100)}%`} />
                  <Stat label={t('stats.avgTime')} value={`${(exStats!.avgResponseMs / 1000).toFixed(1)}s`} />
                  <Stat label={t('stats.tries')} value={String(exStats!.attempts)} />
                </View>
              </Card>
            );
          })}
          <PrimaryButton label={t('stats.clearBtn')} variant="ghost" onPress={confirmClear} />
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
