/**
 * Command panel for the selected aircraft: heading (L20 / Direct-to-gate / R20),
 * speed (− / +) and — when the altitude layer is active — climb/descend. Pure
 * presentational: it calls back into the radar loop, which mutates the world via
 * the tested engine helpers.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';
import { useT } from '@/i18n/useT';
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
  vertical,
  onTurn,
  onDirect,
  onSpeed,
  onAltitude,
}: {
  selected: Aircraft | null;
  gateName: string | null;
  /** Whether the altitude layer is in play (shows climb/descend). */
  vertical: boolean;
  onTurn: (deltaDeg: number) => void;
  onDirect: () => void;
  onSpeed: (delta: number) => void;
  onAltitude: (delta: number) => void;
}) {
  const theme = useTheme();
  const t = useT();

  if (!selected) {
    return (
      <View style={[styles.wrap, styles.empty, { borderColor: theme.border }]}>
        <AppText variant="bodyMuted">{t('cmd.tapAircraft')}</AppText>
      </View>
    );
  }

  const climbing = selected.targetAltitude !== selected.altitude;
  const arrow = selected.targetAltitude > selected.altitude ? '↑' : '↓';

  return (
    <View style={[styles.wrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.headerRow}>
        <AppText variant="subtitle" color={theme.text}>
          {selected.callsign}
        </AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {t('cmd.hdg')} {Math.round(selected.heading).toString().padStart(3, '0')}°  ·  {Math.round(selected.speed)}
          {vertical ? `  ·  FL${Math.round(selected.altitude)}${climbing ? arrow : ''}` : ''}  ·  → {gateName ?? '—'}
        </AppText>
      </View>

      <View style={styles.row}>
        <CmdButton label="◀ L20" onPress={() => onTurn(-20)} />
        <CmdButton label={`DIRECT → ${gateName ?? ''}`} onPress={onDirect} accent={theme.tint} flex={1.6} />
        <CmdButton label="R20 ▶" onPress={() => onTurn(20)} />
      </View>

      <View style={styles.row}>
        <CmdButton label={t('cmd.slower')} onPress={() => onSpeed(-4)} />
        <CmdButton label={t('cmd.faster')} onPress={() => onSpeed(4)} />
      </View>

      {vertical ? (
        <View style={styles.row}>
          <CmdButton label={t('cmd.descend')} onPress={() => onAltitude(-20)} />
          <CmdButton label={t('cmd.climb')} onPress={() => onAltitude(20)} />
        </View>
      ) : null}
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
