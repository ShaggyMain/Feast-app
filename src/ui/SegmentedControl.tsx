import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: Segment<T>[];
  onChange: (value: T) => void;
  /** Accent color for the selected segment (defaults to theme tint). */
  accent?: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  accent,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const selectedBg = accent ?? theme.tint;

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, selected && { backgroundColor: selectedBg }]}
            accessibilityRole="button"
            accessibilityState={{ selected }}>
            <Text
              style={[
                styles.label,
                { color: selected ? theme.tintText : theme.textSecondary },
              ]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});
