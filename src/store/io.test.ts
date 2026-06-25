import type { ExerciseResult } from '../types';
import { parseResults, serializeResults } from './io';

const sample: ExerciseResult = {
  id: 'a1',
  module: 'math',
  exercise: 'math-arith',
  level: 'medium',
  date: '2026-03-01T10:00:00.000Z',
  totalItems: 10,
  correct: 8,
  accuracy: 0.8,
  avgResponseMs: 2500,
  score: 900,
};

describe('results io', () => {
  it('round-trips through serialize/parse', () => {
    expect(parseResults(serializeResults([sample]))).toEqual([sample]);
  });

  it('accepts a bare array too', () => {
    expect(parseResults(JSON.stringify([sample]))).toEqual([sample]);
  });

  it('drops malformed records but keeps valid ones', () => {
    const mixed = JSON.stringify({ results: [sample, { id: 'x' }, { ...sample, level: 'nope' }] });
    expect(parseResults(mixed)).toEqual([sample]);
  });

  it('returns null on non-JSON or wrong shape', () => {
    expect(parseResults('not json')).toBeNull();
    expect(parseResults('{"foo":1}')).toBeNull();
  });
});
