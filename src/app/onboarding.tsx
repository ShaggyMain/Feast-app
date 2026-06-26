import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/useT';
import { useSettingsStore } from '@/store/settings';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

const SECTIONS: { emoji: string; key: string }[] = [
  { emoji: '🎯', key: 's1' },
  { emoji: '⏱️', key: 's2' },
  { emoji: '🎲', key: 's3' },
  { emoji: '📡', key: 's4' },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const setOnboardingSeen = useSettingsStore((s) => s.setOnboardingSeen);

  const start = () => {
    setOnboardingSeen(true);
    router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="hero">{t('onb.title')}</AppText>
        <AppText variant="bodyMuted">{t('onb.intro')}</AppText>
      </View>

      {SECTIONS.map((section) => (
        <Card key={section.key} accent={theme.tint}>
          <View style={styles.row}>
            <AppText variant="title">{section.emoji}</AppText>
            <View style={styles.flex}>
              <AppText variant="subtitle">{t(`onb.${section.key}.title`)}</AppText>
              <AppText variant="bodyMuted">{t(`onb.${section.key}.body`)}</AppText>
            </View>
          </View>
        </Card>
      ))}

      <PrimaryButton label={t('onb.start')} onPress={start} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
});
