import { useState } from 'react';
import { Alert, Share, StyleSheet, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResultsStore } from '@/store/results';
import { parseResults, serializeResults } from '@/store/io';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';

export default function DataScreen() {
  const theme = useTheme();
  const results = useResultsStore((s) => s.results);
  const importResults = useResultsStore((s) => s.importResults);
  const clearAll = useResultsStore((s) => s.clearAll);
  const [text, setText] = useState('');

  const onExport = async () => {
    try {
      await Share.share({ message: serializeResults(results) });
    } catch {
      // user dismissed the share sheet
    }
  };

  const onImport = () => {
    const parsed = parseResults(text.trim());
    if (!parsed) {
      Alert.alert('Błąd importu', 'To nie wygląda na poprawne dane FEAST (oczekiwany JSON).');
      return;
    }
    const added = importResults(parsed);
    Alert.alert('Import zakończony', `Dodano: ${added}. Pominięto duplikaty: ${parsed.length - added}.`);
    setText('');
  };

  const onClear = () =>
    Alert.alert('Wyczyścić dane?', 'Usunie wszystkie zapisane wyniki na tym urządzeniu.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyczyść', style: 'destructive', onPress: () => clearAll() },
    ]);

  return (
    <Screen>
      <View style={styles.statRow}>
        <Stat label="Zapisane wyniki" value={String(results.length)} accent={theme.tint} />
      </View>

      <Card>
        <AppText variant="subtitle">Eksport (kopia zapasowa)</AppText>
        <AppText variant="bodyMuted">
          Udostępnij wyniki jako JSON — zapisz w Plikach albo wyślij sobie, by przenieść na inny
          telefon.
        </AppText>
        <PrimaryButton
          label="Eksportuj (udostępnij)"
          onPress={onExport}
          disabled={results.length === 0}
          style={styles.mt}
        />
      </Card>

      <Card>
        <AppText variant="subtitle">Import</AppText>
        <AppText variant="bodyMuted">Wklej wyeksportowany JSON, aby scalić wyniki (duplikaty pomijane).</AppText>
        <TextInput
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Wklej tutaj dane JSON…"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        <PrimaryButton label="Importuj" variant="secondary" onPress={onImport} disabled={text.trim() === ''} />
      </Card>

      <PrimaryButton label="Wyczyść wszystkie dane" variant="ghost" onPress={onClear} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', gap: Spacing.md },
  mt: { marginTop: Spacing.sm },
  input: {
    minHeight: 110,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 13,
    textAlignVertical: 'top',
    marginVertical: Spacing.sm,
  },
});
