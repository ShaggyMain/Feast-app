import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { EXERCISES, MODULES, exercisesForModule } from '@/data/registry';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/useT';
import { useResultsStore } from '@/store/results';
import { overallStats } from '@/store/selectors';
import { useSettingsStore } from '@/store/settings';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const results = useResultsStore((s) => s.results);
  const stats = overallStats(results);
  const hasHydrated = useSettingsStore((s) => s.hasHydrated);
  const onboardingSeen = useSettingsStore((s) => s.onboardingSeen);

  // Show onboarding once, on first launch (after settings have hydrated).
  useEffect(() => {
    if (hasHydrated && !onboardingSeen) router.replace('/onboarding');
  }, [hasHydrated, onboardingSeen, router]);

  const quickStart = () => {
    const mathExercises = EXERCISES.filter((e) => e.module === 'math');
    const chosen = mathExercises[Math.floor(Math.random() * mathExercises.length)];
    if (chosen) router.push(`/exercise/${chosen.id}`);
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <AppText variant="hero">{t('home.heroTitle')}</AppText>
        <AppText variant="bodyMuted">{t('home.heroSub')}</AppText>
      </View>

      <View style={styles.statRow}>
        <Stat label={t('home.sessions')} value={String(stats.totalSessions)} />
        <Stat label={t('home.avgAcc')} value={`${Math.round(stats.avgAccuracy * 100)}%`} />
        <Stat label={t('home.questions')} value={String(stats.totalItems)} />
      </View>

      <Card accent={theme.tint} onPress={quickStart}>
        <View style={styles.ctaRow}>
          <View style={styles.flex}>
            <AppText variant="subtitle">{t('home.quickTitle')}</AppText>
            <AppText variant="caption">{t('home.quickSub')}</AppText>
          </View>
          <AppText variant="hero" color={theme.tint}>
            ▶
          </AppText>
        </View>
      </Card>

      <Card accent={theme.warning} onPress={() => router.push('/exam')}>
        <View style={styles.ctaRow}>
          <View style={styles.flex}>
            <AppText variant="subtitle">{t('home.examTitle')}</AppText>
            <AppText variant="caption">{t('home.examSub')}</AppText>
          </View>
          <AppText variant="hero" color={theme.warning}>
            ★
          </AppText>
        </View>
      </Card>

      <AppText variant="label" style={styles.section}>
        {t('home.modules')}
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
                <AppText variant="subtitle">{t(module.title)}</AppText>
                <AppText variant="caption">{t(module.subtitle)}</AppText>
              </View>
              <AppText variant="caption" color={module.color}>
                {count > 0 ? t('home.exCount', { n: count }) : t('home.soon')}
              </AppText>
            </View>
          </Card>
        );
      })}

      <View style={styles.actions}>
        <PrimaryButton label={t('home.progress')} variant="secondary" onPress={() => router.push('/progress')} />
        <PrimaryButton label={t('home.stats')} variant="ghost" onPress={() => router.push('/stats')} />
        <PrimaryButton label={t('home.howFeast')} variant="ghost" onPress={() => router.push('/onboarding')} />
        <PrimaryButton label={t('home.settings')} variant="ghost" onPress={() => router.push('/settings')} />
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
