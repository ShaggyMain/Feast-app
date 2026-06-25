import type { ExerciseResult } from '../types';
import { bestScore, dailyStreak, exerciseStats, overallStats, series } from './selectors';

function result(partial: Partial<ExerciseResult>): ExerciseResult {
  return {
    id: Math.random().toString(36).slice(2),
    module: 'math',
    exercise: 'demo-arith',
    level: 'medium',
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
  result({ exercise: 'demo-arith', level: 'hard', score: 520, accuracy: 0.75, correct: 6, avgResponseMs: 2500 }),
  result({ exercise: 'demo-arith', level: 'easy', score: 300, accuracy: 0.5, correct: 4, avgResponseMs: 4000 }),
  result({ exercise: 'other', module: 'reaction', score: 999, accuracy: 1, correct: 8 }),
];

describe('bestScore', () => {
  it('returns the highest score for the exercise (0 when none)', () => {
    expect(bestScore(results, 'demo-arith')).toBe(520);
    expect(bestScore(results, 'missing')).toBe(0);
  });

  it('can restrict to a difficulty level', () => {
    expect(bestScore(results, 'demo-arith', 'easy')).toBe(300);
    expect(bestScore(results, 'demo-arith', 'hard')).toBe(520);
    expect(bestScore(results, 'demo-arith', 'medium')).toBe(0);
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

describe('series', () => {
  // newest-first input
  const rs: ExerciseResult[] = [
    result({ exercise: 'a', score: 50, date: '2026-03-03T10:00:00.000Z' }),
    result({ exercise: 'a', score: 40, date: '2026-03-02T10:00:00.000Z' }),
    result({ exercise: 'b', score: 99, date: '2026-03-02T09:00:00.000Z' }),
    result({ exercise: 'a', score: 30, date: '2026-03-01T10:00:00.000Z' }),
  ];

  it('returns chronological (oldest→newest) values, filtered and limited', () => {
    expect(series(rs, 'score', { exercise: 'a' })).toEqual([30, 40, 50]);
    expect(series(rs, 'score', { exercise: 'a', limit: 2 })).toEqual([40, 50]);
    expect(series(rs, 'score', { exercise: 'missing' })).toEqual([]);
  });
});

describe('dailyStreak', () => {
  const mk = (iso: string) => result({ date: iso });

  it('counts consecutive UTC days up to today', () => {
    const now = new Date('2026-03-03T12:00:00.000Z');
    const rs = [mk('2026-03-03T08:00:00Z'), mk('2026-03-02T08:00:00Z'), mk('2026-03-01T08:00:00Z')];
    expect(dailyStreak(rs, now)).toBe(3);
  });

  it('breaks on a gap and allows "yesterday" when nothing today', () => {
    const now = new Date('2026-03-05T12:00:00.000Z');
    const rs = [mk('2026-03-03T08:00:00Z'), mk('2026-03-02T08:00:00Z')];
    expect(dailyStreak(rs, now)).toBe(0); // last session was 2 days ago
    const now2 = new Date('2026-03-04T12:00:00.000Z');
    expect(dailyStreak(rs, now2)).toBe(2); // yesterday + the day before
  });

  it('is 0 with no results', () => {
    expect(dailyStreak([], new Date())).toBe(0);
  });
});
