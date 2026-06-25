/**
 * Difficulty parameters for the reaction-time exercises. Pure so they can be
 * unit-tested; harder = faster windows / shorter deadlines / more trials.
 */
import type { Difficulty } from '@/types';

export interface SimpleParams {
  trials: number;
  /** Max time after "green" to still count as a hit; slower = a miss. */
  deadlineMs: number;
}

export interface GoNoGoParams {
  trials: number;
  /** How long each stimulus stays on screen to respond. */
  windowMs: number;
  /** Blank gap between stimuli. */
  isiMs: number;
  /** Fraction of GO (vs NO-GO) stimuli. */
  goRatio: number;
}

export function simpleParams(level: Difficulty): SimpleParams {
  switch (level) {
    case 'easy':
      return { trials: 5, deadlineMs: 1500 };
    case 'medium':
      return { trials: 6, deadlineMs: 1000 };
    case 'hard':
      return { trials: 8, deadlineMs: 650 };
  }
}

export function gonogoParams(level: Difficulty): GoNoGoParams {
  switch (level) {
    case 'easy':
      return { trials: 12, windowMs: 1100, isiMs: 700, goRatio: 0.7 };
    case 'medium':
      return { trials: 16, windowMs: 850, isiMs: 550, goRatio: 0.7 };
    case 'hard':
      return { trials: 20, windowMs: 650, isiMs: 450, goRatio: 0.62 };
  }
}
