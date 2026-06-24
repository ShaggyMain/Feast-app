/**
 * Resolves the active color palette from the OS light/dark setting.
 * https://docs.expo.dev/guides/color-schemes/
 */
import { Colors, type ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): ThemePalette {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
