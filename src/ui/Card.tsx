import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  /** Optional left accent stripe (e.g. a module color). */
  accent?: string;
}

export function Card({ children, onPress, style, accent }: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderLeftColor: accent ?? theme.border,
    borderLeftWidth: accent ? 4 : StyleSheet.hairlineWidth,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, base, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, base, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
