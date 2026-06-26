/**
 * RCT controls: a radio-instruction banner (tap "Wykonaj" to action an
 * instruction) and the altitude/speed panel for the selected aircraft. Heading
 * is automatic in RCT — aircraft follow their corridor — so there is no vector
 * command here. Pure presentational; calls back into the loop.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '@/ui/Text';
import type { RadioInstruction, RctAircraft } from './engine/types';

function CmdButton({
  label,
  onPress,
  accent,
  flex = 1,
}: {
  label: string;
  onPress: () => void;
  accent?: string;
  flex?: number;
}) {
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

export function RctControls({
  selected,
  instructions,
  elapsedSec,
  onAltitude,
  onSpeed,
  onExecute,
}: {
  selected: RctAircraft | null;
  instructions: RadioInstruction[];
  elapsedSec: number;
  onAltitude: (delta: number) => void;
  onSpeed: (delta: number) => void;
  onExecute: (ins: RadioInstruction) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      {instructions.map((ins) => {
        const left = Math.max(0, Math.ceil(ins.dueBySec - elapsedSec));
        const verb = ins.kind === 'speed' ? 'PRĘDKOŚĆ' : ins.kind === 'climb' ? 'WZNIEŚ' : 'ZNIŻAJ';
        const target = ins.kind === 'speed' ? `${ins.value}` : `FL${ins.value}`;
        return (
          <Pressable
            key={ins.id}
            onPress={() => onExecute(ins)}
            style={({ pressed }) => [
              styles.radio,
              { borderColor: theme.warning, backgroundColor: theme.surface },
              pressed && styles.pressed,
            ]}>
            <AppText variant="subtitle" color={theme.text}>
              📻 {ins.callsign}: {verb} {target}
            </AppText>
            <View style={styles.radioRight}>
              <AppText variant="caption" color={left <= 5 ? theme.danger : theme.textSecondary}>
                {left}s
              </AppText>
              <View style={[styles.execBadge, { backgroundColor: theme.warning }]}>
                <AppText variant="caption" color={theme.tintText}>
                  Wykonaj
                </AppText>
              </View>
            </View>
          </Pressable>
        );
      })}

      {selected ? (
        <View style={[styles.panel, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={styles.headerRow}>
            <AppText variant="subtitle" color={theme.text}>
              {selected.callsign}
            </AppText>
            <AppText variant="caption" color={theme.textSecondary}>
              FL{Math.round(selected.altitude)} → FL{selected.clearedAlt}  ·  {Math.round(selected.speed)}
            </AppText>
          </View>
          <View style={styles.row}>
            <CmdButton label="Zniżaj ▼" onPress={() => onAltitude(-20)} />
            <CmdButton label="▲ Wznoś" onPress={() => onAltitude(20)} />
          </View>
          <View style={styles.row}>
            <CmdButton label="− Wolniej" onPress={() => onSpeed(-4)} />
            <CmdButton label="Szybciej +" onPress={() => onSpeed(4)} />
          </View>
        </View>
      ) : (
        <View style={[styles.panel, styles.empty, { borderColor: theme.border }]}>
          <AppText variant="bodyMuted">Dotknij samolot, aby zmienić poziom lub prędkość.</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: Spacing.sm },
  radio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  radioRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  execBadge: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  panel: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.sm, gap: Spacing.sm },
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
