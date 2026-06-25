/**
 * Local export/import of results as JSON (no backend). serializeResults wraps
 * the list with a small envelope; parseResults accepts either that envelope or a
 * bare array and keeps only well-formed records. Pure and unit-tested.
 */
import type { Difficulty, ExerciseResult } from '@/types';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

export function serializeResults(results: ExerciseResult[]): string {
  return JSON.stringify({ app: 'feast-trainer', schema: 1, results });
}

function isResult(x: unknown): x is ExerciseResult {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.exercise === 'string' &&
    typeof r.module === 'string' &&
    typeof r.level === 'string' &&
    (LEVELS as string[]).includes(r.level) &&
    typeof r.date === 'string' &&
    Number.isFinite(r.totalItems) &&
    Number.isFinite(r.correct) &&
    Number.isFinite(r.accuracy) &&
    Number.isFinite(r.avgResponseMs) &&
    Number.isFinite(r.score)
  );
}

/** Returns the valid results, or null if the input isn't parseable JSON of the expected shape. */
export function parseResults(json: string): ExerciseResult[] | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  const arr = Array.isArray(data) ? data : (data as { results?: unknown })?.results;
  if (!Array.isArray(arr)) return null;
  return arr.filter(isResult);
}
