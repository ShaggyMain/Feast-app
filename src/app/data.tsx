import { useState } from 'react';
import { Alert, Share, StyleSheet, TextInput, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n/useT';
import { useResultsStore } from '@/store/results';
import { parseResults, serializeResults } from '@/store/io';
import { Card } from '@/ui/Card';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { Screen } from '@/ui/Screen';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';

export default function DataScreen() {
  const theme = useTheme();
  const t = useT();
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
      Alert.alert(t('data.importErrTitle'), t('data.importErrBody'));
      return;
    }
    const added = importResults(parsed);
    Alert.alert(t('data.importOkTitle'), t('data.importOkBody', { added, dup: parsed.length - added }));
    setText('');
  };

  const onClear = () =>
    Alert.alert(t('data.clearTitle'), t('data.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.clear'), style: 'destructive', onPress: () => clearAll() },
    ]);

  return (
    <Screen>
      <View style={styles.statRow}>
        <Stat label={t('data.saved')} value={String(results.length)} accent={theme.tint} />
      </View>

      <Card>
        <AppText variant="subtitle">{t('data.exportTitle')}</AppText>
        <AppText variant="bodyMuted">{t('data.exportBody')}</AppText>
        <PrimaryButton
          label={t('data.exportBtn')}
          onPress={onExport}
          disabled={results.length === 0}
          style={styles.mt}
        />
      </Card>

      <Card>
        <AppText variant="subtitle">{t('data.importTitle')}</AppText>
        <AppText variant="bodyMuted">{t('data.importBody')}</AppText>
        <TextInput
          multiline
          value={text}
          onChangeText={setText}
          placeholder={t('data.importPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
        />
        <PrimaryButton label={t('data.importBtn')} variant="secondary" onPress={onImport} disabled={text.trim() === ''} />
      </Card>

      <PrimaryButton label={t('data.clearBtn')} variant="ghost" onPress={onClear} />
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
