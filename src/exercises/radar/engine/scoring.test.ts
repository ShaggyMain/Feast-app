import { emptyStats } from './types';
import { rawToStanine, scoreRadar } from './scoring';

describe('rawToStanine', () => {
  it('maps the band boundaries to 1..9', () => {
    expect(rawToStanine(100)).toBe(9);
    expect(rawToStanine(96)).toBe(9);
    expect(rawToStanine(95)).toBe(8);
    expect(rawToStanine(89)).toBe(8);
    expect(rawToStanine(88)).toBe(7);
    expect(rawToStanine(60)).toBe(6);
    expect(rawToStanine(59)).toBe(5);
    expect(rawToStanine(40)).toBe(5);
    expect(rawToStanine(23)).toBe(4);
    expect(rawToStanine(11)).toBe(3);
    expect(rawToStanine(4)).toBe(2);
    expect(rawToStanine(0)).toBe(1);
  });

  it('clamps out-of-range input', () => {
    expect(rawToStanine(200)).toBe(9);
    expect(rawToStanine(-5)).toBe(1);
  });
});

describe('scoreRadar', () => {
  it('awards a perfect run the top score', () => {
    const s = scoreRadar({ ...emptyStats(), handoffs: 4, onTimeHandoffs: 4 }, 4);
    expect(s.raw).toBe(100);
    expect(s.stanine).toBe(9);
  });

  it('subtracts conflict time so a conflict always costs', () => {
    const s = scoreRadar({ ...emptyStats(), handoffs: 4, onTimeHandoffs: 4, conflictSeconds: 5 }, 4);
    expect(s.raw).toBe(80); // 100 − 5×4
    expect(s.stanine).toBe(7);
  });

  it('gives half credit for a correct gate reached late', () => {
    const s = scoreRadar(
      { ...emptyStats(), handoffs: 4, onTimeHandoffs: 3, missedEta: 1 },
      4,
    );
    expect(s.raw).toBe(88); // 3×25 + 1×12.5
    expect(s.stanine).toBe(7);
  });

  it('gives no credit for a lost track', () => {
    const s = scoreRadar({ ...emptyStats(), handoffs: 3, onTimeHandoffs: 3, lost: 1 }, 4);
    expect(s.raw).toBe(75);
    expect(s.stanine).toBe(6);
  });

  it('floors at zero', () => {
    const s = scoreRadar({ ...emptyStats(), conflictSeconds: 999 }, 4);
    expect(s.raw).toBe(0);
    expect(s.stanine).toBe(1);
  });
});
