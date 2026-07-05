/**
 * Session-only state for a "mix training" guided playlist (Memory & Reaction):
 * a queue of exercise ids played back-to-back, each keeping its own start/result
 * screen with a "Next" button that advances the queue. Not persisted — a mix is
 * a one-off sitting.
 */
import { create } from 'zustand';

interface MixState {
  moduleId: string | null;
  queue: string[];
  index: number;
  start: (moduleId: string, queue: string[]) => void;
  advance: () => void;
  clear: () => void;
}

export const useMixStore = create<MixState>((set) => ({
  moduleId: null,
  queue: [],
  index: 0,
  start: (moduleId, queue) => set({ moduleId, queue, index: 0 }),
  advance: () => set((s) => ({ index: Math.min(s.index + 1, s.queue.length) })),
  clear: () => set({ moduleId: null, queue: [], index: 0 }),
}));
