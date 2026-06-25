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

interface SettingsState {
  defaultLevel: Difficulty;
  haptics: boolean;
  sound: boolean;
  adaptive: boolean;
  onboardingSeen: boolean;
  hasHydrated: boolean;
  setDefaultLevel: (level: Difficulty) => void;
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
      haptics: true,
      sound: false,
      adaptive: false,
      onboardingSeen: false,
      hasHydrated: false,
      setDefaultLevel: (level) => set({ defaultLevel: level }),
      setHaptics: (value) => set({ haptics: value }),
      setSound: (value) => set({ sound: value }),
      setAdaptive: (value) => set({ adaptive: value }),
      setOnboardingSeen: (value) => set({ onboardingSeen: value }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'feast.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ defaultLevel, haptics, sound, adaptive, onboardingSeen }) => ({
        defaultLevel,
        haptics,
        sound,
        adaptive,
        onboardingSeen,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/** Initial difficulty for an exercise: adaptive suggestion when enabled, else the default. */
export function pickInitialLevel(exerciseId: string): Difficulty {
  const s = useSettingsStore.getState();
  if (!s.adaptive) return s.defaultLevel;
  return suggestLevel(useResultsStore.getState().results, exerciseId, s.defaultLevel);
}
