import type { Aircraft } from './types';
import { cpaDistance, detectConflicts } from './conflicts';

function ac(partial: Partial<Aircraft>): Aircraft {
  return {
    id: 'a',
    callsign: 'X',
    x: 0,
    y: 0,
    heading: 0,
    speed: 0,
    altitude: 200,
    targetHeading: 0,
    targetSpeed: 0,
    targetAltitude: 200,
    controllable: true,
    exitGateId: 'N',
    etaSec: 0,
    spawnAtSec: 0,
    state: 'inbound',
    conflict: false,
    warn: false,
    ...partial,
  };
}

// sepH, sepV, T, climbRate for the 2D-style cases (same altitude → vertical always within).
const SEPV = 10;
const CLIMB = 5;

describe('cpaDistance', () => {
  it('is ~0 for two tracks converging on the same point', () => {
    const a = ac({ id: 'a', x: 0, y: 0, heading: 90, speed: 10 });
    const b = ac({ id: 'b', x: 50, y: 50, heading: 0, speed: 10 });
    expect(cpaDistance(a, b, 20)).toBeCloseTo(0, 5);
  });

  it('returns the current distance when tracks are parallel (no closure)', () => {
    const a = ac({ id: 'a', x: 0, y: 0, heading: 90, speed: 10 });
    const b = ac({ id: 'b', x: 0, y: 30, heading: 90, speed: 10 });
    expect(cpaDistance(a, b, 20)).toBeCloseTo(30);
  });
});

describe('detectConflicts (horizontal)', () => {
  it('flags an active pair when inside separation at the same level', () => {
    const r = detectConflicts([ac({ id: 'a', x: 0, y: 0 }), ac({ id: 'b', x: 10, y: 0 })], 20, SEPV, 10, CLIMB);
    expect(r.active.has('a')).toBe(true);
    expect(r.active.has('b')).toBe(true);
    expect(r.activePairs).toEqual([['a', 'b']]);
    expect(r.warn.size).toBe(0);
  });

  it('warns (amber) when separated now but predicted to converge', () => {
    const a = ac({ id: 'a', x: 0, y: 0, heading: 90, speed: 10 });
    const b = ac({ id: 'b', x: 50, y: 50, heading: 0, speed: 10 });
    const r = detectConflicts([a, b], 20, SEPV, 10, CLIMB);
    expect(r.active.size).toBe(0);
    expect(r.warn.has('a')).toBe(true);
    expect(r.warn.has('b')).toBe(true);
  });

  it('finds nothing when far apart and diverging', () => {
    const a = ac({ id: 'a', x: 0, y: 0, heading: 270, speed: 10 });
    const b = ac({ id: 'b', x: 200, y: 0, heading: 90, speed: 10 });
    const r = detectConflicts([a, b], 20, SEPV, 10, CLIMB);
    expect(r.active.size).toBe(0);
    expect(r.warn.size).toBe(0);
  });
});

describe('detectConflicts (vertical gating)', () => {
  it('does NOT flag an overlap when the tracks are on different flight levels', () => {
    const a = ac({ id: 'a', x: 0, y: 0, altitude: 200, targetAltitude: 200 });
    const b = ac({ id: 'b', x: 10, y: 0, altitude: 220, targetAltitude: 220 });
    const r = detectConflicts([a, b], 20, SEPV, 10, CLIMB); // |Δalt| = 20 ≥ sepV
    expect(r.active.size).toBe(0);
    expect(r.warn.size).toBe(0);
  });

  it('does NOT warn on a horizontal CPA when vertical separation is held', () => {
    const a = ac({ id: 'a', x: 0, y: 0, heading: 90, speed: 10, altitude: 200, targetAltitude: 200 });
    const b = ac({ id: 'b', x: 50, y: 50, heading: 0, speed: 10, altitude: 240, targetAltitude: 240 });
    const r = detectConflicts([a, b], 20, SEPV, 10, CLIMB);
    expect(r.warn.size).toBe(0);
  });

  it('warns when one track is climbing into the other at the CPA time', () => {
    // Same convergence as above, but b is descending from FL240 toward FL200.
    const a = ac({ id: 'a', x: 0, y: 0, heading: 90, speed: 10, altitude: 200, targetAltitude: 200 });
    const b = ac({ id: 'b', x: 50, y: 50, heading: 0, speed: 10, altitude: 240, targetAltitude: 200 });
    // CPA time ≈ 5 s; at climbRate 9 the 40-unit descent completes before then.
    const r = detectConflicts([a, b], 20, SEPV, 10, 9);
    expect(r.warn.has('a')).toBe(true);
    expect(r.warn.has('b')).toBe(true);
  });
});
