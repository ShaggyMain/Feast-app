/**
 * Difficulty parameters and pure sequence builders for the memory module
 * (3.1 short-term memory, 3.2 n-back). Kept framework-free for unit testing.
 */
import type { Difficulty } from '@/types';
import type { Rng } from '@/core/rng';

export interface MemoryParams {
  rounds: number;
  /** Starting number of gauges to memorise (adapts up/down in play). */
  baseGauges: number;
  exposeMs: number;
  maskMs: number;
  recallMs: number;
}

export interface NBackParams {
  n: number;
  length: number;
  /** Time each stimulus is shown / window to respond. */
  isiMs: number;
  /** Target fraction of "matches". */
  targetRate: number;
}

export function memoryParams(level: Difficulty): MemoryParams {
  switch (level) {
    case 'easy':
      return { rounds: 5, baseGauges: 4, exposeMs: 9000, maskMs: 1500, recallMs: 10000 };
    case 'medium':
      return { rounds: 6, baseGauges: 5, exposeMs: 7000, maskMs: 1500, recallMs: 9000 };
    case 'hard':
      return { rounds: 6, baseGauges: 6, exposeMs: 6000, maskMs: 1800, recallMs: 8000 };
  }
}

export function nbackParams(level: Difficulty): NBackParams {
  switch (level) {
    case 'easy':
      return { n: 1, length: 20, isiMs: 2600, targetRate: 0.3 };
    case 'medium':
      return { n: 2, length: 24, isiMs: 2400, targetRate: 0.3 };
    case 'hard':
      return { n: 3, length: 28, isiMs: 2200, targetRate: 0.3 };
  }
}

export interface MultipassParams {
  durationMs: number;
  /** Full stimulus cycle (blank + visible). */
  cycleMs: number;
  /** Visible window within a cycle to respond. */
  onMs: number;
  targetRate: number;
}

export function multipassParams(level: Difficulty): MultipassParams {
  switch (level) {
    case 'easy':
      return { durationMs: 45000, cycleMs: 2000, onMs: 1300, targetRate: 0.35 };
    case 'medium':
      return { durationMs: 50000, cycleMs: 1600, onMs: 1050, targetRate: 0.35 };
    case 'hard':
      return { durationMs: 55000, cycleMs: 1250, onMs: 850, targetRate: 0.35 };
  }
}

export const NBACK_ALPHABET = ['C', 'H', 'K', 'L', 'P', 'Q', 'R', 'T'] as const;

export interface NBackSequence {
  seq: string[];
  /** target[i] === (i >= n && seq[i] === seq[i-n]) */
  target: boolean[];
}

/** Build an n-back stream with a controlled target rate. */
export function buildNbackSequence(
  rng: Rng,
  n: number,
  length: number,
  targetRate: number,
  alphabet: readonly string[] = NBACK_ALPHABET,
): NBackSequence {
  const seq: string[] = [];
  const target: boolean[] = [];
  for (let i = 0; i < length; i++) {
    if (i >= n && rng() < targetRate) {
      seq.push(seq[i - n]);
      target.push(true);
    } else {
      // pick a letter that does NOT accidentally form a target
      const forbidden = i >= n ? seq[i - n] : undefined;
      let letter = alphabet[Math.floor(rng() * alphabet.length)];
      let guard = 0;
      while (letter === forbidden && guard < 20) {
        letter = alphabet[Math.floor(rng() * alphabet.length)];
        guard += 1;
      }
      seq.push(letter);
      target.push(false);
    }
  }
  return { seq, target };
}
