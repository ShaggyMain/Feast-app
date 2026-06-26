import { emptyRctStats } from './types';
import { scoreRct, rawToStanine } from './scoring';

describe('scoreRct', () => {
  it('awards a clean run (all on-time exits + all instructions) the top score', () => {
    const s = scoreRct({ ...emptyRctStats(), exits: 3, onTimeExits: 3, instrComplied: 2 }, 3, 2);
    expect(s.raw).toBe(100);
    expect(s.stanine).toBe(9);
  });

  it('weights exits to 100% when there are no instructions', () => {
    const s = scoreRct({ ...emptyRctStats(), exits: 2, onTimeExits: 2 }, 2, 0);
    expect(s.raw).toBe(100);
  });

  it('subtracts conflict time so a conflict always costs', () => {
    const s = scoreRct({ ...emptyRctStats(), exits: 2, onTimeExits: 2, conflictSeconds: 5 }, 2, 0);
    expect(s.raw).toBe(80); // 100 − 5×4
  });

  it('gives partial credit for wrong-level and uncomplied instructions', () => {
    // 2 aircraft, 1 instruction. exitWeight 75: one on-time (37.5) + one wrong FL (0.25×37.5=9.375).
    // instrPoints: 25 × 0/1 = 0.
    const s = scoreRct({ ...emptyRctStats(), exits: 2, onTimeExits: 1, wrongAlt: 1, instrComplied: 0 }, 2, 1);
    expect(s.raw).toBe(47); // round(37.5 + 9.375)
  });

  it('floors at zero', () => {
    expect(scoreRct({ ...emptyRctStats(), conflictSeconds: 999 }, 3, 1).raw).toBe(0);
  });
});

describe('rawToStanine re-export', () => {
  it('is the shared mapping', () => {
    expect(rawToStanine(100)).toBe(9);
    expect(rawToStanine(0)).toBe(1);
  });
});
