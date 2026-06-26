import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Difficulty } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { type SessionLength, useSettingsStore } from '@/store/settings';
import type { Lang } from '@/i18n';
import { useT } from '@/i18n/useT';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { AppText } from '@/ui/Text';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const defaultLevel = useSettingsStore((s) => s.defaultLevel);
  const sessionLength = useSettingsStore((s) => s.sessionLength);
  const language = useSettingsStore((s) => s.language);
  const haptics = useSettingsStore((s) => s.haptics);
  const sound = useSettingsStore((s) => s.sound);
  const adaptive = useSettingsStore((s) => s.adaptive);
  const setDefaultLevel = useSettingsStore((s) => s.setDefaultLevel);
  const setSessionLength = useSettingsStore((s) => s.setSessionLength);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setHaptics = useSettingsStore((s) => s.setHaptics);
  const setSound = useSettingsStore((s) => s.setSound);
  const setAdaptive = useSettingsStore((s) => s.setAdaptive);

  const levelOptions: { value: Difficulty; label: string }[] = [
    { value: 'easy', label: t('level.easy') },
    { value: 'medium', label: t('level.medium') },
    { value: 'hard', label: t('level.hard') },
  ];
  const lengthOptions: { value: SessionLength; label: string }[] = [
    { value: 'short', label: t('length.short') },
    { value: 'normal', label: t('length.normal') },
    { value: 'long', label: t('length.long') },
  ];
  const langOptions: { value: Lang; label: string }[] = [
    { value: 'pl', label: 'Polski' },
    { value: 'en', label: 'English' },
  ];

  return (
    <Screen>
      <Card>
        <AppText variant="subtitle">{t('settings.langTitle')}</AppText>
        <AppText variant="bodyMuted">{t('settings.langSub')}</AppText>
        <View style={styles.control}>
          <SegmentedControl value={language} options={langOptions} onChange={setLanguage} accent={theme.tint} />
        </View>
      </Card>

      <Card>
        <AppText variant="subtitle">{t('settings.levelTitle')}</AppText>
        <AppText variant="bodyMuted">{t('settings.levelSub')}</AppText>
        <View style={styles.control}>
          <SegmentedControl value={defaultLevel} options={levelOptions} onChange={setDefaultLevel} />
        </View>
      </Card>

      <Card>
        <AppText variant="subtitle">{t('settings.lengthTitle')}</AppText>
        <AppText variant="bodyMuted">{t('settings.lengthSub')}</AppText>
        <View style={styles.control}>
          <SegmentedControl value={sessionLength} options={lengthOptions} onChange={setSessionLength} />
        </View>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="subtitle">{t('settings.adaptiveTitle')}</AppText>
            <AppText variant="bodyMuted">{t('settings.adaptiveSub')}</AppText>
          </View>
          <Switch
            value={adaptive}
            onValueChange={setAdaptive}
            trackColor={{ true: theme.tint, false: theme.border }}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="subtitle">{t('settings.hapticsTitle')}</AppText>
            <AppText variant="bodyMuted">{t('settings.hapticsSub')}</AppText>
          </View>
          <Switch
            value={haptics}
            onValueChange={setHaptics}
            trackColor={{ true: theme.tint, false: theme.border }}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="subtitle">{t('settings.soundTitle')}</AppText>
            <AppText variant="bodyMuted">{t('settings.soundSub')}</AppText>
          </View>
          <Switch
            value={sound}
            onValueChange={setSound}
            trackColor={{ true: theme.tint, false: theme.border }}
          />
        </View>
      </Card>

      <Card>
        <AppText variant="subtitle">{t('settings.themeTitle')}</AppText>
        <AppText variant="bodyMuted">{t('settings.themeSub')}</AppText>
      </Card>

      <PrimaryButton label={t('settings.dataBtn')} variant="secondary" onPress={() => router.push('/data')} />

      <AppText variant="caption" style={styles.about}>
        {t('settings.about', { v: Constants.expoConfig?.version ?? '1.0.0' })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  control: { marginTop: Spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  switchText: { flex: 1, gap: 2 },
  about: { marginTop: Spacing.sm, textAlign: 'center' },
});
