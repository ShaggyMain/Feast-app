import { mulberry32, pick, randInt, shuffle } from './rng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });
});

describe('randInt', () => {
  it('stays within inclusive bounds', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 2000; i++) {
      const v = randInt(r, 3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('shuffle', () => {
  it('is a permutation and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(mulberry32(9), input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('pick', () => {
  it('returns a member of the array', () => {
    const arr = ['a', 'b', 'c'] as const;
    const r = mulberry32(5);
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(pick(r, arr));
    }
  });
});
