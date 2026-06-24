import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A thin horizontal bar showing remaining time (1 = full, 0 = empty). */
export function TimerBar({ progress }: { progress: number }) {
  const theme = useTheme();
  const p = Math.max(0, Math.min(1, progress));
  const color = p > 0.5 ? theme.success : p > 0.25 ? theme.warning : theme.danger;

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
      <View style={{ flex: p, backgroundColor: color }} />
      <View style={{ flex: 1 - p }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    width: '100%',
  },
});
