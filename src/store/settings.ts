/**
 * User preferences (offline, persisted). Default difficulty and haptics for now;
 * a natural home for sound, session length and theme override in later milestones.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Difficulty } from '@/types';
import { suggestLevel } from '@/store/selectors';
import { useResultsStore } from '@/store/results';
import { setLang, type Lang } from '@/i18n/lang';

export type SessionLength = 'short' | 'normal' | 'long';

interface SettingsState {
  defaultLevel: Difficulty;
  sessionLength: SessionLength;
  language: Lang;
  haptics: boolean;
  sound: boolean;
  adaptive: boolean;
  onboardingSeen: boolean;
  hasHydrated: boolean;
  setDefaultLevel: (level: Difficulty) => void;
  setSessionLength: (value: SessionLength) => void;
  setLanguage: (value: Lang) => void;
  setHaptics: (value: boolean) => void;
  setSound: (value: boolean) => void;
  setAdaptive: (value: boolean) => void;
  setOnboardingSeen: (value: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultLevel: 'medium',
      sessionLength: 'normal',
      language: 'pl',
      haptics: true,
      sound: false,
      adaptive: false,
      onboardingSeen: false,
      hasHydrated: false,
      setDefaultLevel: (level) => set({ defaultLevel: level }),
      setSessionLength: (value) => set({ sessionLength: value }),
      // Keep the framework-free language module in sync for non-React callers.
      setLanguage: (value) => {
        setLang(value);
        set({ language: value });
      },
      setHaptics: (value) => set({ haptics: value }),
      setSound: (value) => set({ sound: value }),
      setAdaptive: (value) => set({ adaptive: value }),
      setOnboardingSeen: (value) => set({ onboardingSeen: value }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'feast.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ defaultLevel, sessionLength, language, haptics, sound, adaptive, onboardingSeen }) => ({
        defaultLevel,
        sessionLength,
        language,
        haptics,
        sound,
        adaptive,
        onboardingSeen,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) setLang(state.language);
        state?.setHasHydrated(true);
      },
    },
  ),
);

/** Multiplier applied to an exercise's item count for the chosen session length. */
export function sessionMultiplier(length: SessionLength): number {
  return length === 'short' ? 0.6 : length === 'long' ? 1.6 : 1;
}

/** Initial difficulty for an exercise: adaptive suggestion when enabled, else the default. */
export function pickInitialLevel(exerciseId: string): Difficulty {
  const s = useSettingsStore.getState();
  if (!s.adaptive) return s.defaultLevel;
  return suggestLevel(useResultsStore.getState().results, exerciseId, s.defaultLevel);
}
