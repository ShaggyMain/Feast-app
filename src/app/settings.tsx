import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { Difficulty } from '@/types';
import { useTheme } from '@/hooks/use-theme';
import { type SessionLength, useSettingsStore } from '@/store/settings';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { AppText } from '@/ui/Text';

const LEVEL_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Łatwy' },
  { value: 'medium', label: 'Średni' },
  { value: 'hard', label: 'Trudny' },
];

const LENGTH_OPTIONS: { value: SessionLength; label: string }[] = [
  { value: 'short', label: 'Krótka' },
  { value: 'normal', label: 'Normalna' },
  { value: 'long', label: 'Długa' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const defaultLevel = useSettingsStore((s) => s.defaultLevel);
  const sessionLength = useSettingsStore((s) => s.sessionLength);
  const haptics = useSettingsStore((s) => s.haptics);
  const sound = useSettingsStore((s) => s.sound);
  const adaptive = useSettingsStore((s) => s.adaptive);
  const setDefaultLevel = useSettingsStore((s) => s.setDefaultLevel);
  const setSessionLength = useSettingsStore((s) => s.setSessionLength);
  const setHaptics = useSettingsStore((s) => s.setHaptics);
  const setSound = useSettingsStore((s) => s.setSound);
  const setAdaptive = useSettingsStore((s) => s.setAdaptive);

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
        <AppText variant="subtitle">Długość sesji</AppText>
        <AppText variant="bodyMuted">Liczba pytań w ćwiczeniach z pytaniami (krótsza/dłuższa).</AppText>
        <View style={styles.control}>
          <SegmentedControl value={sessionLength} options={LENGTH_OPTIONS} onChange={setSessionLength} />
        </View>
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="subtitle">Adaptacyjna trudność</AppText>
            <AppText variant="bodyMuted">
              Proponuje poziom startowy wg ostatnich wyników (możesz go zmienić przed startem).
            </AppText>
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
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="subtitle">Dźwięk</AppText>
            <AppText variant="bodyMuted">Krótki sygnał przy poprawnej i błędnej odpowiedzi.</AppText>
          </View>
          <Switch
            value={sound}
            onValueChange={setSound}
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

      <PrimaryButton label="Dane: eksport / import / kopia" variant="secondary" onPress={() => router.push('/data')} />

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
