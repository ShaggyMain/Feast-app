/**
 * Pure derivations over the stored results list. Kept framework-free so they
 * are easy to unit-test and reuse on any screen.
 */
import type { Difficulty, ExerciseResult, ModuleId } from '@/types';

export function resultsForExercise(
  results: ExerciseResult[],
  exerciseId: string,
): ExerciseResult[] {
  return results.filter((r) => r.exercise === exerciseId);
}

/** Best score for an exercise, optionally restricted to a difficulty level. */
export function bestScore(
  results: ExerciseResult[],
  exerciseId: string,
  level?: Difficulty,
): number {
  let best = 0;
  for (const r of results) {
    if (r.exercise === exerciseId && (level == null || r.level === level) && r.score > best) {
      best = r.score;
    }
  }
  return best;
}

export interface ExerciseStats {
  attempts: number;
  bestScore: number;
  bestAccuracy: number;
  avgAccuracy: number;
  avgResponseMs: number;
  lastScore: number;
  lastAccuracy: number;
}

/** Results are stored newest-first, so index 0 is the latest attempt. */
export function exerciseStats(
  results: ExerciseResult[],
  exerciseId: string,
): ExerciseStats | null {
  const xs = resultsForExercise(results, exerciseId);
  if (xs.length === 0) return null;
  const attempts = xs.length;
  return {
    attempts,
    bestScore: Math.max(...xs.map((r) => r.score)),
    bestAccuracy: Math.max(...xs.map((r) => r.accuracy)),
    avgAccuracy: xs.reduce((s, r) => s + r.accuracy, 0) / attempts,
    avgResponseMs: Math.round(xs.reduce((s, r) => s + r.avgResponseMs, 0) / attempts),
    lastScore: xs[0].score,
    lastAccuracy: xs[0].accuracy,
  };
}

export interface OverallStats {
  totalSessions: number;
  totalItems: number;
  totalCorrect: number;
  avgAccuracy: number;
  byModule: Record<ModuleId, number>;
}

export function overallStats(results: ExerciseResult[]): OverallStats {
  const totalItems = results.reduce((s, r) => s + r.totalItems, 0);
  const totalCorrect = results.reduce((s, r) => s + r.correct, 0);
  const byModule: Record<ModuleId, number> = { math: 0, spatial: 0, memory: 0, reaction: 0 };
  for (const r of results) byModule[r.module] += 1;
  return {
    totalSessions: results.length,
    totalItems,
    totalCorrect,
    avgAccuracy: totalItems ? totalCorrect / totalItems : 0,
    byModule,
  };
}
