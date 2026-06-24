import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default) or a plain View. */
  scroll?: boolean;
  /** Safe-area edges to apply. The stack header already covers the top. */
  edges?: Edge[];
}

export function Screen({ children, scroll = true, edges = ['bottom', 'left', 'right'] }: ScreenProps) {
  const theme = useTheme();

  const inner = <View style={styles.inner}>{children}</View>;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex]}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.lg,
    flex: 1,
  },
});
