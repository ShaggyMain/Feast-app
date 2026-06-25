import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore } from '@/store/settings';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

const SECTIONS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '🎯',
    title: 'Czym jest FEAST',
    body: 'Test selekcyjny kontrolerów ruchu lotniczego (Eurocontrol). FEAST I to krótkie moduły poznawcze na czas, FEAST II to część radarowa (DART + Multipass), FEAST III to kwestionariusz osobowości.',
  },
  {
    emoji: '⏱️',
    title: 'Liczy się tempo i dokładność',
    body: 'Każde zadanie jest na czas. Trenuj zawsze z licznikiem — mierzymy szybkość i trafność, nie samą poprawność.',
  },
  {
    emoji: '🎲',
    title: 'Bez kary za błędy',
    body: 'Lepiej zgadnąć niż zostawić puste. Punktacja nagradza poprawne i szybkie odpowiedzi, nie odejmuje za pomyłki.',
  },
  {
    emoji: '📡',
    title: 'Strategia radaru (na później)',
    body: 'Gdy dojdziemy do radaru/DART: najpierw unikaj kolizji, skanuj cały ekran i nie fiksuj się na jednym samolocie.',
  },
];

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const setOnboardingSeen = useSettingsStore((s) => s.setOnboardingSeen);

  const start = () => {
    setOnboardingSeen(true);
    router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="hero">Przygotuj się do FEAST</AppText>
        <AppText variant="bodyMuted">
          Krótkie, generowane zadania treningowe. Aplikacja nie jest powiązana z Eurocontrol ani
          PAŻP i nie odtwarza materiałów egzaminacyjnych.
        </AppText>
      </View>

      {SECTIONS.map((section) => (
        <Card key={section.title} accent={theme.tint}>
          <View style={styles.row}>
            <AppText variant="title">{section.emoji}</AppText>
            <View style={styles.flex}>
              <AppText variant="subtitle">{section.title}</AppText>
              <AppText variant="bodyMuted">{section.body}</AppText>
            </View>
          </View>
        </Card>
      ))}

      <PrimaryButton label="Zaczynaj" onPress={start} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1, gap: 2 },
});
