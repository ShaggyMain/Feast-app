/**
 * User preferences (offline, persisted). Default difficulty and haptics for now;
 * a natural home for sound, session length and theme override in later milestones.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Difficulty } from '@/types';

interface SettingsState {
  defaultLevel: Difficulty;
  haptics: boolean;
  sound: boolean;
  setDefaultLevel: (level: Difficulty) => void;
  setHaptics: (value: boolean) => void;
  setSound: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultLevel: 'medium',
      haptics: true,
      sound: false,
      setDefaultLevel: (level) => set({ defaultLevel: level }),
      setHaptics: (value) => set({ haptics: value }),
      setSound: (value) => set({ sound: value }),
    }),
    {
      name: 'feast.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
