import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useT } from '@/i18n/useT';

function buildNavTheme(dark: boolean) {
  const base = dark ? DarkTheme : DefaultTheme;
  const palette = dark ? Colors.dark : Colors.light;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.tint,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.tint,
    },
  };
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const palette = dark ? Colors.dark : Colors.light;
  const t = useT();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={buildNavTheme(dark)}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: palette.surface },
            headerTitleStyle: { fontWeight: '700' },
            headerTintColor: palette.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: palette.background },
          }}>
          <Stack.Screen name="index" options={{ title: t('nav.home') }} />
          <Stack.Screen name="onboarding" options={{ title: t('nav.onboarding') }} />
          <Stack.Screen name="module/[id]" options={{ title: t('nav.module') }} />
          <Stack.Screen name="exercise/[id]" options={{ title: t('nav.exercise') }} />
          <Stack.Screen name="stats" options={{ title: t('nav.stats') }} />
          <Stack.Screen name="progress" options={{ title: t('nav.progress') }} />
          <Stack.Screen name="exam" options={{ title: t('nav.exam') }} />
          <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
          <Stack.Screen name="data" options={{ title: t('nav.data') }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
