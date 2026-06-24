/**
 * Offline-first results store: a list of ExerciseResult persisted to
 * AsyncStorage via zustand's persist middleware. No backend.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ExerciseResult } from '@/types';

interface ResultsState {
  results: ExerciseResult[];
  hasHydrated: boolean;
  addResult: (result: ExerciseResult) => void;
  clearAll: () => void;
  setHasHydrated: (value: boolean) => void;
}

const MAX_RESULTS = 1000;

export const useResultsStore = create<ResultsState>()(
  persist(
    (set) => ({
      results: [],
      hasHydrated: false,
      addResult: (result) =>
        set((state) => ({ results: [result, ...state.results].slice(0, MAX_RESULTS) })),
      clearAll: () => set({ results: [] }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'feast.results.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ results: state.results }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
