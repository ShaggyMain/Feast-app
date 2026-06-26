/** Difficulty parameters for the full Multipass (three concurrent tasks). */
import type { Difficulty } from '@/types';

export interface MPParams {
  durationMs: number;
  /** Radar: blip count, speed (fraction of scope/sec), separation (fraction), grace before a miss. */
  radarBlips: number;
  radarSpeedFrac: number;
  sepFrac: number;
  conflictGraceMs: number;
  /** Strips: how many on the board, how often one needs action, and the response window. */
  stripCount: number;
  stripEveryMs: number;
  stripWindowMs: number;
  /** Audio: cadence, response window, and how often the spoken callsign is the target. */
  audioEveryMs: number;
  audioWindowMs: number;
  audioMatchRate: number;
}

const EASY: MPParams = {
  durationMs: 60000,
  radarBlips: 3,
  radarSpeedFrac: 0.05,
  sepFrac: 0.17,
  conflictGraceMs: 3500,
  stripCount: 3,
  stripEveryMs: 6000,
  stripWindowMs: 4000,
  audioEveryMs: 5000,
  audioWindowMs: 3500,
  audioMatchRate: 0.4,
};

const MEDIUM: MPParams = {
  durationMs: 75000,
  radarBlips: 4,
  radarSpeedFrac: 0.06,
  sepFrac: 0.18,
  conflictGraceMs: 3000,
  stripCount: 4,
  stripEveryMs: 5000,
  stripWindowMs: 3500,
  audioEveryMs: 4200,
  audioWindowMs: 3000,
  audioMatchRate: 0.42,
};

const HARD: MPParams = {
  durationMs: 90000,
  radarBlips: 5,
  radarSpeedFrac: 0.07,
  sepFrac: 0.19,
  conflictGraceMs: 2500,
  stripCount: 4,
  stripEveryMs: 4200,
  stripWindowMs: 3000,
  audioEveryMs: 3600,
  audioWindowMs: 2600,
  audioMatchRate: 0.45,
};

export function mpParams(level: Difficulty): MPParams {
  return level === 'easy' ? EASY : level === 'medium' ? MEDIUM : HARD;
}
