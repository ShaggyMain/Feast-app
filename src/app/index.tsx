import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { EXERCISES, MODULES, exercisesForModule } from '@/data/registry';
import { useTheme } from '@/hooks/use-theme';
import { useResultsStore } from '@/store/results';
import { overallStats } from '@/store/selectors';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const results = useResultsStore((s) => s.results);
  const stats = overallStats(results);

  const quickStart = () => {
    const mathExercises = EXERCISES.filter((e) => e.module === 'math');
    const chosen = mathExercises[Math.floor(Math.random() * mathExercises.length)];
    if (chosen) router.push(`/exercise/${chosen.id}`);
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <AppText variant="hero">Trenuj jak kontroler</AppText>
        <AppText variant="bodyMuted">
          Krótkie ćwiczenia na czas — liczy się szybkość i dokładność. Bez kary za błędy.
        </AppText>
      </View>

      <View style={styles.statRow}>
        <Stat label="Sesje" value={String(stats.totalSessions)} />
        <Stat label="Śr. trafność" value={`${Math.round(stats.avgAccuracy * 100)}%`} />
        <Stat label="Pytania" value={String(stats.totalItems)} />
      </View>

      <Card accent={theme.tint} onPress={quickStart}>
        <View style={styles.ctaRow}>
          <View style={styles.flex}>
            <AppText variant="subtitle">Szybki trening</AppText>
            <AppText variant="caption">Losowe ćwiczenie z matematyki</AppText>
          </View>
          <AppText variant="hero" color={theme.tint}>
            ▶
          </AppText>
        </View>
      </Card>

      <AppText variant="label" style={styles.section}>
        MODUŁY
      </AppText>

      {MODULES.map((module) => {
        const count = exercisesForModule(module.id).length;
        return (
          <Card key={module.id} accent={module.color} onPress={() => router.push(`/module/${module.id}`)}>
            <View style={styles.tileRow}>
              <View style={[styles.badge, { backgroundColor: module.color + '22' }]}>
                <Text style={styles.emoji}>{module.emoji}</Text>
              </View>
              <View style={styles.tileText}>
                <AppText variant="subtitle">{module.title}</AppText>
                <AppText variant="caption">{module.subtitle}</AppText>
              </View>
              <AppText variant="caption" color={module.color}>
                {count > 0 ? `${count} ćw.` : 'Wkrótce'}
              </AppText>
            </View>
          </Card>
        );
      })}

      <View style={styles.actions}>
        <PrimaryButton label="Statystyki i postępy" variant="secondary" onPress={() => router.push('/stats')} />
        <PrimaryButton label="Ustawienia" variant="ghost" onPress={() => router.push('/settings')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.xs },
  flex: { flex: 1 },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  section: { marginTop: Spacing.sm },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badge: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  tileText: { flex: 1, gap: 2 },
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
});
