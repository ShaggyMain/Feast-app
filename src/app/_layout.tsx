import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
          <Stack.Screen name="index" options={{ title: 'FEAST Trainer' }} />
          <Stack.Screen name="onboarding" options={{ title: 'O FEAST' }} />
          <Stack.Screen name="module/[id]" options={{ title: 'Moduł' }} />
          <Stack.Screen name="exercise/[id]" options={{ title: 'Ćwiczenie' }} />
          <Stack.Screen name="stats" options={{ title: 'Statystyki' }} />
          <Stack.Screen name="progress" options={{ title: 'Postępy' }} />
          <Stack.Screen name="exam" options={{ title: 'Tryb egzaminacyjny' }} />
          <Stack.Screen name="settings" options={{ title: 'Ustawienia' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
