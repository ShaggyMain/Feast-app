/**
 * Shared, framework-free domain types for FEAST Trainer.
 * Nothing in this file may import React Native — generators, scoring and the
 * data registry depend on it and are unit-tested in plain Node (ts-jest).
 */

export type ModuleId = 'math' | 'spatial' | 'memory' | 'reaction';

/** Difficulty levels offered per exercise (manual now, adaptive in M5). */
export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** How the learner answers a generated item. */
export type AnswerMode = 'choice' | 'numeric';

export interface Choice {
  id: string;
  label: string;
  /** Optional visual rendered instead of plain text (spatial exercises). */
  figure?: FigureSpec;
}

/**
 * Optional visual that accompanies a generated item (rendered by `ui/Figure`).
 * Discriminated by `type` so each module can add its own visuals.
 */
export interface GridPoint {
  x: number;
  y: number;
  label?: string;
  /** 'a' = primary (you/aircraft), 'b' = target. */
  role?: 'a' | 'b';
}

/** A filled cell carrying a symbol index (0..5) — used by cube nets. */
export interface NetCellSpec {
  x: number;
  y: number;
  sym: number;
}

export type FigureSpec =
  | {
      type: 'heading';
      /** Current heading, 0..359. */
      heading: number;
      /** Signed degrees to turn for the visual cue (right = +, left = −). */
      turn?: number;
    }
  | {
      type: 'grid';
      /** Number of cells per side (coordinates run 0..cells). */
      cells: number;
      points: GridPoint[];
      /** Draw an arrow from the first to the second point. */
      arrow?: boolean;
    }
  | {
      /** 2D cube net (hexomino) with symbol-bearing cells. */
      type: 'net';
      cols: number;
      rows: number;
      cells: NetCellSpec[];
    }
  | {
      /** Isometric cube showing three faces by symbol index. */
      type: 'cube';
      top: number;
      left: number;
      right: number;
    }
  | {
      /** A polyomino (filled cells) on a grid, for mental rotation. */
      type: 'shape2d';
      cols: number;
      rows: number;
      cells: { x: number; y: number }[];
    };

/**
 * A single procedurally generated task. Generators are pure functions
 * `(seed, level) => GeneratedItem`, so the same inputs always yield the same
 * item (deterministic, testable, replayable).
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
  /** Optional visual aid shown with the prompt. */
  figure?: FigureSpec;
  /** Optional larger visual shown above the prompt (e.g. a cube net to fold). */
  promptFigure?: FigureSpec;
  /**
   * Optional sub-type tag (e.g. '+', 'fraction', 'reciprocal'). The session
   * builder uses it to spread item types and avoid repetition within a session.
   */
  category?: string;
}

/** Result of grading one item during a session. */
export interface ItemOutcome {
  answered: boolean;
  correct: boolean;
  responseMs: number;
}

/**
 * Optional per-exercise variant selector (e.g. "only multiplication"). Rendered
 * as a chooser on the exercise intro screen; the chosen value is passed to the
 * generator. Generators that ignore it simply omit the third argument.
 */
export interface VariantSpec {
  label: string;
  default: string;
  options: { value: string; label: string }[];
}

/**
 * Which UI drives an exercise. Most use the standard generated-item runner;
 * reaction-time exercises use their own interactive component.
 */
export type RunnerKind =
  | 'standard'
  | 'reaction-simple'
  | 'reaction-gonogo'
  | 'memory'
  | 'nback'
  | 'multipass'
  | 'multipass-full'
  | 'radar'
  | 'rct';

/**
 * Definition of a runnable exercise. Pure: metadata plus (for standard
 * exercises) the generator, with no UI concerns.
 */
export interface ExerciseDef {
  id: string;
  module: ModuleId;
  title: string;
  description: string;
  /** Seconds allowed per item before it times out (standard runner). */
  timePerItemSec: number;
  /** Number of items / trials in one session. */
  itemsPerSession: number;
  /** Which runner drives this exercise (default 'standard'). */
  runner?: RunnerKind;
  /** Optional focus selector (e.g. which operation to drill). */
  variant?: VariantSpec;
  /** Item generator — required for the standard runner. */
  generate?: (seed: number, level: Difficulty, variant?: string) => GeneratedItem;
}

/**
 * A persisted session result. Stored as a list in AsyncStorage
 * (see `src/store/results.ts`).
 */
export interface ExerciseResult {
  id: string;
  module: ModuleId;
  exercise: string;
  level: Difficulty;
  /** ISO timestamp. */
  date: string;
  totalItems: number;
  correct: number;
  /** 0..1 */
  accuracy: number;
  avgResponseMs: number;
  score: number;
  /**
   * Radar (DART) only: the 1–6 level played. `level` still carries a mapped
   * difficulty bucket so charts/streaks work, while this preserves per-level
   * bests for the six radar levels. Absent on all other exercises.
   */
  radarLevel?: number;
}
