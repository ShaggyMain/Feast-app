import Constants from 'expo-constants';
import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Difficulty } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { AppText } from '@/ui/Text';

const LEVEL_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Łatwy' },
  { value: 'medium', label: 'Średni' },
  { value: 'hard', label: 'Trudny' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const defaultLevel = useSettingsStore((s) => s.defaultLevel);
  const haptics = useSettingsStore((s) => s.haptics);
  const setDefaultLevel = useSettingsStore((s) => s.setDefaultLevel);
  const setHaptics = useSettingsStore((s) => s.setHaptics);

  return (
    <Screen>
      <Card>
        <AppText variant="subtitle">Domyślny poziom</AppText>
        <AppText variant="bodyMuted">Od tego poziomu startują nowe ćwiczenia.</AppText>
        <View style={styles.control}>
          <SegmentedControl value={defaultLevel} options={LEVEL_OPTIONS} onChange={setDefaultLevel} />
        </View>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="subtitle">Wibracje (haptyka)</AppText>
            <AppText variant="bodyMuted">Krótka wibracja przy odpowiedzi.</AppText>
          </View>
          <Switch
            value={haptics}
            onValueChange={setHaptics}
            trackColor={{ true: theme.tint, false: theme.border }}
          />
        </View>
      </Card>

      <Card>
        <AppText variant="subtitle">Motyw</AppText>
        <AppText variant="bodyMuted">
          Jasny/ciemny dopasowuje się automatycznie do ustawień telefonu.
        </AppText>
      </Card>

      <AppText variant="caption" style={styles.about}>
        FEAST Trainer v{Constants.expoConfig?.version ?? '1.0.0'} · offline · bez backendu
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
