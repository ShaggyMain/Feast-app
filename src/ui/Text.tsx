import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'hero'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyMuted'
  | 'caption'
  | 'label'
  | 'mono';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
}

const MUTED: TextVariant[] = ['bodyMuted', 'caption', 'label'];

export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const resolved = color ?? (MUTED.includes(variant) ? theme.textSecondary : theme.text);
  return <Text style={[styles[variant], { color: resolved }, style]} {...rest} />;
}

const styles = StyleSheet.create<Record<TextVariant, TextStyle>>({
  hero: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  bodyMuted: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  mono: { fontSize: 14, fontFamily: Fonts?.mono, fontWeight: '600' },
});
