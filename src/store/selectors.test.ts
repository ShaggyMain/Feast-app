import type { ExerciseResult } from '../types';
import { bestScore, exerciseStats, overallStats } from './selectors';

function result(partial: Partial<ExerciseResult>): ExerciseResult {
  return {
    id: Math.random().toString(36).slice(2),
    module: 'math',
    exercise: 'demo-arith',
    date: new Date().toISOString(),
    totalItems: 8,
    correct: 4,
    accuracy: 0.5,
    avgResponseMs: 3000,
    score: 400,
    ...partial,
  };
}

// Stored newest-first.
const results: ExerciseResult[] = [
  result({ exercise: 'demo-arith', score: 520, accuracy: 0.75, correct: 6, avgResponseMs: 2500 }),
  result({ exercise: 'demo-arith', score: 300, accuracy: 0.5, correct: 4, avgResponseMs: 4000 }),
  result({ exercise: 'other', module: 'reaction', score: 999, accuracy: 1, correct: 8 }),
];

describe('bestScore', () => {
  it('returns the highest score for the exercise (0 when none)', () => {
    expect(bestScore(results, 'demo-arith')).toBe(520);
    expect(bestScore(results, 'missing')).toBe(0);
  });
});

describe('exerciseStats', () => {
  it('aggregates attempts, best and averages; latest first', () => {
    const s = exerciseStats(results, 'demo-arith')!;
    expect(s.attempts).toBe(2);
    expect(s.bestScore).toBe(520);
    expect(s.bestAccuracy).toBeCloseTo(0.75, 5);
    expect(s.avgAccuracy).toBeCloseTo(0.625, 5);
    expect(s.avgResponseMs).toBe(3250);
    expect(s.lastScore).toBe(520);
  });

  it('returns null when the exercise has no results', () => {
    expect(exerciseStats(results, 'missing')).toBeNull();
  });
});

describe('overallStats', () => {
  it('sums totals and counts sessions per module', () => {
    const s = overallStats(results);
    expect(s.totalSessions).toBe(3);
    expect(s.totalItems).toBe(24);
    expect(s.totalCorrect).toBe(18);
    expect(s.avgAccuracy).toBeCloseTo(18 / 24, 5);
    expect(s.byModule.math).toBe(2);
    expect(s.byModule.reaction).toBe(1);
    expect(s.byModule.spatial).toBe(0);
  });
});
