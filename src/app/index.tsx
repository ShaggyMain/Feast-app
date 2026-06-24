import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { MODULES } from '@/data/registry';
import { useTheme } from '@/hooks/use-theme';
import { useResultsStore } from '@/store/results';
import { overallStats } from '@/store/selectors';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const results = useResultsStore((s) => s.results);
  const stats = overallStats(results);

  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={[styles.title, { color: theme.text }]}>Trenuj jak kontroler</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Krótkie ćwiczenia na czas — liczy się szybkość i dokładność. Bez kary za błędy:
          lepiej zgadnąć niż zostawić puste.
        </Text>
      </View>

      <View style={styles.statRow}>
        <Stat label="Sesje" value={String(stats.totalSessions)} />
        <Stat label="Śr. trafność" value={`${Math.round(stats.avgAccuracy * 100)}%`} />
        <Stat label="Pytania" value={String(stats.totalItems)} />
      </View>

      <PrimaryButton label="▶  Trening demo" onPress={() => router.push('/exercise/demo-arith')} />

      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MODUŁY</Text>

      {MODULES.map((module) => (
        <Card key={module.id} accent={module.color} onPress={() => router.push(`/module/${module.id}`)}>
          <View style={styles.tileRow}>
            <Text style={styles.emoji}>{module.emoji}</Text>
            <View style={styles.tileText}>
              <Text style={[styles.tileTitle, { color: theme.text }]}>{module.title}</Text>
              <Text style={[styles.tileSub, { color: theme.textSecondary }]}>{module.subtitle}</Text>
            </View>
          </View>
        </Card>
      ))}

      <PrimaryButton
        label="Statystyki i postępy"
        variant="secondary"
        onPress={() => router.push('/stats')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
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
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 30,
  },
  tileText: {
    flex: 1,
    gap: 2,
  },
  tileTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  tileSub: {
    fontSize: 13,
    lineHeight: 18,
  },
});
