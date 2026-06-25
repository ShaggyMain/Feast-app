/**
 * Command panel for the selected aircraft: heading (L20 / Direct-to-gate / R20)
 * and speed (− / +). Pure presentational — it calls back into the radar loop,
 * which mutates the world via the tested engine helpers.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';
import type { Aircraft } from './engine/types';

interface CmdButtonProps {
  label: string;
  onPress: () => void;
  accent?: string;
  flex?: number;
}

function CmdButton({ label, onPress, accent, flex = 1 }: CmdButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: accent ?? theme.surfaceAlt, flex },
        pressed && styles.pressed,
      ]}>
      <AppText variant="subtitle" color={accent ? theme.tintText : theme.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function CommandPanel({
  selected,
  gateName,
  onTurn,
  onDirect,
  onSpeed,
}: {
  selected: Aircraft | null;
  gateName: string | null;
  onTurn: (deltaDeg: number) => void;
  onDirect: () => void;
  onSpeed: (delta: number) => void;
}) {
  const theme = useTheme();

  if (!selected) {
    return (
      <View style={[styles.wrap, styles.empty, { borderColor: theme.border }]}>
        <AppText variant="bodyMuted">Dotknij samolot, aby wydać komendę.</AppText>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.headerRow}>
        <AppText variant="subtitle" color={theme.text}>
          {selected.callsign}
        </AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          KURS {Math.round(selected.heading).toString().padStart(3, '0')}°  ·  {Math.round(selected.speed)} ·  → {gateName ?? '—'}
        </AppText>
      </View>

      <View style={styles.row}>
        <CmdButton label="◀ L20" onPress={() => onTurn(-20)} />
        <CmdButton label={`DIRECT → ${gateName ?? ''}`} onPress={onDirect} accent={theme.tint} flex={1.6} />
        <CmdButton label="R20 ▶" onPress={() => onTurn(20)} />
      </View>

      <View style={styles.row}>
        <CmdButton label="− Wolniej" onPress={() => onSpeed(-4)} />
        <CmdButton label="Szybciej +" onPress={() => onSpeed(4)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  empty: { alignItems: 'center', paddingVertical: Spacing.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  btn: {
    minHeight: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  pressed: { opacity: 0.7 },
});
