/**
 * Shared, framework-free domain types for FEAST Trainer.
 * Nothing in this file may import React Native — generators, scoring and the
 * data registry depend on it and are unit-tested in plain Node (ts-jest).
 */

export type ModuleId = 'math' | 'spatial' | 'memory' | 'reaction';

/** How the learner answers a generated item. */
export type AnswerMode = 'choice' | 'numeric';

export interface Choice {
  id: string;
  label: string;
}

/**
 * A single procedurally generated task. Generators are pure functions
 * `(seed: number) => GeneratedItem`, so the same seed always yields the same
 * item (deterministic, testable, and replayable).
 */
export interface GeneratedItem {
  prompt: string;
  mode: AnswerMode;
  /** Present when `mode === 'choice'`. Always contains exactly one correct option. */
  choices?: Choice[];
  /** Id of the correct choice (when `mode === 'choice'`). */
  correctChoiceId?: string;
  /** Correct value (when `mode === 'numeric'`). */
  correctValue?: number;
  /** Human-readable correct answer, shown in feedback. */
  answerLabel: string;
  /** Optional method hint surfaced under the prompt. */
  hint?: string;
}

/** Result of grading one item during a session. */
export interface ItemOutcome {
  answered: boolean;
  correct: boolean;
  responseMs: number;
}

/**
 * Definition of a runnable exercise. Pure: holds metadata plus the generator,
 * with no UI concerns. Consumed by the shared ExerciseRunner shell.
 */
export interface ExerciseDef {
  id: string;
  module: ModuleId;
  title: string;
  description: string;
  /** Seconds allowed per item before it times out. */
  timePerItemSec: number;
  /** Number of items in one session. */
  itemsPerSession: number;
  generate: (seed: number) => GeneratedItem;
}

/**
 * A persisted session result. Stored as a list in AsyncStorage
 * (see `src/store/results.ts`).
 */
export interface ExerciseResult {
  id: string;
  module: ModuleId;
  exercise: string;
  /** ISO timestamp. */
  date: string;
  totalItems: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
  avgResponseMs: number;
  score: number;
}
