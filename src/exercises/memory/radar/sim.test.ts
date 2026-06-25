import { conflictPairs, pairKey, radarParams, reachedLanding, stepToward } from './sim';

describe('radarParams', () => {
  it('is harder at higher levels (faster spawns, more planes, bigger separation)', () => {
    expect(radarParams('hard').spawnEveryMs).toBeLessThan(radarParams('easy').spawnEveryMs);
    expect(radarParams('hard').maxPlanes).toBeGreaterThan(radarParams('easy').maxPlanes);
    expect(radarParams('hard').sepFrac).toBeGreaterThan(radarParams('easy').sepFrac);
    expect(radarParams('hard').speedFrac).toBeGreaterThan(radarParams('easy').speedFrac);
  });
});

describe('stepToward', () => {
  it('moves by the step distance toward the target', () => {
    const p = stepToward(0, 0, 10, 0, 4);
    expect(p).toEqual({ x: 4, y: 0 });
  });

  it('clamps at the target without overshooting', () => {
    expect(stepToward(0, 0, 3, 4, 100)).toEqual({ x: 3, y: 4 });
  });
});

describe('reachedLanding', () => {
  it('detects arrival within the radius', () => {
    expect(reachedLanding(10, 10, 12, 11, 3)).toBe(true);
    expect(reachedLanding(10, 10, 20, 20, 3)).toBe(false);
  });
});

describe('conflictPairs', () => {
  it('returns pairs within the threshold only', () => {
    const planes = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 1, y: 0 },
      { id: 3, x: 50, y: 50 },
    ];
    const pairs = conflictPairs(planes, 5);
    expect(pairs).toHaveLength(1);
    expect(pairKey(pairs[0][0], pairs[0][1])).toBe('1-2');
  });

  it('finds nothing when all are far apart', () => {
    const planes = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 100, y: 0 },
    ];
    expect(conflictPairs(planes, 5)).toHaveLength(0);
  });
});
